// Comprehensive Deno test suite for Dorogo Booking Copilot
import { assertEquals, assertNotEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeDate, normalizeTime, parseGoogleMapsUrl, mapChildSeat, applyBusinessRules, calculateStandbyHours } from "./rules.ts";
import { extractBookingWithGemini } from "./extract.ts";
import { getGoogleAccessToken, toCalendarEventId } from "./google.ts";
import { buildCompactCopyText, buildEditableBookingText, buildFullCardPlainText, renderEditCopyCard, renderBookingCard } from "./card.ts";
import defaultCreds from "./service_account.json" with { type: "json" };

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

// 1. UNIT TESTS: Rules & Normalization
Deno.test("normalizeDate handles multiple formats", () => {
  const d1 = normalizeDate("Saturday, April 24, 2027");
  assertEquals(d1, "2027-04-24");

  const d2 = normalizeDate("24 дек 2026");
  assertEquals(d2, "2026-12-24");

  const d3 = normalizeDate("15/06/2027");
  assertEquals(d3, "2027-06-15");

  const d4 = normalizeDate("2026-10-25");
  assertEquals(d4, "2026-10-25");

  // Critical regression checks: Day-first Month Year format (previously matched 'Jan 20' from '11 Jan 2027')
  const baseDate = new Date("2026-10-24T12:00:00Z");
  assertEquals(normalizeDate("11 Jan 2027", baseDate), "2027-01-11");
  assertEquals(normalizeDate("18 Jan 2027", baseDate), "2027-01-18");
  assertEquals(normalizeDate("11 January 2027", baseDate), "2027-01-11");
  assertEquals(normalizeDate("Jan 11, 2027", baseDate), "2027-01-11");
  assertEquals(normalizeDate("18/01/2027", baseDate), "2027-01-18");

  // Year missing rollover (October 2026 -> 3 Feb should be 2027)
  assertEquals(normalizeDate("3 Feb", baseDate), "2027-02-03");
});

Deno.test("normalizeTime handles ranges and approx", () => {
  const t1 = normalizeTime("14:50");
  assertEquals(t1.time, "14:50");
  assertEquals(t1.isApprox, false);

  const t2 = normalizeTime("~15:10");
  assertEquals(t2.time, "15:10");
  assertEquals(t2.isApprox, true);

  const t3 = normalizeTime("18:10 – 18:15");
  assertEquals(t3.time, "18:10");
  assertEquals(t3.isApprox, true);
  assertEquals(t3.endTime, "18:15");
});

Deno.test("parseGoogleMapsUrl extracts address and coordinates", () => {
  const url1 = "https://maps.google.com/?q=Via+Paolo+Carcano+30+Bellagio";
  const r1 = parseGoogleMapsUrl(url1);
  assertEquals(r1.address, "Via Paolo Carcano 30 Bellagio");
  assertEquals(r1.lat, null);

  const url2 = "https://maps.google.com/?q=45.9752932,9.2468878";
  const r2 = parseGoogleMapsUrl(url2);
  assertEquals(r2.lat, 45.9752932);
  assertEquals(r2.lng, 9.2468878);
});

Deno.test("mapChildSeat follows EU standards", () => {
  assertEquals(mapChildSeat({ age: 1 }).seat_type, "infant_carrier");
  assertEquals(mapChildSeat({ age: 3 }).seat_type, "child_seat");
  assertEquals(mapChildSeat({ age: 6 }).seat_type, "booster");
  assertEquals(mapChildSeat({ age: null }).seat_type, "unknown");
});

// 2. INTEGRATION TEST: Google OAuth2 Token Generation
Deno.test("Google Service Account token exchange via WebCrypto", async () => {
  const token = await getGoogleAccessToken(defaultCreds);
  assert(token.length > 20, "Should receive valid bearer token");
  console.log("✅ Google OAuth2 Token successfully acquired:", token.substring(0, 15) + "...");
});

// 3. LIVE AI TESTS: Bellagio Multi-Stop Schedule
Deno.test("Gemini live extraction on Bellagio multi-stop schedule", async () => {
  const bellagioText = `
Here is your exact transfer schedule with Google Maps pins for Saturday, April 24, 2027:

[TRANSFER 1, ~10 min drive]
📍 Pick-up 1 — 14:50
Villa Lilla
👉 https://maps.google.com/?q=Via+Paolo+Carcano+30+Bellagio
(Bus pulls over outside the main gate)

📍 Pick-up 2 — 15:00
Nenè Bellagio (Parcheggio)
👉 https://maps.google.com/?q=45.9752932,9.2468878
(Bus boards at the main parking area)

📍 Drop-off — ~15:10
Loppia Bus Stop
👉 https://maps.google.com/?q=Via+Paolo+Carcano+10+Bellagio
(2-min gentle walk / 130m down to Loppia Dock)

[TRANSFER 2 , ~25 min drive]
📍 Pick-up — 17:40
Loppia Bus Stop
👉 https://maps.google.com/?q=Via+Paolo+Carcano+10+Bellagio

📍 Drop-off — ~18:10 – 18:15
La Madonnina di Barni
👉 https://maps.google.com/?q=La+Madonnina+di+Barni
(Direct drop-off at the restaurant entrance)

[TRANSFER 3, ~25 min drive]
📍 Pick-up — 23:30
La Madonnina di Barni
👉 https://maps.google.com/?q=La+Madonnina+di+Barni

📍 Drop-offs — ~00:00 – 00:05
•  Nenèè Bellagio (Parcheggio): https://maps.google.com/?q=45.9752932,9.2468878
•  Villa Lilla: https://maps.google.com/?q=Via+Paolo+Carcano+30+Bellagio
`;

  const booking = await extractBookingWithGemini({ text: bellagioText }, GEMINI_API_KEY);
  console.log("Extracted Bellagio Booking:", JSON.stringify(booking, null, 2));

  assertEquals(booking.rides.length, 3, "Should have 3 transfer blocks");
  assertEquals(booking.rides[0].stops.length, 3, "Transfer 1 should have 3 stops");
  assertEquals(booking.rides[1].stops.length, 2, "Transfer 2 should have 2 stops");
  assertEquals(booking.rides[2].stops.length, 3, "Transfer 3 should have 3 stops");

  // Check midnight rollover on transfer 3
  assertEquals(booking.rides[2].date, "2027-04-24");
  assertEquals(booking.rides[2].end_date, "2027-04-25");

  // Check missing items list contains name and phone
  assert(booking.missing_fields.some((m) => m.includes("Client full name")));
  assert(booking.missing_fields.some((m) => m.includes("Client phone")));
  console.log("✅ Bellagio multi-stop test passed with 100% accuracy!");
});

// 4. LIVE AI TEST: Russian WhatsApp Chat with Round Trip and Prepayment
Deno.test("Gemini live extraction on Russian WhatsApp chat", async () => {
  const chat = `
Клиент: Здравствуйте! Нужен трансфер из Мальпенсы в Червинию в отель Hermitage 24 декабря. Прилетаем рейсом AZ123 в 14:15. Нас двое взрослых и ребенок 3 года.
Вы: Добрый день! Можем предоставить Mercedes V-Class, стоимость 490 евро.
Клиент: Отлично! Мы также хотим обратный трансфер 30 декабря в 13:00 из того же отеля обратно в Мальпенсу. Перевел 100 евро предоплаты на карту.
Вы: Принято, обратный трансфер тоже 490 евро. Итого 980, предоплата 100 получена.
`;

  const booking = await extractBookingWithGemini({ text: chat }, GEMINI_API_KEY);
  console.log("Extracted Russian Booking:", JSON.stringify(booking, null, 2));

  assertEquals(booking.rides.length, 2, "Should have outbound and return rides");
  assertEquals(booking.rides[0].role, "outbound");
  assertEquals(booking.rides[1].role, "return");
  assertEquals(booking.rides[0].date, "2026-12-24");
  assertEquals(booking.rides[1].date, "2026-12-30");

  assertEquals(booking.finance.total_price, 980);
  assertEquals(booking.finance.paid_deposit, 100);
  assertEquals(booking.finance.balance_due, 880);

  // 50/50 split check
  assertEquals(booking.rides[0].price, 490);
  assertEquals(booking.rides[1].price, 490);

  // Child seat check
  assertEquals(booking.party.children.length, 1);
  assertEquals(booking.party.children[0].age, 3);
  assertEquals(booking.party.children[0].seat_type, "child_seat");

  // Flight check
  assertEquals(booking.rides[0].flight?.number, "AZ123");

  console.log("✅ Russian WhatsApp round-trip test passed with 100% accuracy!");
});

// 5. UNIT TEST: Google Calendar base32hex Event ID Encoding
Deno.test("toCalendarEventId produces strictly valid base32hex IDs ([a-v0-9])", () => {
  // Test booking ref containing characters outside base32hex (like W, X, Y, Z, dashes)
  const refWithProblemChars = "DRG-P9W31D";
  const eventId1 = toCalendarEventId(refWithProblemChars);

  // Must match strictly [a-v0-9]{5,1024}
  assert(/^[a-v0-9]{5,1024}$/.test(eventId1), `Event ID "${eventId1}" must only contain characters in [a-v0-9]`);
  // Ensure 'w', 'x', 'y', 'z', and '-' are NOT in eventId
  assert(!/[wxyz\-]/.test(eventId1), `Event ID "${eventId1}" must not contain w, x, y, z or dashes`);

  // Test multi-ride suffix
  const eventIdRide2 = toCalendarEventId("DRG-P9W31D_R2");
  assert(/^[a-v0-9]{5,1024}$/.test(eventIdRide2), `Event ID "${eventIdRide2}" must be valid base32hex`);

  // Check deterministic idempotency
  assertEquals(toCalendarEventId(refWithProblemChars), eventId1);
  console.log("✅ toCalendarEventId strictly valid base32hex test passed:", eventId1);
});

// 6. UNIT TEST: buildCompactCopyText length and content constraints
Deno.test("buildCompactCopyText guarantees <= 256 chars for native Telegram copy_text button", () => {
  const dummyBooking: any = {
    booking_ref: "DRG-9A7B3C",
    client: { name: "Alessandro Michele", phone: "+39 340 123 4567", email: "alessandro@gucci.com" },
    vehicle: { class: "Mercedes-Benz V-Class", count: 1 },
    party: { passengers: 4, luggage: 4, children: [] },
    rides: [
      {
        ride_no: 1,
        date: "2027-05-15",
        time: "10:00",
        stops: [
          { kind: "pickup", place: "Grand Hotel Tremezzo", time: "10:00" },
          { kind: "dropoff", place: "Milan Malpensa Airport MXP", time: "11:30" },
        ],
      },
    ],
    finance: { total_price: 350, paid_deposit: 100, balance_due: 250 },
    client_notes: "Needs English speaking chauffeur and bottled sparkling water",
  };

  const copyText = buildCompactCopyText(dummyBooking);
  console.log("Generated Compact Copy Text:\n", copyText);

  // Hard requirement: must never exceed 256 characters for Telegram Bot API CopyTextButton
  assert(copyText.length <= 256, `Copy text length ${copyText.length} exceeds 256 character Telegram limit!`);
  assert(copyText.includes("[DRG-9A7B3C]"), "Must contain booking reference");
  assert(copyText.includes("Alessandro Michele"), "Must contain client name");
  assert(copyText.includes("350"), "Must contain price");

  // Extreme test: giant notes
  const bookingWithLongNotes: any = {
    ...dummyBooking,
    client_notes: "A".repeat(500),
  };
  const truncatedCopyText = buildCompactCopyText(bookingWithLongNotes);
  assert(truncatedCopyText.length <= 256, "Even with 500 chars of notes, must truncate to <= 256 chars");
  assert(truncatedCopyText.endsWith("..."), "Truncated text must end with ellipsis");

  // Short raw message test: should preserve the user's raw message when <= 256 chars
  const shortRaw = "Transfer MXP to Bellagio on 15 May at 10:00 for Alessandro, 4 pax, V-Class, 350 EUR";
  const rawCopy = buildCompactCopyText(dummyBooking, shortRaw);
  assert(rawCopy.startsWith("[DRG-9A7B3C]\nTransfer MXP to Bellagio"), "Should preserve raw text when <= 256 chars");
  assert(rawCopy.length <= 256);

  console.log("✅ buildCompactCopyText 256-char limit test passed!");
});

// 7. UNIT TEST: buildFullCardPlainText and renderEditCopyCard in-place edit flip
Deno.test("buildFullCardPlainText produces complete un-truncated card for in-place edit flip", () => {
  const dummyBooking: any = {
    booking_ref: "DRG-827R8B",
    booked_date: "2027-04-24",
    client: { name: "Isabella O'Kennedy", phone: null, email: "isabella.ok@icloud.com" },
    vehicle: { class: "Mercedes-Benz Sprinter", count: 1 },
    party: { passengers: 22, luggage: null, children: [] },
    service_type: "Hourly Standby",
    rides: [
      {
        ride_no: 1,
        date: "2027-04-24",
        time: "14:00",
        stops: [
          { kind: "pickup", place: "Nenè Bellagio (Parcheggio)", maps_url: "https://maps.google.com/?q=45.9752932,9.2468878", instructions: "Bus pulls over outside the main gate" },
          { kind: "dropoff", place: "Loppia Bus Stop", maps_url: "https://maps.google.com/?q=Via+Paolo+Carcano+10+Bellagio", instructions: "2-min gentle walk / 130m down to Loppia Dock" },
        ],
      },
      {
        ride_no: 2,
        date: "2027-04-24",
        time: "17:40",
        stops: [
          { kind: "pickup", place: "Loppia Bus Stop", maps_url: "https://maps.google.com/?q=Via+Paolo+Carcano+10+Bellagio" },
          { kind: "dropoff", place: "La Madonnina di Barni", maps_url: "https://maps.google.com/?q=La+Madonnina+di+Barni", instructions: "Direct drop-off at the restaurant entrance" },
        ],
      },
      {
        ride_no: 3,
        date: "2027-04-24",
        time: "23:30",
        stops: [
          { kind: "pickup", place: "La Madonnina di Barni", maps_url: "https://maps.google.com/?q=La+Madonnina+di+Barni" },
          { kind: "dropoff", place: "Nenèè Bellagio (Parcheggio)", maps_url: "https://maps.google.com/?q=45.9752932,9.2468878" },
          { kind: "dropoff", place: "Villa Lilla", maps_url: "https://maps.google.com/?q=Via+Paolo+Carcano+30+Bellagio" },
        ],
      },
    ],
    finance: { total_price: 1610, paid_deposit: 483, balance_due: 1127 },
    client_notes: "We will have everyone at Loppia by 14:50 for your 15:00 boat departure. Your chauffeur can transfer all 22 guests together at 14:4, there are other locations that have to be confimed, we promised sprinter on 24/28 people",
    missing_fields: ["Client phone number / WhatsApp"],
  };

  const fullText = buildFullCardPlainText(dummyBooking);
  console.log("Full Card Plain Text:\n", fullText);

  // Assert NO truncation
  assert(fullText.length > 500, `Full text length ${fullText.length} must be comprehensive (>500 chars)`);
  assert(fullText.includes("Isabella O'Kennedy"));
  assert(fullText.includes("isabella.ok@icloud.com"));
  assert(fullText.includes("We will have everyone at Loppia by 14:50 for your 15:00 boat departure. Your chauffeur can transfer all 22 guests together at 14:4, there are other locations that have to be confimed, we promised sprinter on 24/28 people"), "Full notes must not be cut off!");
  assert(fullText.includes("https://maps.google.com/?q=45.9752932,9.2468878"), "Maps URLs must be present in full");
  assert(fullText.includes("La Madonnina di Barni"));
  assert(fullText.includes("€1610"));
  assert(fullText.includes("€1127"));

  // Verify renderEditCopyCard markup
  const editCard = renderEditCopyCard(dummyBooking, "draft_123");
  assert(editCard.text.includes("<code>"));
  assert(editCard.text.includes("</code>"));
  assert(editCard.replyMarkup.inline_keyboard[0][0].text === "⬅️ Back to Preview");
  assert(editCard.replyMarkup.inline_keyboard[0][1].text === "❌ Cancel");

  // Verify renderBookingCard has single "Edit the Card" button on row 2
  const previewCard = renderBookingCard(dummyBooking, "draft_123");
  assertEquals(previewCard.replyMarkup.inline_keyboard.length, 2);
  assertEquals(previewCard.replyMarkup.inline_keyboard[0].length, 2);
  assertEquals(previewCard.replyMarkup.inline_keyboard[0][0].text, "✅ Confirm & Save to CRM");
  assertEquals(previewCard.replyMarkup.inline_keyboard[0][1].text, "❌ Cancel");
  assertEquals(previewCard.replyMarkup.inline_keyboard[1].length, 1);
  assertEquals(previewCard.replyMarkup.inline_keyboard[1][0].text, "✏️ Edit the Card");
  assertEquals(previewCard.replyMarkup.inline_keyboard[1][0].callback_data, "edit_card:draft_123");

  console.log("✅ buildFullCardPlainText and renderEditCopyCard test passed!");
});

// 8. UNIT TEST: calculateStandbyHours calculation
Deno.test("calculateStandbyHours calculates standby hours accurately from regex, ranges, or itinerary span", () => {
  // Test direct regex match in text
  const h1 = calculateStandbyHours(null, "Standby 10 hours for Bellagio wedding", []);
  assertEquals(h1, 10);

  const h2 = calculateStandbyHours(null, "В распоряжении на 8 часов", []);
  assertEquals(h2, 8);

  const h3 = calculateStandbyHours(null, "A disposizione 6 ore", []);
  assertEquals(h3, 6);

  // Test time range with rollover
  const h4 = calculateStandbyHours(null, "Standby from 14:00 to 22:00", []);
  assertEquals(h4, 8);

  const h5 = calculateStandbyHours(null, "Service 20:00 - 02:00", []);
  assertEquals(h5, 6);

  // Test multi-ride itinerary span (Bellagio schedule: 14:00 to 00:00 = 10h)
  const bellagioRides: any[] = [
    {
      ride_no: 1,
      time: "14:00",
      stops: [
        { kind: "pickup", place: "Nenè Bellagio", time: "14:00" },
        { kind: "dropoff", place: "Loppia", time: "15:10" },
      ],
    },
    {
      ride_no: 2,
      time: "17:40",
      stops: [
        { kind: "pickup", place: "Loppia", time: "17:40" },
        { kind: "dropoff", place: "La Madonnina di Barni", time: "18:10" },
      ],
    },
    {
      ride_no: 3,
      time: "23:30",
      end_time: "00:00",
      stops: [
        { kind: "pickup", place: "La Madonnina di Barni", time: "23:30" },
        { kind: "dropoff", place: "Villa Lilla", time: "00:00" },
      ],
    },
  ];
  const h6 = calculateStandbyHours(null, "Sprinter transfer package Bellagio", bellagioRides);
  assertEquals(h6, 10);

  console.log("✅ calculateStandbyHours test passed!");
});

// 9. UNIT TEST: Standby service_type normalization
Deno.test("applyBusinessRules normalizes service_type to Standby (10 hours)", () => {
  const rawData: any = {
    service_type: "Hourly (10 hours)",
    rides: [
      {
        ride_no: 1,
        role: "transfer",
        raw_date: "2027-04-24",
        stops: [
          { seq: 1, kind: "pickup", place: "Nenè Bellagio", time: "14:00", time_approx: false, evidence: "14:00" },
          { seq: 2, kind: "dropoff", place: "Loppia", time: "15:10", time_approx: true, evidence: "15:10" },
        ],
      },
      {
        ride_no: 2,
        role: "transfer",
        raw_date: "2027-04-24",
        stops: [
          { seq: 1, kind: "pickup", place: "Loppia", time: "17:40", time_approx: false, evidence: "17:40" },
          { seq: 2, kind: "dropoff", place: "La Madonnina di Barni", time: "18:10", time_approx: true, evidence: "18:10" },
        ],
      },
      {
        ride_no: 3,
        role: "transfer",
        raw_date: "2027-04-24",
        stops: [
          { seq: 1, kind: "pickup", place: "La Madonnina di Barni", time: "23:30", time_approx: false, evidence: "23:30" },
          { seq: 2, kind: "dropoff", place: "Villa Lilla", time: "00:00", time_approx: true, evidence: "00:00" },
        ],
      },
    ],
    price_total: 1610,
    paid_deposit: 483,
  };

  const booking = applyBusinessRules(rawData, "Standby 10 hours Bellagio wedding transfers");
  assertEquals(booking.standby_hours, 10);
  assertEquals(booking.service_type, "Standby (10 hours)");
  assertEquals(booking.rides.length, 3);
  console.log("✅ applyBusinessRules normalized standby service_type passed!");
});

// 10. UNIT TEST: Vehicle capacity vs passenger count
Deno.test("applyBusinessRules avoids mistaking vehicle capacity for party size", () => {
  // Case A: Only vehicle capacity in notes, no party size -> passengers should be null
  const rawWithOnlyVehCap: any = {
    passengers: 8,
    client_notes: "We promised a standard sprinter, 24/8 pax (white).",
    rides: [],
  };
  const b1 = applyBusinessRules(rawWithOnlyVehCap, "Notes: We promised a standard sprinter, 24/8 pax (white).");
  assertEquals(b1.party.passengers, null, "Should not treat '24/8 pax' vehicle size as 8 passengers");

  // Case B: Explicit party size alongside vehicle capacity -> extracts 22 passengers
  const rawWithBoth: any = {
    passengers: 28,
    client_notes: "Transfer all 22 guests. We promised a sprinter 24/28 pax.",
    rides: [],
  };
  const b2 = applyBusinessRules(rawWithBoth, "Transfer all 22 guests. We promised a sprinter 24/28 pax.");
  assertEquals(b2.party.passengers, 22, "Should extract 22 guests, ignoring vehicle capacity 24/28");
  console.log("✅ Vehicle capacity vs party size test passed!");
});

// 11. UNIT TEST: DRG-WIL1KT Round Trip Extraction & Per-Leg Financial Split
Deno.test("DRG-WIL1KT round trip parses dates (11 & 18 Jan 2027), splits 50/50 balance, and is not standby", () => {
  const rawWil1kt: any = {
    booking_ref: "DRG-WIL1KT",
    client_name: "Facundo Bahamonde",
    client_phone: "+17867601195",
    client_email: "facundobahamonde@gmail.com",
    service_type: "Transfer",
    vehicle_class: "Mercedes-Benz V-Class",
    passengers: 2,
    luggage: 2,
    price_total: 1520,
    paid_deposit: 380,
    raw_date: "11 Jan 2027",
    rides: [
      {
        ride_no: 1,
        role: "outbound",
        raw_date: "11 Jan 2027",
        stops: [
          { seq: 1, kind: "pickup", time: "08:00", place: "Milan City Center", evidence: "Milan City Center" },
          { seq: 2, kind: "dropoff", place: "Zermatt (Matterhorn)", evidence: "Zermatt (Matterhorn)" },
        ],
      },
      {
        ride_no: 2,
        role: "return",
        raw_date: "18 Jan 2027",
        stops: [
          { seq: 1, kind: "pickup", time: "09:00", place: "Zermatt (Matterhorn)", evidence: "Zermatt (Matterhorn)" },
          { seq: 2, kind: "dropoff", place: "Milan City Center", evidence: "Milan City Center" },
        ],
      },
    ],
    client_notes: "Palazzo Touring Club Milan, A Radisson Collection Hotel",
  };

  const booking = applyBusinessRules(
    rawWil1kt,
    `🔔 NEW BOOKING REQUEST [DRG-WIL1KT]
Date: 11 Jan 2027
🔄 RETURN JOURNEY
Date: 18 Jan 2027
Calculated Fare: €1520 (25% Deposit: €380)`,
    new Date("2026-10-24T12:00:00Z")
  );

  // Assertions
  assertEquals(booking.booking_ref, "DRG-WIL1KT");
  assertEquals(booking.service_type, "Round-Trip Transfer");
  assertEquals(booking.standby_hours, null, "Should NOT be classified as standby");
  assertEquals(booking.rides.length, 2);

  // Outbound ride
  const r1 = booking.rides[0];
  assertEquals(r1.date, "2027-01-11", "Outbound date must be 2027-01-11");
  assertEquals(r1.price, 760, "Outbound price should be €760 (50%)");
  assertEquals(r1.balance_due, 570, "Outbound balance due should be €570 (half of €1140)");

  // Return ride
  const r2 = booking.rides[1];
  assertEquals(r2.date, "2027-01-18", "Return date must be 2027-01-18");
  assertEquals(r2.role, "return");
  assertEquals(r2.price, 760, "Return price should be €760 (50%)");
  assertEquals(r2.balance_due, 570, "Return balance due should be €570 (half of €1140)");

  // Total financials
  assertEquals(booking.finance.total_price, 1520);
  assertEquals(booking.finance.paid_deposit, 380);
  assertEquals(booking.finance.balance_due, 1140);

  // Check Card Display
  const card = renderBookingCard(booking, "test-draft-id");
  assert(card.text.includes("Dates:"), "Card should display multi-day Dates header");
  assert(card.text.includes("11 Jan 2027") && card.text.includes("18 Jan 2027"), "Card must display both 11 and 18 Jan 2027");
  assert(card.text.includes("€570 + €570 per leg"), "Card must display per-leg balance breakdown");
  assert(card.text.includes("RETURN"), "Card must show RETURN label on ride 2");

  console.log("✅ DRG-WIL1KT round trip business rules test passed!");
});

// 12. UNIT TEST: Missing pick-up time audit & "Time TBD" card rendering
Deno.test("Missing pick-up time is audited in missing_fields and rendered as Time TBD", () => {
  const rawWithoutTime: any = {
    booking_ref: "DRG-5QNRLH",
    client_name: "Julie",
    client_phone: "+1 (970) 599-3554",
    service_type: "Transfer",
    vehicle_class: "Mercedes-Benz V-Class",
    passengers: 5,
    price_total: 2470,
    paid_deposit: 618,
    raw_date: "27 Dec 2026",
    rides: [
      {
        ride_no: 1,
        role: "outbound",
        raw_date: "27 Dec 2026",
        stops: [
          { seq: 1, kind: "pickup", place: "Sina de la Ville, Milan", evidence: "Sina de la Ville" },
          { seq: 2, kind: "dropoff", place: "Cortina d'Ampezzo", evidence: "Cortina" },
        ],
      },
      {
        ride_no: 2,
        role: "return",
        raw_date: "2 Jan 2027",
        stops: [
          { seq: 1, kind: "pickup", place: "Cortina d'Ampezzo", evidence: "Cortina" },
          { seq: 2, kind: "dropoff", place: "Sina de la Ville, Milan", evidence: "Sina de la Ville" },
        ],
      },
    ],
  };

  const booking = applyBusinessRules(rawWithoutTime, "booking without time");
  
  // 1. Check missing_fields contains Pick-up times TBD
  const hasTimeMissing = booking.missing_fields.some((m) => m.includes("Pick-up time"));
  assert(hasTimeMissing, "missing_fields must contain pick-up time warning when time is null");

  // 2. Check Card text renders Time TBD explicitly
  const card = renderBookingCard(booking, "draft-5qnrlh");
  assert(card.text.includes("Time TBD"), "Card text must explicitly indicate Time TBD on stops with missing time");
  assert(card.text.includes("MISSING INFO:"), "Card must include MISSING INFO section");
  assert(card.text.includes("Pick-up time"), "Card MISSING INFO must list Pick-up time");

  // 3. Plain text view
  const plain = buildFullCardPlainText(booking);
  assert(plain.includes("Time TBD"), "Plain text edit mode must show Time TBD");

  console.log("✅ Missing pick-up time audit & Time TBD test passed!");
});

// 13. UNIT TEST: Explicit per-leg fares & dues vs 50/50 fallback and reply instructions
Deno.test("Flexible per-leg pricing, due amounts, and reply instructions under MISSING INFO", () => {
  const chatLogText = `[07/10/2569 BE, 00:00:13] Dmitri: Hi Julie, I just tried calling following your booking request for Dec 27 & Jan 02 (Milan ⇄ Cortina d'Ampezzo).

Your fixed rate for the Mercedes-Benz V-Class (5 passengers) with an English-speaking chauffeur is:
•  Dec 27 (Milan → Cortina): €1,270
•  Jan 02 (Cortina → Milan): €1,200 (return discount applied)
•  Total: €2,470 all-inclusive (all tolls, fuel, VAT)
A 25% deposit reserves your chauffeur for both dates. If any children are traveling, child seats are complimentary.

Shall I send the secure payment link to lock this in?

Warm regards,
Dmitri
DOROGO | Private Transportation
[07/10/2569 BE, 00:03:42] Julie Mote (Dorogo): Thank you Dimitri! Let me get a few quotes back but this looks really good !
[21/10/2569 BE, 10:32:42] Dmitri: A 25% deposit secures your Mercedes V-Class and chauffeur:

•  Due today (25%): €618.00, link:  https://pay.sumup.com/p/s/XQZFSY1WR6
•  Due after Leg 1 (27 Dec): €952.00
•  Due after Leg 2 (02 Jan): €900.00
[21/10/2569 BE, 10:33:11] Dmitri: Also, if you'll be needing a chauffeur between the airport (Malp`;

  const rawGeminiExtraction: any = {
    booking_ref: "DRG-JUL1EM",
    client_name: "Julie",
    service_type: "Round-Trip Transfer",
    vehicle_class: "Mercedes-Benz V-Class",
    passengers: 5,
    price_total: 2470,
    paid_deposit: 618,
    rides: [
      {
        ride_no: 1,
        role: "outbound",
        raw_date: "27 Dec 2026",
        stops: [
          { seq: 1, kind: "pickup", place: "Milan", evidence: "Milan" },
          { seq: 2, kind: "dropoff", place: "Cortina d'Ampezzo", evidence: "Cortina" },
        ],
      },
      {
        ride_no: 2,
        role: "return",
        raw_date: "02 Jan 2027",
        stops: [
          { seq: 1, kind: "pickup", place: "Cortina d'Ampezzo", evidence: "Cortina" },
          { seq: 2, kind: "dropoff", place: "Milan", evidence: "Milan" },
        ],
      },
    ],
  };

  const booking = applyBusinessRules(rawGeminiExtraction, chatLogText, new Date("2026-10-26T08:00:00Z"));

  // 1. Verify Client full name was resolved from WhatsApp chat log
  assertEquals(booking.client.name, "Julie Mote", "Client full name must be extracted from WhatsApp chat header");

  // 2. Verify explicit per-leg prices and per-leg balances due were preserved
  assertEquals(booking.rides[0].price, 1270, "Ride 1 price must be 1270");
  assertEquals(booking.rides[1].price, 1200, "Ride 2 price must be 1200");
  assertEquals(booking.rides[0].balance_due, 952, "Ride 1 balance due must be 952");
  assertEquals(booking.rides[1].balance_due, 900, "Ride 2 balance due must be 900");
  assertEquals(booking.finance.balance_due, 1852, "Total balance due must be 1852");

  // 3. Verify Card Fare line renders explicit split
  const card = renderBookingCard(booking, "draft-julie");
  assert(card.text.includes("€1852 (€952 + €900 per leg)"), "Card must display explicit per-leg due amounts");

  // 4. Verify Reply instruction is rendered under MISSING INFO
  assert(card.text.includes("Reply directly to this message to add missing details"), "Card must include reply instructions under MISSING INFO");

  // 5. Verify plain-text tap-to-copy card also includes reply instructions
  const plainText = buildFullCardPlainText(booking);
  assert(plainText.includes("Reply directly to this message to add missing details"), "Plain-text card must include reply instructions");

  console.log("✅ Flexible per-leg pricing, due amounts, and reply instructions test passed!");
});
