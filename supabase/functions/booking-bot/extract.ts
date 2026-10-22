// Gemini 2.5 Flash / Pro extraction engine with strict schema enforcement
import { GEMINI_BOOKING_SCHEMA } from "./schema.ts";
import { applyBusinessRules } from "./rules.ts";
import type { BookingData } from "./schema.ts";
import rateCardData from "./rate_card.json" with { type: "json" };

const SYSTEM_INSTRUCTION = `
You are an expert booking assistant for Dorogo, a private luxury chauffeur service in Milan, Northern Italy, and the Alps.
Your task is to extract chauffeur booking data from conversational messages, WhatsApp chat logs, multi-stop itineraries, or notes.

CRITICAL RULES:
1. ONLY extract information that is explicitly stated or directly implied by the context.
2. If a field is NOT in the text, you MUST return null or omit it. NEVER invent names, phone numbers, prices, or flights.
3. If the booking is a round-trip or multi-transfer schedule, create separate entries in the "rides" array:
   - For a standard return trip, create 2 rides (ride 1: outbound, ride 2: return).
   - For multi-stop itineraries (e.g. [TRANSFER 1], [TRANSFER 2], [TRANSFER 3]), create separate rides for each transfer block, each with its own pickup(s) and dropoff(s).
4. Extract Google Maps URLs if present into "maps_url".
5. Extract flight numbers (e.g. LX1612, AZ123, BA562) and assign them to the appropriate ride (arrival to outbound, departure to return).
6. For child seats, extract the age of each child if mentioned.
7. For prices, extract total price into "price_total" and any deposit/prepayment (e.g. "предоплата 100", "deposit €150", "paid 200", "100 евро предоплаты") into "paid_deposit" as numeric values.
8. Output MUST conform strictly to the JSON schema provided.
`;

const MODEL_CASCADE = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

async function callGeminiWithFallback(
  payload: any,
  apiKey: string,
  modelIndex = 0
): Promise<string> {
  const model = MODEL_CASCADE[modelIndex] || MODEL_CASCADE[0];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    if ((res.status === 429 || res.status === 404 || res.status >= 500) && modelIndex < MODEL_CASCADE.length - 1) {
      console.warn(`[Gemini ${model} Status ${res.status}] Retrying with ${MODEL_CASCADE[modelIndex + 1]}...`);
      return callGeminiWithFallback(payload, apiKey, modelIndex + 1);
    }
    throw new Error(`Gemini API error (${res.status} on ${model}): ${errText}`);
  }

  const jsonRes = await res.json();
  const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    if (modelIndex < MODEL_CASCADE.length - 1) {
      console.warn(`[Gemini ${model} empty response] Retrying with ${MODEL_CASCADE[modelIndex + 1]}...`);
      return callGeminiWithFallback(payload, apiKey, modelIndex + 1);
    }
    throw new Error(`Gemini returned empty candidate response on ${model}`);
  }
  return rawText;
}

export async function extractBookingWithGemini(
  input: { text: string; audioBase64?: string; audioMime?: string; imageBase64?: string; imageMime?: string },
  apiKey: string
): Promise<BookingData> {
  const parts: any[] = [];

  if (input.text) {
    parts.push({ text: `Message / Chat to parse:\n${input.text}` });
  }

  if (input.audioBase64 && input.audioMime) {
    parts.push({
      inlineData: {
        mimeType: input.audioMime,
        data: input.audioBase64,
      },
    });
  }

  if (input.imageBase64 && input.imageMime) {
    parts.push({
      inlineData: {
        mimeType: input.imageMime,
        data: input.imageBase64,
      },
    });
  }

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: GEMINI_BOOKING_SCHEMA,
    },
  };

  const rawText = await callGeminiWithFallback(payload, apiKey);
  if (!rawText) {
    throw new Error("Gemini returned empty response content.");
  }

  const rawData = JSON.parse(rawText);
  const booking = applyBusinessRules(rawData, input.text || "");

  // Auto-suggest price from rate card if total_price is null
  if (booking.finance.total_price === null) {
    const suggested = suggestRateFromCard(booking);
    if (suggested) {
      booking.finance.suggested_price = suggested;
      booking.finance.is_suggested = true;
      booking.warnings.push(`💶 Рекомендованный тариф Dorogo: €${suggested}`);
    }
  }

  return booking;
}

/**
 * Updates an existing booking with a plain-text correction or compact template edit
 */
export async function patchBookingWithGemini(
  existingBooking: BookingData,
  correctionText: string,
  apiKey: string,
  originalRawText = ""
): Promise<BookingData> {
  const prompt = `
You are updating an existing chauffeur booking with new corrections or missing details provided by the user.

EXISTING BOOKING JSON:
${JSON.stringify(existingBooking, null, 2)}

USER'S CORRECTION / ADDITIONAL INFO:
"${correctionText}"

CRITICAL INSTRUCTIONS:
1. Apply ONLY the changes mentioned in USER'S CORRECTION to the EXISTING BOOKING.
2. Keep ALL existing rides, stops, maps_url, instructions, dates, times, client_notes, vehicle_class, and prices intact unless the user explicitly changed them.
3. Return the complete updated booking conforming strictly to the JSON schema.
`;

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: GEMINI_BOOKING_SCHEMA,
    },
  };

  const rawText = await callGeminiWithFallback(payload, apiKey);
  const rawData = JSON.parse(rawText);
  const combinedSource = `${originalRawText}\n${correctionText}`.trim();
  const updated = applyBusinessRules(rawData, combinedSource);

  // Safeguard: preserve existing rides & Google Maps URLs if the patch did not include full transfer blocks
  const hasFullTransferOverride = /\[transfer|\bpick-?up\s*\d/i.test(correctionText);
  if (!hasFullTransferOverride && existingBooking.rides.length > 0) {
    // Keep existing rides structure and merge any time/flight/date updates
    if (updated.rides.length === existingBooking.rides.length) {
      updated.rides = existingBooking.rides.map((origRide, idx) => {
        const uRide = updated.rides[idx];
        return {
          ...origRide,
          date: uRide?.date || origRide.date,
          time: uRide?.time || origRide.time,
          flight: uRide?.flight || origRide.flight,
          stops: origRide.stops.map((origStop, sIdx) => {
            const uStop = uRide?.stops?.[sIdx];
            return {
              ...origStop,
              time: uStop?.time || origStop.time,
              place: uStop?.place || origStop.place,
              maps_url: origStop.maps_url || uStop?.maps_url || null,
              address: origStop.address || uStop?.address || null,
              instructions: origStop.instructions || uStop?.instructions || null,
            };
          }),
        };
      });
    } else {
      updated.rides = existingBooking.rides;
    }
  }

  // Safeguard: preserve non-null fields from existingBooking if omitted
  updated.booking_ref = existingBooking.booking_ref;
  if (!updated.client.name && existingBooking.client.name) updated.client.name = existingBooking.client.name;
  if (!updated.client.phone && existingBooking.client.phone) updated.client.phone = existingBooking.client.phone;
  if (!updated.client.email && existingBooking.client.email) updated.client.email = existingBooking.client.email;
  if (!updated.client_notes && existingBooking.client_notes) updated.client_notes = existingBooking.client_notes;
  if (updated.finance.total_price === null && existingBooking.finance.total_price !== null) {
    updated.finance.total_price = existingBooking.finance.total_price;
  }
  if (updated.finance.paid_deposit === null && existingBooking.finance.paid_deposit !== null) {
    updated.finance.paid_deposit = existingBooking.finance.paid_deposit;
  }
  if (updated.finance.total_price !== null) {
    updated.finance.balance_due = updated.finance.total_price - (updated.finance.paid_deposit || 0);
    updated.our_notes = updated.finance.balance_due > 0 ? `to be paid: ${updated.finance.balance_due} EUR` : "";
    updated.status = updated.finance.paid_deposit && updated.finance.paid_deposit > 0 ? "Prepayment Received" : "Confirmed (Unpaid)";
    // Re-sync ride prices
    if (updated.rides.length === 2 && updated.rides[1].role === "return" && !/standby/i.test(updated.service_type)) {
      const half = Math.round(updated.finance.total_price / 2);
      updated.rides[0].price = half;
      updated.rides[1].price = updated.finance.total_price - half;
    } else if (updated.rides.length > 0) {
      updated.rides[0].price = updated.finance.total_price;
      for (let i = 1; i < updated.rides.length; i++) updated.rides[i].price = null;
    }
  }

  // Re-evaluate missing fields
  updated.missing_fields = [];
  if (!updated.client.name) updated.missing_fields.push("👤 Client full name (for driver nameboard)");
  if (!updated.client.phone) updated.missing_fields.push("📞 Client phone number / WhatsApp");
  const hasAirport = updated.rides.some((rd) =>
    rd.stops.some((st) => /airport|malpensa|mxp|linate|lin|bergamo|bgy|terminal/i.test(st.place + " " + (st.address || "")))
  );
  const hasFlight = updated.rides.some((rd) => !!rd.flight?.number);
  if (hasAirport && !hasFlight) updated.missing_fields.push("✈️ Inbound/outbound flight number");

  return updated;
}

/**
 * Checks Dorogo rate card for automatic price suggestion
 */
function suggestRateFromCard(booking: BookingData): number | null {
  if (!booking.rides.length) return null;
  const firstRide = booking.rides[0];
  const pStops = firstRide.stops.filter((s) => s.kind === "pickup").map((s) => (s.place + " " + (s.address || "")).toLowerCase());
  const dStops = firstRide.stops.filter((s) => s.kind === "dropoff").map((s) => (s.place + " " + (s.address || "")).toLowerCase());

  const pText = pStops.join(" ");
  const dText = dStops.join(" ");

  for (const item of (rateCardData as any).routes || []) {
    const fromMatch = item.from.some((f: string) => pText.includes(f));
    const toMatch = item.to.some((t: string) => dText.includes(t));

    if (fromMatch && toMatch) {
      const vClass = (booking.vehicle.class || "").toLowerCase();
      let rate = item.rates.vClass;
      if (vClass.includes("s-class") || vClass.includes("s class")) rate = item.rates.sClass;
      if (vClass.includes("e-class") || vClass.includes("e class")) rate = item.rates.eClass;

      // Multiply by 2 if round trip
      if (booking.rides.length === 2 && booking.rides[1].role === "return") {
        return rate * 2;
      }
      return rate;
    }
  }
  return null;
}
