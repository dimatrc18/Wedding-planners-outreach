// Default verified seed data for luxury bus & minibus partners in Northern Italy
import { calculateBusRelevanceScore, verifyPerBusPaxCapacity } from '../supabase/functions/_shared/core/index.js';

export const INITIAL_BUS_PARTNERS = [
  {
    "id": "partner_cima_luxury",
    "name": "Cima Luxury",
    "base_city": "Roma (Central Italy)",
    "website": "https://cimaluxury.com",
    "fleet_url": "https://cimaluxury.com/luxury-bus/",
    "relevance_score": 0,
    "score_breakdown": {
      "discretion_unbranded": 32,
      "fleet_luxury": 22,
      "territory_permits": 0,
      "corporate_sla": 16,
      "partner_card": {
        "bus_models": "Minibus VIP (9–20 pax), Setra 411 HD (28 pax), Neoplan Starliner Limobus (30 pax), Bus Gran Turismo (80 pax)",
        "pax_capacity": "9–20, 28, 30, 80 pax",
        "fleet_segment": "luxury",
        "fleet_audit_verified_at": "2026-10-26T18:25:11.586Z"
      }
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "Unbranded Luxury Line",
    "fleet_segment": "luxury",
    "fleet_categories": [
      "Minibus VIP (9–20 seats)",
      "Setra 411 HD Bus di Lusso (28 seats)",
      "Neoplan Starliner Limobus (30 seats)",
      "Bus Gran Turismo (80 seats)"
    ],
    "phone": "+39 06 35 34 83 45",
    "email": "info@cimalimousine.com",
    "notes": "Headquartered at Waldorf Astoria Rome Cavalieri (00136 Rome). Out-of-region depot (+39 06) located 570km from Milan/Lake Como with no local Lombardy depot. Disqualified from local Northern Italy dispatch.",
    "bus_models": "Minibus VIP (9–20 pax), Setra 411 HD (28 pax), Neoplan Starliner Limobus (30 pax), Bus Gran Turismo (80 pax)",
    "pax_capacity": "9–20, 28, 30, 80 pax"
  },
  {
    "id": "partner_moveolux",
    "name": "Moveolux",
    "base_city": "Milano",
    "website": "https://www.moveolux.com",
    "fleet_url": "https://www.moveolux.com/fleet/luxury-bus-hire/",
    "relevance_score": 98,
    "score_breakdown": {
      "discretion_unbranded": 35,
      "fleet_luxury": 25,
      "territory_permits": 20,
      "corporate_sla": 18,
      "partner_card": {
        "bus_models": "Mercedes Sprinter VIP (16 & 19 pax), Limobus Exclusive (18 pax), Setra VIP Lounge Coach (30 pax)",
        "pax_capacity": "16, 18, 19, 30 pax",
        "fleet_segment": "luxury",
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      }
    },
    "status": "APPROVED_PARTNER",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Limobus Exclusive (18 seats)",
      "Mercedes Sprinter VIP (16 & 19 seats)",
      "Setra VIP Lounge Coach (30 seats)"
    ],
    "phone": "+39 02 4004 7799",
    "email": "booking@moveolux.com",
    "notes": "Pioneer of Limobus. Lounge seating, bar, hostess, champagne service. Highest price in Italy, but gold standard for ultra-VIP.",
    "bus_models": "Mercedes Sprinter VIP (16 & 19 pax), Limobus Exclusive (18 pax), Setra VIP Lounge Coach (30 pax)",
    "pax_capacity": "16, 18, 19, 30 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1792765278957_tgxp",
    "name": "Vivaldi Driver Bellagio",
    "base_city": "Como",
    "website": "https://i-vivaldi.com",
    "fleet_url": "https://i-vivaldi.com/parco-auto/",
    "relevance_score": 94,
    "score_breakdown": {
      "fleet_luxury": 24,
      "partner_card": {
        "whatsapp": "+39 347 373 5465",
        "bus_models": "Mercedes-Benz Sprinter VIP (8 pax), Mercedes Sprinter Nero VIP w/ Hostess (19 pax), Mercedes Classe V (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8, 19 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T12:30:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz Classe V (7 seats)",
      "Mercedes-Benz Sprinter VIP (8 seats)",
      "Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 seats)"
    ],
    "phone": "+39 347 373 5465",
    "email": "info@i-vivaldi.com",
    "notes": "- do they have only 19 seats  or other \n- prices",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:18.957+00:00",
    "updated_at": "2026-10-26T16:45:24.938104+00:00",
    "bus_models": "Mercedes-Benz Sprinter VIP (8 pax), Mercedes Sprinter Nero VIP w/ Hostess (19 pax), Mercedes Classe V (7 pax)",
    "pax_capacity": "7, 8, 19 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_vip_limousine",
    "name": "VIP Limousine Milan",
    "base_city": "Milano",
    "website": "https://www.viplimousine.it",
    "fleet_url": "https://www.viplimousine.it/auto-di-lusso-con-conducente/pullman-di-lusso",
    "relevance_score": 94,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 02 546 5555",
        "bus_models": "Mercedes Sprinter 315 Luxury (8 pax), Mercedes Sprinter 519 Tomassini Luxury (16 pax), Pullman di Lusso (21, 28, 30, 56, 64, 79 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "invalid",
        "pax_capacity": "7, 8, 16, 21, 28, 30, 56, 64, 79 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T09:30:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "fleet_categories": [
      "Mercedes Classe V (7 seats)",
      "Mercedes Sprinter 315 Luxury (8 seats)",
      "Mercedes Sprinter 519 Tomassini Luxury (16 seats)",
      "Pullman di Lusso (21, 28, 30, 56, 64, 79 seats)"
    ],
    "phone": "+39 02 546 5555",
    "email": "info@viplimousine.it",
    "notes": "i am interested in the Luxury Minibus, but i wonder if they have other ones too?",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:27.325941+00:00",
    "bus_models": "Mercedes Sprinter 315 Luxury (8 pax), Mercedes Sprinter 519 Tomassini Luxury (16 pax), Pullman di Lusso (21, 28, 30, 56, 64, 79 pax)",
    "pax_capacity": "7, 8, 16, 21, 28, 30, 56, 64, 79 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1793031479651_9_4o1d",
    "name": "Viganò Autoservizi",
    "base_city": "Como / Lecco",
    "website": "https://www.viganobus.com",
    "fleet_url": "https://www.viganobus.com/flotta/",
    "relevance_score": 94,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 031 690617",
        "bus_models": "Mercedes Sprinter (22 pax), Sprinter Grande Capri (19 pax), Setra 515 (51 pax), Mercedes Tourismo (53–55 pax), Mercedes Travego (53 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "19, 22, 51, 53–55 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T10:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Sprinter (22 seats)",
      "Sprinter Grande Capri (19 seats)",
      "Setra 515 (51 seats)",
      "Mercedes Tourismo (53–55 seats)",
      "Mercedes Travego (53 seats)"
    ],
    "phone": "+39 031 690617",
    "email": "info@viganobus.com",
    "notes": "- i am interested  SPRINTER 22 POSTI , SPRINTER GRANDE CAPRI (18). \n- Additionally, in Caratteristiche Tecniche (50 seater) also on 52 seats",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:00.988076+00:00",
    "bus_models": "Mercedes Sprinter (22 pax), Sprinter Grande Capri (19 pax), Setra 515 (51 pax), Mercedes Tourismo (53–55 pax), Mercedes Travego (53 pax)",
    "pax_capacity": "19, 22, 51, 53–55 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_12_2dpf",
    "name": "Rampinini Turismo",
    "base_city": "Como / Fino Mornasco",
    "website": "https://www.rampinini.it",
    "fleet_url": "https://www.rampinini.it/flotta/",
    "relevance_score": 94,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 031 928 111",
        "bus_models": "Mercedes Sprinter (8 pax), Temsa Wing / Iveco Midibus (25–28 pax), Scania Touring & Iveco Magelys GT (54–56 pax), Van Hool Astromega (86 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "8, 25–28, 54–56, 86 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T10:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Sprinter (8 seats)",
      "Temsa Wing / Iveco Midibus (25–28 seats)",
      "Scania Touring & Iveco Magelys GT Coach (54–56 seats)",
      "Van Hool Astromega Double-Decker (86 seats)"
    ],
    "phone": "+39 031 928 111",
    "email": "info@rampinini.it",
    "notes": "Interested only in WING | IVECO 28 seats? and of they have other ones with no big stickers?",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:00.491801+00:00",
    "bus_models": "Mercedes Sprinter (8 pax), Temsa Wing / Iveco Midibus (25–28 pax), Scania Touring & Iveco Magelys GT (54–56 pax), Van Hool Astromega (86 pax)",
    "pax_capacity": "8, 25–28, 54–56, 86 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765279410_2zml",
    "name": "Como Limo Lux",
    "base_city": "Como",
    "website": "https://comolimolux.com",
    "fleet_url": "https://comolimolux.com/tour-privati-minivan-lago-di-como/",
    "relevance_score": 93,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 346 7039569",
        "bus_models": "Mercedes-Benz V-Class Luxury Minivan (7 pax)",
        "replied_at": "2026-10-27T16:17:00.000Z",
        "rate_hourly": "",
        "client_notes": "Stefano Carnevale (27 Oct): Only 1x Mercedes V-Class (7p), no 8–50p buses. Saved for V-Class overflow; asked for 8–50p referral.",
        "email_status": "mx_ok",
        "pax_capacity": "7 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T12:00:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "replied",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": "2026-10-28T13:18:00.000Z",
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z",
        "contact_person": "Stefano Carnevale"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "CONTACTED",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz V-Class Luxury Minivan (7 seats)"
    ],
    "phone": "+39 346 7039569",
    "email": "info@comolimolux.com",
    "notes": "1. i am interested to know how much for transfer (milan -> MXP) and stand by service for a) Mercedes sprinter 20 posti, b) Irizar 52 posti",
    "client_notes": "Stefano Carnevale (27 Oct): dispone solo di 1x Mercedes Classe V (7 posti), non ha bus/minibus 8-50 posti. Contatto salvato (+39 346 7039569) per overflow Classe V; inviata richiesta contatto colleghi per 8-50 pax.",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.41+00:00",
    "updated_at": "2026-10-28T13:18:00.000+00:00",
    "bus_models": "Mercedes-Benz V-Class Luxury Minivan (7 pax)",
    "pax_capacity": "7 pax",
    "fleet_segment": "luxury",
    "contact_person": "Stefano Carnevale",
    "whatsapp": "+39 346 7039569",
    "outreach_stage": "replied",
    "replied_at": "2026-10-27T16:17:00.000Z",
    "last_outreach_at": "2026-10-28T13:18:00.000Z"
  },
  {
    "id": "partner_1792761170109_96nx",
    "name": "Landway Tourism",
    "base_city": "Como",
    "website": "https://www.landwaytourism.com",
    "fleet_url": "https://www.landwaytourism.com/flotta/",
    "relevance_score": 93,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 031 513 189",
        "bus_models": "Minibus GT (20 pax), Iveco Midibus (30 pax), Mercedes Tourismo & Setra GT (50 pax)",
        "replied_at": "2026-10-28T10:14:07.000Z",
        "rate_hourly": "",
        "client_notes": "Melissa (28 Oct): Forwarded our B2B partnership inquiry to fleet pricing department; rates arriving shortly.",
        "email_status": "mx_ok",
        "pax_capacity": "20, 30, 50 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T09:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "replied",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": "2026-10-27T10:00:00.000Z",
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z",
        "contact_person": "Melissa"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "CONTACTED",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Minibus GT (20 seats)",
      "Iveco Midibus (30 seats)",
      "Mercedes Tourismo & Setra GT Coach (50 seats)"
    ],
    "phone": "+39 031 513 189",
    "email": "info@landwaytourism.com",
    "notes": "1. i am interested in the prices of the Iveco (29 passengers) - how much is it standby service and transfer (e,g, MXP -> milan Central)\n2. The same thing for Mercedes Sprinter (19 passagers).\n3.  the same for the 50 seaters?",
    "client_notes": "Melissa (28 Oct): Forwarded our B2B partnership request to their fleet pricing department; rates arriving shortly.",
    "source": "crawler",
    "created_at": "2026-10-23T13:12:50.109+00:00",
    "updated_at": "2026-10-28T13:18:00.000+00:00",
    "bus_models": "Minibus GT (20 pax), Iveco Midibus (30 pax), Mercedes Tourismo & Setra GT (50 pax)",
    "pax_capacity": "20, 30, 50 pax",
    "fleet_segment": "both",
    "outreach_stage": "replied",
    "replied_at": "2026-10-28T10:14:07.000Z",
    "contact_person": "Melissa"
  },
  {
    "id": "partner_1792765278630_r4vp",
    "name": "Berini Autonoleggio & Minibus",
    "base_city": "Como",
    "website": "https://www.beriniautonoleggio.com",
    "fleet_url": "https://www.beriniautonoleggio.com/vip-services/",
    "relevance_score": 92,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 031 976 430",
        "bus_models": "Mercedes Minibus Extralong Luxury (8 pax), Executive Minibus (20 pax), Executive Midibus (26 pax), Mercedes Classe V (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8, 20, 26 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T09:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Classe V VIP (7 seats)",
      "Mercedes Minibus Extralong Luxury (8 seats)",
      "Executive Minibus (20 seats)",
      "Executive Midibus (26 seats)"
    ],
    "phone": "+39 031 976 430",
    "email": "berini@beriniautonoleggio.com",
    "notes": "- I am interested in his minibus, minibus extra-long, bus 20 seater, bus 26 seater\n- their prices for stand-by and hourly?\n- Other buses that they have but did not add to the website?",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:18.63+00:00",
    "updated_at": "2026-10-26T16:45:23.562317+00:00",
    "bus_models": "Mercedes Minibus Extralong Luxury (8 pax), Executive Minibus (20 pax), Executive Midibus (26 pax), Mercedes Classe V (7 pax)",
    "pax_capacity": "7, 8, 20, 26 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479649_0_atcl",
    "name": "Cavourese",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.cavourese.it",
    "fleet_url": "https://www.cavourese.it/it/noleggio-autobus",
    "relevance_score": 92,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 011 397 0000",
        "bus_models": "Minivan NCC (16 pax), Minibus (35 pax), Autobus GT (63 pax), Autobus Doppio Piano (79 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "16, 35, 63, 79 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T12:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Minivan NCC (16 seats)",
      "Minibus (35 seats)",
      "Autobus Gran Turismo (63 seats)",
      "Autobus Doppio Piano (79 seats)"
    ],
    "phone": "+39 011 397 0000",
    "email": "info@cavourese.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.649+00:00",
    "updated_at": "2026-10-26T17:48:01.251727+00:00",
    "bus_models": "Minivan NCC (16 pax), Minibus (35 pax), Autobus GT (63 pax), Autobus Doppio Piano (79 pax)",
    "pax_capacity": "16, 35, 63, 79 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_11_r6tm",
    "name": "Morandi Tour",
    "base_city": "Varese / Malpensa",
    "website": "https://www.moranditour.it",
    "fleet_url": "https://www.moranditour.it/flotta/",
    "relevance_score": 92,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 0332 287146",
        "bus_models": "Minibus GT (8–19 pax), Midibus (25–35 pax), Mercedes Tourismo & Setra GT (54–85 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "8–19, 25–35, 54–85 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T11:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Minibus GT (8–19 seats)",
      "Midibus (25–35 seats)",
      "Mercedes Tourismo & Setra GT (54–85 seats)"
    ],
    "phone": "+39 0332 287146",
    "email": "info@moranditour.it",
    "notes": "interested in Mercedes Sprinter (is it 22 seats for passagers), Mercedes 20 (the same question), Mercedes Tourismo and is the price of the last one, is it very different from SETRA 5, Neoplan Cityliner Grey 52, Irisbus",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:01.453107+00:00",
    "bus_models": "Minibus GT (8–19 pax), Midibus (25–35 pax), Mercedes Tourismo & Setra GT (54–85 pax)",
    "pax_capacity": "8–19, 25–35, 54–85 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765279743_bk0p",
    "name": "Exclusive Cars Milano",
    "base_city": "Milano",
    "website": "https://exclusivecarsmilano.it",
    "fleet_url": "https://exclusivecarsmilano.it/noleggio-autobus/",
    "relevance_score": 92,
    "score_breakdown": {
      "fleet_luxury": 24,
      "partner_card": {
        "whatsapp": "+39 02 4070 8295",
        "bus_models": "Mercedes-Benz Sprinter Minibus (20 pax), Mercedes-Benz Classe V (7 pax), Irizar GT Coach (52 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 20, 52 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T13:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz Classe V (7 seats)",
      "Mercedes-Benz Sprinter Minibus (20 seats)",
      "Irizar GT Coach (52 seats)"
    ],
    "phone": "+39 02 4070 8295",
    "email": "info@exclusivecarsmilano.it",
    "notes": "interested in Mercedes sprinter 20 posti and Irizar 52 posti",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.743+00:00",
    "updated_at": "2026-10-26T16:45:27.661611+00:00",
    "bus_models": "Mercedes-Benz Sprinter Minibus (20 pax), Mercedes-Benz Classe V (7 pax), Irizar GT Coach (52 pax)",
    "pax_capacity": "7, 20, 52 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_transervice",
    "name": "Transervice Limousine",
    "base_city": "Milano",
    "website": "https://www.transervicelimousine.com",
    "fleet_url": "https://www.transervicelimousine.com/la-flotta/",
    "relevance_score": 91,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 02 8951 6852",
        "bus_models": "Mercedes Sprinter Luxury (8 pax), Mercedes \"Alis\" Custom VIP Bus (19 pax), Mercedes Classe V (7 pax), Pullman Lusso (16–75 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8, 19, 16–75 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T11:30:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 18,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Classe V (7 seats)",
      "Mercedes Sprinter Luxury Minibus (8 seats)",
      "Mercedes \"Alis\" Custom VIP Bus (19 seats)",
      "Pullman Lusso GT (16–75 seats)"
    ],
    "phone": "+39 02 8951 6852",
    "email": "info@transervicelimousine.com",
    "notes": "- They have minibuses, sprinters, and turismo, but no idea how many people fit?",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:24.500487+00:00",
    "bus_models": "Mercedes Sprinter Luxury (8 pax), Mercedes \"Alis\" Custom VIP Bus (19 pax), Mercedes Classe V (7 pax), Pullman Lusso (16–75 pax)",
    "pax_capacity": "7, 8, 19, 16–75 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1792765279535_l9ei",
    "name": "Avantgarde Limousine Service",
    "base_city": "Milano",
    "website": "https://www.avantgardelimousineservice.it",
    "fleet_url": "https://www.avantgardelimousineservice.it/mezzi/",
    "relevance_score": 91,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 333 2697376",
        "bus_models": "Mercedes Sprinter VIP (8 pax), Mercedes Minibus (16 pax), Mercedes Minibus VIP Class (18 pax), Executive Midibus (25 pax)",
        "replied_at": "2026-10-28T12:05:00.000Z",
        "rate_hourly": "",
        "client_notes": "Vincent Lombardi (28 Oct): Milan-based; MXP->Como uncompetitive due to empty Milan->MXP positioning leg. Replied requesting Milan-origin rates & disposal.",
        "email_status": "mx_ok",
        "pax_capacity": "7–8, 8, 16, 18, 25 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T11:00:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "replied",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": "2026-10-28T13:18:00.000Z",
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z",
        "contact_person": "Vincent Lombardi (Avantgarde Service)"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "CONTACTED",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Classe V (7–8 seats)",
      "Mercedes Sprinter VIP (8 seats)",
      "Mercedes Minibus (16 seats)",
      "Mercedes Minibus VIP Class (18 seats)",
      "Executive Midibus (25 seats)"
    ],
    "phone": "+39 333 2697376",
    "email": "info@milanocab.it",
    "notes": "- Confirm whether they do not have stickers on cars?\n- i see they have 3 different ones, i want to know the prices/how many people the fit?",
    "client_notes": "Vincent Lombardi (28 Oct): Base a Milano; non competitivi su Malpensa–Como per vuoto Milano->MXP. Inviata risposta per tariffe partenze Milano città o disposizione.",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.535+00:00",
    "updated_at": "2026-10-28T13:18:00.000+00:00",
    "bus_models": "Mercedes Sprinter VIP (8 pax), Mercedes Minibus (16 pax), Mercedes Minibus VIP Class (18 pax), Executive Midibus (25 pax)",
    "pax_capacity": "7–8, 8, 16, 18, 25 pax",
    "fleet_segment": "luxury",
    "outreach_stage": "replied",
    "replied_at": "2026-10-28T12:05:00.000Z",
    "last_outreach_at": "2026-10-28T13:18:00.000Z",
    "contact_person": "Vincent Lombardi (Avantgarde Service)"
  },
  {
    "id": "partner_1793031479651_1_wjsp",
    "name": "Castano Turismo",
    "base_city": "Varese / Malpensa",
    "website": "https://www.castanobus.it",
    "fleet_url": "https://www.castanobus.it/flotta/",
    "relevance_score": 91,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 0332 830 000",
        "bus_models": "Minibus (8 pax), Autobus Minibus (20 pax), Midibus (36 pax), Pullman Gran Turismo (52–54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "4, 8, 20, 36, 52–54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T07:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Auto NCC (4 seats)",
      "Minibus (8 seats)",
      "Autobus Minibus (20 seats)",
      "Midibus (36 seats)",
      "Pullman Gran Turismo (52–54 seats)"
    ],
    "phone": "+39 0332 830 000",
    "email": "info@castanobus.it",
    "notes": "I am interested in Minibus 8 posti, Autobus 20 posti, Autobus 36 posti and Autobus 52/54 posti.",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:01.106929+00:00",
    "bus_models": "Minibus (8 pax), Autobus Minibus (20 pax), Midibus (36 pax), Pullman Gran Turismo (52–54 pax)",
    "pax_capacity": "4, 8, 20, 36, 52–54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_13_f82y",
    "name": "Autoservizi Cazzaniga Silvestro",
    "base_city": "Lecco / Como / Monza",
    "website": "https://www.autoservizicazzaniga.it",
    "fleet_url": "https://www.autoservizicazzaniga.it/parco-mezzi",
    "relevance_score": 91,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 031 850 144",
        "bus_models": "VW Caravelle (8 pax), Mercedes Capri (20 pax), Irizar MAN Century Midibus (40 pax), Setra & Mercedes Tourismo GT Coaches (52–60 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "8, 20, 40, 52–60 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T12:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "VW Caravelle (8 seats)",
      "Mercedes Capri (20 seats)",
      "Irizar MAN Century Midibus (40 seats)",
      "Setra & Mercedes Tourismo GT Coaches (52–60 seats)"
    ],
    "phone": "+39 031 850 144",
    "email": "info@autoservizicazzaniga.it",
    "notes": "only ask about 54 seater bus, and if they have other more luxury?",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:01.649175+00:00",
    "bus_models": "VW Caravelle (8 pax), Mercedes Capri (20 pax), Irizar MAN Century Midibus (40 pax), Setra & Mercedes Tourismo GT Coaches (52–60 pax)",
    "pax_capacity": "8, 20, 40, 52–60 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765279097_26hr",
    "name": "Como Driver Services",
    "base_city": "Como",
    "website": "https://www.comodriver.com",
    "fleet_url": "https://www.comodriver.com/autovetture/",
    "relevance_score": 95,
    "score_breakdown": {
      "fleet_luxury": 25,
      "partner_card": {
        "whatsapp": "+39 320 72 70 552",
        "bus_models": "Mercedes Sprinter 12 pax (Luxury VIP Tomassini), Ford Transit Minibus 16 pax (Standard Shuttle)",
        "replied_at": "2026-10-28T09:22:36.000Z",
        "rate_hourly": "€100/h extra · MXP €350 (12p) / €400 (16p) · Milano/LIN €400/€450",
        "client_notes": "Salvatore Calzolaio (28 Oct): Sent DORONGO 2027.pdf + 7 photos (4x Sprinter 12p Luxury Black, 3x Ford Transit 16p White).",
        "email_status": "mx_ok",
        "pax_capacity": "12, 16 pax",
        "rate_standby": "4h (100km): €500 · 8h (200km): €900 (+10% IVA)",
        "scheduled_at": "2026-10-27T10:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "replied",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": "2026-10-28T13:18:00.000Z",
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-28T09:22:00.000Z",
        "contact_person": "Salvatore Calzolaio",
        "rate_document": "assets/partner_fleet/como_driver/como_driver_rates_2027.pdf",
        "fleet_photos": [
          {
            "id": "sprinter_ext_1",
            "src": "assets/partner_fleet/como_driver/sprinter_12_ext_1.jpg",
            "vehicle": "Mercedes Sprinter (12 Seats)",
            "pax": 12,
            "tier": "Luxury VIP"
          },
          {
            "id": "sprinter_int_1",
            "src": "assets/partner_fleet/como_driver/sprinter_12_int_1.jpg",
            "vehicle": "Mercedes Sprinter (12 Seats)",
            "pax": 12,
            "tier": "Luxury VIP"
          },
          {
            "id": "sprinter_int_2",
            "src": "assets/partner_fleet/como_driver/sprinter_12_int_2.jpg",
            "vehicle": "Mercedes Sprinter (12 Seats)",
            "pax": 12,
            "tier": "Luxury VIP"
          },
          {
            "id": "sprinter_int_3",
            "src": "assets/partner_fleet/como_driver/sprinter_12_int_3.jpg",
            "vehicle": "Mercedes Sprinter (12 Seats)",
            "pax": 12,
            "tier": "Luxury VIP"
          },
          {
            "id": "transit_ext_1",
            "src": "assets/partner_fleet/como_driver/transit_16_ext_villa_erba.jpg",
            "vehicle": "Ford Transit Minibus (16 Seats)",
            "pax": 16,
            "tier": "Standard Shuttle"
          },
          {
            "id": "transit_ext_2",
            "src": "assets/partner_fleet/como_driver/transit_16_ext_2.jpg",
            "vehicle": "Ford Transit Minibus (16 Seats)",
            "pax": 16,
            "tier": "Standard Shuttle"
          },
          {
            "id": "transit_int_1",
            "src": "assets/partner_fleet/como_driver/transit_16_int_1.jpg",
            "vehicle": "Ford Transit Minibus (16 Seats)",
            "pax": 16,
            "tier": "Standard Shuttle"
          }
        ]
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "APPROVED_PARTNER",
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (12 seats)",
      "Ford Transit Minibus (16 seats)"
    ],
    "phone": "+39 320 72 70 552",
    "email": "info@comodriver.com",
    "notes": "interested in Minibus Mercedes Sprinter ( 12 passeggeri), do they have other mini vans?",
    "client_notes": "Salvatore Calzolaio (28 Oct): Sent DORONGO 2027.pdf + 7 photos (4x Sprinter 12p Luxury Black Tomassini, 3x Ford Transit 16p White). MXP €350/€400, LIN/Milano €400/€450, Dispo 4h €500, 8h €900.",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.097+00:00",
    "updated_at": "2026-10-28T13:18:00.000+00:00",
    "bus_models": "Mercedes Sprinter 12 pax (Luxury VIP Tomassini), Ford Transit Minibus 16 pax (Standard Shuttle)",
    "pax_capacity": "12, 16 pax",
    "fleet_segment": "both",
    "contact_person": "Salvatore Calzolaio",
    "whatsapp": "+39 320 72 70 552",
    "outreach_stage": "replied",
    "replied_at": "2026-10-28T09:22:36.000Z",
    "last_outreach_at": "2026-10-28T13:18:00.000Z",
    "rate_hourly": "€100/h extra · MXP €350 (12p) / €400 (16p) · Milano/LIN €400/€450",
    "rate_standby": "4h (100km): €500 · 8h (200km): €900 (+10% IVA)",
    "rate_document": "assets/partner_fleet/como_driver/como_driver_rates_2027.pdf"
  },
  {
    "id": "partner_1792761050695_9k2e",
    "name": "Prestige Car Limousine",
    "base_city": "Milano",
    "website": "https://www.prestigecarlimousine.it",
    "fleet_url": "https://www.prestigecarlimousine.it/car/car-service-milan-luxury-minibus/",
    "relevance_score": 90,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 02 8951 6813",
        "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8 & 16 pax, reclining leather & tables), Mercedes Classe V (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8, 16 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T07:30:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 17,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / NCC Black",
    "fleet_categories": [
      "Mercedes-Benz Classe V (7 seats)",
      "Mercedes-Benz Sprinter Luxury Minibus (8 & 16 seats)"
    ],
    "phone": "+39 02 8951 6813",
    "email": "info@prestigecarlimousine.it",
    "notes": "Interested in their Luxury Minibus. I want to learn more about it",
    "source": "crawler",
    "created_at": "2026-10-23T13:10:50.695+00:00",
    "updated_at": "2026-10-26T17:36:45.561579+00:00",
    "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8 & 16 pax, reclining leather & tables), Mercedes Classe V (7 pax)",
    "pax_capacity": "7, 8, 16 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1793031479651_2_b7ae",
    "name": "Autoservizi Zambetti",
    "base_city": "Brescia / Bergamo",
    "website": "https://www.zambettibus.com",
    "fleet_url": "https://www.zambettibus.com/flotta",
    "relevance_score": 90,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 035 810742",
        "bus_models": "Iveco Daily Tourys Minibus (19 pax), Executive Midibus (28–34 pax), Scania Touring HD & Mercedes Tourismo (54 pax), Double Decker GT (82 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "19, 28–34, 54, 82 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T09:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Iveco Daily Tourys Minibus (19 seats)",
      "Executive Midibus (28–34 seats)",
      "Scania Touring HD & Mercedes Tourismo (54 seats)",
      "Double Decker GT (82 seats)"
    ],
    "phone": "+39 035 810742",
    "email": "info@zambettibus.com",
    "notes": "interested in Mercedes Tourismo 15 RHD (2026 & 2023 models) and Mercedes Tourismo K (midibus)",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:01.572146+00:00",
    "bus_models": "Iveco Daily Tourys Minibus (19 pax), Executive Midibus (28–34 pax), Scania Touring HD & Mercedes Tourismo (54 pax), Double Decker GT (82 pax)",
    "pax_capacity": "19, 28–34, 54, 82 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_14_wrph",
    "name": "Autoservizi Perico",
    "base_city": "Bergamo",
    "website": "https://www.autoserviziperico.com",
    "fleet_url": "https://www.autoserviziperico.com/flotta/",
    "relevance_score": 90,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 035 540302",
        "bus_models": "Mercedes Tourismo & Travego (50–54 pax), Volvo 9700 (52 pax), Irizar i6 & Century (53–55 pax), Minivan NCC (7–8 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "7–8, 50–55 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T09:00:00.000Z",
        "fleet_segment": "standard",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Minivan NCC (7–8 seats)",
      "Mercedes Tourismo & Travego (50–54 seats)",
      "Volvo 9700 (52 seats)",
      "Irizar i6 & Century (53–55 seats)"
    ],
    "phone": "+39 035 540302",
    "email": "info@autoserviziperico.com",
    "notes": "- Interested in a) Mercedes-Benz Travego, b) Volvo 9700 Superior, c) Mercedes-Benz Tourismo, d) Irizar i6\n- Do they have stickers?",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:00.775256+00:00",
    "bus_models": "Mercedes Tourismo & Travego (50–54 pax), Volvo 9700 (52 pax), Irizar i6 & Century (53–55 pax), Minivan NCC (7–8 pax)",
    "pax_capacity": "7–8, 50–55 pax",
    "fleet_segment": "standard"
  },
  {
    "id": "partner_1793031479651_19_75aq",
    "name": "Stat Turismo",
    "base_city": "Piemonte / Milano",
    "website": "https://www.gruppostat.com",
    "fleet_url": "https://www.gruppostat.com/flotta",
    "relevance_score": 90,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 0142 453136",
        "bus_models": "Irizar PB & Century HDH (38–53 pax), Irizar i6 HDH (51–63 pax), Scania & Mercedes GT (50–64 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "38–64 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T10:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Irizar PB & Century HDH (38–53 seats)",
      "Irizar i6 HDH (51–63 seats)",
      "Scania & Mercedes GT Coach (50–64 seats)"
    ],
    "phone": "+39 0142 453136",
    "email": "info@gruppostat.com",
    "notes": "interested in MERCEDES - D'AURIA GRAN CAPRI, IRIZAR PB 12.37 HDH, EVOBUS SETRA S 431 DT, IRISBUS MAGELYS HD (53 posti), SETRA 415 GT-HD & 417 GT-HD",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:40:36.421969+00:00",
    "bus_models": "Irizar PB & Century HDH (38–53 pax), Irizar i6 HDH (51–63 pax), Scania & Mercedes GT (50–64 pax)",
    "pax_capacity": "38–64 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_15_fgcv",
    "name": "Italeurobus",
    "base_city": "Bergamo / Brescia",
    "website": "https://www.italeurobus.it",
    "fleet_url": "https://www.italeurobus.it/servizi/",
    "relevance_score": 89,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 349 8429000",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "19, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T11:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "phone": "+39 349 8429000",
    "email": "info@italeurobus.it",
    "notes": "i would love to see the images of their minibuses and pullmans",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:46:54.313391+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_18_caqw",
    "name": "Autoservizi Comazzi",
    "base_city": "Novara (Piemonte)",
    "website": "https://www.comazzibus.com",
    "fleet_url": "https://www.comazzibus.com/flotta",
    "relevance_score": 89,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 0324 240333",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Iveco & Otokar Midibus (30 pax), Bova VDL & Van Hool Astromega GT (54–94 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 30, 54–94 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T11:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Iveco & Otokar Midibus (30 seats)",
      "Bova VDL & Van Hool Astromega GT Coaches (54–94 seats)"
    ],
    "phone": "+39 0324 240333",
    "email": "comazzi@comazzibus.com",
    "notes": "i am intrested in 1) Mercedes Sprinter Plus, 2) Setra ComfortClass S 511 HD 3) Mercedes Travego, 4) Mercedes Tourismo RHD, 5) Mercedes Tourismo 17 RHD, and 6) VAN HOOL TDX27 Astromega",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T16:45:25.680384+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Iveco & Otokar Midibus (30 pax), Bova VDL & Van Hool Astromega GT (54–94 pax)",
    "pax_capacity": "19, 30, 54–94 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_3_6l9j",
    "name": "Bassi Tours",
    "base_city": "Brescia / Lake Garda",
    "website": "https://www.bassitours.com",
    "fleet_url": "https://www.bassitours.com/parco-mezzi/",
    "relevance_score": 89,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 030 961 166",
        "bus_models": "Mercedes Sprinter (16 pax), Iveco Midibus (28 pax), Setra GT Coach (54 & 64 pax), Autobus GT Maxi (80 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "16, 28, 54, 64, 80 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T12:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter (16 seats)",
      "Iveco Midibus (28 seats)",
      "Setra GT Coach (54 & 64 seats)",
      "Autobus GT Maxi (80 seats)"
    ],
    "phone": "+39 030 961 166",
    "email": "info@bassitours.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T16:45:26.59247+00:00",
    "bus_models": "Mercedes Sprinter (16 pax), Iveco Midibus (28 pax), Setra GT Coach (54 & 64 pax), Autobus GT Maxi (80 pax)",
    "pax_capacity": "16, 28, 54, 64, 80 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765279227_h3qg",
    "name": "Travel & Service Como",
    "base_city": "Como",
    "website": "https://www.travelandservice.it",
    "fleet_url": "https://www.travelandservice.it/flotta",
    "relevance_score": 88,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 035 017 2012",
        "bus_models": "Minibus (14–20 pax), Midibus (31 pax), Pullman GT (50–64 pax), Double-Decker Pullman (90–94 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "5–8, 14–20, 31, 50–64, 90–94 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T07:30:00.000Z",
        "fleet_segment": "standard",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Minivan NCC (5–8 seats)",
      "Minibus (14–20 seats)",
      "Midibus (31 seats)",
      "Pullman GT Coaches (50–54, 55–56, 57–64 seats)",
      "Double-Decker GT (90–94 seats)"
    ],
    "phone": "+39 035 017 2012",
    "email": "info@travelandservice.it",
    "notes": "I am curious to learn if they lux and premium minibuses and buses?",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.227+00:00",
    "updated_at": "2026-10-26T16:45:27.140752+00:00",
    "bus_models": "Minibus (14–20 pax), Midibus (31 pax), Pullman GT (50–64 pax), Double-Decker Pullman (90–94 pax)",
    "pax_capacity": "5–8, 14–20, 31, 50–64, 90–94 pax",
    "fleet_segment": "standard"
  },
  {
    "id": "partner_1793031479651_17_6bsj",
    "name": "Bolognini Autoservizi",
    "base_city": "Verbania (Lake Maggiore)",
    "website": "https://www.bologninibus.it",
    "fleet_url": "https://www.bologninibus.it/flotta/",
    "relevance_score": 88,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 0323 556012",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (29 pax), Pullman GT (52 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 29, 52 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T12:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Neutral White / B2B Charter",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Midibus (29 seats)",
      "Pullman GT (52 seats)"
    ],
    "phone": "+39 0323 556012",
    "email": "info@bologninibus.it",
    "notes": "does not exist the web  link",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T16:45:25.777717+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (29 pax), Pullman GT (52 pax)",
    "pax_capacity": "19, 29, 52 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765280013_poa6",
    "name": "Caprioli Viaggi VIP Minibus",
    "base_city": "Brescia",
    "website": "https://www.caprioliviaggi.it",
    "fleet_url": "https://www.caprioliviaggi.it/mezzi/",
    "relevance_score": 88,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 030 969 511",
        "bus_models": "Monovolume NCC (7 pax), Mercedes Sprinter Minibus (16 pax), Minibus GT (25 pax), Setra GT Coaches (30, 42, 52 pax), Irizar i8 Pullman GTL Lusso (60 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 16, 25, 30, 42, 52, 60 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T08:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 18,
      "discretion_unbranded": 30
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Monovolume NCC (7 seats)",
      "Mercedes Sprinter Minibus (16 seats)",
      "Minibus GT (25 seats)",
      "Setra GT Coaches (30, 42, 52 seats)",
      "Irizar i8 Pullman GTL Lusso (60 seats)"
    ],
    "phone": "+39 030 969 511",
    "email": "info@caprioliviaggi.it",
    "notes": "1. do they have buses without big stickers?",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:20.013+00:00",
    "updated_at": "2026-10-26T16:45:26.064528+00:00",
    "bus_models": "Monovolume NCC (7 pax), Mercedes Sprinter Minibus (16 pax), Minibus GT (25 pax), Setra GT Coaches (30, 42, 52 pax), Irizar i8 Pullman GTL Lusso (60 pax)",
    "pax_capacity": "7, 16, 25, 30, 42, 52, 60 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_6_rmj2",
    "name": "Rossi Pietro Bus",
    "base_city": "Piacenza / South Lombardy",
    "website": "https://www.rossipietrobus.it",
    "fleet_url": "https://www.rossipietrobus.it/parco-mezzi/",
    "relevance_score": 88,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 0523 855 120",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52–56 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 52–56 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T13:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Neutral White / B2B Charter",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (52–56 seats)"
    ],
    "phone": "+39 0523 855 120",
    "email": "info@rossipietrobus.it",
    "notes": "does not work the weblink",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T16:45:26.966863+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52–56 pax)",
    "pax_capacity": "19, 52–56 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792761050955_n0vc",
    "name": "Car Service Milan",
    "base_city": "Milano",
    "website": "https://carservicemilan.com",
    "fleet_url": "https://carservicemilan.com/fleet/",
    "relevance_score": 87,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 02 8719 9508",
        "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8 pax, reclining leather & privacy glass), Mercedes-Benz Classe V (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T08:00:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 17,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz Classe V (7 seats)",
      "Mercedes-Benz Sprinter Luxury Minibus (8 seats)"
    ],
    "phone": "+39 02 8719 9508",
    "email": "info@carservicemilan.com",
    "notes": "I am curious to learn more about their sprinter",
    "source": "crawler",
    "created_at": "2026-10-23T13:10:50.955+00:00",
    "updated_at": "2026-10-26T16:45:23.128233+00:00",
    "bus_models": "Mercedes-Benz Sprinter Luxury Minibus (8 pax, reclining leather & privacy glass), Mercedes-Benz Classe V (7 pax)",
    "pax_capacity": "7, 8 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1793030996360_0w9g",
    "name": "Peschiera Viaggi Luxury Coaches",
    "base_city": "Lake Garda",
    "website": "https://www.peschieraviaggi.it",
    "fleet_url": "https://www.peschieraviaggi.it/flotta",
    "relevance_score": 87,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 045 755 0122",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (30 pax), Pullman GT (54–62 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 30, 54–62 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T07:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 18,
      "discretion_unbranded": 30
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Midibus (30 seats)",
      "Pullman GT (54–62 seats)"
    ],
    "phone": "+39 045 755 0122",
    "email": "info@peschieraviaggi.it",
    "notes": "Peschiera del Garda and Sirmione wedding event transport. Clean unbranded black buses for lakefront resorts.",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.36+00:00",
    "updated_at": "2026-10-26T16:45:28.011259+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Midibus (30 pax), Pullman GT (54–62 pax)",
    "pax_capacity": "19, 30, 54–62 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_8_6l1r",
    "name": "M. Bonaccorsi Tours",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.bonaccorsitours.com",
    "fleet_url": "https://www.bonaccorsitours.com/flotta",
    "relevance_score": 87,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 011 965 2100",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T08:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 17,
      "discretion_unbranded": 35
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Neutral White / Custom B2B",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "phone": "+39 011 965 2100",
    "email": "bonaccorsi.manuelaviaggi@gmail.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T16:45:27.012031+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765280113_5c8r",
    "name": "Pancheri NCC & Minibus",
    "base_city": "Brescia",
    "website": "https://www.bresciatransfer.it",
    "fleet_url": "https://www.bresciatransfer.it/flotta/",
    "relevance_score": 86,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 030 375 2210",
        "bus_models": "Mercedes Sprinter Minibus (8 pax), Iveco Daily Minibus (20 pax), Mercedes Viano (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 8, 20 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T08:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 17,
      "discretion_unbranded": 30
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Viano (7 seats)",
      "Mercedes Sprinter Minibus (8 seats)",
      "Iveco Daily Minibus (20 seats)"
    ],
    "phone": "+39 030 375 2210",
    "email": "roberto.pancheri.viaggi@gmail.com",
    "notes": "they have a lot of stickers",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:20.113+00:00",
    "updated_at": "2026-10-26T16:45:26.17265+00:00",
    "bus_models": "Mercedes Sprinter Minibus (8 pax), Iveco Daily Minibus (20 pax), Mercedes Viano (7 pax)",
    "pax_capacity": "7, 8, 20 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030995868_be2m",
    "name": "Ilton Autonoleggi",
    "base_city": "Bergamo",
    "website": "https://www.iltonautonoleggi.com",
    "fleet_url": "https://www.iltonautonoleggi.com/flotta",
    "relevance_score": 85,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 035 459 2210",
        "bus_models": "Mercedes Classe V VIP (6 & 8 pax), Autobus Gran Turismo (12–50 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "6, 8, 12–50 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T09:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 30
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes Classe V VIP (6 & 8 seats)",
      "Autobus Gran Turismo (12–50 seats)"
    ],
    "phone": "+39 035 459 2210",
    "email": "info@iltonautonoleggi.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:55.868+00:00",
    "updated_at": "2026-10-26T16:45:23.495202+00:00",
    "bus_models": "Mercedes Classe V VIP (6 & 8 pax), Autobus Gran Turismo (12–50 pax)",
    "pax_capacity": "6, 8, 12–50 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1792765279877_4d0c",
    "name": "Autonoleggio Carnelli",
    "base_city": "Milano",
    "website": "https://www.autonoleggiocarnelli.it",
    "fleet_url": "https://www.autonoleggiocarnelli.it/i-nostri-mezzi/",
    "relevance_score": 85,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 02 9678 9012",
        "bus_models": "Mercedes Minivan (8 pax), Mercedes Sprinter (20 pax), Temsa MD-7 (32–36 pax), Neoplan Tourliner (52–56 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "8, 20, 32–36, 52–56 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-26T08:15:00.000Z",
        "verification": {
          "ok": true,
          "email": "info@autonoleggiocarnelli.it",
          "result": "ok",
          "status": "verified",
          "credits": -1,
          "quality": "good",
          "provider": "zerobounce",
          "subresult": "role_based",
          "checked_at": "2026-10-26T08:16:06.203Z",
          "resultcode": 1,
          "monthly_usage": {
            "month": "2026-10",
            "debounce_count": 0,
            "zerobounce_count": 30,
            "millionverifier_count": 0
          }
        },
        "fleet_segment": "both",
        "outreach_stage": "t1_sent",
        "last_message_id": "<2e3c27b4-6948-40e6-a8fe-a3aa325c64d3@dorogo.eu>",
        "user_set_status": false,
        "last_outreach_at": "2026-10-26T08:16:02.237Z",
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 18,
      "territory_permits": 20,
      "discretion_unbranded": 25
    },
    "status": "CONTACTED",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Minivan (8 seats)",
      "Mercedes Sprinter (20 seats)",
      "Temsa MD-7 (32–36 seats)",
      "Neoplan Tourliner (52–56 seats)"
    ],
    "phone": "+39 02 9678 9012",
    "email": "info@autonoleggiocarnelli.it",
    "notes": "i am not sure if they offer also lux or not?",
    "source": "crawler",
    "created_at": "2026-10-23T14:21:19.877+00:00",
    "updated_at": "2026-10-26T16:45:24.691731+00:00",
    "bus_models": "Mercedes Minivan (8 pax), Mercedes Sprinter (20 pax), Temsa MD-7 (32–36 pax), Neoplan Tourliner (52–56 pax)",
    "pax_capacity": "8, 20, 32–36, 52–56 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793016425770_x3h4",
    "name": "Air Car Service",
    "base_city": "Monza",
    "website": "https://www.aircarservice.com",
    "fleet_url": "https://www.aircarservice.com/",
    "relevance_score": 85,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 035 311 258",
        "bus_models": "Mercedes Sprinter VIP (16 pax), Autobus Granturismo (54 pax), Mercedes Classe V (7 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "7, 16, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T08:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 30
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz Classe V (7 seats)",
      "Mercedes Sprinter VIP (16 seats)",
      "Autobus Granturismo (54 seats)"
    ],
    "phone": "+39 035 311 258",
    "email": "info@aircarservice.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T12:07:05.77+00:00",
    "updated_at": "2026-10-26T16:45:23.25121+00:00",
    "bus_models": "Mercedes Sprinter VIP (16 pax), Autobus Granturismo (54 pax), Mercedes Classe V (7 pax)",
    "pax_capacity": "7, 16, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030996491_wete",
    "name": "Gardabus Exclusive",
    "base_city": "Lake Garda",
    "website": "https://www.gardabus.it",
    "fleet_url": "https://www.gardabus.it/flotta",
    "relevance_score": 84,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 030 914 1820",
        "bus_models": "Mercedes Sprinter VIP (16 pax), Setra GT Coach (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "16, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T09:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 19,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Sprinter VIP (16 seats)",
      "Setra GT Coach (54 seats)"
    ],
    "phone": "+39 030 914 1820",
    "email": "info@gardabus.it",
    "notes": "weblink does not work",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.491+00:00",
    "updated_at": "2026-10-26T16:45:25.354341+00:00",
    "bus_models": "Mercedes Sprinter VIP (16 pax), Setra GT Coach (54 pax)",
    "pax_capacity": "16, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030996812_339h",
    "name": "Cattazzo Pullman",
    "base_city": "Bormio (Alps)",
    "website": "https://cattazzopullman.com",
    "fleet_url": "https://cattazzopullman.com/",
    "relevance_score": 84,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 045 715 1138",
        "bus_models": "Mercedes Sprinter Capri (17 pax), Mercedes Sprinter Amalfi/Tourline (20 pax), Executive Midibus (30 pax), Neoplan Tourliner (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "17, 20, 30, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T10:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 20,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Sprinter Capri (17 seats)",
      "Mercedes Sprinter Amalfi & Tourline (20 seats)",
      "Executive Midibus (30 seats)",
      "Neoplan Tourliner (54 seats)"
    ],
    "phone": "+39 045 715 1138",
    "email": "info@cattazzopullman.com",
    "notes": "Luxury Gran Turismo coaches and Mercedes minibuses serving Northern Italy, Verona, and Alpine corridors.",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.812+00:00",
    "updated_at": "2026-10-26T16:45:26.643529+00:00",
    "bus_models": "Mercedes Sprinter Capri (17 pax), Mercedes Sprinter Amalfi/Tourline (20 pax), Executive Midibus (30 pax), Neoplan Tourliner (54 pax)",
    "pax_capacity": "17, 20, 30, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030997076_cyc8",
    "name": "Luxury Transfer Milan",
    "base_city": "Varese",
    "website": "https://www.luxurytransfermilan.com",
    "fleet_url": "https://www.luxurytransfermilan.com/",
    "relevance_score": 83,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 02 8718 6920",
        "bus_models": "Mercedes Sprinter Bus (14 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "14 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T12:05:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 20,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Sprinter Bus (14 seats)"
    ],
    "phone": "+39 02 8718 6920",
    "email": "info@luxurytransfermilan.com",
    "notes": "Only interested in Mercedes Sprinter, and want to see if they have anything else in the category of busses?",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:57.076+00:00",
    "updated_at": "2026-10-26T16:45:22.87793+00:00",
    "bus_models": "Mercedes Sprinter Bus (14 pax)",
    "pax_capacity": "14 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1793030996893_sp4m",
    "name": "Bormio Viaggi Luxury Lines",
    "base_city": "Bormio (Alps)",
    "website": "https://www.bormioviaggi.com",
    "fleet_url": "https://www.bormioviaggi.com/flotta",
    "relevance_score": 83,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 0342 951 158",
        "bus_models": "Mercedes Classe V (7 pax), Mercedes Sprinter 317 (8 pax), Mercedes Sprinter 518 (19 pax), Daily Tourismo (21 pax), Setra 515 & Mercedes Tourismo GT (49–51 pax), MAN Lion's Coach (63 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "7, 8, 19, 21, 49–51, 63 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T11:40:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 20,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Classe V (7 seats)",
      "Mercedes Sprinter 317 (8 seats)",
      "Mercedes Sprinter 518 (19 seats)",
      "Daily Tourismo (21 seats)",
      "Setra 515 & Mercedes Tourismo GT (49–51 seats)",
      "MAN Lion's Coach (63 seats)"
    ],
    "phone": "+39 0342 951 158",
    "email": "booking@bormioviaggi.com",
    "notes": "interested in Man Lion's Coach - 63 seats, Iveco Magelys Pro - 55 seats, Setra 515 HD - 49 seats, Mercedes 317 - 8 seats",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.893+00:00",
    "updated_at": "2026-10-26T16:45:23.685596+00:00",
    "bus_models": "Mercedes Classe V (7 pax), Mercedes Sprinter 317 (8 pax), Mercedes Sprinter 518 (19 pax), Daily Tourismo (21 pax), Setra 515 & Mercedes Tourismo GT (49–51 pax), MAN Lion's Coach (63 pax)",
    "pax_capacity": "7, 8, 19, 21, 49–51, 63 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030996589_2k6k",
    "name": "Consorzio Eurobus Verona",
    "base_city": "Lake Garda",
    "website": "https://eurobusverona.it",
    "fleet_url": "https://eurobusverona.it/",
    "relevance_score": 83,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 045 803 2002",
        "bus_models": "Minibus (19 pax), Pullman GT (54 pax), Autobus Maxi (84 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19, 54, 84 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T11:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 18,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Minibus GT (19 seats)",
      "Pullman Gran Turismo (54 seats)",
      "Autobus Maxi (84 seats)"
    ],
    "phone": "+39 045 803 2002",
    "email": "info@eurobusverona.it",
    "notes": "do they have any images for the vehicles?",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.589+00:00",
    "updated_at": "2026-10-26T16:45:25.844342+00:00",
    "bus_models": "Minibus (19 pax), Pullman GT (54 pax), Autobus Maxi (84 pax)",
    "pax_capacity": "19, 54, 84 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030996221_7t9y",
    "name": "Autoservizi Guizzetti",
    "base_city": "Brescia",
    "website": "https://www.autoserviziguizzetti.com",
    "fleet_url": "https://www.autoserviziguizzetti.com/",
    "relevance_score": 82,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 035 901 118",
        "bus_models": "Iveco Daily / Indcar Wing (19–28 pax), Setra 515 HD & Irizar i6 (53–54 pax), Setra 415 GT-HD (55 pax), Setra 416/417 HDH (59–64 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "19–28, 53–55, 59–64 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T12:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 19,
      "territory_permits": 20,
      "discretion_unbranded": 20
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Iveco Daily Tourist / Indcar Wing (19–28 seats)",
      "Setra 515 HD & Irizar i6 (53–54 seats)",
      "Setra 415 GT-HD (55 seats)",
      "Setra 416 GT & 417 HDH (59–64 seats)"
    ],
    "phone": "+39 035 901 118",
    "email": "info@autoserviziguizzetti.com",
    "notes": "i am interested in  1) Setra 417 HDH, 2) Setra 515 HD, 3) Mercedes-Benz Travego, 4) Van Hool TX-Astronef",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.221+00:00",
    "updated_at": "2026-10-26T16:45:24.165014+00:00",
    "bus_models": "Iveco Daily / Indcar Wing (19–28 pax), Setra 515 HD & Irizar i6 (53–54 pax), Setra 415 GT-HD (55 pax), Setra 416/417 HDH (59–64 pax)",
    "pax_capacity": "19–28, 53–55, 59–64 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030997210_o8w4",
    "name": "Ugolini Viaggi",
    "base_city": "Lake Maggiore",
    "website": "https://www.ugoliniviaggi.it",
    "fleet_url": "https://www.ugoliniviaggi.it/",
    "relevance_score": 81,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 045 770 1522",
        "bus_models": "Executive Midibus (28 pax), Setra & Mercedes GT Coach (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "28, 54 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-31T07:25:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 18,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Executive Midibus (28 seats)",
      "Setra & Mercedes GT Coach (54 seats)"
    ],
    "phone": "+39 045 770 1522",
    "email": "info@ugoliniviaggi.it",
    "notes": "i am only interested in their + 50 seaters",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:57.21+00:00",
    "updated_at": "2026-10-26T16:45:25.455466+00:00",
    "bus_models": "Executive Midibus (28 pax), Setra & Mercedes GT Coach (54 pax)",
    "pax_capacity": "28, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_perletti_topclass",
    "name": "Perletti Autoservizi (Top Class Line)",
    "base_city": "Bergamo / Milano",
    "website": "https://www.perlettibus.it",
    "fleet_url": "https://www.perlettibus.it/perlettibus/parco-mezzi/",
    "relevance_score": 81,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 338 666 8249",
        "bus_models": "Mercedes Gran Capri (20 pax), Iveco Wing & Mago 2 (28–29 pax), Mercedes Tourismo & Setra 515 GT (51–55 pax), Mercedes Tourismo RHD-L Maxibus (64 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "7, 20, 28–29, 51–55, 64 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T08:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "last_message_id": null,
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request (Specify Top Class)",
    "fleet_categories": [
      "Mercedes-Benz Classe V 250 (7 seats)",
      "Mercedes Gran Capri Minibus (20 seats)",
      "Iveco Wing & Mago 2 (28–29 seats)",
      "Mercedes Tourismo & Setra 515 GT (51–55 seats)",
      "Mercedes Tourismo RHD-L Maxibus (64 seats)"
    ],
    "phone": "+39 035 832700",
    "email": "info@perlettibus.it",
    "notes": "- i am interested in their minibuses.\n- i am curious if all of the minibuses that they have are presented on the website or the 3? \n- I wonder if they have something luxury/consider as VIP class\n- prices\n- cancelation \n- cancelation policies",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:27.213247+00:00",
    "bus_models": "Mercedes Gran Capri (20 pax), Iveco Wing & Mago 2 (28–29 pax), Mercedes Tourismo & Setra 515 GT (51–55 pax), Mercedes Tourismo RHD-L Maxibus (64 pax)",
    "pax_capacity": "7, 20, 28–29, 51–55, 64 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793030996978_x4p9",
    "name": "Autoservizi Rainoldi NCC",
    "base_city": "Bormio (Alps)",
    "website": "https://www.rainoldibus.com",
    "fleet_url": "https://www.ncc3.it/flotta",
    "relevance_score": 80,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 0342 515 220",
        "bus_models": "Mercedes Minibus (8, 16, 19 pax), Midibus GT (27 pax), Setra & Mercedes GT Coach (56 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "email_status": "unknown",
        "pax_capacity": "8, 16, 19, 27, 56 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-30T13:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Minibus (8, 16, 19 seats)",
      "Midibus GT (27 seats)",
      "Setra & Mercedes GT Coach (56 seats)"
    ],
    "phone": "+39 0342 515 220",
    "email": "info@rainoldibus.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:09:56.978+00:00",
    "updated_at": "2026-10-26T16:45:24.751271+00:00",
    "bus_models": "Mercedes Minibus (8, 16, 19 pax), Midibus GT (27 pax), Setra & Mercedes GT Coach (56 pax)",
    "pax_capacity": "8, 16, 19, 27, 56 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_lariobus",
    "name": "Lariobus",
    "base_city": "Lecco (Lake Como)",
    "website": "https://www.lariobus.com",
    "fleet_url": "https://www.lariobus.com/automezzi/",
    "relevance_score": 79,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 0341 581 600",
        "bus_models": "Ford Transit (13 pax), Mercedes Sprinter IBIS 2 (20 pax), Iveco Calipso (36 pax), Temsa MD9 (40 pax), Mercedes Tourismo & Irizar i6 (54–56 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "13, 20, 36, 40, 54–56 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-26T07:25:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "to_check",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 19,
      "territory_permits": 20,
      "discretion_unbranded": 20
    },
    "status": "TO_REVIEW",
    "unbranded_status": "Unbranded on Request (Must Demand in Quote)",
    "fleet_categories": [
      "Ford Transit Minibus (13 seats)",
      "Mercedes Sprinter IBIS 2 (20 seats)",
      "Iveco Calipso Midibus (36 seats)",
      "Temsa MD9 (40 seats)",
      "Mercedes Tourismo & Irizar i6 (54–56 seats)"
    ],
    "phone": "+39 0341 821 445",
    "email": "info@lariobus.com",
    "notes": "- Not a priority, seems that they have only old buses with tags\n- they answer fast if needed",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:25.973465+00:00",
    "bus_models": "Ford Transit (13 pax), Mercedes Sprinter IBIS 2 (20 pax), Iveco Calipso (36 pax), Temsa MD9 (40 pax), Mercedes Tourismo & Irizar i6 (54–56 pax)",
    "pax_capacity": "13, 20, 36, 40, 54–56 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031033043_nx6z",
    "name": "Autoservizi Sonzogni",
    "base_city": "Bergamo",
    "website": "https://www.autoservizisonzogni.it",
    "fleet_url": "https://www.autoservizisonzogni.it/",
    "relevance_score": 79,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 0345 910 38",
        "bus_models": "Minivan NCC (8 pax), Minibus (41 pax), Pullman Gran Turismo Irizar (48–64 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "8, 41, 48–64 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-27T10:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 18,
      "discretion_unbranded": 25
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Minivan NCC (8 seats)",
      "Minibus (41 seats)",
      "Pullman Gran Turismo Irizar (48–64 seats)"
    ],
    "phone": "+39 0345 910 38",
    "email": "info@autoservizisonzogni.it",
    "notes": "interested in Mercedes Sprinter Capri (22 seater) + 40 seater + 54 + 64",
    "source": "crawler",
    "created_at": "2026-10-26T16:10:33.043+00:00",
    "updated_at": "2026-10-26T17:48:00.668054+00:00",
    "bus_models": "Minivan NCC (8 pax), Minibus (41 pax), Pullman Gran Turismo Irizar (48–64 pax)",
    "pax_capacity": "8, 41, 48–64 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031032925_1w89",
    "name": "Air Pullman VIP Line",
    "base_city": "Milano",
    "website": "https://www.airpullman.it",
    "fleet_url": "https://www.airpullman.it/noleggio",
    "relevance_score": 74,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 02 896 039",
        "bus_models": "Minibus VIP (9 pax), Executive Midibus (38 pax), Setra GT Coach (54–80 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "invalid",
        "pax_capacity": "9, 38, 54–80 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T09:30:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "ready",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 14,
      "territory_permits": 20,
      "discretion_unbranded": 20
    },
    "status": "WANT_TO_CONTACT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Minibus VIP (9 seats)",
      "Executive Midibus (38 seats)",
      "Setra GT Coach (54–80 seats)"
    ],
    "phone": "+39 02 896 039",
    "email": "noleggio@airpullman.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:10:32.925+00:00",
    "updated_at": "2026-10-26T17:48:01.338833+00:00",
    "bus_models": "Minibus VIP (9 pax), Executive Midibus (38 pax), Setra GT Coach (54–80 pax)",
    "pax_capacity": "9, 38, 54–80 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_linea_azzurra",
    "name": "Linea Azzurra Bus",
    "base_city": "Torino (Moncalieri) & Milano (Rho Depot)",
    "website": "https://www.lineaazzurrabus.com",
    "fleet_url": "https://www.lineaazzurrabus.com/la-flotta/",
    "relevance_score": 70,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 02 905 5406",
        "bus_models": "Minivan (6–8 pax), Minibus (16–19 pax), Midibus (25–30 pax), Autobus GT (45–54 pax), Autobus Long/Double-Decker (60–80 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "mx_ok",
        "pax_capacity": "6–8, 16–19, 25–30, 45–54, 60–80 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-26T07:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "to_check",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 18,
      "discretion_unbranded": 15
    },
    "status": "TO_REVIEW",
    "unbranded_status": "Neutral White / Custom B2B Fleet",
    "fleet_categories": [
      "Minivan (6–8 seats)",
      "Minibus (16–19 seats)",
      "Midibus (25–30 seats)",
      "Autobus GT Coaches (45–54 seats)",
      "Autobus Long / Double-Decker (60–80 seats)"
    ],
    "phone": "+39 02 905 5406",
    "email": "info@lineaazzurrabus.it",
    "notes": "",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:23.006504+00:00",
    "bus_models": "Minivan (6–8 pax), Minibus (16–19 pax), Midibus (25–30 pax), Autobus GT (45–54 pax), Autobus Long/Double-Decker (60–80 pax)",
    "pax_capacity": "6–8, 16–19, 25–30, 45–54, 60–80 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_rosa_bus",
    "name": "Rosa Bus",
    "base_city": "Rosà (Vicenza, Veneto)",
    "website": "https://www.rosabus.it",
    "fleet_url": "https://www.rosabus.it/la-nostra-flotta/",
    "relevance_score": 68,
    "score_breakdown": {
      "fleet_luxury": 18,
      "partner_card": {
        "whatsapp": "+39 0424 582055",
        "bus_models": "Mercedes Tourengo 818 Midibus (29–30 pax), Autobus GT (54, 64, 83 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "verified",
        "pax_capacity": "29–30, 54, 64, 83 pax",
        "rate_standby": "",
        "verification": {
          "ok": true,
          "email": "info@rosa-autoservizi.it",
          "result": "ok",
          "status": "verified",
          "credits": -1,
          "quality": "good",
          "provider": "zerobounce",
          "subresult": "role_based",
          "checked_at": "2026-10-24T16:45:34.839Z",
          "resultcode": 1,
          "monthly_usage": {
            "month": "2026-10",
            "debounce_count": 0,
            "zerobounce_count": 9,
            "millionverifier_count": 0
          }
        },
        "fleet_segment": "both",
        "outreach_stage": "t1_sent",
        "last_message_id": "<1dd8750d-1eb9-4b49-a232-fd8185a5cd8b@dorogo.eu>",
        "user_set_status": true,
        "last_outreach_at": "2026-10-24T16:45:34.494Z",
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 17,
      "territory_permits": 18,
      "discretion_unbranded": 15
    },
    "status": "CONTACTED",
    "unbranded_status": "Standard Tour Livery (Needs Request for Plain)",
    "fleet_categories": [
      "Mercedes Tourengo 818 Midibus (29–30 seats)",
      "Autobus Gran Turismo (54, 64, 83 seats)"
    ],
    "phone": "+39 0424 582055",
    "email": "info@rosa-autoservizi.it",
    "notes": "It seems that they focus mostly on 50-seaters.\n\nI wonder if:\n1. Are there other buses that they offer?  Do they have luxury minibuses or buses? (if not, if they have trustworhy contacts), also we are still interested in just normal buses\n2. prices for standby (min/max hours) and transfer (like Milan <-> MXP )\n3. how long in advance I should contact them to book?  What would be the cancelation policies?",
    "source": "seed",
    "created_at": "2026-10-22T16:36:12.495179+00:00",
    "updated_at": "2026-10-26T16:45:23.431338+00:00",
    "bus_models": "Mercedes Tourengo 818 Midibus (29–30 pax), Autobus GT (54, 64, 83 pax)",
    "pax_capacity": "29–30, 54, 64, 83 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_16_z7uf",
    "name": "Bergamo Transfer",
    "base_city": "Bergamo / Milano",
    "website": "https://www.bergamotransfer.com",
    "fleet_url": "https://www.bergamotransfer.com/flotta",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 035 3844411",
        "bus_models": "Mercedes-Benz Minivan & Minibus NCC (8 pax), Mercedes Berlina (3–4 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "invalid",
        "pax_capacity": "3–4, 8 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T13:00:00.000Z",
        "fleet_segment": "luxury",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": true,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "100% Guaranteed Unbranded / Total Black",
    "fleet_categories": [
      "Mercedes-Benz Berlina (3–4 seats)",
      "Minivan & Minibus NCC (fino a 8 seats)"
    ],
    "phone": "+39 035 3844411",
    "email": "reservation@bergamotransfer.com",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:48:00.898191+00:00",
    "bus_models": "Mercedes-Benz Minivan & Minibus NCC (8 pax), Mercedes Berlina (3–4 pax)",
    "pax_capacity": "3–4, 8 pax",
    "fleet_segment": "luxury"
  },
  {
    "id": "partner_1793031479651_7_9rqt",
    "name": "Bus Company",
    "base_city": "Torino (Piemonte)",
    "website": "https://www.buscompany.it",
    "fleet_url": "https://www.buscompany.it/noleggio/",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 011 226 1222",
        "bus_models": "Minibus (20 pax), Midibus (28–32 pax), Pullman GT (52–80 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "20, 28–32, 52–80 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T08:30:00.000Z",
        "fleet_segment": "standard",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Minibus (20 seats)",
      "Midibus (28–32 seats)",
      "Pullman GT (52–80 seats)"
    ],
    "phone": "+39 011 226 1222",
    "email": "noleggi@buscompany.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:30:50.392552+00:00",
    "bus_models": "Minibus (20 pax), Midibus (28–32 pax), Pullman GT (52–80 pax)",
    "pax_capacity": "20, 28–32, 52–80 pax",
    "fleet_segment": "standard"
  },
  {
    "id": "partner_1793031479651_5_i74u",
    "name": "Pasqualini Bus",
    "base_city": "Verona / Lake Garda",
    "website": "https://www.pasqualinibus.it",
    "fleet_url": "https://www.pasqualinibus.it/flotta/",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 21,
      "partner_card": {
        "whatsapp": "+39 045 765 0100",
        "bus_models": "Minibus (16–19 pax), Midibus (28–32 pax), Pullman GT (52–60 pax), Double Decker GT (80 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "16–19, 28–32, 52–60, 80 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T10:00:00.000Z",
        "fleet_segment": "standard",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 16,
      "territory_permits": 18,
      "discretion_unbranded": 35
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Minibus GT (16–19 seats)",
      "Midibus (28–32 seats)",
      "Pullman GT (52–60 seats)",
      "Double Decker GT (80 seats)"
    ],
    "phone": "+39 045 765 0100",
    "email": "info@pasqualinibus.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:41:19.371637+00:00",
    "bus_models": "Minibus (16–19 pax), Midibus (28–32 pax), Pullman GT (52–60 pax), Double Decker GT (80 pax)",
    "pax_capacity": "16–19, 28–32, 52–60, 80 pax",
    "fleet_segment": "standard"
  },
  {
    "id": "partner_1793031032498_gxg7",
    "name": "Zani Viaggi Executive",
    "base_city": "Milano",
    "website": "https://www.zaniviaggi.it",
    "fleet_url": "https://www.zaniviaggi.it/noleggio-autobus",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 02 867 131",
        "bus_models": "Mercedes Sprinter Executive (19 pax), Pullman Gran Turismo (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "19, 54 pax",
        "rate_standby": "",
        "scheduled_at": null,
        "fleet_segment": "both",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 20
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Mercedes Sprinter Executive (19 seats)",
      "Pullman Gran Turismo (54 seats)"
    ],
    "phone": "+39 02 867 131",
    "email": "noleggio@zaniviaggi.it",
    "notes": "Historic Milan carrier. Large fleet of modern Mercedes and Setra coaches. Specify unbranded when booking.",
    "source": "crawler",
    "created_at": "2026-10-26T16:10:32.497+00:00",
    "updated_at": "2026-10-26T16:45:27.07704+00:00",
    "bus_models": "Mercedes Sprinter Executive (19 pax), Pullman Gran Turismo (54 pax)",
    "pax_capacity": "19, 54 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_4_xsml",
    "name": "Autoservizi Facchinetti",
    "base_city": "Milano / Bergamo",
    "website": "https://www.autoservizifacchinetti.it",
    "fleet_url": "https://www.autoservizifacchinetti.it/flotta",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 22,
      "partner_card": {
        "whatsapp": "+39 035 838 120",
        "bus_models": "Mercedes Sprinter (20 pax), Iveco Midibus (29 pax), Temsa VIP Safari (46 pax), Temsa Safari HD (54–58 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "20, 29, 46, 54–58 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-29T08:00:00.000Z",
        "fleet_segment": "both",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 19,
      "discretion_unbranded": 35
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter (20 seats)",
      "Iveco Midibus (29 seats)",
      "Temsa VIP Safari (46 seats)",
      "Temsa Safari HD (54–58 seats)"
    ],
    "phone": "+39 035 838 120",
    "email": "info@autoservizifacchinetti.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:31:29.565919+00:00",
    "bus_models": "Mercedes Sprinter (20 pax), Iveco Midibus (29 pax), Temsa VIP Safari (46 pax), Temsa Safari HD (54–58 pax)",
    "pax_capacity": "20, 29, 46, 54–58 pax",
    "fleet_segment": "both"
  },
  {
    "id": "partner_1793031479651_10_3kbi",
    "name": "Autoservizi Radaelli",
    "base_city": "Monza / Como / Milano",
    "website": "https://www.autoserviziradaelli.it",
    "fleet_url": "https://www.autoserviziradaelli.it/flotta",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 23,
      "partner_card": {
        "whatsapp": "+39 0362 901353",
        "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "19, 52 pax",
        "rate_standby": "",
        "scheduled_at": "2026-10-28T11:00:00.000Z",
        "fleet_segment": "standard",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 15,
      "territory_permits": 20,
      "discretion_unbranded": 35
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "100% Guaranteed Unbranded",
    "fleet_categories": [
      "Mercedes Sprinter Minibus (19 seats)",
      "Pullman Gran Turismo (52 seats)"
    ],
    "phone": "+39 0362 901353",
    "email": "bus@autoserviziradaelli.it",
    "notes": "",
    "source": "crawler",
    "created_at": "2026-10-26T16:17:59.651+00:00",
    "updated_at": "2026-10-26T17:20:54.974843+00:00",
    "bus_models": "Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52 pax)",
    "pax_capacity": "19, 52 pax",
    "fleet_segment": "standard"
  },
  {
    "id": "partner_1793031033153_oyw9",
    "name": "Frigerio Trasporti",
    "base_city": "Monza",
    "website": "https://www.frigerioviaggi.com",
    "fleet_url": "https://www.frigerioviaggi.com/noleggio-bus",
    "relevance_score": 0,
    "score_breakdown": {
      "fleet_luxury": 20,
      "partner_card": {
        "whatsapp": "+39 0362 359 1",
        "bus_models": "Executive Midibus (28 pax), Pullman GT (54 pax)",
        "replied_at": null,
        "rate_hourly": "",
        "client_notes": "",
        "email_status": "unknown",
        "pax_capacity": "28, 54 pax",
        "rate_standby": "",
        "scheduled_at": null,
        "fleet_segment": "both",
        "outreach_stage": "closed",
        "user_set_status": true,
        "last_outreach_at": null,
        "user_set_segment": false,
        "fleet_audit_verified_at": "2026-10-26T18:25:11.587Z"
      },
      "corporate_sla": 18,
      "territory_permits": 17,
      "discretion_unbranded": 20
    },
    "status": "NOT_RELEVANT",
    "unbranded_status": "Unbranded on Request",
    "fleet_categories": [
      "Executive Midibus (28 seats)",
      "Pullman GT (54 seats)"
    ],
    "phone": "+39 0362 359 1",
    "email": "bus@frigerioviaggi.com",
    "notes": "Monza Brianza and Milan corporate transfer company. Euro 6 midibuses and V-Classes.",
    "source": "crawler",
    "created_at": "2026-10-26T16:10:33.153+00:00",
    "updated_at": "2026-10-26T16:45:24.870025+00:00",
    "bus_models": "Executive Midibus (28 pax), Pullman GT (54 pax)",
    "pax_capacity": "28, 54 pax",
    "fleet_segment": "both"
  }
];
const STORAGE_KEY = 'dorogo_bus_partners_v1';
export const STORAGE_EXCLUDED_KEY = 'dorogo_bus_partners_excluded_v1';

let _memoryExcluded = [];

export function normalizeDomain(url) {
  if (!url) return '';
  try {
    const raw = String(url).trim();
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase().trim();
  } catch (_) {
    return String(url).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim();
  }
}

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function mergeNotes(notesA = '', notesB = '') {
  const strA = String(notesA || '').trim();
  const strB = String(notesB || '').trim();
  if (!strA) return strB;
  if (!strB) return strA;
  if (strA === strB) return strA;

  const linesA = strA.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const linesB = strB.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const seen = new Set(linesA.map((l) => l.toLowerCase()));
  const merged = [...linesA];

  for (const line of linesB) {
    if (!seen.has(line.toLowerCase())) {
      seen.add(line.toLowerCase());
      merged.push(line);
    }
  }

  return merged.join('\n');
}

export function mergePartnerRecords(target, incoming) {
  if (!incoming) return target;
  if (!target) return incoming;

  // 1. Merge notes (preserving dashes - and numbers 1., 2., etc.)
  target.notes = mergeNotes(target.notes, incoming.notes);

  // 2. Merge partner_card sub-object client_notes
  target.score_breakdown = target.score_breakdown || {};
  target.score_breakdown.partner_card = target.score_breakdown.partner_card || {};
  const inCard = incoming.score_breakdown?.partner_card || {};

  target.score_breakdown.partner_card.client_notes = mergeNotes(
    target.score_breakdown.partner_card.client_notes,
    inCard.client_notes
  );

  // 3. Status priority
  const STATUS_PRIORITY = {
    APPROVED_PARTNER: 50,
    CONTACTED: 40,
    WANT_TO_CONTACT: 30,
    TO_REVIEW: 20,
    REJECTED: 10,
    NOT_RELEVANT: 5,
  };
  const targetPri = STATUS_PRIORITY[target.status] || 0;
  const inPri = STATUS_PRIORITY[incoming.status] || 0;
  if (inPri > targetPri) {
    target.status = incoming.status;
  }

  // 4. Contact fields
  if (!target.email && incoming.email) target.email = incoming.email;
  if (!target.phone && incoming.phone) target.phone = incoming.phone;
  if (!target.website && incoming.website) target.website = incoming.website;
  if (!target.fleet_url && incoming.fleet_url) target.fleet_url = incoming.fleet_url;
  if (!target.base_city && incoming.base_city) target.base_city = incoming.base_city;

  // 5. Rates and fleet details
  if (!target.score_breakdown.partner_card.rate_hourly && inCard.rate_hourly) {
    target.score_breakdown.partner_card.rate_hourly = inCard.rate_hourly;
  }
  if (!target.score_breakdown.partner_card.rate_standby && inCard.rate_standby) {
    target.score_breakdown.partner_card.rate_standby = inCard.rate_standby;
  }
  if (!target.score_breakdown.partner_card.whatsapp && inCard.whatsapp) {
    target.score_breakdown.partner_card.whatsapp = inCard.whatsapp;
  }
  if (!target.score_breakdown.partner_card.bus_models && inCard.bus_models) {
    target.score_breakdown.partner_card.bus_models = inCard.bus_models;
  }
  if (!target.score_breakdown.partner_card.pax_capacity && inCard.pax_capacity) {
    target.score_breakdown.partner_card.pax_capacity = inCard.pax_capacity;
  }

  // 6. Keep max relevance score
  target.relevance_score = Math.max(target.relevance_score || 0, incoming.relevance_score || 0);

  // 7. Union of fleet categories
  const catSet = new Set((target.fleet_categories || []).concat(incoming.fleet_categories || []));
  target.fleet_categories = [...catSet];

  target.updated_at = new Date().toISOString();

  return target;
}

export function loadExcludedBusPartners() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_EXCLUDED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (_) {}
  return _memoryExcluded;
}

export function saveExcludedBusPartners(list) {
  _memoryExcluded = Array.isArray(list) ? list : [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_EXCLUDED_KEY, JSON.stringify(_memoryExcluded));
    }
  } catch (_) {}
}

export function isBusPartnerExcluded(partner, excludedList = null) {
  if (!partner) return false;
  const excluded = excludedList || loadExcludedBusPartners();
  if (!excluded || !excluded.length) return false;

  const pId = partner.id || '';
  const pNameNorm = normalizeName(partner.name);
  const pDomain = normalizeDomain(partner.website);
  const pPhoneNorm = normalizePhone(partner.phone);

  return excluded.some((ex) => {
    // 1. Direct ID match
    if (pId && ex.id && pId === ex.id) return true;

    // 2. Exact or substring domain match (e.g. cimaluxury.com)
    if (pDomain && ex.domain) {
      if (pDomain === ex.domain || pDomain.endsWith(`.${ex.domain}`) || ex.domain.endsWith(`.${pDomain}`)) {
        return true;
      }
    }

    // 3. Normalized name match (e.g. 'cimaluxury' or 'cimaluxurysrl')
    if (pNameNorm && ex.normalized_name) {
      if (pNameNorm === ex.normalized_name) return true;
      if (pNameNorm.length >= 6 && ex.normalized_name.length >= 6) {
        if (pNameNorm.includes(ex.normalized_name) || ex.normalized_name.includes(pNameNorm)) return true;
      }
    }

    // 4. Normalized phone match (matching last 7+ digits)
    if (pPhoneNorm && ex.normalized_phone && pPhoneNorm.length >= 7 && ex.normalized_phone.length >= 7) {
      const pTail = pPhoneNorm.slice(-7);
      const exTail = ex.normalized_phone.slice(-7);
      if (pTail === exTail) return true;
    }

    return false;
  });
}

export function addExcludedBusPartner(partner, reason = 'Dismissed by user') {
  if (!partner) return null;
  const list = [...loadExcludedBusPartners()];
  const domain = normalizeDomain(partner.website);
  const normalized_name = normalizeName(partner.name);
  const normalized_phone = normalizePhone(partner.phone);

  const existingIdx = list.findIndex((ex) => 
    (partner.id && ex.id === partner.id) ||
    (domain && ex.domain && domain === ex.domain) ||
    (normalized_name && ex.normalized_name && normalized_name === ex.normalized_name)
  );

  const entry = {
    id: partner.id || `excluded_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: partner.name || 'Unknown Operator',
    normalized_name,
    website: partner.website || '',
    domain,
    phone: partner.phone || '',
    normalized_phone,
    base_city: partner.base_city || '',
    fleet_categories: Array.isArray(partner.fleet_categories) ? partner.fleet_categories : [],
    relevance_score: partner.relevance_score || 0,
    reason: reason || 'Dismissed by user',
    excluded_at: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry };
  } else {
    list.unshift(entry);
  }

  saveExcludedBusPartners(list);
  return entry;
}

export function removeExcludedBusPartner(idOrDomain) {
  if (!idOrDomain) return null;
  const list = [...loadExcludedBusPartners()];
  const target = String(idOrDomain).toLowerCase().trim();
  const targetNorm = normalizeName(target);
  const targetDomain = normalizeDomain(target);

  const idx = list.findIndex((ex) => 
    ex.id === idOrDomain || 
    (ex.domain && (ex.domain === target || ex.domain === targetDomain)) || 
    (ex.normalized_name && ex.normalized_name === targetNorm)
  );

  if (idx >= 0) {
    const [removed] = list.splice(idx, 1);
    saveExcludedBusPartners(list);
    return removed;
  }
  return null;
}

// Verified real-world replacements for legacy prototype/mock entries that had non-existent domains
export const LEGACY_OPERATOR_REPLACEMENTS = {
  comolaketransfersminibus: {
    name: 'Landway Tourism',
    base_city: 'Como',
    website: 'https://www.landwaytourism.com',
    fleet_url: 'https://www.landwaytourism.com/',
    phone: '+39 031 513 189',
    email: 'info@landwaytourism.com',
    notes: 'Grandate / Como luxury coach and minibus operator. Unbranded Sprinter & midibus fleet for Lake Como villas.'
  },
  lakecomochauffeurbusservice: {
    name: 'Como Driver Services',
    base_city: 'Como',
    website: 'https://www.comodriver.com',
    fleet_url: 'https://www.comodriver.com/',
    phone: '+39 347 184 8920',
    email: 'info@comodriver.com',
    notes: 'Dedicated Lake Como private chauffeur & luxury Mercedes Sprinter/V-Class operator covering Bellagio, Cernobbio, and Villa d’Este.'
  },
  menaggiovipminibustour: {
    name: 'Travel & Service Como',
    base_city: 'Como',
    website: 'https://www.travelandservice.it',
    fleet_url: 'https://www.travelandservice.it/',
    phone: '+39 035 017 2012',
    email: 'info@travelandservice.it',
    notes: 'Lombardy & Lake Como executive bus and VIP minibus charter specialist for weddings and corporate delegations.'
  },
  lakecomoexecutivesprinter: {
    name: 'Como Limo Lux',
    base_city: 'Como',
    website: 'https://comolimolux.com',
    fleet_url: 'https://comolimolux.com/',
    phone: '+39 031 264 780',
    email: 'info@comolimolux.com',
    notes: 'Bespoke Lake Como luxury ground transport. Total-black Mercedes V-Class and VIP Sprinter fleet.'
  },
  milanovipdrivercoach: {
    name: 'Exclusive Cars Milano',
    base_city: 'Milano',
    website: 'https://exclusivecarsmilano.it',
    fleet_url: 'https://exclusivecarsmilano.it/',
    phone: '+39 02 4070 8295',
    email: 'info@exclusivecarsmilano.it',
    notes: 'Premier Milan NCC operator with luxury Mercedes-Benz Sprinter VIP (8–19 seats) and V-Class fleet.'
  },
  starlightlimousinecoach: {
    name: 'Prestige Car Limousine',
    base_city: 'Milano',
    website: 'https://www.prestigecarlimousine.it',
    fleet_url: 'https://www.prestigecarlimousine.it/',
    phone: '+39 02 8951 6813',
    email: 'info@prestigecarlimousine.it',
    notes: 'Milan luxury roadshow and event transport. 8 to 16-seater luxury Mercedes minibuses and suited English-speaking chauffeurs.'
  },
  autonoleggiobattaglia: {
    name: 'Car Service Milan',
    base_city: 'Milano',
    website: 'https://carservicemilan.com',
    fleet_url: 'https://carservicemilan.com/',
    phone: '+39 02 8719 9508',
    email: 'info@carservicemilan.com',
    notes: 'Milan & Malpensa executive vans and 14–20 seater luxury Mercedes Sprinters. Strict unbranded policy.'
  },
  pellegriniautoservizi: {
    name: 'Autoservizi Sonzogni',
    base_city: 'Bergamo',
    website: 'https://www.autoservizisonzogni.it',
    fleet_url: 'https://www.autoservizisonzogni.it/',
    phone: '+39 0345 910 38',
    email: 'info@autoservizisonzogni.it',
    notes: 'Bergamo luxury Gran Turismo coach and minibus operator for airport transfers and northern lakes.'
  },
  benacominibusncc: {
    name: 'Consorzio Eurobus Verona',
    base_city: 'Lake Garda',
    website: 'https://eurobusverona.it',
    fleet_url: 'https://eurobusverona.it/',
    phone: '+39 045 803 2002',
    email: 'info@eurobusverona.it',
    notes: 'Verona and Lake Garda premier bus & luxury minibus consortium covering Sirmione, Lazise, and Garda villas.'
  },
  silvestribuslivigno: {
    name: 'Cattazzo Pullman',
    base_city: 'Verona',
    website: 'https://cattazzopullman.com',
    fleet_url: 'https://cattazzopullman.com/',
    phone: '+39 045 715 1138',
    email: 'info@cattazzopullman.com',
    notes: 'Luxury Gran Turismo coaches and Mercedes minibuses serving Northern Italy, Verona, and Alpine corridors.'
  },
  brianzalimousineminibus: {
    name: 'Air Car Service',
    base_city: 'Monza',
    website: 'https://www.aircarservice.com',
    fleet_url: 'https://www.aircarservice.com/',
    phone: '+39 035 311 258',
    email: 'info@aircarservice.com',
    notes: 'Executive Mercedes, Setra & MAN Gran Turismo buses and luxury minivans across Monza, Bergamo, and Milan.'
  },
  vareseviptransfercoach: {
    name: 'Luxury Transfer Milan',
    base_city: 'Varese',
    website: 'https://www.luxurytransfermilan.com',
    fleet_url: 'https://www.luxurytransfermilan.com/',
    phone: '+39 02 8718 6920',
    email: 'info@luxurytransfermilan.com',
    notes: 'Malpensa (MXP), Varese, and Lake Como executive Sprinter VIP and V-Class chauffeur service.'
  },
  stresamaggiorevipcoach: {
    name: 'Ugolini Viaggi',
    base_city: 'Lake Garda',
    website: 'https://www.ugoliniviaggi.it',
    fleet_url: 'https://www.ugoliniviaggi.it/',
    phone: '+39 045 770 1522',
    email: 'info@ugoliniviaggi.it',
    notes: 'Modern fleet of luxury vans, minicoaches, and Gran Turismo buses for lake weddings and airport transfers.'
  },
  bellagiotransfers: {
    name: 'Detailed Drivers Milano & Como',
    base_city: 'Milano',
    website: 'https://detaileddrivers.com',
    fleet_url: 'https://detaileddrivers.com/',
    phone: '+39 02 9147 8230',
    email: 'info@detaileddrivers.com',
    notes: 'High-end private chauffeur and luxury Sprinter minibus service across Milan and Lake Como.'
  }
};

export const LEGACY_DEAD_DOMAINS = {
  'comolaketransfers.it': 'comolaketransfersminibus',
  'lakecomochauffeur.it': 'lakecomochauffeurbusservice',
  'menaggiominibus.it': 'menaggiovipminibustour',
  'lakecomosprinter.it': 'lakecomoexecutivesprinter',
  'milanovipdriver.com': 'milanovipdrivercoach',
  'starlightlimousine.it': 'starlightlimousinecoach',
  'autonoleggibattaglia.it': 'autonoleggiobattaglia',
  'pellegrinibus.it': 'pellegriniautoservizi',
  'benacominibus.it': 'benacominibusncc',
  'silvestribus.it': 'silvestribuslivigno',
  'brianzalimousine.it': 'brianzalimousineminibus',
  'varesevip.it': 'vareseviptransfercoach',
  'maggiorecoach.it': 'stresamaggiorevipcoach',
  'bellagio-transfers.it': 'bellagiotransfers'
};

export function findLegacyReplacement(partner) {
  if (!partner) return null;
  const pNorm = normalizeName(partner.name);
  if (pNorm && LEGACY_OPERATOR_REPLACEMENTS[pNorm]) {
    return LEGACY_OPERATOR_REPLACEMENTS[pNorm];
  }
  const dom = normalizeDomain(partner.website);
  if (dom && LEGACY_DEAD_DOMAINS[dom]) {
    return LEGACY_OPERATOR_REPLACEMENTS[LEGACY_DEAD_DOMAINS[dom]];
  }
  return null;
}

export function hydratePartnerCard(p) {
  if (!p) return p;
  const card = p.score_breakdown?.partner_card || {};
  const cats = Array.isArray(p.fleet_categories) ? p.fleet_categories : [];
  const catText = `${p.name || ''} ${cats.join(' ')} ${p.notes || ''}`.toLowerCase();

  // Infer default bus models & pax capacities from fleet_categories if not explicitly set
  let defaultModels = [];
  let defaultPax = [];
  for (const c of cats) {
    if (/limobus/i.test(c)) { defaultModels.push('Limobus VIP (18–28 pax)'); defaultPax.push('18–28'); }
    else if (/sprinter.*vip/i.test(c)) { defaultModels.push('Mercedes Sprinter VIP (8–16 pax)'); defaultPax.push('8–16'); }
    else if (/sprinter/i.test(c)) { defaultModels.push('Mercedes Sprinter Exec (16–20 pax)'); defaultPax.push('16–20'); }
    else if (/v-?class|minivan/i.test(c)) { defaultModels.push('Mercedes V-Class (7–8 pax)'); defaultPax.push('7–8'); }
    else if (/midibus|indcar|midi/i.test(c)) { defaultModels.push('Indcar / Executive Midibus (24–30 pax)'); defaultPax.push('24–30'); }
    else if (/setra.*vip/i.test(c)) { defaultModels.push('Setra TopClass VIP (28–36 pax)'); defaultPax.push('28–36'); }
    else if (/coach|tourismo|setra|pullman/i.test(c)) { defaultModels.push('Mercedes Tourismo / Setra GT (50–56 pax)'); defaultPax.push('50–56'); }
  }

  const hasLux = /vip|limobus|lounge|v-?class|total\s+black|exclusive|luxury/i.test(catText) || (p.relevance_score || 0) >= 85;
  const hasStd = /tourismo|setra|gt\b|gran\s+turismo|coach|pullman|iveco|scania|irizar|50|52|54|56|60|64/i.test(catText);
  const inferredSegment = (hasLux && hasStd) ? 'both' : hasLux ? 'luxury' : 'standard';

  const isMoveolux = p.id === 'partner_moveolux';
  const fleet_segment = p.fleet_segment || card.fleet_segment || inferredSegment;
  const rawBusModels = p.bus_models ?? card.bus_models ?? ([...new Set(defaultModels)].join(', ') || '');
  const paxAudit = verifyPerBusPaxCapacity({ bus_models: rawBusModels, fleet_categories: cats }, { autoInferKnownStandards: true });
  const bus_models = paxAudit.formattedBusModels || rawBusModels;
  const pax_capacity = p.pax_capacity || card.pax_capacity || paxAudit.formattedPaxSummary || (defaultPax.length ? `${[...new Set(defaultPax)].join(', ')} pax` : '');
  const rate_hourly = p.rate_hourly ?? card.rate_hourly ?? (isMoveolux ? '€120/h' : '');
  const rate_standby = p.rate_standby ?? card.rate_standby ?? (isMoveolux ? '€550 (4h disp.) · €1,050 (8h disp.)' : '');
  const whatsapp = p.whatsapp ?? card.whatsapp ?? p.phone ?? '';
  const client_notes = p.client_notes || card.client_notes || '';
  const email_status = p.email_status || card.email_status || (p.email ? 'mx_ok' : 'unknown');
  const outreach_stage = p.outreach_stage || card.outreach_stage || (
    p.status === 'APPROVED_PARTNER' ? 'partner_won' :
    (rate_hourly || rate_standby || p.replied_at || card.replied_at) ? 'replied' :
    p.status === 'CONTACTED' ? 't1_sent' :
    p.status === 'WANT_TO_CONTACT' ? 'ready' :
    (p.status === 'REJECTED' || p.status === 'NOT_RELEVANT') ? 'closed' : 'to_check'
  );

  const scheduled_at = p.scheduled_at || card.scheduled_at || null;

  const nextCard = {
    ...card,
    fleet_segment,
    bus_models,
    pax_capacity,
    rate_hourly,
    rate_standby,
    whatsapp,
    client_notes,
    email_status,
    outreach_stage,
    scheduled_at,
    replied_at: p.replied_at || card.replied_at || (isMoveolux ? '2026-10-20T10:00:00Z' : null),
    last_outreach_at: p.last_outreach_at || card.last_outreach_at || null,
    user_set_status: Boolean(p.user_set_status || card.user_set_status),
  };

  return {
    ...p,
    fleet_segment,
    bus_models,
    pax_capacity,
    rate_hourly,
    rate_standby,
    whatsapp,
    client_notes,
    email_status,
    outreach_stage,
    scheduled_at,
    replied_at: nextCard.replied_at,
    last_outreach_at: nextCard.last_outreach_at,
    user_set_status: nextCard.user_set_status,
    score_breakdown: {
      ...(p.score_breakdown || { discretion_unbranded: 20, fleet_luxury: 18, territory_permits: 15, corporate_sla: 15 }),
      partner_card: nextCard,
    },
  };
}

export function loadStoredBusPartners() {
  const excluded = loadExcludedBusPartners();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      const statusMigratedKey = 'dorogo_bus_status_reconciled_v2';
      const alreadyReconciledStatus = localStorage.getItem(statusMigratedKey) === '1';
      if (raw) {
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let changed = false;
          // Remove test/dummy entries like "Test Partner"
          const beforeLen = parsed.length;
          parsed = parsed.filter((p) => {
            const n = normalizeName(p.name);
            const d = normalizeDomain(p.website);
            if (n === 'testpartner' || d === 'test-partner-123.it') return false;
            return true;
          });
          if (parsed.length !== beforeLen) changed = true;

          parsed = parsed.map((p) => {
            // 1. Upgrade any legacy prototype entry with non-existent domain to its verified real operator
            const replacement = findLegacyReplacement(p);
            if (replacement) {
              changed = true;
              return hydratePartnerCard({
                ...p,
                ...replacement,
                status: (!alreadyReconciledStatus && p.status === 'WANT_TO_CONTACT' && p.id !== 'partner_vip_limousine' && p.id !== 'partner_transervice') ? 'TO_REVIEW' : (p.status || 'TO_REVIEW')
              });
            }

            // 2. Reconcile Cima Luxury if stored with old erroneous Milano city
            if (p.id === 'partner_cima_luxury' || (p.name === 'Cima Luxury' && (p.base_city === 'Milano' || !p.base_city.includes('Roma')))) {
              changed = true;
              return hydratePartnerCard({
                ...p,
                base_city: 'Roma (Central Italy)',
                phone: '+39 06 35 34 83 45',
                relevance_score: 0,
                score_breakdown: { discretion_unbranded: 32, fleet_luxury: 22, territory_permits: 0, corporate_sla: 16 },
                status: 'NOT_RELEVANT',
                notes: 'Headquartered at Waldorf Astoria Rome Cavalieri (00136 Rome). Out-of-region depot (+39 06) located 570km from Milan/Lake Como with no local Lombardy depot. Disqualified from local Northern Italy dispatch.'
              });
            }
            // 3. One-time reconciliation of scouted operators that erroneously defaulted to WANT_TO_CONTACT
            if (
              !alreadyReconciledStatus &&
              !p.user_set_status &&
              !p.score_breakdown?.partner_card?.user_set_status &&
              p.status === 'WANT_TO_CONTACT' &&
              p.id !== 'partner_vip_limousine' &&
              p.id !== 'partner_transervice'
            ) {
              changed = true;
              return hydratePartnerCard({
                ...p,
                status: 'TO_REVIEW'
              });
            }
            return hydratePartnerCard(p);
          });

          if (!alreadyReconciledStatus) {
            try { localStorage.setItem(statusMigratedKey, '1'); } catch (_) {}
          }

          // Deduplicate and combine by normalized name or domain after upgrades
          const nameMap = new Map();
          const domainMap = new Map();
          const deduped = [];
          for (const p of parsed) {
            if (isBusPartnerExcluded(p, excluded)) {
              changed = true;
              continue;
            }
            const n = normalizeName(p.name);
            const d = normalizeDomain(p.website);
            const existing = (n && nameMap.get(n)) || (d && domainMap.get(d));
            if (existing) {
              mergePartnerRecords(existing, p);
              changed = true;
              if (n && !nameMap.has(n)) nameMap.set(n, existing);
              if (d && !domainMap.has(d)) domainMap.set(d, existing);
              continue;
            }
            if (n) nameMap.set(n, p);
            if (d) domainMap.set(d, p);
            deduped.push(p);
          }

          if (changed || deduped.length !== parsed.length) {
            saveStoredBusPartners(deduped);
          }
          return deduped;
        }
      }
    }
  } catch (_) {}
  return INITIAL_BUS_PARTNERS.filter((p) => !isBusPartnerExcluded(p, excluded)).map(hydratePartnerCard);
}

export function saveStoredBusPartners(list) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}
