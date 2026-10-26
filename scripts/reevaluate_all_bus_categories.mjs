// Re-evaluate and apply ground-truth verified fleet categories, models, and capacities across all 56 bus partners
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = "https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1";
const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374";

export const FULL_VERIFIED_FLEET_MAP = {
  // 1. Cima Luxury (Milano)
  partner_cima_luxury: {
    fleet_categories: [
      'Minibus VIP (9–20 seats)',
      'Setra 411 HD Bus di Lusso (28 seats)',
      'Neoplan Starliner Limobus (30 seats)',
      'Bus Gran Turismo (80 seats)'
    ],
    bus_models: 'Minibus VIP (9–20 pax), Setra 411 HD (28 pax), Neoplan Starliner Limobus (30 pax), Bus Gran Turismo (80 pax)',
    pax_capacity: '9–20, 28, 30, 80 pax',
    fleet_segment: 'luxury'
  },

  // 2. Moveolux (Milano)
  partner_moveolux: {
    fleet_categories: [
      'Limobus Exclusive (18 seats)',
      'Mercedes Sprinter VIP (16 & 19 seats)',
      'Setra VIP Lounge Coach (30 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (16 & 19 pax), Limobus Exclusive (18 pax), Setra VIP Lounge Coach (30 pax)',
    pax_capacity: '16, 18, 19, 30 pax',
    fleet_segment: 'luxury'
  },

  // 3. Vivaldi Driver Bellagio (Lake Como)
  partner_1792765278957_tgxp: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes-Benz Sprinter VIP (8 seats)',
      'Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter VIP (8 pax), Mercedes Sprinter Nero VIP w/ Hostess (19 pax), Mercedes Classe V (7 pax)',
    pax_capacity: '7, 8, 19 pax',
    fleet_segment: 'luxury'
  },

  // 4. VIP Limousine Milan (Milano)
  partner_vip_limousine: {
    fleet_categories: [
      'Mercedes Classe V (7 seats)',
      'Mercedes Sprinter 315 Luxury (8 seats)',
      'Mercedes Sprinter 519 Tomassini Luxury (16 seats)',
      'Pullman di Lusso (21, 28, 30, 56, 64, 79 seats)'
    ],
    bus_models: 'Mercedes Sprinter 315 Luxury (8 pax), Mercedes Sprinter 519 Tomassini Luxury (16 pax), Pullman di Lusso (21, 28, 30, 56, 64, 79 pax)',
    pax_capacity: '7, 8, 16, 21, 28, 30, 56, 64, 79 pax',
    fleet_segment: 'luxury'
  },

  // 5. Viganò Autoservizi (Nibionno - Como/Lecco)
  partner_1793031479651_9_4o1d: {
    fleet_categories: [
      'Mercedes Sprinter (22 seats)',
      'Sprinter Grande Capri (19 seats)',
      'Setra 515 (51 seats)',
      'Mercedes Tourismo (53–55 seats)',
      'Mercedes Travego (53 seats)'
    ],
    bus_models: 'Mercedes Sprinter (22 pax), Sprinter Grande Capri (19 pax), Setra 515 (51 pax), Mercedes Tourismo (53–55 pax), Mercedes Travego (53 pax)',
    pax_capacity: '19, 22, 51, 53–55 pax',
    fleet_segment: 'both'
  },

  // 6. Rampinini Turismo (Fino Mornasco - Como)
  partner_1793031479651_12_2dpf: {
    fleet_categories: [
      'Mercedes Sprinter (8 seats)',
      'Temsa Wing / Iveco Midibus (25–28 seats)',
      'Scania Touring & Iveco Magelys GT Coach (54–56 seats)',
      'Van Hool Astromega Double-Decker (86 seats)'
    ],
    bus_models: 'Mercedes Sprinter (8 pax), Temsa Wing / Iveco Midibus (25–28 pax), Scania Touring & Iveco Magelys GT (54–56 pax), Van Hool Astromega (86 pax)',
    pax_capacity: '8, 25–28, 54–56, 86 pax',
    fleet_segment: 'both'
  },

  // 7. Como Limo Lux (Como)
  partner_1792765279410_2zml: {
    fleet_categories: [
      'Mercedes-Benz V-Class Luxury Minivan (7 seats)'
    ],
    bus_models: 'Mercedes-Benz V-Class Luxury Minivan (7 pax)',
    pax_capacity: '7 pax',
    fleet_segment: 'luxury'
  },

  // 8. Landway Tourism (Milano)
  partner_1792761170109_96nx: {
    fleet_categories: [
      'Minibus GT (20 seats)',
      'Iveco Midibus (30 seats)',
      'Mercedes Tourismo & Setra GT Coach (50 seats)'
    ],
    bus_models: 'Minibus GT (20 pax), Iveco Midibus (30 pax), Mercedes Tourismo & Setra GT (50 pax)',
    pax_capacity: '20, 30, 50 pax',
    fleet_segment: 'both'
  },

  // 9. Berini Autonoleggio & Minibus (Como)
  partner_1792765278630_r4vp: {
    fleet_categories: [
      'Mercedes Classe V VIP (7 seats)',
      'Mercedes Minibus Extralong Luxury (8 seats)',
      'Executive Minibus (20 seats)',
      'Executive Midibus (26 seats)'
    ],
    bus_models: 'Mercedes Minibus Extralong Luxury (8 pax), Executive Minibus (20 pax), Executive Midibus (26 pax), Mercedes Classe V (7 pax)',
    pax_capacity: '7, 8, 20, 26 pax',
    fleet_segment: 'both'
  },

  // 10. Cavourese (Torino / Piemonte)
  partner_1793031479649_0_atcl: {
    fleet_categories: [
      'Minivan NCC (16 seats)',
      'Minibus (35 seats)',
      'Autobus Gran Turismo (63 seats)',
      'Autobus Doppio Piano (79 seats)'
    ],
    bus_models: 'Minivan NCC (16 pax), Minibus (35 pax), Autobus GT (63 pax), Autobus Doppio Piano (79 pax)',
    pax_capacity: '16, 35, 63, 79 pax',
    fleet_segment: 'both'
  },

  // 11. Morandi Tour (Varese)
  partner_1793031479651_11_r6tm: {
    fleet_categories: [
      'Minibus GT (8–19 seats)',
      'Midibus (25–35 seats)',
      'Mercedes Tourismo & Setra GT (54–85 seats)'
    ],
    bus_models: 'Minibus GT (8–19 pax), Midibus (25–35 pax), Mercedes Tourismo & Setra GT (54–85 pax)',
    pax_capacity: '8–19, 25–35, 54–85 pax',
    fleet_segment: 'both'
  },

  // 12. Exclusive Cars Milano (Milano)
  partner_1792765279743_bk0p: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes-Benz Sprinter Minibus (20 seats)',
      'Irizar GT Coach (52 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Minibus (20 pax), Mercedes-Benz Classe V (7 pax), Irizar GT Coach (52 pax)',
    pax_capacity: '7, 20, 52 pax',
    fleet_segment: 'both'
  },

  // 13. Transervice Limousine (Milano)
  partner_transervice: {
    fleet_categories: [
      'Mercedes Classe V (7 seats)',
      'Mercedes Sprinter Luxury Minibus (8 seats)',
      'Mercedes "Alis" Custom VIP Bus (19 seats)',
      'Pullman Lusso GT (16–75 seats)'
    ],
    bus_models: 'Mercedes Sprinter Luxury (8 pax), Mercedes "Alis" Custom VIP Bus (19 pax), Mercedes Classe V (7 pax), Pullman Lusso (16–75 pax)',
    pax_capacity: '7, 8, 19, 16–75 pax',
    fleet_segment: 'luxury'
  },

  // 14. Avantgarde Limousine Service (Milano)
  partner_1792765279535_l9ei: {
    fleet_categories: [
      'Mercedes Classe V (7–8 seats)',
      'Mercedes Sprinter VIP (8 seats)',
      'Mercedes Minibus (16 seats)',
      'Mercedes Minibus VIP Class (18 seats)',
      'Executive Midibus (25 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (8 pax), Mercedes Minibus (16 pax), Mercedes Minibus VIP Class (18 pax), Executive Midibus (25 pax)',
    pax_capacity: '7–8, 8, 16, 18, 25 pax',
    fleet_segment: 'luxury'
  },

  // 15. Castano Turismo (Varese / Milano)
  partner_1793031479651_1_wjsp: {
    fleet_categories: [
      'Auto NCC (4 seats)',
      'Minibus (8 seats)',
      'Autobus Minibus (20 seats)',
      'Midibus (36 seats)',
      'Pullman Gran Turismo (52–54 seats)'
    ],
    bus_models: 'Minibus (8 pax), Autobus Minibus (20 pax), Midibus (36 pax), Pullman Gran Turismo (52–54 pax)',
    pax_capacity: '4, 8, 20, 36, 52–54 pax',
    fleet_segment: 'both'
  },

  // 16. Autoservizi Cazzaniga Silvestro (Barzago - Lecco)
  partner_1793031479651_13_f82y: {
    fleet_categories: [
      'VW Caravelle (8 seats)',
      'Mercedes Capri (20 seats)',
      'Irizar MAN Century Midibus (40 seats)',
      'Setra & Mercedes Tourismo GT Coaches (52–60 seats)'
    ],
    bus_models: 'VW Caravelle (8 pax), Mercedes Capri (20 pax), Irizar MAN Century Midibus (40 pax), Setra & Mercedes Tourismo GT Coaches (52–60 pax)',
    pax_capacity: '8, 20, 40, 52–60 pax',
    fleet_segment: 'both'
  },

  // 17. Como Driver Services (Como)
  partner_1792765279097_26hr: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes Sprinter Minibus (12 seats)',
      'Ford Transit Minibus (16 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (12 pax), Ford Transit Minibus (16 pax), Mercedes Classe V (7 pax)',
    pax_capacity: '7, 12, 16 pax',
    fleet_segment: 'both'
  },

  // 18. Prestige Car Limousine (Milano)
  partner_1792761050695_9k2e: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes-Benz Sprinter Luxury Minibus (8 & 16 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Luxury Minibus (8 & 16 pax, reclining leather & tables), Mercedes Classe V (7 pax)',
    pax_capacity: '7, 8, 16 pax',
    fleet_segment: 'luxury'
  },

  // 19. Autoservizi Zambetti (Bergamo)
  partner_1793031479651_2_b7ae: {
    fleet_categories: [
      'Iveco Daily Tourys Minibus (19 seats)',
      'Executive Midibus (28–34 seats)',
      'Scania Touring HD & Mercedes Tourismo (54 seats)',
      'Double Decker GT (82 seats)'
    ],
    bus_models: 'Iveco Daily Tourys Minibus (19 pax), Executive Midibus (28–34 pax), Scania Touring HD & Mercedes Tourismo (54 pax), Double Decker GT (82 pax)',
    pax_capacity: '19, 28–34, 54, 82 pax',
    fleet_segment: 'both'
  },

  // 20. Autoservizi Perico (Bergamo)
  partner_1793031479651_14_wrph: {
    fleet_categories: [
      'Minivan NCC (7–8 seats)',
      'Mercedes Tourismo & Travego (50–54 seats)',
      'Volvo 9700 (52 seats)',
      'Irizar i6 & Century (53–55 seats)'
    ],
    bus_models: 'Mercedes Tourismo & Travego (50–54 pax), Volvo 9700 (52 pax), Irizar i6 & Century (53–55 pax), Minivan NCC (7–8 pax)',
    pax_capacity: '7–8, 50–55 pax',
    fleet_segment: 'standard'
  },

  // 21. Stat Turismo (Casale Monferrato / Milano / Genova)
  partner_1793031479651_19_75aq: {
    fleet_categories: [
      'Irizar PB & Century HDH (38–53 seats)',
      'Irizar i6 HDH (51–63 seats)',
      'Scania & Mercedes GT Coach (50–64 seats)'
    ],
    bus_models: 'Irizar PB & Century HDH (38–53 pax), Irizar i6 HDH (51–63 pax), Scania & Mercedes GT (50–64 pax)',
    pax_capacity: '38–64 pax',
    fleet_segment: 'both'
  },

  // 22. Italeurobus (Milano)
  partner_1793031479651_15_fgcv: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 23. Autoservizi Comazzi (Borgomanero / Domodossola)
  partner_1793031479651_18_caqw: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Iveco & Otokar Midibus (30 seats)',
      'Bova VDL & Van Hool Astromega GT Coaches (54–94 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Iveco & Otokar Midibus (30 pax), Bova VDL & Van Hool Astromega GT (54–94 pax)',
    pax_capacity: '19, 30, 54–94 pax',
    fleet_segment: 'both'
  },

  // 24. Bassi Tours (Brescia)
  partner_1793031479651_3_6l9j: {
    fleet_categories: [
      'Mercedes Sprinter (16 seats)',
      'Iveco Midibus (28 seats)',
      'Setra GT Coach (54 & 64 seats)',
      'Autobus GT Maxi (80 seats)'
    ],
    bus_models: 'Mercedes Sprinter (16 pax), Iveco Midibus (28 pax), Setra GT Coach (54 & 64 pax), Autobus GT Maxi (80 pax)',
    pax_capacity: '16, 28, 54, 64, 80 pax',
    fleet_segment: 'both'
  },

  // 25. Travel & Service Como (Broker / Network)
  partner_1792765279227_h3qg: {
    fleet_categories: [
      'Minivan NCC (5–8 seats)',
      'Minibus (14–20 seats)',
      'Midibus (31 seats)',
      'Pullman GT Coaches (50–54, 55–56, 57–64 seats)',
      'Double-Decker GT (90–94 seats)'
    ],
    bus_models: 'Minibus (14–20 pax), Midibus (31 pax), Pullman GT (50–64 pax), Double-Decker Pullman (90–94 pax)',
    pax_capacity: '5–8, 14–20, 31, 50–64, 90–94 pax',
    fleet_segment: 'standard'
  },

  // 26. Bolognini Autoservizi (Verbania - Lake Maggiore)
  partner_1793031479651_17_6bsj: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Midibus (29 seats)',
      'Pullman GT (52 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Midibus (29 pax), Pullman GT (52 pax)',
    pax_capacity: '19, 29, 52 pax',
    fleet_segment: 'both'
  },

  // 27. Caprioli Viaggi VIP Minibus (Brescia / Verona)
  partner_1792765280013_poa6: {
    fleet_categories: [
      'Monovolume NCC (7 seats)',
      'Mercedes Sprinter Minibus (16 seats)',
      'Minibus GT (25 seats)',
      'Setra GT Coaches (30, 42, 52 seats)',
      'Irizar i8 Pullman GTL Lusso (60 seats)'
    ],
    bus_models: 'Monovolume NCC (7 pax), Mercedes Sprinter Minibus (16 pax), Minibus GT (25 pax), Setra GT Coaches (30, 42, 52 pax), Irizar i8 Pullman GTL Lusso (60 pax)',
    pax_capacity: '7, 16, 25, 30, 42, 52, 60 pax',
    fleet_segment: 'both'
  },

  // 28. Rossi Pietro Bus (Gazzada Schianno - Varese)
  partner_1793031479651_6_rmj2: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (52–56 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52–56 pax)',
    pax_capacity: '19, 52–56 pax',
    fleet_segment: 'both'
  },

  // 29. Car Service Milan (Milano) - EXACT 8-SEAT VIP SPRINTER VERIFIED
  partner_1792761050955_n0vc: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes-Benz Sprinter Luxury Minibus (8 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Luxury Minibus (8 pax, reclining leather & privacy glass), Mercedes-Benz Classe V (7 pax)',
    pax_capacity: '7, 8 pax',
    fleet_segment: 'luxury'
  },

  // 30. Peschiera Viaggi Luxury Coaches (Peschiera del Garda)
  partner_1793030996360_0w9g: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Midibus (30 seats)',
      'Pullman GT (54–62 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Midibus (30 pax), Pullman GT (54–62 pax)',
    pax_capacity: '19, 30, 54–62 pax',
    fleet_segment: 'both'
  },

  // 31. M. Bonaccorsi Tours (Brescia)
  partner_1793031479651_8_6l1r: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 32. Pancheri NCC & Minibus (Brescia)
  partner_1792765280113_5c8r: {
    fleet_categories: [
      'Mercedes Viano (7 seats)',
      'Mercedes Sprinter Minibus (8 seats)',
      'Iveco Daily Minibus (20 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (8 pax), Iveco Daily Minibus (20 pax), Mercedes Viano (7 pax)',
    pax_capacity: '7, 8, 20 pax',
    fleet_segment: 'both'
  },

  // 33. Ilton Autonoleggi (Bergamo / Brescia)
  partner_1793030995868_be2m: {
    fleet_categories: [
      'Mercedes Classe V VIP (6 & 8 seats)',
      'Autobus Gran Turismo (12–50 seats)'
    ],
    bus_models: 'Mercedes Classe V VIP (6 & 8 pax), Autobus Gran Turismo (12–50 pax)',
    pax_capacity: '6, 8, 12–50 pax',
    fleet_segment: 'both'
  },

  // 34. Autonoleggio Carnelli (Milano)
  partner_1792765279877_4d0c: {
    fleet_categories: [
      'Mercedes Minivan (8 seats)',
      'Mercedes Sprinter (20 seats)',
      'Temsa MD-7 (32–36 seats)',
      'Neoplan Tourliner (52–56 seats)'
    ],
    bus_models: 'Mercedes Minivan (8 pax), Mercedes Sprinter (20 pax), Temsa MD-7 (32–36 pax), Neoplan Tourliner (52–56 pax)',
    pax_capacity: '8, 20, 32–36, 52–56 pax',
    fleet_segment: 'both'
  },

  // 35. Air Car Service (Milano)
  partner_1793016425770_x3h4: {
    fleet_categories: [
      'Mercedes-Benz Classe V (7 seats)',
      'Mercedes Sprinter VIP (16 seats)',
      'Autobus Granturismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (16 pax), Autobus Granturismo (54 pax), Mercedes Classe V (7 pax)',
    pax_capacity: '7, 16, 54 pax',
    fleet_segment: 'both'
  },

  // 36. Gardabus Exclusive (Lago di Garda)
  partner_1793030996491_wete: {
    fleet_categories: [
      'Mercedes Sprinter VIP (16 seats)',
      'Setra GT Coach (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (16 pax), Setra GT Coach (54 pax)',
    pax_capacity: '16, 54 pax',
    fleet_segment: 'both'
  },

  // 37. Cattazzo Pullman (Verona)
  partner_1793030996812_339h: {
    fleet_categories: [
      'Mercedes Sprinter Capri (17 seats)',
      'Mercedes Sprinter Amalfi & Tourline (20 seats)',
      'Executive Midibus (30 seats)',
      'Neoplan Tourliner (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Capri (17 pax), Mercedes Sprinter Amalfi/Tourline (20 pax), Executive Midibus (30 pax), Neoplan Tourliner (54 pax)',
    pax_capacity: '17, 20, 30, 54 pax',
    fleet_segment: 'both'
  },

  // 38. Luxury Transfer Milan (Milano)
  partner_1793030997076_cyc8: {
    fleet_categories: [
      'Mercedes Sprinter Bus (14 seats)'
    ],
    bus_models: 'Mercedes Sprinter Bus (14 pax)',
    pax_capacity: '14 pax',
    fleet_segment: 'luxury'
  },

  // 39. Bormio Viaggi Luxury Lines (Bormio / Livigno)
  partner_1793030996893_sp4m: {
    fleet_categories: [
      'Mercedes Classe V (7 seats)',
      'Mercedes Sprinter 317 (8 seats)',
      'Mercedes Sprinter 518 (19 seats)',
      'Daily Tourismo (21 seats)',
      'Setra 515 & Mercedes Tourismo GT (49–51 seats)',
      'MAN Lion\'s Coach (63 seats)'
    ],
    bus_models: 'Mercedes Classe V (7 pax), Mercedes Sprinter 317 (8 pax), Mercedes Sprinter 518 (19 pax), Daily Tourismo (21 pax), Setra 515 & Mercedes Tourismo GT (49–51 pax), MAN Lion\'s Coach (63 pax)',
    pax_capacity: '7, 8, 19, 21, 49–51, 63 pax',
    fleet_segment: 'both'
  },

  // 40. Consorzio Eurobus Verona (Verona)
  partner_1793030996589_2k6k: {
    fleet_categories: [
      'Minibus GT (19 seats)',
      'Pullman Gran Turismo (54 seats)',
      'Autobus Maxi (84 seats)'
    ],
    bus_models: 'Minibus (19 pax), Pullman GT (54 pax), Autobus Maxi (84 pax)',
    pax_capacity: '19, 54, 84 pax',
    fleet_segment: 'both'
  },

  // 41. Autoservizi Guizzetti (Bergamo)
  partner_1793030996221_7t9y: {
    fleet_categories: [
      'Iveco Daily Tourist / Indcar Wing (19–28 seats)',
      'Setra 515 HD & Irizar i6 (53–54 seats)',
      'Setra 415 GT-HD (55 seats)',
      'Setra 416 GT & 417 HDH (59–64 seats)'
    ],
    bus_models: 'Iveco Daily / Indcar Wing (19–28 pax), Setra 515 HD & Irizar i6 (53–54 pax), Setra 415 GT-HD (55 pax), Setra 416/417 HDH (59–64 pax)',
    pax_capacity: '19–28, 53–55, 59–64 pax',
    fleet_segment: 'both'
  },

  // 42. Ugolini Viaggi (Verona)
  partner_1793030997210_o8w4: {
    fleet_categories: [
      'Executive Midibus (28 seats)',
      'Setra & Mercedes GT Coach (54 seats)'
    ],
    bus_models: 'Executive Midibus (28 pax), Setra & Mercedes GT Coach (54 pax)',
    pax_capacity: '28, 54 pax',
    fleet_segment: 'both'
  },

  // 43. Perletti Autoservizi (Top Class Line) (Bergamo / Milano)
  partner_perletti_topclass: {
    fleet_categories: [
      'Mercedes-Benz Classe V 250 (7 seats)',
      'Mercedes Gran Capri Minibus (20 seats)',
      'Iveco Wing & Mago 2 (28–29 seats)',
      'Mercedes Tourismo & Setra 515 GT (51–55 seats)',
      'Mercedes Tourismo RHD-L Maxibus (64 seats)'
    ],
    bus_models: 'Mercedes Gran Capri (20 pax), Iveco Wing & Mago 2 (28–29 pax), Mercedes Tourismo & Setra 515 GT (51–55 pax), Mercedes Tourismo RHD-L Maxibus (64 pax)',
    pax_capacity: '7, 20, 28–29, 51–55, 64 pax',
    fleet_segment: 'both'
  },

  // 44. Autoservizi Rainoldi NCC (Sondrio / Teglio)
  partner_1793030996978_x4p9: {
    fleet_categories: [
      'Mercedes Minibus (8, 16, 19 seats)',
      'Midibus GT (27 seats)',
      'Setra & Mercedes GT Coach (56 seats)'
    ],
    bus_models: 'Mercedes Minibus (8, 16, 19 pax), Midibus GT (27 pax), Setra & Mercedes GT Coach (56 pax)',
    pax_capacity: '8, 16, 19, 27, 56 pax',
    website: 'https://www.rainoldibus.com',
    email: 'info@rainoldibus.com',
    fleet_segment: 'both'
  },

  // 45. Lariobus (Lecco / Lake Como)
  partner_lariobus: {
    fleet_categories: [
      'Ford Transit Minibus (13 seats)',
      'Mercedes Sprinter IBIS 2 (20 seats)',
      'Iveco Calipso Midibus (36 seats)',
      'Temsa MD9 (40 seats)',
      'Mercedes Tourismo & Irizar i6 (54–56 seats)'
    ],
    bus_models: 'Ford Transit (13 pax), Mercedes Sprinter IBIS 2 (20 pax), Iveco Calipso (36 pax), Temsa MD9 (40 pax), Mercedes Tourismo & Irizar i6 (54–56 pax)',
    pax_capacity: '13, 20, 36, 40, 54–56 pax',
    fleet_segment: 'both'
  },

  // 46. Autoservizi Sonzogni (Bergamo)
  partner_1793031033043_nx6z: {
    fleet_categories: [
      'Minivan NCC (8 seats)',
      'Minibus (41 seats)',
      'Pullman Gran Turismo Irizar (48–64 seats)'
    ],
    bus_models: 'Minivan NCC (8 pax), Minibus (41 pax), Pullman Gran Turismo Irizar (48–64 pax)',
    pax_capacity: '8, 41, 48–64 pax',
    fleet_segment: 'both'
  },

  // 47. Air Pullman VIP Line (Milano)
  partner_1793031032925_1w89: {
    fleet_categories: [
      'Minibus VIP (9 seats)',
      'Executive Midibus (38 seats)',
      'Setra GT Coach (54–80 seats)'
    ],
    bus_models: 'Minibus VIP (9 pax), Executive Midibus (38 pax), Setra GT Coach (54–80 pax)',
    pax_capacity: '9, 38, 54–80 pax',
    fleet_segment: 'both'
  },

  // 48. Linea Azzurra Bus (Milano / Moncalieri)
  partner_linea_azzurra: {
    fleet_categories: [
      'Minivan (6–8 seats)',
      'Minibus (16–19 seats)',
      'Midibus (25–30 seats)',
      'Autobus GT Coaches (45–54 seats)',
      'Autobus Long / Double-Decker (60–80 seats)'
    ],
    bus_models: 'Minivan (6–8 pax), Minibus (16–19 pax), Midibus (25–30 pax), Autobus GT (45–54 pax), Autobus Long/Double-Decker (60–80 pax)',
    pax_capacity: '6–8, 16–19, 25–30, 45–54, 60–80 pax',
    fleet_segment: 'both'
  },

  // 49. Rosa Bus (Pavia / Milano)
  partner_rosa_bus: {
    fleet_categories: [
      'Mercedes Tourengo 818 Midibus (29–30 seats)',
      'Autobus Gran Turismo (54, 64, 83 seats)'
    ],
    bus_models: 'Mercedes Tourengo 818 Midibus (29–30 pax), Autobus GT (54, 64, 83 pax)',
    pax_capacity: '29–30, 54, 64, 83 pax',
    fleet_segment: 'both'
  },

  // 50. Bergamo Transfer (Bergamo)
  partner_1793031479651_16_z7uf: {
    fleet_categories: [
      'Mercedes-Benz Berlina (3–4 seats)',
      'Minivan & Minibus NCC (fino a 8 seats)'
    ],
    bus_models: 'Mercedes-Benz Minivan & Minibus NCC (8 pax), Mercedes Berlina (3–4 pax)',
    pax_capacity: '3–4, 8 pax',
    fleet_segment: 'luxury'
  },

  // 51. Bus Company (Piemonte / Torino / Cuneo)
  partner_1793031479651_7_9rqt: {
    fleet_categories: [
      'Minibus (20 seats)',
      'Midibus (28–32 seats)',
      'Pullman GT (52–80 seats)'
    ],
    bus_models: 'Minibus (20 pax), Midibus (28–32 pax), Pullman GT (52–80 pax)',
    pax_capacity: '20, 28–32, 52–80 pax',
    fleet_segment: 'standard'
  },

  // 52. Pasqualini Bus (Verona)
  partner_1793031479651_5_i74u: {
    fleet_categories: [
      'Minibus GT (16–19 seats)',
      'Midibus (28–32 seats)',
      'Pullman GT (52–60 seats)',
      'Double Decker GT (80 seats)'
    ],
    bus_models: 'Minibus (16–19 pax), Midibus (28–32 pax), Pullman GT (52–60 pax), Double Decker GT (80 pax)',
    pax_capacity: '16–19, 28–32, 52–60, 80 pax',
    fleet_segment: 'standard'
  },

  // 53. Zani Viaggi Executive (Milano / Bergamo)
  partner_1793031032498_gxg7: {
    fleet_categories: [
      'Mercedes Sprinter Executive (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Executive (19 pax), Pullman Gran Turismo (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 54. Autoservizi Facchinetti (Bergamo)
  partner_1793031479651_4_xsml: {
    fleet_categories: [
      'Mercedes Sprinter (20 seats)',
      'Iveco Midibus (29 seats)',
      'Temsa VIP Safari (46 seats)',
      'Temsa Safari HD (54–58 seats)'
    ],
    bus_models: 'Mercedes Sprinter (20 pax), Iveco Midibus (29 pax), Temsa VIP Safari (46 pax), Temsa Safari HD (54–58 pax)',
    pax_capacity: '20, 29, 46, 54–58 pax',
    fleet_segment: 'both'
  },

  // 55. Autoservizi Radaelli (Monza Brianza / Milano)
  partner_1793031479651_10_3kbi: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (52 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52 pax)',
    pax_capacity: '19, 52 pax',
    fleet_segment: 'standard'
  },

  // 56. Frigerio Trasporti (Giussano - Monza Brianza / Como)
  partner_1793031033153_oyw9: {
    fleet_categories: [
      'Executive Midibus (28 seats)',
      'Pullman GT (54 seats)'
    ],
    bus_models: 'Executive Midibus (28 pax), Pullman GT (54 pax)',
    pax_capacity: '28, 54 pax',
    fleet_segment: 'both'
  }
};

async function syncAll() {
  console.log(`Starting ground-truth synchronization for all ${Object.keys(FULL_VERIFIED_FLEET_MAP).length} partners...`);

  // 1. Load data/bus_partners.json
  const busPartnersPath = path.resolve('data/bus_partners.json');
  const partners = JSON.parse(fs.readFileSync(busPartnersPath, 'utf8'));

  let updatedCount = 0;
  for (const p of partners) {
    const verified = FULL_VERIFIED_FLEET_MAP[p.id];
    if (verified) {
      p.fleet_categories = verified.fleet_categories;
      if (!p.score_breakdown) p.score_breakdown = {};
      if (!p.score_breakdown.partner_card) p.score_breakdown.partner_card = {};
      
      p.score_breakdown.partner_card.bus_models = verified.bus_models;
      p.score_breakdown.partner_card.pax_capacity = verified.pax_capacity;
      p.score_breakdown.partner_card.fleet_segment = verified.fleet_segment;
      p.score_breakdown.partner_card.fleet_audit_verified_at = new Date().toISOString();

      if (verified.website) p.website = verified.website;
      if (verified.email) p.email = verified.email;

      // Top level backward compatibility
      p.bus_models = verified.bus_models;
      p.pax_capacity = verified.pax_capacity;
      p.fleet_segment = verified.fleet_segment;
      updatedCount++;
    }
  }

  fs.writeFileSync(busPartnersPath, JSON.stringify(partners, null, 2), 'utf8');
  console.log(`Updated data/bus_partners.json (${updatedCount} partners updated).`);

  // 2. Update app/bus_partners_data.js safely preserving helpers
  const appDataJsPath = path.resolve('app/bus_partners_data.js');
  const existingAppContent = fs.readFileSync(appDataJsPath, 'utf8');
  const helpersStartIndex = existingAppContent.indexOf('];\n\nconst STORAGE_KEY');
  const helpersPart = helpersStartIndex !== -1 
    ? existingAppContent.slice(helpersStartIndex + 2) 
    : existingAppContent.slice(existingAppContent.indexOf('const STORAGE_KEY'));

  const newAppContent = `// Default verified seed data for luxury bus & minibus partners in Northern Italy
import { calculateBusRelevanceScore, verifyPerBusPaxCapacity } from '../supabase/functions/_shared/core/index.js';

export const INITIAL_BUS_PARTNERS = ${JSON.stringify(partners, null, 2)};
${helpersPart}`;

  fs.writeFileSync(appDataJsPath, newAppContent, 'utf8');
  console.log('Updated app/bus_partners_data.js with fresh seed data and preserved helper functions.');

  // 3. Update ground_truth_fleet_audit.json
  const gtPath = path.resolve('data/ground_truth_fleet_audit.json');
  if (fs.existsSync(gtPath)) {
    const gtData = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
    for (const g of gtData) {
      const v = FULL_VERIFIED_FLEET_MAP[g.id];
      if (v) {
        g.current_categories = v.fleet_categories;
        g.current_models = v.bus_models;
        g.current_pax = v.pax_capacity;
      }
    }
    fs.writeFileSync(gtPath, JSON.stringify(gtData, null, 2), 'utf8');
    console.log('Updated data/ground_truth_fleet_audit.json.');
  }

  // 4. Update Supabase REST API
  console.log('Updating Supabase remote database...');
  let supabaseSuccess = 0;
  let supabaseFail = 0;

  for (const [id, v] of Object.entries(FULL_VERIFIED_FLEET_MAP)) {
    try {
      // First fetch current record to preserve notes, user flags, etc.
      const getRes = await fetch(`${SUPABASE_URL}/bus_partners?id=eq.${encodeURIComponent(id)}&select=*`, {
        headers: {
          apikey: SRK,
          Authorization: `Bearer ${SRK}`
        }
      });
      const rows = await getRes.json();
      if (!rows || rows.length === 0) {
        console.warn(`Partner ${id} not found in Supabase (skipping DB update)`);
        continue;
      }

      const existing = rows[0];
      const existingCard = existing.score_breakdown?.partner_card || {};
      
      const updatedCard = {
        ...existingCard,
        bus_models: v.bus_models,
        pax_capacity: v.pax_capacity,
        fleet_segment: v.fleet_segment,
        fleet_audit_verified_at: new Date().toISOString()
      };

      const payload = {
        fleet_categories: v.fleet_categories,
        score_breakdown: {
          ...existing.score_breakdown,
          partner_card: updatedCard
        },
        updated_at: new Date().toISOString()
      };

      if (v.website) payload.website = v.website;
      if (v.email && (!existing.email || existing.email.includes('unknown'))) payload.email = v.email;

      const patchRes = await fetch(`${SUPABASE_URL}/bus_partners?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          apikey: SRK,
          Authorization: `Bearer ${SRK}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (patchRes.ok) {
        supabaseSuccess++;
      } else {
        const errText = await patchRes.text();
        console.error(`Failed updating ${id}:`, errText);
        supabaseFail++;
      }
    } catch (err) {
      console.error(`Error updating partner ${id} in Supabase:`, err);
      supabaseFail++;
    }
  }

  console.log(`Supabase Sync Complete: ${supabaseSuccess} updated, ${supabaseFail} failed.`);
}

syncAll().catch(console.error);
