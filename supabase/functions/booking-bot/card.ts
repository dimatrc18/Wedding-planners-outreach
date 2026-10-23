// Telegram HTML Card Renderer and Inline Keyboards (Clean Luxury Minimalist English)
import type { BookingData, Ride, Stop } from "./schema.ts";

export function esc(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const dt = new Date(dateStr);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {
    // ignore
  }
  return dateStr;
}

export function renderBookingCard(
  booking: BookingData,
  draftId: string,
  rawText?: string
): { text: string; replyMarkup: any } {
  const lines: string[] = [];

  // Header
  lines.push(`📋 <b>BOOKING DRAFT [${esc(booking.booking_ref)}]</b>`);
  lines.push(`───────────────────────────`);

  const primaryDate = booking.rides[0]?.date || booking.booked_date;
  if (primaryDate) {
    lines.push(`📅 <b>Date:</b> ${esc(formatDisplayDate(primaryDate))}`);
  }

  // Client Details
  const clientName = booking.client.name ? `<b>${esc(booking.client.name)}</b>` : `❓ <i>Not provided</i>`;
  const clientPhone = booking.client.phone ? `<code>${esc(booking.client.phone)}</code>` : `❓ <i>Not provided</i>`;
  lines.push(`👤 <b>Client:</b> ${clientName} | 📞 ${clientPhone}`);
  if (booking.client.email) {
    lines.push(`✉️ <b>Email:</b> ${esc(booking.client.email)}`);
  }

  // Vehicle & Party
  const vehStr = `${esc(booking.vehicle.class || "Mercedes-Benz V-Class")}${booking.vehicle.count > 1 ? ` (${booking.vehicle.count}x)` : ""}`;
  let partyStr = `👥 <b>Guests:</b> ${booking.party.passengers ?? 1} passengers`;
  if (booking.party.luggage !== null && booking.party.luggage > 0) {
    partyStr += ` | 🧳 ${booking.party.luggage} bags`;
  }
  lines.push(`🚐 <b>Vehicle:</b> ${vehStr}`);
  lines.push(partyStr);

  // Service Description (Standby vs Transfer)
  const isStandby = booking.service_type === "standby" ||
    booking.service_type === "disposal" ||
    booking.service_type === "wedding_transport" ||
    (booking.client_notes && /standby|10hours|disposal/i.test(booking.client_notes));

  let serviceDisplay = booking.service_type || "Chauffeur Service";
  if (isStandby) {
    const hMatch = (booking.client_notes || "").match(/(\d+)\s*(?:hours|hour|h|hr)\b/i);
    const hCount = hMatch ? `${hMatch[1]}-Hour ` : "";
    serviceDisplay = `${hCount}Standby Service`;
  }
  lines.push(`⏱ <b>Service:</b> ${esc(serviceDisplay)}`);

  // Financials (Single consolidated line in top summary)
  if (booking.finance.total_price !== null) {
    const p = booking.finance.total_price;
    const dep = booking.finance.paid_deposit || 0;
    const due = booking.finance.balance_due ?? (p - dep);
    if (dep > 0) {
      lines.push(`💶 <b>Fare:</b> €${p} | <b>Paid:</b> €${dep} ✅ | <b>Due:</b> <b>€${due}</b> 💵`);
    } else {
      lines.push(`💶 <b>Fare:</b> €${p} (Unpaid)`);
    }
  } else if (booking.finance.suggested_price) {
    lines.push(`💶 <b>Fare:</b> <i>Suggested: €${booking.finance.suggested_price}</i>`);
  } else {
    lines.push(`💶 <b>Fare:</b> ❓ <i>Not specified</i>`);
  }

  // Child Seats
  if (booking.party.children && booking.party.children.length > 0) {
    const seatsDesc = booking.party.children
      .map((c) => {
        if (c.age === null) return "Child seat (age not specified ⚠️)";
        if (c.seat_type === "infant_carrier") return `Infant carrier (under 13kg, age ${c.age})`;
        if (c.seat_type === "child_seat") return `Toddler seat 9–18kg (age ${c.age})`;
        return `Booster cushion (age ${c.age})`;
      })
      .join(", ");
    lines.push(`👶 <b>Child seats:</b> ${esc(seatsDesc)}`);
  }

  // Rides & Transfers Itinerary
  if (booking.rides.length > 0) {
    lines.push(`\n📍 <b>ITINERARY:</b>`);
    booking.rides.forEach((r, idx) => {
      const pickups = r.stops.filter((s) => s.kind === "pickup");
      const dropoffs = r.stops.filter((s) => s.kind === "dropoff");

      if (pickups.length > 0) {
        const p = pickups[0];
        const pTime = p.time ? `${p.time} — ` : r.time ? `${r.time} — ` : "";
        const pMap = p.maps_url ? ` <a href="${p.maps_url}">[Maps]</a>` : "";
        lines.push(`• <b>${pTime}${esc(p.place)}</b>${pMap}`);
        if (p.instructions) {
          lines.push(`    <i>ℹ️ ${esc(p.instructions)}</i>`);
        }
      } else {
        lines.push(`• <b>Transfer ${idx + 1}</b>`);
      }

      if (dropoffs.length === 1) {
        const d = dropoffs[0];
        const dTime = d.time ? ` (~${d.time})` : "";
        const dMap = d.maps_url ? ` <a href="${d.maps_url}">[Maps]</a>` : "";
        lines.push(`  ↳ Drop-off${dTime}: <b>${esc(d.place)}</b>${dMap}`);
        if (d.instructions) {
          lines.push(`    <i>ℹ️ ${esc(d.instructions)}</i>`);
        }
      } else if (dropoffs.length > 1) {
        lines.push(`  ↳ Drop-offs:`);
        dropoffs.forEach((d) => {
          const dTime = d.time ? ` (~${d.time})` : "";
          const dMap = d.maps_url ? ` <a href="${d.maps_url}">[Maps]</a>` : "";
          lines.push(`    - <b>${esc(d.place)}</b>${dTime}${dMap}`);
          if (d.instructions) {
            lines.push(`      <i>ℹ️ ${esc(d.instructions)}</i>`);
          }
        });
      }

      lines.push("");
    });
  }

  // Client Notes
  if (booking.client_notes) {
    lines.push(`📝 <b>Notes:</b> ${esc(booking.client_notes)}`);
  }

  // Missing Fields Checklist
  if (booking.missing_fields.length > 0) {
    lines.push(`\n───────────────────────────`);
    lines.push(`❓ <b>MISSING INFO:</b>`);
    booking.missing_fields.forEach((m) => lines.push(`• ❓ ${esc(m)}`));
  }

  // Inline Buttons layout requested by user:
  // Row 1: Approve and Cancel (Cancel deletes draft completely from chat)
  // Row 2: Single full-width button to flip the card in-place into tap-to-copy mode (0 truncation, 0 chat clutter!)
  const buttons: any[] = [];

  buttons.push([
    {
      text: "✅ Confirm & Save to CRM",
      callback_data: `confirm:${draftId}`,
    },
    {
      text: "❌ Cancel",
      callback_data: `discard:${draftId}`,
    },
  ]);

  buttons.push([
    {
      text: "✏️ Edit the Card",
      callback_data: `edit_card:${draftId}`,
    },
  ]);

  return {
    text: lines.join("\n"),
    replyMarkup: { inline_keyboard: buttons },
  };
}

/**
 * Builds the complete un-truncated card in plain-text format (all 1,350+ chars).
 * Placed inside a <code> block so one tap on Telegram copies everything to clipboard.
 */
export function buildFullCardPlainText(booking: BookingData): string {
  const lines: string[] = [];

  // Header
  lines.push(`📋 BOOKING DRAFT [${booking.booking_ref}]`);
  lines.push(`───────────────────────────`);

  const primaryDate = booking.rides[0]?.date || booking.booked_date;
  if (primaryDate) {
    lines.push(`📅 Date: ${formatDisplayDate(primaryDate)}`);
  }

  // Client Details
  const clientName = booking.client.name || `❓ Not provided`;
  const clientPhone = booking.client.phone || `❓ Not provided`;
  lines.push(`👤 Client: ${clientName} | 📞 ${clientPhone}`);
  if (booking.client.email) {
    lines.push(`✉️ Email: ${booking.client.email}`);
  }

  // Vehicle & Party
  const vehStr = `${booking.vehicle.class || "Mercedes-Benz V-Class"}${booking.vehicle.count > 1 ? ` (${booking.vehicle.count}x)` : ""}`;
  let partyStr = `👥 Guests: ${booking.party.passengers ?? 1} passengers`;
  if (booking.party.luggage !== null && booking.party.luggage > 0) {
    partyStr += ` | 🧳 ${booking.party.luggage} bags`;
  }
  lines.push(`🚐 Vehicle: ${vehStr}`);
  lines.push(partyStr);

  // Service Description (Standby vs Transfer)
  const isStandby = booking.service_type === "standby" ||
    booking.service_type === "disposal" ||
    booking.service_type === "wedding_transport" ||
    (booking.client_notes && /standby|10hours|disposal/i.test(booking.client_notes));

  let serviceDisplay = booking.service_type || "Chauffeur Service";
  if (isStandby) {
    const hMatch = (booking.client_notes || "").match(/(\d+)\s*(?:hours|hour|h|hr)\b/i);
    const hCount = hMatch ? `${hMatch[1]}-Hour ` : "";
    serviceDisplay = `${hCount}Standby Service`;
  }
  lines.push(`⏱ Service: ${serviceDisplay}`);

  // Financials
  if (booking.finance.total_price !== null) {
    const p = booking.finance.total_price;
    const dep = booking.finance.paid_deposit || 0;
    const due = booking.finance.balance_due ?? (p - dep);
    if (dep > 0) {
      lines.push(`💶 Fare: €${p} | Paid: €${dep} ✅ | Due: €${due} 💵`);
    } else {
      lines.push(`💶 Fare: €${p} (Unpaid)`);
    }
  } else if (booking.finance.suggested_price) {
    lines.push(`💶 Fare: Suggested: €${booking.finance.suggested_price}`);
  } else {
    lines.push(`💶 Fare: ❓ Not specified`);
  }

  // Child Seats
  if (booking.party.children && booking.party.children.length > 0) {
    const seatsDesc = booking.party.children
      .map((c) => {
        if (c.age === null) return "Child seat (age not specified ⚠️)";
        if (c.seat_type === "infant_carrier") return `Infant carrier (under 13kg, age ${c.age})`;
        if (c.seat_type === "child_seat") return `Toddler seat 9–18kg (age ${c.age})`;
        return `Booster cushion (age ${c.age})`;
      })
      .join(", ");
    lines.push(`👶 Child seats: ${seatsDesc}`);
  }

  // Rides & Transfers Itinerary
  if (booking.rides.length > 0) {
    lines.push(`\n📍 ITINERARY:`);
    booking.rides.forEach((r, idx) => {
      const pickups = r.stops.filter((s) => s.kind === "pickup");
      const dropoffs = r.stops.filter((s) => s.kind === "dropoff");

      if (pickups.length > 0) {
        const p = pickups[0];
        const pTime = p.time ? `${p.time} — ` : r.time ? `${r.time} — ` : "";
        const pMap = p.maps_url ? ` (${p.maps_url})` : "";
        lines.push(`• ${pTime}${p.place}${pMap}`);
        if (p.instructions) {
          lines.push(`    ℹ️ ${p.instructions}`);
        }
      } else {
        lines.push(`• Transfer ${idx + 1}`);
      }

      if (dropoffs.length === 1) {
        const d = dropoffs[0];
        const dTime = d.time ? ` (~${d.time})` : "";
        const dMap = d.maps_url ? ` (${d.maps_url})` : "";
        lines.push(`  ↳ Drop-off${dTime}: ${d.place}${dMap}`);
        if (d.instructions) {
          lines.push(`    ℹ️ ${d.instructions}`);
        }
      } else if (dropoffs.length > 1) {
        lines.push(`  ↳ Drop-offs:`);
        dropoffs.forEach((d) => {
          const dTime = d.time ? ` (~${d.time})` : "";
          const dMap = d.maps_url ? ` (${d.maps_url})` : "";
          lines.push(`    - ${d.place}${dTime}${dMap}`);
          if (d.instructions) {
            lines.push(`      ℹ️ ${d.instructions}`);
          }
        });
      }

      if (r.flight?.number) {
        lines.push(`  ✈️ Flight: ${r.flight.number}`);
      }

      lines.push("");
    });
  }

  // Client Notes
  if (booking.client_notes) {
    lines.push(`📝 Notes: ${booking.client_notes}`);
  }

  // Missing Fields Checklist
  if (booking.missing_fields.length > 0) {
    lines.push(`\n───────────────────────────`);
    lines.push(`❓ MISSING INFO:`);
    booking.missing_fields.forEach((m) => lines.push(`• ❓ ${m}`));
  }

  return lines.join("\n").trim();
}

/**
 * In-place Tap-to-Copy Card View.
 * Contains the ENTIRE un-truncated booking (all 1,350+ characters) inside <code>...</code>.
 * One tap anywhere on the code box copies everything to the clipboard in Telegram.
 */
export function renderEditCopyCard(booking: BookingData, draftId: string): { text: string; replyMarkup: any } {
  const fullText = buildFullCardPlainText(booking);
  const text = `✏️ <b>TAP THE BOX BELOW TO COPY:</b>\n` +
    `<i>(Tap once to copy the entire card, paste into chat (Cmd+V), edit, and send)</i>\n\n` +
    `<code>${esc(fullText)}</code>`;

  const buttons = [
    [
      {
        text: "⬅️ Back to Preview",
        callback_data: `preview:${draftId}`,
      },
      {
        text: "❌ Cancel",
        callback_data: `discard:${draftId}`,
      },
    ],
  ];

  return {
    text,
    replyMarkup: { inline_keyboard: buttons },
  };
}

/**
 * Builds a compact editable summary (<= 256 chars) for Telegram's native CopyTextButton.
 * Clicking the button copies this directly to clipboard with a native popup and 0 chat messages.
 */
export function buildCompactCopyText(booking: BookingData, rawText?: string): string {
  // If original raw message is short enough to fit with ref into 256 chars,
  // copy the user's actual original message directly so they can edit it naturally!
  if (rawText && rawText.trim()) {
    const candidate = `[${booking.booking_ref}]\n${rawText.trim()}`;
    if (candidate.length <= 256) {
      return candidate;
    }
  }

  const lines: string[] = [];
  lines.push(`[${booking.booking_ref}]`);
  if (booking.client.name) lines.push(`Name: ${booking.client.name}`);
  if (booking.client.phone) lines.push(`Phone: ${booking.client.phone}`);
  if (booking.finance.total_price !== null) {
    let f = `Price: €${booking.finance.total_price}`;
    if (booking.finance.paid_deposit) f += ` | Paid: €${booking.finance.paid_deposit}`;
    lines.push(f);
  }
  const pax = booking.party.passengers ? ` (${booking.party.passengers} pax)` : "";
  if (booking.vehicle.class) lines.push(`Vehicle: ${booking.vehicle.class}${pax}`);
  if (booking.rides.length > 0) {
    const r0 = booking.rides[0];
    const times = booking.rides.map((r) => r.time || "").filter(Boolean).join(", ");
    lines.push(`Date: ${r0.date}${times ? ` @ ${times}` : ""}`);

    // Include route if available
    const p0 = r0.stops.find((s) => s.kind === "pickup");
    const d0 = r0.stops.find((s) => s.kind === "dropoff");
    if (p0?.place && d0?.place) {
      lines.push(`Route: ${p0.place} -> ${d0.place}`);
    }
  }
  if (booking.client_notes) {
    lines.push(`Notes: ${booking.client_notes}`);
  }
  let res = lines.join("\n").trim();
  if (res.length > 256) {
    res = res.substring(0, 253) + "...";
  }
  return res || `[${booking.booking_ref}]`;
}

/**
 * Builds clean, plain-text editable format for the entire booking.
 * Single-tap copied via Telegram code block so the user can paste into chat,
 * edit on their keyboard, and send back.
 */
export function buildEditableBookingText(booking: BookingData): string {
  const lines: string[] = [];
  lines.push(`[${booking.booking_ref}]`);
  if (booking.client.name) lines.push(`Client: ${booking.client.name}`);
  if (booking.client.phone) lines.push(`Phone: ${booking.client.phone}`);
  if (booking.client.email) lines.push(`Email: ${booking.client.email}`);

  const vClass = booking.vehicle.class || "Mercedes-Benz V-Class";
  const pax = booking.party.passengers ? ` (${booking.party.passengers} pax)` : "";
  lines.push(`Vehicle: ${vClass}${pax}`);

  if (booking.finance.total_price !== null) {
    let fStr = `Fare: €${booking.finance.total_price}`;
    if (booking.finance.paid_deposit) {
      fStr += ` | Deposit: €${booking.finance.paid_deposit}`;
    }
    lines.push(fStr);
  }

  lines.push("");

  // Rides / Transfers
  if (booking.rides && booking.rides.length > 0) {
    booking.rides.forEach((r, idx) => {
      const rNum = r.ride_no || idx + 1;
      const rDate = r.date || "";
      const rTime = r.time ? ` @ ${r.time}` : "";
      lines.push(`[TRANSFER ${rNum}] ${rDate}${rTime}`);

      const pickups = r.stops.filter((s) => s.kind === "pickup");
      const dropoffs = r.stops.filter((s) => s.kind === "dropoff");

      pickups.forEach((p) => {
        lines.push(`📍 Pickup: ${p.place}`);
        if (p.maps_url) lines.push(`   ${p.maps_url}`);
        if (p.instructions) lines.push(`   (${p.instructions})`);
      });

      dropoffs.forEach((d) => {
        lines.push(`🏁 Dropoff: ${d.place}`);
        if (d.maps_url) lines.push(`   ${d.maps_url}`);
        if (d.instructions) lines.push(`   (${d.instructions})`);
      });

      if (r.flight?.number) {
        lines.push(`✈️ Flight: ${r.flight.number}`);
      }
      lines.push("");
    });
  }

  if (booking.client_notes) {
    lines.push(`Notes: ${booking.client_notes}`);
  }

  return lines.join("\n").trim();
}
