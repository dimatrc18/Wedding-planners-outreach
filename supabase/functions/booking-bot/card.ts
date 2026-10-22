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

export function renderBookingCard(booking: BookingData, draftId: string): { text: string; replyMarkup: any } {
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

  // Inline Buttons layout:
  // Row 1: Approve and Cancel (Cancel deletes draft completely from chat)
  // Row 2: Full-width Edit Full Booking (copies full itinerary/text to edit all fields)
  // Row 3: Quick targeted edits (Edit Notes / Add Missing Info / Edit Price)
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
      text: "✏️ Edit Full Booking",
      callback_data: `edit_full:${draftId}`,
    },
  ]);

  const row3: any[] = [];
  if (booking.client_notes) {
    row3.push({
      text: "📝 Edit Notes",
      callback_data: `edit_notes:${draftId}`,
    });
  }
  if (booking.missing_fields.length > 0) {
    row3.push({
      text: "➕ Add Missing Info",
      callback_data: `add_info:${draftId}`,
    });
  }
  if (booking.finance.total_price === null && booking.finance.suggested_price) {
    row3.push({
      text: `💶 Confirm €${booking.finance.suggested_price}`,
      callback_data: `set_price:${draftId}:${booking.finance.suggested_price}`,
    });
  } else if (!booking.client_notes || booking.missing_fields.length === 0) {
    row3.push({
      text: "💶 Edit Price",
      callback_data: `edit_price:${draftId}`,
    });
  }
  if (row3.length > 0) {
    buttons.push(row3);
  }

  return {
    text: lines.join("\n"),
    replyMarkup: { inline_keyboard: buttons },
  };
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
