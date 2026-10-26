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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Builds an ISO date. When the year is missing, picks the NEXT upcoming occurrence
 * relative to referenceDate (bookings are always for the future).
 */
function buildIso(y: number | null, m: number, d: number, referenceDate: Date): string | null {
  if (y !== null) {
    if (y < 100) y += 2000;
    return isValidYmd(y, m, d) ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  }
  const refIso = referenceDate.toISOString().split("T")[0];
  let year = referenceDate.getUTCFullYear();
  if (!isValidYmd(year, m, d) && !isValidYmd(year + 1, m, d)) return null;
  let iso = `${year}-${pad2(m)}-${pad2(d)}`;
  if (iso < refIso) {
    year += 1;
    iso = `${year}-${pad2(m)}-${pad2(d)}`;
  }
  return isValidYmd(year, m, d) ? iso : null;
}

function lookupMonth(token: string): number | null {
  const t = token.toLowerCase().replace(/\.$/, "");
  return EN_MONTHS[t] || RU_MONTHS[t] || RU_MONTHS[t + "."] || null;
}

/**
 * Strict date parser. Returns YYYY-MM-DD, or null when no date can be read.
 * The day and year tokens must be complete numbers (so "Jan 2027" is never read as "Jan 20").
 */
export function parseDateStrict(dateStr: string | null | undefined, referenceDate: Date = new Date()): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // 1. ISO YYYY-MM-DD
  const isoMatch = s.match(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  if (isoMatch) {
    return buildIso(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10), parseInt(isoMatch[3], 10), referenceDate);
  }

  // 2. DD/MM/YYYY or DD.MM.YYYY (European day-first)
  const slashMatch = s.match(/(?<!\d)(\d{1,2})[\/.](\d{1,2})[\/.](\d{4}|\d{2})(?!\d)/);
  if (slashMatch) {
    return buildIso(parseInt(slashMatch[3], 10), parseInt(slashMatch[2], 10), parseInt(slashMatch[1], 10), referenceDate);
  }

  const MONTH_TOKEN = "([A-Za-zА-Яа-яЁё]{3,}\\.?)";
  const DAY_TOKEN = "(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)";
  const YEAR_TOKEN = "(?:,?\\s*(\\d{4})(?!\\d))?";

  // 3. Day-first: "11 Jan 2027", "11 January", "24 дек 2026", "2 января"
  const dayFirstRe = new RegExp(`(?<!\\d)${DAY_TOKEN}\\s+(?:of\\s+)?${MONTH_TOKEN}${YEAR_TOKEN}`, "gi");
  for (const m of s.matchAll(dayFirstRe)) {
    const mNum = lookupMonth(m[2]);
    if (mNum) {
      return buildIso(m[3] ? parseInt(m[3], 10) : null, mNum, parseInt(m[1], 10), referenceDate);
    }
  }

  // 4. Month-first: "Jan 11, 2027", "Saturday, April 24, 2027"
  const monthFirstRe = new RegExp(`${MONTH_TOKEN}\\s+${DAY_TOKEN}${YEAR_TOKEN}`, "gi");
  for (const m of s.matchAll(monthFirstRe)) {
    const mNum = lookupMonth(m[1]);
    if (mNum) {
      return buildIso(m[3] ? parseInt(m[3], 10) : null, mNum, parseInt(m[2], 10), referenceDate);
    }
  }

  return null;
}

/**
 * Normalizes any freeform or localized date to YYYY-MM-DD (falls back to baseDate when unreadable).
 * Prefer parseDateStrict() when a missing date must be detected.
 */
export function normalizeDate(dateStr: string | null | undefined, baseDate: Date = new Date()): string {
  return parseDateStrict(dateStr, baseDate) || baseDate.toISOString().split("T")[0];
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
 * Explicit standby / disposal / hourly vocabulary (EN / IT / RU)
 */
export const STANDBY_KEYWORD_RE =
  /(?:^|[^\p{L}\p{N}])(?:stand\s*-?\s*by|disposal|disposi(?:zione|tion)|a\s+disposizione|распоряжен\p{L}*|hourly|по\s+часам|почасов\p{L}*|package)(?=[^\p{L}\p{N}]|$)/iu;

/**
 * Automatically detects and computes total standby/disposal hours.
 * Returns null for ordinary transfers / round trips (e.g. Milan → Zermatt and back a week later).
 */
export function calculateStandbyHours(
  rawHours: number | null | undefined,
  sourceText: string,
  rides: Ride[]
): number | null {
  const hasStandbyKeyword = STANDBY_KEYWORD_RE.test(sourceText);
  // A standby block happens on one service day. Rides on different dates = transfers, never standby.
  const distinctDates = new Set(rides.map((r) => r.date).filter(Boolean));
  const singleServiceDay = distinctDates.size <= 1;

  if (!singleServiceDay) return null;

  // 1. Direct from Gemini if valid positive number
  if (typeof rawHours === "number" && rawHours > 0) {
    return Math.round(rawHours * 10) / 10;
  }

  // Without explicit standby vocabulary, free-text hours/ranges ("3 hours drive", "08:00 - 12:00")
  // are only considered if there are no transfer rides defined (i.e. pure hourly booking brief)
  if (!hasStandbyKeyword && rides.length > 0) return null;

  // 2. Direct regex match in text: e.g. "10 hours", "10h", "10 hrs", "8 часов", "4 ore"
  const match = sourceText.match(/(?:^|[^\p{L}\p{N}])(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|часов|часа|час|ore|ora)(?=[^\p{L}\p{N}]|$)/iu);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 1 && val <= 48) {
      return val;
    }
  }

  // 3. Time range regex: e.g. "14:00 - 22:00", "from 10:00 to 18:00", "14:00 до 22:00"
  const rangeMatch = sourceText.match(/(?:^|[^\d])(\d{1,2})[:.](\d{2})\s*(?:to|-|–|—|до)\s*(\d{1,2})[:.](\d{2})(?=[^\d]|$)/i);
  if (rangeMatch) {
    const sH = parseInt(rangeMatch[1], 10);
    const sM = parseInt(rangeMatch[2], 10);
    let eH = parseInt(rangeMatch[3], 10);
    const eM = parseInt(rangeMatch[4], 10);
    if (eH < sH || (eH === 0 && sH > 0)) {
      eH += 24; // midnight rollover
    }
    const diffHours = (eH * 60 + eM - (sH * 60 + sM)) / 60;
    if (diffHours >= 1 && diffHours <= 24) {
      return Math.round(diffHours * 10) / 10;
    }
  }

  // 4. Time span across extracted rides (earliest pickup to latest dropoff)
  //    Only for explicit standby/disposal/hourly bookings — a normal round trip must never become "standby".
  if (rides.length > 0) {
    let earliestMinutes: number | null = null;
    let latestMinutes: number | null = null;

    rides.forEach((r) => {
      if (r.time) {
        const [hh, mm] = r.time.split(":").map(Number);
        if (!isNaN(hh)) {
          const totalM = hh * 60 + (mm || 0);
          if (earliestMinutes === null || totalM < earliestMinutes) {
            earliestMinutes = totalM;
          }
        }
      }
      const dropoffs = r.stops.filter((s) => s.kind === "dropoff");
      dropoffs.forEach((d) => {
        if (d.time) {
          const [hh, mm] = d.time.split(":").map(Number);
          if (!isNaN(hh)) {
            let totalM = hh * 60 + (mm || 0);
            if (earliestMinutes !== null && totalM < earliestMinutes) {
              totalM += 24 * 60;
            }
            if (latestMinutes === null || totalM > latestMinutes) {
              latestMinutes = totalM;
            }
          }
        }
      });
      if (r.end_time) {
        const [hh, mm] = r.end_time.split(":").map(Number);
        if (!isNaN(hh)) {
          let totalM = hh * 60 + (mm || 0);
          if (earliestMinutes !== null && totalM < earliestMinutes) {
            totalM += 24 * 60;
          }
          if (latestMinutes === null || totalM > latestMinutes) {
            latestMinutes = totalM;
          }
        }
      }
    });

    if (earliestMinutes !== null && latestMinutes !== null) {
      const spanHours = (latestMinutes - earliestMinutes) / 60;
      if (spanHours >= 3 && spanHours <= 24) {
        return Math.round(spanHours);
      }
    }
  }

  return null;
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

  // Generate Reference if not provided (Base32Hex-safe alphabet: A-V, 2-9)
  const SAFE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUV";
  let randomRef = "DRG-";
  for (let i = 0; i < 6; i++) {
    randomRef += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  const bookingRef =
    (sourceText.match(/\b(DRG-[A-Z0-9]{4,10})\b/i)?.[1] ||
    raw.booking_ref ||
    randomRef).toUpperCase();

  // 1. Process Rides
  const parsedBaseDate = parseDateStrict(raw.raw_date || raw.date || raw.rides?.[0]?.raw_date || raw.rides?.[0]?.date, now);
  const baseDate = parsedBaseDate || todayIso;
  let dateMissing = !parsedBaseDate;
  const rawRides = Array.isArray(raw.rides) && raw.rides.length > 0 ? raw.rides : [{ role: "outbound", stops: [] }];
  
  const rides: Ride[] = rawRides.map((r: any, idx: number) => {
    const rideNo = r.ride_no || idx + 1;
    let role = r.role || (idx === 0 ? "outbound" : idx === 1 && rawRides.length === 2 ? "return" : "transfer");
    if (rawRides.length === 2 && idx === 1) role = "return";

    // Ride's own date wins; otherwise inherit booking date (never silently default to today without flagging)
    const ownDate = parseDateStrict(r.raw_date || r.date, now);
    const rideDate = ownDate || parseDateStrict(raw.raw_date || raw.date, now) || baseDate;
    if (!ownDate && !parsedBaseDate) dateMissing = true;

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
    const priceMatch =
      sourceText.match(/(?:итого|total|fare|всего|стоимость)\s*[:—–-]?\s*(?:€\s*)?(\d+)/i) ||
      sourceText.match(/(\d+)\s*€|€\s*(\d+)/) ||
      sourceText.match(/(\d+)\s*(?:евро|eur)\b/i);
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

  // Standby / Hourly & Vehicle classification
  const standbyHours = calculateStandbyHours(raw.standby_hours, sourceText, rides);
  const isStandby = (standbyHours !== null && standbyHours > 0) ||
    (STANDBY_KEYWORD_RE.test(sourceText) && new Set(rides.map((r) => r.date)).size <= 1);
  const standbyDuration = standbyHours ? ` (${standbyHours}h)` : "";

  const isBusOrSprinter = /\b(?:bus|sprinter|minibus|coach|24\/28)\b/i.test(sourceText);
  const defaultVehicle = isBusOrSprinter ? "Mercedes-Benz Sprinter (24-28 seats)" : "Mercedes-Benz V-Class";

  // 3. Children & Party
  const childrenList: ChildInfo[] = Array.isArray(raw.children)
    ? raw.children.map((c: any) => mapChildSeat({ age: typeof c.age === "number" ? c.age : null }))
    : [];

  let pax = typeof raw.passengers === "number" ? raw.passengers : null;

  // Safeguard: distinguish between vehicle seating capacity (e.g. "sprinter, 24/8 pax", "sprinter 24/28 pax") vs actual passenger count
  const vehCapacityMatch = sourceText.match(/\b(?:sprinter|bus|coach|van|minibus)[^.\n]*?(\d{1,2})\s*[/–-]\s*(\d{1,2})\s*(?:pax|people|seats?)/i);
  if (vehCapacityMatch && (pax === parseInt(vehCapacityMatch[1], 10) || pax === parseInt(vehCapacityMatch[2], 10))) {
    const explicitPartyMatch = sourceText.match(/(?:all|party of|total of|group of)?\s*(\d{1,3})\s*(?:guests?|passengers?|клиентов|пассажиров)/i);
    if (explicitPartyMatch && parseInt(explicitPartyMatch[1], 10) !== pax) {
      pax = parseInt(explicitPartyMatch[1], 10);
    } else {
      pax = null;
    }
  }

  if (pax === null) {
    const paxMatch = sourceText.match(/(?:^|[^\d/–-])(\d{1,3})\s*(?:guests?|people|passengers?|человек|пассажир)/i) ||
                     sourceText.match(/(?:party of|group of|total of)\s*(\d{1,3})/i);
    if (paxMatch) pax = parseInt(paxMatch[1], 10);
  }

  const party = {
    passengers: pax,
    adults: typeof raw.adults === "number" ? raw.adults : null,
    children: childrenList,
    luggage: typeof raw.luggage === "number" ? raw.luggage : null,
    ski_bags: typeof raw.ski_bags === "number" ? raw.ski_bags : null,
  };

  // Client Name & Email fallbacks (strictly guarded so place names like "Villa Lilla" are never mistaken for client names)
  let clientName = raw.client_name || null;
  if (!clientName) {
    const labeledName =
      sourceText.match(/(?:client|name|guest|passenger|клиент|имя|пассажир)\s*[:—–-]\s*([A-ZА-ЯЁ][a-zа-яё]+(?:\s+[A-ZА-ЯЁ]['’]?[A-Za-zА-Яа-яЁё]+)+)/i) ||
      sourceText.match(/\b([A-Z][a-z]+\s+[A-Z]['’]?[A-Za-z]+)\s*[,|/-]?\s*[a-zA-Z0-9._%+-]+@/);
    if (labeledName) {
      clientName = labeledName[1].trim();
    }
  }

  let clientEmail = raw.client_email || null;
  if (!clientEmail) {
    const emailMatch = sourceText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) clientEmail = emailMatch[1];
  }

  let clientPhone = raw.client_phone || null;
  if (!clientPhone) {
    const phoneMatch = sourceText.match(/(?:phone|tel|whatsapp|телефон|тел)?\s*[:—–-]?\s*(\+\d[\d\s\-()]{7,18}\d)/i);
    if (phoneMatch) clientPhone = phoneMatch[1].trim();
  }

  // 4. Missing Fields Audit
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!clientName) {
    missing.push("👤 Client full name (for driver nameboard)");
  }
  if (!clientPhone) {
    missing.push("📞 Client phone number / WhatsApp");
  }

  // Check pick-up time
  const missingTimes = rides.filter((r) => !r.time);
  if (missingTimes.length > 0) {
    if (rides.length === 1) {
      missing.push("⏰ Pick-up time (not specified in message)");
    } else if (missingTimes.length === rides.length) {
      missing.push("⏰ Pick-up times (TBD — not specified in message)");
    } else {
      const legLabels = missingTimes.map((r) => r.role === "return" ? "Return" : `Leg ${r.ride_no}`).join(", ");
      missing.push(`⏰ Pick-up time for ${legLabels} (TBD)`);
    }
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

  // Status & Our Notes (balance due) computation
  const status = paidDeposit && paidDeposit > 0 ? "Prepayment Received" : "Confirmed (Unpaid)";
  const ourNotes = balanceDue !== null && balanceDue > 0 ? `to be paid: ${balanceDue} EUR` : "";

  // Standby / Hourly / Round-Trip service type normalization
  let serviceType = raw.service_type;
  const isRoundTrip = rides.length === 2 && rides[1].role === "return";

  if (isStandby) {
    serviceType = standbyHours ? `Standby (${standbyHours} hours)` : "Standby Service";
  } else if (isRoundTrip) {
    serviceType = "Round-Trip Transfer";
  } else if (!serviceType || /stand\s*-?\s*by|hourly|disposal|disposizione/i.test(serviceType)) {
    serviceType = hasAirport ? "Airport Transfer" : rides.length > 2 ? "Multi-Stop Transfer" : "Chauffeur Transfer";
  }

  // Date sanity checks (missing date, past date, return before outbound)
  if (dateMissing) {
    missing.push("📅 Travel date (not found in message)");
  } else {
    if (rides.some((r) => r.date < todayIso)) {
      warnings.push("⚠️ Date is in the past – check the year");
    }
    const outbound = rides.find((r) => r.role === "outbound") || rides[0];
    const ret = rides.find((r) => r.role === "return");
    if (outbound && ret && ret.date < outbound.date) {
      warnings.push("⚠️ Return date is before the outbound date");
    }
  }

  const booking: BookingData = {
    booking_ref: bookingRef,
    booked_date: todayIso,
    booked_month: currentMonth,
    status,
    service_type: serviceType,
    standby_hours: isStandby ? standbyHours : null,
    client: {
      name: clientName,
      phone: clientPhone,
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
    our_notes: ourNotes,
    evidence: raw.evidence_map || {},
    missing_fields: missing,
    warnings,
  };

  allocateFinance(booking);
  return booking;
}

/**
 * True for single-block standby / disposal / hourly services (one calendar event, one CRM row)
 */
export function isStandbyBooking(booking: BookingData): boolean {
  return Boolean(booking.standby_hours && booking.standby_hours > 0) ||
    /^standby/i.test(booking.service_type || "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Single source of truth for money: total balance, per-leg price and per-leg amount to collect.
 * Round trip: price split 50/50, prepayment counted once, remaining balance split 50/50
 * (odd euro goes on the return leg). Standby / multi-stop packages: everything on leg 1.
 * Mutates and returns the booking.
 */
export function allocateFinance(booking: BookingData): BookingData {
  const total = booking.finance.total_price;
  const deposit = booking.finance.paid_deposit || 0;
  const rides = booking.rides || [];

  rides.forEach((r) => {
    r.price = null;
    r.balance_due = null;
  });

  if (total === null || total === undefined) {
    booking.finance.balance_due = null;
    booking.our_notes = "";
    booking.status = deposit > 0 ? "Prepayment Received" : "Confirmed (Unpaid)";
    return booking;
  }

  const balance = round2(total - deposit);
  booking.finance.balance_due = balance;
  booking.our_notes = balance > 0 ? `to be paid: ${balance} EUR` : "";
  booking.status = deposit > 0 ? "Prepayment Received" : "Confirmed (Unpaid)";

  if (rides.length === 0) return booking;

  const isRoundTrip = rides.length === 2 && rides[1].role === "return" && !isStandbyBooking(booking);
  if (isRoundTrip) {
    const half = Math.round(total / 2);
    rides[0].price = half;
    rides[1].price = round2(total - half);
    const firstLegDue = Math.floor(balance / 2);
    rides[0].balance_due = firstLegDue;
    rides[1].balance_due = round2(balance - firstLegDue);
  } else {
    rides[0].price = total;
    rides[0].balance_due = balance;
  }
  return booking;
}

/**
 * Text used in CRM "our_notes" / calendar for a specific leg
 */
export function legBalanceNote(booking: BookingData, rideIdx: number): string {
  const ride = booking.rides[rideIdx];
  const due = ride?.balance_due;
  if (due === null || due === undefined) {
    // Legacy drafts without per-leg allocation: show total on leg 1 only
    if (rideIdx === 0 && booking.finance.balance_due && booking.finance.balance_due > 0) {
      return `to be paid: ${booking.finance.balance_due} EUR`;
    }
    return "";
  }
  return due > 0 ? `to be paid: ${due} EUR` : "";
}
