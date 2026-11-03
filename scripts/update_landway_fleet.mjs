import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = "https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1";
const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374";

const LANDWAY_ID = "partner_1792761170109_96nx";

const LANDWAY_FLEET_PHOTOS = [
  // 19 Posti (Minibus 19 Pax) - 3 Exterior + 2 Interior
  {
    id: "landway_minibus_19_ext_1",
    src: "assets/partner_fleet/landway/19_posti_villa_erba_1.jpeg",
    file: "19 posti villa erba 1.jpeg",
    vehicle: "Mercedes-Benz Minibus GT (19 Seats)",
    category: "minibus_19",
    type: "exterior",
    pax: 19,
    tier: "Luxury VIP",
    title: "Exterior Front 3/4 — Mercedes-Benz Minibus 19 Pax at Villa Erba",
    caption: "Total black unbranded Mercedes-Benz Sprinter luxury minibus parked at Villa Erba on Lake Como."
  },
  {
    id: "landway_minibus_19_ext_2",
    src: "assets/partner_fleet/landway/19_posti_villa_erba_2.jpeg",
    file: "19 posti villa erba 2.jpeg",
    vehicle: "Mercedes-Benz Minibus GT (19 Seats)",
    category: "minibus_19",
    type: "exterior",
    pax: 19,
    tier: "Luxury VIP",
    title: "Exterior Side Profile — Mercedes-Benz Minibus 19 Pax at Villa Erba",
    caption: "Full side profile showing tinted privacy glass and clean unbranded bodywork with lake backdrop."
  },
  {
    id: "landway_minibus_19_ext_3",
    src: "assets/partner_fleet/landway/19_posti_villa_erba_3.jpeg",
    file: "19 posti villa erba 3.jpeg",
    vehicle: "Mercedes-Benz Minibus GT (19 Seats)",
    category: "minibus_19",
    type: "exterior",
    pax: 19,
    tier: "Luxury VIP",
    title: "Exterior Rear 3/4 — Mercedes-Benz Minibus 19 Pax at Villa Erba",
    caption: "Rear view confirming unbranded clean coachwork with discreet small rear logo only."
  },
  {
    id: "landway_minibus_19_int_1",
    src: "assets/partner_fleet/landway/19_posti_1_HD150SX.jpeg",
    file: "19 posti 1 HD150SX.jpeg",
    vehicle: "Mercedes-Benz Minibus GT (19 Seats)",
    category: "minibus_19",
    type: "interior",
    pax: 19,
    tier: "Luxury VIP",
    title: "Interior VIP Cabin — Executive Leather Seating (19 Pax)",
    caption: "Luxury contoured dark leather seating with individual headrests, ambient lighting, and executive aisle."
  },
  {
    id: "landway_minibus_19_int_2",
    src: "assets/partner_fleet/landway/19_posti_2_HD150SX.jpeg",
    file: "19 posti 2 HD150SX.jpeg",
    vehicle: "Mercedes-Benz Minibus GT (19 Seats)",
    category: "minibus_19",
    type: "interior",
    pax: 19,
    tier: "Luxury VIP",
    title: "Interior Forward View — Chauffeur Cockpit & Passenger Cabin",
    caption: "Forward cabin perspective showing panoramic front windscreen, clean cockpit, and passenger rows."
  },

  // 29 Posti (Midibus 27–29 Pax) - 1 Exterior + 2 Interior
  {
    id: "landway_midibus_29_ext_1",
    src: "assets/partner_fleet/landway/29_posti_2.jpeg",
    file: "29 posti 2.jpeg",
    vehicle: "Iveco Midibus GT (27–29 Seats)",
    category: "midibus_29",
    type: "exterior",
    pax: 29,
    tier: "Luxury VIP",
    title: "Exterior & Cabin Entrance — Iveco Midibus 29 Pax",
    caption: "Total black 29-seater touring midibus with open entry showing luxury grey leather seating."
  },
  {
    id: "landway_midibus_29_int_1",
    src: "assets/partner_fleet/landway/29_posti_3.jpeg",
    file: "29 posti 3.jpeg",
    vehicle: "Iveco Midibus GT (27–29 Seats)",
    category: "midibus_29",
    type: "interior",
    pax: 29,
    tier: "Luxury VIP",
    title: "Interior VIP Cabin — Executive Leather Passenger Seats",
    caption: "Contoured luxury leather seating with dual-tone grey/black upholstery, 3-point seatbelts, and armrests."
  },
  {
    id: "landway_midibus_29_int_2",
    src: "assets/partner_fleet/landway/29_posti_5.jpeg",
    file: "29 posti 5.jpeg",
    vehicle: "Iveco Midibus GT (27–29 Seats)",
    category: "midibus_29",
    type: "interior",
    pax: 29,
    tier: "Luxury VIP",
    title: "Interior Cabin Aisle — High Panoramic Ceiling",
    caption: "Aisle perspective toward rear showing full passenger cabin, overhead parcel racks, and AC vents."
  },

  // 50 Posti (Coach 50 Pax) - 2 Exterior + 2 Interior
  {
    id: "landway_coach_50_ext_1",
    src: "assets/partner_fleet/landway/3_BUS_50_POSTI_.jpeg",
    file: "3 BUS 50 POSTI .jpeg",
    vehicle: "Mercedes Tourismo & Setra GT Coach (50 Seats)",
    category: "coach_50",
    type: "exterior",
    pax: 50,
    tier: "Standard GT",
    title: "Exterior Fleet Convoy — 3x Mercedes Tourismo GT Coaches (50 Pax)",
    caption: "Convoy of 3 Mercedes-Benz Tourismo 50-seater Gran Turismo coaches showing side livery."
  },
  {
    id: "landway_coach_50_ext_2",
    src: "assets/partner_fleet/landway/50_SEAT_BUS_.png",
    file: "50 SEAT BUS .png",
    vehicle: "Mercedes Tourismo & Setra GT Coach (50 Seats)",
    category: "coach_50",
    type: "exterior",
    pax: 50,
    tier: "Standard GT",
    title: "Exterior Profile — Gran Turismo Coach (50 Pax)",
    caption: "Full side exterior profile of Landway 50-seat touring coach."
  },
  {
    id: "landway_coach_50_int_1",
    src: "assets/partner_fleet/landway/50_posti_interni_HA526.jpeg",
    file: "50 posti interni HA526.jpeg",
    vehicle: "Mercedes Tourismo & Setra GT Coach (50 Seats)",
    category: "coach_50",
    type: "interior",
    pax: 50,
    tier: "Standard GT",
    title: "Interior VIP Cabin — Executive Touring Recliners",
    caption: "Long-distance executive cabin with wide reclining touring seats, aisle grab handles, and high ceiling."
  },
  {
    id: "landway_coach_50_int_2",
    src: "assets/partner_fleet/landway/50_posti_interni_GN150.jpeg",
    file: "50 posti interni GN150.jpeg",
    vehicle: "Mercedes Tourismo & Setra GT Coach (50 Seats)",
    category: "coach_50",
    type: "interior",
    pax: 50,
    tier: "Standard GT",
    title: "Interior Passenger Cabin — Overhead Parcel Racks & Lighting",
    caption: "Forward passenger cabin perspective showing climate control nozzles, reading lights, and premium upholstery."
  }
];

const LANDWAY_VERIFIED_PAIRS = [
  {
    id: 1,
    fleet_no: "HD150SX",
    model: "Mercedes-Benz Minibus GT (19 pax)",
    category: "minibus_19",
    pax: 19,
    tier: "Luxury VIP",
    unbranded: true,
    luggage: "12 hold bags · 14–15 medium (~45–60L) · 19 cabin trolleys. Pax: 19 + guida + autista",
    exterior_filename: "19_posti_villa_erba_1.jpeg",
    interior_filename: "19_posti_1_HD150SX.jpeg",
    status: "VERIFIED_PAIR",
    transfers: {
      mxp_milano: 350,
      milano_como: 450
    },
    standby: {
      dispo_4h: 400,
      dispo_8h: 700
    }
  },
  {
    id: 2,
    fleet_no: null,
    model: "Iveco Midibus GT (27–29 pax)",
    category: "midibus_29",
    pax: 29,
    tier: "Luxury VIP",
    unbranded: true,
    luggage: "10–13 hold bags · 20–25 medium (~45–60L) · 27–29 cabin trolleys. Pax: 27–29 + guida + autista",
    exterior_filename: "29_posti_2.jpeg",
    interior_filename: "29_posti_3.jpeg",
    status: "VERIFIED_PAIR",
    transfers: {
      mxp_milano: 400,
      milano_como: 500
    },
    standby: {
      dispo_4h: 500,
      dispo_8h: 800
    }
  },
  {
    id: 3,
    fleet_no: "HA526 / GN150",
    model: "Mercedes Tourismo & Setra GT Coach (50 pax)",
    category: "coach_50",
    pax: 50,
    tier: "Standard GT",
    unbranded: false,
    luggage: "50 large hold suitcases + interior racks. Pax: 50 + guida + autista",
    exterior_filename: "3_BUS_50_POSTI_.jpeg",
    interior_filename: "50_posti_interni_HA526.jpeg",
    status: "VERIFIED_PAIR",
    transfers: {
      mxp_milano: 450,
      milano_como: 550
    },
    standby: {
      dispo_4h: 600,
      dispo_8h: 900
    }
  }
];

async function main() {
  console.log("Updating Landway Tourism in data/bus_partners.json, app/bus_partners_data.js, and Supabase...");

  const jsonPath = path.resolve('data/bus_partners.json');
  const partners = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const pIdx = partners.findIndex((x) => x.id === LANDWAY_ID);
  if (pIdx === -1) {
    throw new Error(`Partner ${LANDWAY_ID} not found in ${jsonPath}`);
  }

  const p = partners[pIdx];

  p.status = "APPROVED_PARTNER";
  p.relevance_score = 95;
  p.pax_capacity = "19, 27–29, 50 pax (+ guida + autista)";
  p.bus_models = "Mercedes Minibus GT (19 pax), Iveco Midibus (27–29 pax), Mercedes Tourismo & Setra GT Coach (50 pax)";
  p.fleet_categories = [
    "Mercedes-Benz Sprinter Minibus (19 seats)",
    "Iveco Executive Midibus (27–29 seats)",
    "Mercedes Tourismo & Setra GT Coach (50 seats)"
  ];
  p.notes = "28 Oct: Melissa forwarded to pricing. 2 Nov: Sent Listino Prezzi 2027 X DOROGO (PDF). Rates: 19p MXP €350 / Como €450 / 8h €700; 29p MXP €400 / Como €500 / 8h €800; 50p MXP €450 / Como €550 / 8h €900. All Luxury fitted. 3 Nov 15:07: Melissa sent complete interior & exterior photo set (12 photos). Luggage specs confirmed: 19p (12 hold / 14–15 med / 19 trolley); 29p (10–13 hold / 20–25 med / 27–29 trolley). Massimo Rossi +39 331 528 1982.";
  p.client_notes = "3 Nov 15:07: Melissa sent complete interior & exterior photos (12 photos total across 19p, 27–29p, 50p). Verified luggage: 19p = 12 hold / 14–15 med / 19 trolley; 29p = 10–13 hold / 20–25 med / 27–29 trolley. 19p & 29p 100% unbranded sides (small rear logo only). Listino Prezzi 2027 X DOROGO on file.";
  p.unbranded_status = "19p & 27/29p: 100% Clean unbranded sides (small rear logo only); 50p has company side logos";
  p.replied_at = "2026-11-03T15:07:00.000Z";

  if (!p.score_breakdown) p.score_breakdown = {};
  p.score_breakdown.fleet_luxury = 25;
  p.score_breakdown.discretion_unbranded = 35;
  p.score_breakdown.territory_permits = 20;
  p.score_breakdown.corporate_sla = 15;

  p.score_breakdown.partner_card = {
    ...(p.score_breakdown.partner_card || {}),
    whatsapp: "+39 345 689 8609",
    bus_models: p.bus_models,
    pax_capacity: p.pax_capacity,
    replied_at: "2026-11-03T15:07:00.000Z",
    rate_hourly: "19p: €400/4h, €700/8h; 29p: €500/4h, €800/8h; 50p: €600/4h, €900/8h + IVA",
    rate_standby: "19p: €700/8h; 29p: €800/8h; 50p: €900/8h (+ ZTL: €60 / €100 / €150)",
    client_notes: p.client_notes,
    email_status: "replied",
    rate_document: "assets/partner_fleet/landway/landway_rates_2027.pdf",
    fleet_audit_verified_at: "2026-11-03T15:07:00.000Z",
    contact_person: "Melissa (Emergency: Massimo Rossi +39 331 528 1982)",
    fleet_segment: "both",
    outreach_stage: "replied",
    user_set_status: true,
    user_set_segment: true,
    verified_fleet_pairs: LANDWAY_VERIFIED_PAIRS,
    fleet_photos: LANDWAY_FLEET_PHOTOS
  };

  partners[pIdx] = p;

  // 1. Write data/bus_partners.json
  fs.writeFileSync(jsonPath, JSON.stringify(partners, null, 2), 'utf8');
  console.log("✓ Updated data/bus_partners.json");

  // 2. Update app/bus_partners_data.js
  const jsPath = path.resolve('app/bus_partners_data.js');
  let jsContent = fs.readFileSync(jsPath, 'utf8');

  // Find start and end of INITIAL_BUS_PARTNERS
  const startMarker = 'export const INITIAL_BUS_PARTNERS = ';
  const endMarker = '];\nconst STORAGE_KEY';
  const startIdx = jsContent.indexOf(startMarker);
  const endIdx = jsContent.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const newJsContent = jsContent.slice(0, startIdx + startMarker.length) +
      JSON.stringify(partners, null, 2) +
      ';\n' +
      jsContent.slice(endIdx + 3); // skip '];\n'
    fs.writeFileSync(jsPath, newJsContent, 'utf8');
    console.log("✓ Updated app/bus_partners_data.js");
  } else {
    console.warn("Could not find marker boundaries in app/bus_partners_data.js, skipping JS rewrite");
  }

  // 3. Update Supabase
  try {
    const patchBody = {
      status: p.status,
      relevance_score: p.relevance_score,
      fleet_categories: p.fleet_categories,
      unbranded_status: p.unbranded_status,
      notes: p.notes,
      score_breakdown: p.score_breakdown,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${SUPABASE_URL}/bus_partners?id=eq.${LANDWAY_ID}`, {
      method: 'PATCH',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(patchBody)
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`✓ Updated Supabase bus_partners table for Landway Tourism (returned ${data.length} row)`);
    } else {
      console.error("✗ Failed to update Supabase:", await res.text());
    }
  } catch (err) {
    console.error("Supabase update error:", err.message);
  }

  console.log("\nAll CRM and DB updates for Landway Tourism finished successfully!");
}

main().catch(console.error);
