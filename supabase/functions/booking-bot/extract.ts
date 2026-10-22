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

export async function extractBookingWithGemini(
  input: { text: string; audioBase64?: string; audioMime?: string; imageBase64?: string; imageMime?: string },
  apiKey: string,
  model = "gemini-2.5-flash"
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    // If Flash fails with 429 or 5xx, retry with gemini-3.5-flash-lite or gemini-3-flash-preview
    if (model === "gemini-2.5-flash") {
      console.warn(`[Gemini Flash Status ${res.status}] Retrying with Gemini 3.5 Flash Lite...`);
      return extractBookingWithGemini(input, apiKey, "gemini-3.5-flash-lite");
    } else if (model === "gemini-3.5-flash-lite") {
      console.warn(`[Gemini Flash Lite Status ${res.status}] Retrying with Gemini 3 Flash Preview...`);
      return extractBookingWithGemini(input, apiKey, "gemini-3-flash-preview");
    }
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const jsonRes = await res.json();
  const rawText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
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
 * Updates an existing booking with a plain-text correction or additional detail
 */
export async function patchBookingWithGemini(
  existingBooking: BookingData,
  correctionText: string,
  apiKey: string
): Promise<BookingData> {
  const prompt = `
You are updating an existing chauffeur booking with new corrections or missing details provided by the user.

EXISTING BOOKING JSON:
${JSON.stringify(existingBooking, null, 2)}

USER'S CORRECTION / ADDITIONAL INFO:
"${correctionText}"

Apply the corrections to the existing booking and return the complete updated booking conforming to the JSON schema.
Only modify the fields referenced in the correction text; keep all other valid fields intact.
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Gemini patch error: ${await res.text()}`);
  }

  const jsonRes = await res.json();
  const rawData = JSON.parse(jsonRes.candidates[0].content.parts[0].text);
  const updated = applyBusinessRules(rawData, correctionText);

  // Preserve existing booking ref
  updated.booking_ref = existingBooking.booking_ref;
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
