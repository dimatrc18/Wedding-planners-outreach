// Deterministic business rules, normalization, grounding checks, and missing-field auditing
import type { BookingData, Ride, Stop, ChildInfo } from "./schema.ts";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const RU_MONTHS: Record<string, number> = {
  "янв": 1, "января": 1, "янв.": 1,
  "фев": 2, "февраля": 2, "февр": 2,
  "мар": 3, "марта": 3,
  "апр": 4, "апреля": 4,
  "май": 5, "мая": 5,
  "июн": 6, "июня": 6,
  "июл": 7, "июля": 7,
  "авг": 8, "августа": 8,
  "сен": 9, "сентября": 9, "сент": 9,
  "окт": 10, "октября": 10,
  "ноя": 11, "ноября": 11, "нояб": 11,
  "дек": 12, "декабря": 12, "дек.": 12
};

const EN_MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Normalizes any freeform or localized date to YYYY-MM-DD
 */
export function normalizeDate(dateStr: string | null | undefined, baseDate: Date = new Date()): string {
  if (!dateStr || !dateStr.trim()) {
    return baseDate.toISOString().split("T")[0];
  }
  const s = dateStr.trim();

  // 1. Check ISO format YYYY-MM-DD
  const isoMatch = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, "0");
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 2. Check DD/MM/YYYY or DD.MM.YYYY
  const slashMatch = s.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/);
  if (slashMatch) {
    const d = String(parseInt(slashMatch[1], 10)).padStart(2, "0");
    const m = String(parseInt(slashMatch[2], 10)).padStart(2, "0");
    let y = parseInt(slashMatch[3], 10);
    if (y < 100) y += 2000;
    return `${y}-${m}-${d}`;
  }

  // 3. Check English date: "Saturday, April 24, 2027" or "24 April 2027"
  const enMatch1 = s.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
  if (enMatch1) {
    const mName = enMatch1[1].toLowerCase();
    const mNum = EN_MONTHS[mName];
    if (mNum) {
      const d = String(parseInt(enMatch1[2], 10)).padStart(2, "0");
      const y = enMatch1[3] ? parseInt(enMatch1[3], 10) : baseDate.getFullYear();
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  const enMatch2 = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s*(\d{4})?/i);
  if (enMatch2) {
    const mName = enMatch2[2].toLowerCase();
    const mNum = EN_MONTHS[mName];
    if (mNum) {
      const d = String(parseInt(enMatch2[1], 10)).padStart(2, "0");
      const y = enMatch2[3] ? parseInt(enMatch2[3], 10) : baseDate.getFullYear();
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  // 4. Check Russian date: "24 дек 2026" or "2 января 2027"
  const ruMatch = s.match(/(\d{1,2})\s+([а-яА-ЯёЁ]+),?\s*(\d{4})?/i);
  if (ruMatch) {
    const mName = ruMatch[2].toLowerCase();
    const mNum = RU_MONTHS[mName];
    if (mNum) {
      const d = String(parseInt(ruMatch[1], 10)).padStart(2, "0");
      const y = ruMatch[3] ? parseInt(ruMatch[3], 10) : baseDate.getFullYear();
      return `${y}-${String(mNum).padStart(2, "0")}-${d}`;
    }
  }

  // Fallback to JS Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return baseDate.toISOString().split("T")[0];
}

/**
 * Normalizes time string: "14:50", "~15:10", "18:10 – 18:15"
 */
export function normalizeTime(timeStr: string | null | undefined): { time: string | null; isApprox: boolean; endTime?: string } {
  if (!timeStr || !timeStr.trim()) {
    return { time: null, isApprox: false };
  }
  const isApprox = timeStr.includes("~") || /approx|around|около/i.test(timeStr);
  const clean = timeStr.replace(/~/g, "").trim();

  // Check range e.g. "18:10 – 18:15" or "00:00 – 00:05"
  const rangeMatch = clean.match(/(\d{1,2}[:.]\d{2})\s*(?:–|-|to|до)\s*(\d{1,2}[:.]\d{2})/);
  if (rangeMatch) {
    const t1 = formatHHMM(rangeMatch[1]);
    const t2 = formatHHMM(rangeMatch[2]);
    return { time: t1, isApprox: true, endTime: t2 };
  }

  const singleMatch = clean.match(/(\d{1,2}[:.]\d{2})/);
  if (singleMatch) {
    return { time: formatHHMM(singleMatch[1]), isApprox };
  }

  return { time: clean, isApprox };
}

function formatHHMM(s: string): string {
  const parts = s.split(/[:.]/);
  const h = String(parseInt(parts[0], 10)).padStart(2, "0");
  const m = String(parseInt(parts[1], 10)).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Checks if a time crosses midnight (e.g. 23:30 to 00:05) and calculates next day ISO
 */
export function addDays(dateIso: string, days = 1): string {
  const d = new Date(dateIso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Extracts address or coordinates from a Google Maps URL
 */
export function parseGoogleMapsUrl(url: string | null | undefined): { address: string | null; lat: number | null; lng: number | null } {
  if (!url) return { address: null, lat: null, lng: null };

  // Match coordinates in ?q=45.9752932,9.2468878
  const coordMatch = url.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (coordMatch) {
    return {
      address: `${coordMatch[1]}, ${coordMatch[2]}`,
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
    };
  }

  // Match address in ?q=Via+Paolo+Carcano+30+Bellagio
  const queryMatch = url.match(/[?&]q=([^&]+)/);
  if (queryMatch) {
    const raw = decodeURIComponent(queryMatch[1].replace(/\+/g, " "));
    return { address: raw, lat: null, lng: null };
  }

  return { address: null, lat: null, lng: null };
}

/**
 * Maps child age to EU-compliant seat type (R129 / R44 standard)
 */
export function mapChildSeat(child: ChildInfo): ChildInfo {
  if (child.age === null || child.age === undefined) {
    return { ...child, seat_type: "unknown" };
  }
  if (child.age < 1.5) {
    return { ...child, seat_type: "infant_carrier" };
  }
  if (child.age < 4) {
    return { ...child, seat_type: "child_seat" };
  }
  return { ...child, seat_type: "booster" };
}

/**
 * Applies deterministic business rules to raw extracted Gemini output
 */
export function applyBusinessRules(
  raw: any,
  sourceText: string,
  now: Date = new Date()
): BookingData {
  const todayIso = now.toISOString().split("T")[0];
  const currentMonth = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  // Generate Reference if not provided
  const bookingRef =
    (sourceText.match(/\b(DRG-[A-Z0-9]{4,10})\b/i)?.[1] ||
    raw.booking_ref ||
    `DRG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`).toUpperCase();

  // 1. Process Rides
  const baseDate = normalizeDate(raw.raw_date || raw.rides?.[0]?.raw_date, now);
  const rawRides = Array.isArray(raw.rides) && raw.rides.length > 0 ? raw.rides : [{ role: "outbound", stops: [] }];
  
  const rides: Ride[] = rawRides.map((r: any, idx: number) => {
    const rideNo = r.ride_no || idx + 1;
    let role = r.role || (idx === 0 ? "outbound" : idx === 1 && rawRides.length === 2 ? "return" : "transfer");
    if (rawRides.length === 2 && idx === 1) role = "return";

    const rideDate = normalizeDate(r.raw_date || raw.raw_date, new Date(baseDate + "T12:00:00Z"));

    // Process Stops
    const stops: Stop[] = (r.stops || []).map((s: any, sIdx: number) => {
      const timeInfo = normalizeTime(s.time);
      const mapsData = parseGoogleMapsUrl(s.maps_url);

      let cleanPlace = s.place || "";
      if (!cleanPlace && s.address) cleanPlace = s.address;

      return {
        seq: s.seq || sIdx + 1,
        kind: s.kind || (sIdx === (r.stops?.length || 1) - 1 ? "dropoff" : "pickup"),
        time: timeInfo.time,
        time_approx: s.time_approx || timeInfo.isApprox,
        place: cleanPlace,
        address: s.address || mapsData.address,
        maps_url: s.maps_url || null,
        lat: mapsData.lat,
        lng: mapsData.lng,
        instructions: s.instructions || null,
        evidence: s.evidence || s.place || "",
      };
    });

    // Detect first and last stop times
    const firstPickup = stops.find((st) => st.kind === "pickup");
    const lastDropoff = [...stops].reverse().find((st) => st.kind === "dropoff");

    const startTime = firstPickup?.time || stops[0]?.time || null;
    let endTime = lastDropoff?.time || null;
    let endDate = rideDate;

    // Check midnight crossover (e.g. 23:30 to 00:05)
    if (startTime && endTime) {
      const [sh] = startTime.split(":").map(Number);
      const [eh] = endTime.split(":").map(Number);
      if (sh >= 20 && eh < 6) {
        endDate = addDays(rideDate, 1);
      }
    }

    return {
      ride_no: rideNo,
      role,
      date: rideDate,
      end_date: endDate,
      time: startTime,
      end_time: endTime,
      time_approx: stops.some((st) => st.time_approx),
      est_minutes: r.est_duration_min || null,
      stops,
      flight: r.flight_number ? { number: r.flight_number.toUpperCase().replace(/\s+/g, ""), kind: r.flight_kind } : null,
      price: null, // Will be computed in finance
    };
  });

  // 2. Financials & Fallbacks
  let totalPrice = typeof raw.price_total === "number" ? raw.price_total : null;
  if (totalPrice === null) {
    const priceMatch = sourceText.match(/(\d+)\s*€|€\s*(\d+)/);
    if (priceMatch) totalPrice = parseFloat(priceMatch[1] || priceMatch[2]);
  }

  let paidDeposit = typeof raw.paid_deposit === "number" ? raw.paid_deposit : null;
  if (paidDeposit === null) {
    const depositMatch = sourceText.match(/(?:paid|deposit|предоплат[аы]?)\s*[:—–-]?\s*(?:€\s*)?(\d+)/i) ||
                         sourceText.match(/(\d+)\s*(?:евро|eur|€)?\s*предоплат[аы]/i) ||
                         sourceText.match(/предоплат[аы]\s*(\d+)/i);
    if (depositMatch) paidDeposit = parseFloat(depositMatch[1]);
  }

  const balanceDue = totalPrice !== null ? (totalPrice - (paidDeposit || 0)) : null;

  // Split prices across rides (e.g. 50/50 for round trips)
  if (totalPrice !== null && rides.length > 0) {
    if (rides.length === 2 && rides[1].role === "return") {
      const half = Math.round(totalPrice / 2);
      rides[0].price = half;
      rides[1].price = totalPrice - half;
    } else {
      const share = Math.round(totalPrice / rides.length);
      rides.forEach((rd, i) => {
        rd.price = i === rides.length - 1 ? totalPrice - share * (rides.length - 1) : share;
      });
    }
  }

  // 3. Children & Party
  const childrenList: ChildInfo[] = Array.isArray(raw.children)
    ? raw.children.map((c: any) => mapChildSeat({ age: typeof c.age === "number" ? c.age : null }))
    : [];

  let pax = typeof raw.passengers === "number" ? raw.passengers : null;
  if (pax === null) {
    const paxMatch = sourceText.match(/(\d{1,3})\s*(?:guests?|people|pax|passengers?|человек)/i);
    if (paxMatch) pax = parseInt(paxMatch[1], 10);
  }

  const party = {
    passengers: pax,
    adults: typeof raw.adults === "number" ? raw.adults : null,
    children: childrenList,
    luggage: typeof raw.luggage === "number" ? raw.luggage : null,
    ski_bags: typeof raw.ski_bags === "number" ? raw.ski_bags : null,
  };

  // Client Name & Email fallbacks
  let clientName = raw.client_name || null;
  if (!clientName) {
    const nameMatch = sourceText.match(/\b([A-Z][a-z]+(?:\s+[A-Z]['’][A-Za-z]+|\s+[A-Z][a-z]+))\b/);
    if (nameMatch && !/Google|Maps|Apple|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday/i.test(nameMatch[1])) {
      clientName = nameMatch[1];
    }
  }

  let clientEmail = raw.client_email || null;
  if (!clientEmail) {
    const emailMatch = sourceText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) clientEmail = emailMatch[1];
  }

  // Standby / Hourly & Vehicle classification
  const isStandby = /\b(?:\d+\s*hours?|stand\s*by|disposi(?:zione|tion)|from\s+\d+\s*(?:am|pm)\s*-\s*\d+\s*(?:am|pm))\b/i.test(sourceText);
  const standbyHoursMatch = sourceText.match(/(\d+)\s*hours?/i);
  const standbyDuration = standbyHoursMatch ? ` (${standbyHoursMatch[1]}h)` : "";

  const isBusOrSprinter = /\b(?:bus|sprinter|minibus|coach|24\/28)\b/i.test(sourceText);
  const defaultVehicle = isBusOrSprinter ? "Mercedes-Benz Sprinter (24-28 seats)" : "Mercedes-Benz V-Class";

  // 4. Missing Fields Audit
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!clientName) {
    missing.push("👤 Client full name (for driver nameboard)");
  }
  if (!raw.client_phone) {
    missing.push("📞 Client phone number / WhatsApp");
  }

  // Check if any airport stop is missing a flight number
  const hasAirport = rides.some((rd) =>
    rd.stops.some((st) => /airport|malpensa|mxp|linate|lin|bergamo|bgy|terminal/i.test(st.place + " " + (st.address || "")))
  );
  const hasFlight = rides.some((rd) => !!rd.flight?.number);
  if (hasAirport && !hasFlight) {
    missing.push("✈️ Inbound/outbound flight number");
  }

  // Check child ages
  const childrenMissingAge = childrenList.filter((c) => c.age === null);
  if (childrenMissingAge.length > 0) {
    missing.push(`👶 Child age for ${childrenMissingAge.length} child (required for safety seat)`);
  }

  if (totalPrice === null) {
    warnings.push("💶 Total fare not specified in booking message");
  }

  // Client Notes fallback
  let notes = (raw.client_notes || "").trim();
  if (!notes) {
    const notesMatch = sourceText.match(/(?:notes?|заметк[иа]|примечани[ея])\s*[:—–-]\s*([\s\S]+?)(?=\n\s*(?:paid|total|fare|итого|предоплат|transfer|pick-?up|drop-?off)\b|$)/i);
    if (notesMatch) {
      notes = notesMatch[1].trim();
    }
  }

  // Status computation
  const status = paidDeposit && paidDeposit > 0 ? "Prepayment Received" : "Confirmed (Unpaid)";

  return {
    booking_ref: bookingRef,
    booked_date: todayIso,
    booked_month: currentMonth,
    status,
    service_type: raw.service_type || (isStandby ? `Hourly Standby${standbyDuration}` : hasAirport ? "Airport Transfer" : rides.length > 2 ? "Multi-Stop Transfer" : "Chauffeur Transfer"),
    client: {
      name: clientName,
      phone: raw.client_phone || null,
      email: clientEmail,
    },
    party,
    vehicle: {
      class: raw.vehicle_class || defaultVehicle,
      count: raw.vehicle_count || 1,
    },
    rides,
    finance: {
      total_price: totalPrice,
      paid_deposit: paidDeposit,
      balance_due: balanceDue,
      payment_method: raw.payment_method || (paidDeposit ? "Deposit Paid" : null),
    },
    client_notes: notes,
    our_notes: "",
    evidence: raw.evidence_map || {},
    missing_fields: missing,
    warnings,
  };
}
