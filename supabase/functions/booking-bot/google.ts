// Google Service Account Authentication and Google Sheets / Calendar API client (Deno WebCrypto)
import type { BookingData, Ride } from "./schema.ts";
import { isStandbyBooking, legBalanceNote } from "./rules.ts";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Gets a valid Google OAuth2 Bearer token signed via WebCrypto RSA-SHA256
 */
export async function getGoogleAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: creds.client_email,
    scope: SCOPES,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const b64u = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const encHeader = b64u(header);
  const encClaims = b64u(claimSet);
  const dataToSign = new TextEncoder().encode(`${encHeader}.${encClaims}`);

  // Import PEM private key
  const pem = creds.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, dataToSign);
  const encSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const assertion = `${encHeader}.${encClaims}.${encSignature}`;

  // Exchange assertion for token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };
  return cachedAccessToken.token;
}

/**
 * Resolves worksheet name dynamically (CRM or Bookings or first sheet)
 */
async function getEffectiveWorksheet(sheetId: string, preferred: string, token: string): Promise<string> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const titles: string[] = meta.sheets?.map((s: any) => s.properties?.title) || [];
      if (titles.includes(preferred)) return preferred;
      if (titles.includes("CRM")) return "CRM";
      if (titles.includes("Bookings")) return "Bookings";
      if (titles.length > 0) return titles[0];
    }
  } catch (e) {
    console.warn("Could not fetch sheet metadata, falling back to:", preferred);
  }
  return preferred;
}

/**
 * Saves or updates booking rows in the Google Sheet (tab: CRM / Bookings)
 */
export async function saveBookingToGoogleSheet(
  booking: BookingData,
  sheetId: string,
  worksheet = "CRM",
  creds: ServiceAccountCredentials
): Promise<{ success: boolean; rowsWritten: number; message: string }> {
  const token = await getGoogleAccessToken(creds);
  const targetWorksheet = await getEffectiveWorksheet(sheetId, worksheet, token);

  // 1. Fetch Column A to check existing rows for idempotency
  const colAUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetWorksheet)}!A:A`;
  const colARes = await fetch(colAUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!colARes.ok) {
    throw new Error(`Failed to read Sheet column A: ${await colARes.text()}`);
  }

  const colAData = await colARes.json();
  const existingIds: string[] = (colAData.values || []).map((row: any[]) => String(row[0] || "").trim());

  let headerRowIdx = 3;
  existingIds.forEach((val, idx) => {
    if (val.toLowerCase() === "booking_id") headerRowIdx = idx + 1;
  });

  // Ensure header row (e.g. Row 3) includes "Booked Month" at Column T if not present
  try {
    const headerCheckUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetWorksheet)}!S${headerRowIdx}:T${headerRowIdx}`;
    const hRes = await fetch(headerCheckUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (hRes.ok) {
      const hData = await hRes.json();
      const tVal = hData.values?.[0]?.[1];
      if (!tVal || tVal !== "Booked Month") {
        const updateHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(targetWorksheet)}!T${headerRowIdx}?valueInputOption=USER_ENTERED`;
        await fetch(updateHeaderUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ range: `${targetWorksheet}!T${headerRowIdx}`, values: [["Booked Month"]] }),
        });
      }
    }
  } catch (e) {
    console.warn(`Failed to check/update T${headerRowIdx} header:`, e);
  }

  // Helper to format stop with both place name and street address (never replacing place name with raw lat/lng)
  const formatStopForSheet = (st: { place?: string; address?: string | null } | undefined): string => {
    if (!st) return "";
    const place = (st.place || "").trim();
    const addr = (st.address || "").trim();
    const isCoords = /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(addr);
    if (!addr || isCoords) return place || addr;
    if (!place) return addr;
    if (addr.toLowerCase().includes(place.toLowerCase())) return addr;
    if (place.toLowerCase().includes(addr.toLowerCase())) return place;
    return `${place} (${addr})`;
  };

  // Build rows for each ride
  const rowsToSave: { rowNumber: number | null; values: any[] }[] = [];

  const isStandby = isStandbyBooking(booking);

  if (isStandby) {
    const firstRide = booking.rides[0] || {
      date: booking.booked_date,
      time: "10:00",
      stops: [],
    };
    const pStop = firstRide.stops.find((s) => s.kind === "pickup");
    const pickupStr = formatStopForSheet(pStop);

    // Collect distinct dropoff places across all rides
    const dropPlaces: string[] = [];
    booking.rides.forEach((r) => {
      r.stops.filter((s) => s.kind === "dropoff").forEach((s) => {
        if (s.place && !dropPlaces.includes(s.place)) dropPlaces.push(s.place);
      });
    });
    const hours = booking.standby_hours || 10;
    const dropoffStr = dropPlaces.length > 0
      ? `${dropPlaces.join(" ➔ ")} (Standby ${hours}h)`
      : "Multiple Locations (Standby)";

    // Compile concise itinerary for client_notes
    let itinerarySummary = "";
    if (booking.rides.length > 1) {
      const stopsSummary = booking.rides.map((r, rIdx) => {
        const p = r.stops.find((s) => s.kind === "pickup")?.place || "Pickup";
        const d = [...r.stops].reverse().find((s) => s.kind === "dropoff")?.place || "Dropoff";
        return `[T${rIdx + 1}] ${r.time || ""} ${p} ➔ ${d}${r.end_time ? ` (~${r.end_time})` : ""}`;
      }).join(" | ");
      itinerarySummary = `Schedule: ${stopsSummary}`;
    }

    const notesParts: string[] = [];
    if (itinerarySummary) notesParts.push(itinerarySummary);
    if (booking.party.children.length > 0) {
      const seats = booking.party.children
        .map((c) => (c.age !== null ? `seat (${c.age} y/o)` : `seat (age unknown)`))
        .join(", ");
      notesParts.push(`Child seats: ${seats}`);
    }
    if (booking.client_notes) {
      notesParts.push(booking.client_notes);
    }
    const combinedNotes = notesParts.join(" | ");

    const priceVal = booking.finance.total_price !== null && booking.finance.total_price !== undefined
      ? `€${booking.finance.total_price}`
      : "";
    const prepayVal = booking.finance.paid_deposit !== null && booking.finance.paid_deposit !== undefined
      ? `€${booking.finance.paid_deposit}`
      : "";
    const ourNotesVal =
      booking.our_notes ||
      (booking.finance.balance_due !== null && booking.finance.balance_due > 0
        ? `to be paid: ${booking.finance.balance_due} EUR`
        : "");

    const phoneStr = booking.client.phone
      ? (booking.client.phone.startsWith("+") ? `'${booking.client.phone}` : booking.client.phone)
      : "";

    const rowValues = [
      booking.booking_ref,                             // Col A: booking_id
      booking.status,                                  // Col B: status
      booking.service_type,                            // Col C: service_type
      booking.vehicle.class || "Mercedes-Benz Sprinter",// Col D: vehicle
      firstRide.date,                                  // Col E: date
      firstRide.time || "",                            // Col F: time
      pickupStr,                                       // Col G: pick_up
      dropoffStr,                                      // Col H: drop_off
      booking.party.passengers || 1,                   // Col I: passenger
      booking.party.luggage || 0,                      // Col J: luggage
      combinedNotes,                                   // Col K: client_notes
      booking.client.name || "",                       // Col L: name
      phoneStr,                                        // Col M: phone
      booking.client.email || "",                      // Col N: email
      priceVal,                                        // Col O: price
      prepayVal,                                       // Col P: prepayment
      ourNotesVal,                                     // Col Q: our_notes
      "",                                              // Col R: Comision received
      booking.booked_date,                             // Col S: Sale Date
      booking.booked_month,                            // Col T: Booked Month
    ];

    const existingIdx = existingIds.findIndex((val) => val === booking.booking_ref);
    if (existingIdx !== -1) {
      rowsToSave.push({ rowNumber: existingIdx + 1, values: rowValues });
    } else {
      rowsToSave.push({ rowNumber: null, values: rowValues });
    }
  } else {
    booking.rides.forEach((ride, idx) => {
      let legId = booking.booking_ref;
      if (booking.rides.length === 2 && idx === 1) {
        legId = `${booking.booking_ref}-RET`;
      } else if (booking.rides.length > 2) {
        legId = idx === 0 ? booking.booking_ref : `${booking.booking_ref}-${idx + 1}`;
      }

      // Determine pickup & dropoff preserving hotel/villa names
      const pStop = ride.stops.find((s) => s.kind === "pickup");
      const dStop = [...ride.stops].reverse().find((s) => s.kind === "dropoff");
      const pickupStr = formatStopForSheet(pStop);
      const dropoffStr = formatStopForSheet(dStop);

      // Build client notes including flight and extra stops
      const notesParts: string[] = [];
      if (ride.flight?.number) {
        notesParts.push(`Flight: ${ride.flight.number}`);
      }
      if (ride.stops.length > 2) {
        const intermediate = ride.stops
          .slice(1, -1)
          .map((s) => `${s.kind === "pickup" ? "Pick" : "Drop"} ${s.time ? `(${s.time})` : ""}: ${s.place}`)
          .join(" -> ");
        notesParts.push(`Stops: ${intermediate}`);
      }
      if (booking.party.children.length > 0) {
        const seats = booking.party.children
          .map((c) => (c.age !== null ? `seat (${c.age} y/o)` : `seat (age unknown)`))
          .join(", ");
        notesParts.push(`Child seats: ${seats}`);
      }
      if (booking.client_notes) {
        notesParts.push(booking.client_notes);
      }
      const combinedNotes = notesParts.join(" | ");

      // Price, Prepayment & Balance Due (our_notes)
      let priceVal = "";
      if (ride.price !== null && ride.price !== undefined) {
        priceVal = `€${ride.price}`;
      } else if (idx > 0 && booking.finance.total_price !== null) {
        priceVal = booking.rides.length === 2 ? "Included in Round-Trip" : "Included in Package";
      }
      const prepayVal = idx === 0 && booking.finance.paid_deposit !== null ? `€${booking.finance.paid_deposit}` : "";
      const ourNotesVal = legBalanceNote(booking, idx);

      const phoneStr = booking.client.phone ? (booking.client.phone.startsWith("+") ? `'${booking.client.phone}` : booking.client.phone) : "";

      const rowValues = [
        legId,                                          // Col A: booking_id
        booking.status,                                 // Col B: status
        booking.service_type,                           // Col C: service_type
        booking.vehicle.class || "Mercedes-Benz V-Class",// Col D: vehicle
        ride.date,                                      // Col E: date
        ride.time || "",                                // Col F: time
        pickupStr,                                      // Col G: pick_up
        dropoffStr,                                     // Col H: drop_off
        booking.party.passengers || 1,                  // Col I: passenger
        booking.party.luggage || 0,                     // Col J: luggage
        combinedNotes,                                  // Col K: client_notes
        booking.client.name || "",                      // Col L: name
        phoneStr,                                       // Col M: phone
        booking.client.email || "",                     // Col N: email
        priceVal,                                       // Col O: price
        prepayVal,                                      // Col P: prepayment
        ourNotesVal,                                    // Col Q: our_notes
        "",                                             // Col R: Comision received
        booking.booked_date,                            // Col S: Sale Date
        booking.booked_month,                           // Col T: Booked Month
      ];

      // Check if legId already exists in sheet
      const existingIdx = existingIds.findIndex((val) => val === legId);
      if (existingIdx !== -1) {
        rowsToSave.push({ rowNumber: existingIdx + 1, values: rowValues });
      } else {
        rowsToSave.push({ rowNumber: null, values: rowValues });
      }
    });
  }

  // Execute updates for existing rows and appends for new rows
  let updatedCount = 0;
  const newRowValues: any[][] = [];

  for (const item of rowsToSave) {
    if (item.rowNumber !== null) {
      const updateRange = `${targetWorksheet}!A${item.rowNumber}:T${item.rowNumber}`;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ range: updateRange, values: [item.values] }),
      });
      updatedCount++;
    } else {
      newRowValues.push(item.values);
    }
  }

  if (newRowValues.length > 0) {
    const startRow = Math.max(headerRowIdx + 1, existingIds.length + 1);
    const endRow = startRow + newRowValues.length - 1;
    const writeRange = `${targetWorksheet}!A${startRow}:T${endRow}`;
    const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`;
    const appRes = await fetch(putUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ range: writeRange, values: newRowValues }),
    });
    if (!appRes.ok) {
      throw new Error(`Failed to write rows to Google Sheet: ${await appRes.text()}`);
    }
  }

  return {
    success: true,
    rowsWritten: rowsToSave.length,
    message: `Saved ${rowsToSave.length} ride row(s) to Sheet (${updatedCount} updated, ${newRowValues.length} appended)`,
  };
}

/**
 * Converts any booking reference (including ones with W, X, Y, Z) into a strictly valid
 * Google Calendar API v3 base32hex ID (only characters [a-v0-9], length 5..1024).
 */
export function toCalendarEventId(fullRef: string): string {
  const hex = Array.from(fullRef.toLowerCase())
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return `drg${hex}`;
}

/**
 * Adds minutes to a local date (YYYY-MM-DD) and time (HH:MM) without timezone/UTC shifts
 */
function addMinutesLocalIso(dateStr: string, timeStr: string, addMins: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
  dt.setUTCMinutes(dt.getUTCMinutes() + addMins);
  const ey = dt.getUTCFullYear();
  const em = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const ed = String(dt.getUTCDate()).padStart(2, "0");
  const eh = String(dt.getUTCHours()).padStart(2, "0");
  const emi = String(dt.getUTCMinutes()).padStart(2, "0");
  return `${ey}-${em}-${ed}T${eh}:${emi}:00`;
}

/**
 * Creates or updates Google Calendar events for each ride
 */
export async function saveBookingToGoogleCalendar(
  booking: BookingData,
  calendarId: string,
  timezone = "Europe/Rome",
  creds: ServiceAccountCredentials
): Promise<{ success: boolean; eventLinks: string[]; error?: string }> {
  const token = await getGoogleAccessToken(creds);
  const links: string[] = [];
  const errors: string[] = [];

  const notesCombined = `${booking.vehicle.class || ""} ${booking.service_type || ""} ${booking.client_notes || ""}`.toLowerCase();
  const isStandby = isStandbyBooking(booking);
  const isWedding = /wedding/i.test(notesCombined);
  const paxNum = booking.party.passengers || 1;
  const vClass = (booking.vehicle.class || "").toLowerCase();

  let icon = "🚗";
  let vTag = `Sedan (${paxNum} pax)`;
  if (/bus|sprinter|coach|minibus|24|28/i.test(vClass) || paxNum >= 8) {
    icon = "🚌";
    vTag = `Bus (${paxNum} pax)`;
  } else if (/v-class|van|minivan/i.test(vClass)) {
    icon = "🚐";
    vTag = `V-Class (${paxNum} pax)`;
  } else if (/s-class|first class/i.test(vClass)) {
    icon = "✨";
    vTag = `S-Class (${paxNum} pax)`;
  } else if (/e-class/i.test(vClass)) {
    icon = "🚗";
    vTag = `E-Class (${paxNum} pax)`;
  }

  // 1. STANDBY SERVICE: Create a SINGLE continuous block event for the entire duration
  if (isStandby) {
    const hours = booking.standby_hours || (function () {
      const hMatch = `${booking.service_type || ""} ${booking.client_notes || ""}`.match(/(\d+)\s*(?:hours|hour|h|hr)\b/i);
      return hMatch ? parseInt(hMatch[1], 10) : 10;
    })();
    const hTag = `${hours}h Standby`;
    const svcTag = isWedding ? `Wedding ${hTag}` : hTag;

    const firstRide = booking.rides[0] || {
      date: booking.booked_date,
      time: "10:00",
      stops: [],
    };
    const pStop = firstRide.stops.find((s) => s.kind === "pickup");
    const pName = pStop?.place || "Pickup";

    const destPlaces: string[] = [];
    booking.rides.forEach((r) => {
      r.stops.filter((s) => s.kind === "dropoff").forEach((s) => {
        if (s.place && !destPlaces.includes(s.place)) destPlaces.push(s.place);
      });
    });
    const dScope = destPlaces.length > 0 ? destPlaces.join(" / ") : "At Disposal";

    const summary = `${icon} ${vTag} ${svcTag}: ${pName} ➔ ${dScope} | ${booking.client.name || "Client"} [${booking.booking_ref}]`;

    const cleanTimeMatch = (firstRide.time || "10:00").match(/(\d{1,2}):(\d{2})/);
    const startTimeStr = cleanTimeMatch
      ? `${String(parseInt(cleanTimeMatch[1], 10)).padStart(2, "0")}:${cleanTimeMatch[2]}`
      : "10:00";
    const startIso = `${firstRide.date}T${startTimeStr}:00`;

    const durationMins = hours * 60;
    const endIso = addMinutesLocalIso(firstRide.date, startTimeStr, durationMins);

    const emailHtml = booking.client.email
      ? `<a href="mailto:${booking.client.email}">${booking.client.email}</a>`
      : "N/A";

    const descLines: string[] = [
      `<b>Status:</b> ${booking.status}`,
      `<b>🔖 Reference:</b> ${booking.booking_ref}`,
      `<b>👤 Client:</b> ${booking.client.name || "VIP Guest"}`,
      `<b>📞 Phone:</b> ${booking.client.phone || "N/A"}`,
      `<b>✉️ Email:</b> ${emailHtml}`,
      "",
      `<b>🚘 Fleet:</b> ${booking.vehicle.class || "Mercedes-Benz"}`,
      `<b>👥 Party:</b> ${booking.party.passengers || 1} Pax | <b>🧳 Luggage:</b> ${booking.party.luggage || 0}`,
      `<b>⏱ Service:</b> ${hours}-Hour Standby Service (${startTimeStr} — ${endIso.split("T")[1]?.substring(0, 5) || ""})`,
      "",
      `<hr>`,
      `<b>📍 ITINERARY & TRANSFERS SCHEDULE:</b>`,
    ];

    booking.rides.forEach((r, rIdx) => {
      descLines.push("");
      descLines.push(`<b>• Leg ${rIdx + 1} (${r.time || ""}${r.end_time ? ` — ~${r.end_time}` : ""})</b>`);
      r.stops.forEach((st) => {
        const isPick = st.kind === "pickup";
        const icon = isPick ? "📍" : "🏁";
        const label = isPick ? "Pick-up" : "Drop-off";
        const placeHtml = st.maps_url ? `<a href="${st.maps_url}">${st.place}</a>` : st.place;
        descLines.push(`${icon} <b>${label}:</b> ${placeHtml}`);
        if (st.instructions) {
          descLines.push(`   <i>ℹ️ ${st.instructions}</i>`);
        }
      });
    });

    if (booking.party.children.length > 0) {
      descLines.push("");
      const seats = booking.party.children.map((c) => `${c.age} y/o (${c.seat_type})`).join(", ");
      descLines.push(`<b>👶 Child Seats:</b> ${seats}`);
    }

    if (booking.finance.total_price !== null) {
      descLines.push("");
      descLines.push(`<hr>`);
      descLines.push(`<b>💶 FINANCIALS:</b>`);
      descLines.push(`• <b>Fare:</b> €${booking.finance.total_price}`);
      if (booking.finance.paid_deposit !== null) {
        descLines.push(`• <b>Paid Deposit:</b> €${booking.finance.paid_deposit} ✅`);
        descLines.push(`• <b>Balance Due:</b> €${booking.finance.balance_due || 0} 💵`);
      }
    }

    if (booking.client_notes) {
      descLines.push("");
      descLines.push(`<hr>`);
      descLines.push(`<b>📝 NOTES:</b>`);
      descLines.push(booking.client_notes);
    }

    const eventId = toCalendarEventId(booking.booking_ref);
    const eventBody = {
      summary,
      location: pStop?.address || pStop?.place || "",
      description: descLines.join("<br>\n"),
      start: { dateTime: startIso, timeZone: timezone },
      end: { dateTime: endIso, timeZone: timezone },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 120 },
          { method: "email", minutes: 1440 },
        ],
      },
    };

    const targetUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
    const checkRes = await fetch(targetUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      links.push(data.htmlLink || "");
    } else {
      const insertUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const insertRes = await fetch(insertUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...eventBody, id: eventId }),
      });
      if (insertRes.ok) {
        const data = await insertRes.json();
        links.push(data.htmlLink || "");
      } else {
        const errText = await insertRes.text();
        console.error(`Failed to create standby calendar event: ${errText}`);
        errors.push(errText);
      }
    }

    // Clean up any legacy sub-events created with suffixes (-2, -3, -4)
    if (booking.rides.length > 1) {
      for (let leg = 2; leg <= 6; leg++) {
        const subEventId = toCalendarEventId(`${booking.booking_ref}-${leg}`);
        fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${subEventId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }

    return {
      success: errors.length === 0,
      eventLinks: links,
      error: errors.join(", "),
    };
  }

  // 2. STANDARD POINT-TO-POINT / ROUND-TRIP TRANSFERS (Individual events per ride)
  for (let idx = 0; idx < booking.rides.length; idx++) {
    const ride = booking.rides[idx];
    const isReturn = ride.role === "return";
    const legSuffix = booking.rides.length === 2 && idx === 1 ? "-RET" : booking.rides.length > 2 ? `-${idx + 1}` : "";
    const fullRef = `${booking.booking_ref}${legSuffix}`;

    const pStop = ride.stops.find((s) => s.kind === "pickup");
    const dStop = [...ride.stops].reverse().find((s) => s.kind === "dropoff");
    const pName = pStop?.place || "Pickup";
    const dName = dStop?.place || "Dropoff";

    let summary = "";
    if (isReturn) {
      summary = `🔄 ${vTag} Return: ${pName} ➔ ${dName} | ${booking.client.name || "Client"} [${fullRef}]`;
    } else {
      const svcTag = isWedding ? "Wedding Transfer" : "Transfer";
      summary = `${icon} ${vTag} ${svcTag}: ${pName} ➔ ${dName} | ${booking.client.name || "Client"} [${fullRef}]`;
    }

    // Compute Start and End times (pure local ISO without UTC drift)
    const cleanTimeMatch = (ride.time || "10:00").match(/(\d{1,2}):(\d{2})/);
    const startTimeStr = cleanTimeMatch
      ? `${String(parseInt(cleanTimeMatch[1], 10)).padStart(2, "0")}:${cleanTimeMatch[2]}`
      : "10:00";
    const startIso = `${ride.date}T${startTimeStr}:00`;

    let durationMins = ride.est_minutes || 90;
    if (booking.rides.length === 1 && booking.standby_hours && booking.standby_hours > 0) {
      durationMins = booking.standby_hours * 60;
    } else if (durationMins < 30) {
      durationMins = 30;
    }

    let endIso = addMinutesLocalIso(ride.date, startTimeStr, durationMins);
    if (ride.end_time) {
      const endMatch = ride.end_time.match(/(\d{1,2}):(\d{2})/);
      if (endMatch) {
        const endTimeClean = `${String(parseInt(endMatch[1], 10)).padStart(2, "0")}:${endMatch[2]}`;
        const candidateEndDate = ride.end_date || ride.date;
        const candidateIso = `${candidateEndDate}T${endTimeClean}:00`;
        if (candidateIso > startIso) {
          endIso = candidateIso;
        }
      }
    }

    // Build Detailed Description
    const emailHtml = booking.client.email
      ? `<a href="mailto:${booking.client.email}">${booking.client.email}</a>`
      : "N/A";

    const descLines: string[] = [
      `<b>Status:</b> ${booking.status}`,
      `<b>🔖 Reference:</b> ${fullRef}`,
      `<b>👤 Client:</b> ${booking.client.name || "VIP Guest"}`,
      `<b>📞 Phone:</b> ${booking.client.phone || "N/A"}`,
      `<b>✉️ Email:</b> ${emailHtml}`,
      "",
      `<b>🚘 Fleet:</b> ${booking.vehicle.class || "Mercedes-Benz V-Class"}`,
      `<b>👥 Party:</b> ${booking.party.passengers || 1} Pax | <b>🧳 Luggage:</b> ${booking.party.luggage || 0}`,
    ];

    if (ride.flight?.number) {
      descLines.push(`<b>✈️ Flight:</b> ${ride.flight.number}`);
    }

    if (booking.party.children.length > 0) {
      const seats = booking.party.children.map((c) => `${c.age} y/o (${c.seat_type})`).join(", ");
      descLines.push(`<b>👶 Child Seats:</b> ${seats}`);
    }

    descLines.push("");
    descLines.push(`<hr>`);
    descLines.push("<b>📍 ITINERARY & STOPS:</b>");
    ride.stops.forEach((st) => {
      const isPick = st.kind === "pickup";
      const icon = isPick ? "📍" : "🏁";
      const label = isPick ? "Pick-up" : "Drop-off";
      const placeHtml = st.maps_url ? `<a href="${st.maps_url}">${st.place}</a>` : st.place;
      let sLine = `${icon} <b>${label}${st.time ? ` (${st.time})` : ""}:</b> ${placeHtml}`;
      if (st.instructions) sLine += `<br>&nbsp;&nbsp;<i>ℹ️ ${st.instructions}</i>`;
      descLines.push(sLine);
    });

    if (ride.price !== null) {
      descLines.push("");
      descLines.push(`<hr>`);
      descLines.push(`<b>💶 FINANCIALS:</b>`);
      descLines.push(`• <b>Fare:</b> €${ride.price}`);
      const legDue = ride.balance_due !== undefined && ride.balance_due !== null
        ? ride.balance_due
        : (idx === 0 && booking.finance.balance_due ? booking.finance.balance_due : 0);
      if (legDue > 0) {
        descLines.push(`• <b>Collect on site:</b> €${legDue} 💵`);
      }
    }

    if (booking.client_notes) {
      descLines.push("");
      descLines.push(`<hr>`);
      descLines.push(`<b>📝 NOTES:</b>`);
      descLines.push(booking.client_notes);
    }

    const eventBody = {
      summary,
      location: pStop?.address || pStop?.place || "",
      description: descLines.join("<br>\n"),
      start: { dateTime: startIso, timeZone: timezone },
      end: { dateTime: endIso, timeZone: timezone },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 120 },
          { method: "email", minutes: 1440 },
        ],
      },
    };

    // Strictly valid base32hex eventId ([a-v0-9])
    const eventId = toCalendarEventId(fullRef);

    // Try update first (idempotent), then insert
    const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`;
    const updateRes = await fetch(updateUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });

    if (updateRes.ok) {
      const data = await updateRes.json();
      links.push(data.htmlLink || "");
    } else {
      // Insert with eventId
      const insertUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const insertRes = await fetch(insertUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...eventBody, id: eventId }),
      });
      if (insertRes.ok) {
        const data = await insertRes.json();
        links.push(data.htmlLink || "");
      } else {
        const errText = await insertRes.text();
        console.error(`Failed to create calendar event: ${errText}`);
        errors.push(errText);
      }
    }
  }

  return {
    success: links.length > 0 && errors.length === 0,
    eventLinks: links,
    error: errors.length > 0 ? errors[0] : undefined,
  };
}
