import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = "https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1";
const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374";

// Exact ground-truth website fleet mappings for all 54 Northern Italy operators
export const VERIFIED_CUSTOM_FLEET_MAP = {
  // 1. Viganò Autoservizi (Nibionno - Como/Lecco)
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

  // 2. Autonoleggio Carnelli (Milano)
  partner_1792765279877_4d0c: {
    fleet_categories: [
      'Mercedes Minibus (8 seats)',
      'Mercedes Sprinter (20 seats)',
      'Temsa MD-7 (32–36 seats)',
      'Neoplan Tourliner (52–56 seats)'
    ],
    bus_models: 'Mercedes Minibus (8 pax), Mercedes Sprinter (20 pax), Temsa MD-7 (32–36 pax), Neoplan Tourliner (52–56 pax)',
    pax_capacity: '8, 20, 32–36, 52–56 pax',
    fleet_segment: 'both'
  },

  // 3. Cattazzo Pullman (Bormio (Alps))
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

  // 4. Autoservizi Facchinetti (Milano / Bergamo)
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

  // 5. Autoservizi Guizzetti (Brescia)
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

  // 6. Autoservizi Zambetti (Brescia / Bergamo)
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

  // 7. Lariobus (Lecco (Lake Como))
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

  // 8. Caprioli Viaggi VIP Minibus (Brescia)
  partner_1792765280013_poa6: {
    fleet_categories: [
      'Mercedes-Benz Sprinter Minibus (8 & 16–20 seats)',
      'Minibus (25 seats)',
      'Setra GT Coaches (30, 42, 54 seats)',
      'Irizar i8 Pullman GTL Lusso (60 seats)'
    ],
    bus_models: 'Mercedes Sprinter (8 & 16–20 pax), Minibus (25 pax), Setra GT (30, 42, 54 pax), Irizar i8 Pullman GTL Lusso (60 pax)',
    pax_capacity: '8, 16–20, 25, 30, 42, 54, 60 pax',
    fleet_segment: 'both'
  },

  // 9. Travel & Service Como (Como)
  partner_1792765279227_h3qg: {
    fleet_categories: [
      'Minibus (14–20 seats)',
      'Midibus (31 seats)',
      'Pullman GT Coaches (50–54, 55–56, 57–64 seats)',
      'Double-Decker GT (90–94 seats)'
    ],
    bus_models: 'Minibus (14–20 pax), Midibus (31 pax), Pullman GT (50–64 pax), Double-Decker Pullman (90–94 pax)',
    pax_capacity: '14–20, 31, 50–64, 90–94 pax',
    fleet_segment: 'standard'
  },

  // 10. VIP Limousine Milan (Milano)
  partner_vip_limousine: {
    fleet_categories: [
      'Mercedes Sprinter 315 Luxury (8 seats)',
      'Mercedes Sprinter 519 Tomassini Luxury (16 seats)',
      'Pullman di Lusso (21, 28, 30, 56, 64, 79 seats)'
    ],
    bus_models: 'Mercedes Sprinter 315 Luxury (8 pax), Mercedes Sprinter 519 Tomassini Luxury (16 pax), Pullman di Lusso (21, 28, 30, 56, 64, 79 pax)',
    pax_capacity: '8, 16, 21, 28, 30, 56, 64, 79 pax',
    fleet_segment: 'luxury'
  },

  // 11. Car Service Milan (Milano)
  partner_1792761050955_n0vc: {
    fleet_categories: [
      'Mercedes-Benz Sprinter Luxury Minibus (8–16 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Luxury Minibus (8–16 pax, reclining leather & privacy glass)',
    pax_capacity: '8–16 pax',
    fleet_segment: 'luxury'
  },

  // 12. Como Driver Services (Como)
  partner_1792765279097_26hr: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (12 seats)',
      'Ford Transit Minibus (16 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (12 pax), Ford Transit Minibus (16 pax)',
    pax_capacity: '12, 16 pax',
    fleet_segment: 'both'
  },

  // 13. Pancheri NCC & Minibus (Brescia)
  partner_1792765280113_5c8r: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (8 seats)',
      'Iveco Daily Minibus (20 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (8 pax), 2x Iveco Daily Minibus (20 pax)',
    pax_capacity: '8, 20 pax',
    fleet_segment: 'standard'
  },

  // 14. Perletti Autoservizi (Top Class Line) (Bergamo / Milano)
  partner_perletti_topclass: {
    fleet_categories: [
      'Mercedes Sprinter Top Class (16–20 seats)',
      'Mercedes Tourismo RHD-L Top Class (64 & 79 seats)'
    ],
    bus_models: 'Mercedes Sprinter Top Class (16–20 pax), Mercedes Tourismo RHD-L Top Class (64 & 79 pax)',
    pax_capacity: '16–20, 64, 79 pax',
    fleet_segment: 'both'
  },

  // 15. Landway Tourism (Como)
  partner_1792761170109_96nx: {
    fleet_categories: [
      'Mercedes-Benz Sprinter Minibus (19–20 seats)',
      'Iveco Executive Midibus (29–30 seats)',
      'Mercedes Tourismo / Setra / Neoplan GT Coach (51–57 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19–20 pax), Iveco Executive Midibus (29–30 pax), Mercedes Tourismo / Setra GT (51–57 pax)',
    pax_capacity: '19–20, 29–30, 51–57 pax',
    fleet_segment: 'standard'
  },

  // 16. Cavourese (Torino (Piemonte))
  partner_1793031479649_0_atcl: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (16 seats)',
      'Executive Midibus (35 seats)',
      'Pullman Gran Turismo (50 & 63 seats)',
      'Double Decker GT (79 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (16 pax), Executive Midibus (35 pax), Pullman Gran Turismo (50 & 63 pax), Double Decker GT (79 pax)',
    pax_capacity: '16, 35, 50, 63, 79 pax',
    fleet_segment: 'both'
  },

  // 17. Castano Turismo (Varese / Malpensa)
  partner_1793031479651_1_wjsp: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Setra GT Coach (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Setra GT Coach (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 18. Bassi Tours (Brescia / Lake Garda)
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

  // 19. Pasqualini Bus (Verona / Lake Garda)
  partner_1793031479651_5_i74u: {
    fleet_categories: [
      'Minibus GT (16–19 seats)',
      'Midibus (28–32 seats)',
      'Pullman GT (52–60 seats)',
      'Double Decker GT (80 seats)'
    ],
    bus_models: 'Minibus (16–19 pax), Midibus (28–32 pax), Pullman GT (52–60 pax), Double Decker GT (80 pax)',
    pax_capacity: '16–19, 28–32, 52–60, 80 pax',
    fleet_segment: 'both'
  },

  // 20. Rossi Pietro Bus (Piacenza / South Lombardy)
  partner_1793031479651_6_rmj2: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (52–56 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman GT (52–56 pax)',
    pax_capacity: '19, 52–56 pax',
    fleet_segment: 'both'
  },

  // 21. Bus Company (Torino (Piemonte))
  partner_1793031479651_7_9rqt: {
    fleet_categories: [
      'Minibus (20 seats)',
      'Midibus (28–32 seats)',
      'Pullman GT (52–80 seats)'
    ],
    bus_models: 'Minibus (20 pax), Midibus (28–32 pax), Pullman GT (52–80 pax)',
    pax_capacity: '20, 28–32, 52–80 pax',
    fleet_segment: 'both'
  },

  // 22. M. Bonaccorsi Tours (Torino (Piemonte))
  partner_1793031479651_8_6l1r: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman GT (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 23. Autoservizi Radaelli (Monza / Como / Milano)
  partner_1793031479651_10_3kbi: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (52 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (52 pax)',
    pax_capacity: '19, 52 pax',
    fleet_segment: 'both'
  },

  // 24. Morandi Tour (Varese / Malpensa)
  partner_1793031479651_11_r6tm: {
    fleet_categories: [
      'Minibus GT (8–19 seats)',
      'Midibus (25–35 seats)',
      'Mercedes Tourismo / Setra GT (54–85 seats)'
    ],
    bus_models: 'Minibus GT (8–19 pax), Midibus (25–35 pax), Mercedes Tourismo / Setra GT (54–85 pax)',
    pax_capacity: '8–19, 25–35, 54–85 pax',
    fleet_segment: 'both'
  },

  // 25. Rampinini Turismo (Como / Fino Mornasco)
  partner_1793031479651_12_2dpf: {
    fleet_categories: [
      'Minibus Gran Turismo (25 & 28 seats)',
      'Midibus (40 seats)',
      'Pullman GT (54 & 56 seats)'
    ],
    bus_models: 'Minibus Gran Turismo (25 & 28 pax), Midibus (40 pax), Pullman GT (54 & 56 pax)',
    pax_capacity: '25, 28, 40, 54, 56 pax',
    fleet_segment: 'both'
  },

  // 26. Autoservizi Cazzaniga Silvestro (Lecco / Como / Monza)
  partner_1793031479651_13_f82y: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman Gran Turismo (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 27. Autoservizi Perico (Bergamo)
  partner_1793031479651_14_wrph: {
    fleet_categories: [
      'Mercedes Sprinter 416 (19 seats)',
      'Midibus (34 seats)',
      'Mercedes Tourismo / Travego GT (54 seats)',
      'Irizar i6 (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter 416 (19 pax), Midibus (34 pax), Mercedes Tourismo / Travego GT (54 pax), Irizar i6 (54 pax)',
    pax_capacity: '19, 34, 54 pax',
    fleet_segment: 'both'
  },

  // 28. Italeurobus (Bergamo / Brescia)
  partner_1793031479651_15_fgcv: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Pullman GT (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 29. Bergamo Transfer (Bergamo / Milano)
  partner_1793031479651_16_z7uf: {
    fleet_categories: [
      'Mercedes Sprinter VIP (8 & 16 seats)',
      'Coach GT (50 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (8 & 16 pax), Coach GT (50 pax)',
    pax_capacity: '8, 16, 50 pax',
    fleet_segment: 'both'
  },

  // 30. Bolognini Autoservizi (Verbania (Lake Maggiore))
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

  // 31. Autoservizi Comazzi (Novara (Piemonte))
  partner_1793031479651_18_caqw: {
    fleet_categories: [
      'Minibus (19 seats)',
      'Midibus (30 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Minibus (19 pax), Midibus (30 pax), Pullman GT (54 pax)',
    pax_capacity: '19, 30, 54 pax',
    fleet_segment: 'both'
  },

  // 32. Stat Turismo (Piemonte / Milano)
  partner_1793031479651_19_75aq: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Setra GT Coach (52–64 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Setra GT Coach (52–64 pax)',
    pax_capacity: '19, 52–64 pax',
    fleet_segment: 'both'
  },

  // 33. Vivaldi Driver Bellagio (Como)
  partner_1792765278957_tgxp: {
    fleet_categories: [
      'Mercedes-Benz Sprinter VIP (8 seats)',
      'Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter VIP (8 pax), Mercedes-Benz Sprinter Nero VIP w/ Hostess (19 pax)',
    pax_capacity: '8, 19 pax',
    fleet_segment: 'luxury'
  },

  // 34. Berini Autonoleggio & Minibus (Como)
  partner_1792765278630_r4vp: {
    fleet_categories: [
      'Mercedes Minibus Extralong Luxury (8 seats)',
      'Executive Minibus (20 seats)',
      'Executive Midibus (26 seats)'
    ],
    bus_models: 'Mercedes Minibus Extralong Luxury (8 pax), Executive Minibus (20 pax), Executive Midibus (26 pax)',
    pax_capacity: '8, 20, 26 pax',
    fleet_segment: 'both'
  },

  // 35. Como Limo Lux (Como)
  partner_1792765279410_2zml: {
    fleet_categories: [
      'Mercedes-Benz V-Class Luxury Minivan (7 seats)'
    ],
    bus_models: 'Mercedes-Benz V-Class Luxury Minivan (7 pax)',
    pax_capacity: '7 pax',
    fleet_segment: 'luxury'
  },

  // 36. Avantgarde Limousine Service (Milano)
  partner_1792765279535_l9ei: {
    fleet_categories: [
      'Mercedes-Benz Sprinter VIP Total Black (8 & 16 seats)',
      'Mercedes Minibus VIP Class (18 seats)',
      'Executive Minibus (25 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter VIP Total Black (8 & 16 pax), Mercedes Minibus VIP Class (18 pax), Executive Minibus (25 pax)',
    pax_capacity: '8, 16, 18, 25 pax',
    fleet_segment: 'luxury'
  },

  // 37. Prestige Car Limousine (Milano)
  partner_1792761050695_9k2e: {
    fleet_categories: [
      'Mercedes-Benz Sprinter Luxury Minibus (8 & 16 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Luxury Minibus (8 & 16 pax, reclining leather & tables)',
    pax_capacity: '8, 16 pax',
    fleet_segment: 'luxury'
  },

  // 38. Transervice Limousine (Milano)
  partner_transervice: {
    fleet_categories: [
      'Mercedes Sprinter Luxury Minibus (8 seats)'
    ],
    bus_models: 'Mercedes Sprinter Luxury Minibus (8 pax)',
    pax_capacity: '8 pax',
    fleet_segment: 'luxury'
  },

  // 39. Linea Azzurra Bus (Torino (Moncalieri) & Milano (Rho Depot))
  partner_linea_azzurra: {
    fleet_categories: [
      'Minibus (16–19 seats)',
      'Midibus (25–30 seats)',
      'Autobus GT Coaches (45–54 seats)',
      'Autobus Long / Double-Decker (60–80 seats)'
    ],
    bus_models: 'Minibus (16–19 pax), Midibus (25–30 pax), Autobus GT (45–54 pax), Autobus Long/Double-Decker (60–80 pax)',
    pax_capacity: '16–19, 25–30, 45–54, 60–80 pax',
    fleet_segment: 'both'
  },

  // 40. Rosa Bus (Rosà (Vicenza, Veneto))
  partner_rosa_bus: {
    fleet_categories: [
      'Mercedes Tourengo 818 Midibus (29–30 seats)',
      'Autobus Gran Turismo (54, 64, 83 seats)'
    ],
    bus_models: 'Mercedes Tourengo 818 Midibus (29–30 pax), Autobus GT (54, 64, 83 pax)',
    pax_capacity: '29–30, 54, 64, 83 pax',
    fleet_segment: 'both'
  },

  // 41. Air Car Service (Monza)
  partner_1793016425770_x3h4: {
    fleet_categories: [
      'Mercedes Sprinter VIP (16 seats)',
      'Autobus Granturismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (16 pax), Autobus Granturismo (54 pax)',
    pax_capacity: '16, 54 pax',
    fleet_segment: 'both'
  },

  // 42. Ilton Autonoleggi (Bergamo)
  partner_1793030995868_be2m: {
    fleet_categories: [
      'Mercedes Sprinter Luxury (8 & 16 seats)',
      'Pullman GT (50 seats)'
    ],
    bus_models: 'Mercedes Sprinter Luxury (8 & 16 pax), Pullman GT (50 pax)',
    pax_capacity: '8, 16, 50 pax',
    fleet_segment: 'both'
  },

  // 43. Bormio Viaggi Luxury Lines (Bormio (Alps))
  partner_1793030996893_sp4m: {
    fleet_categories: [
      'Mercedes Sprinter Luxury (16–20 seats)',
      'Setra GT Coach (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Luxury (16–20 pax), Setra GT Coach (54 pax)',
    pax_capacity: '16–20, 54 pax',
    fleet_segment: 'both'
  },

  // 44. Autoservizi Sonzogni (Bergamo)
  partner_1793031033043_nx6z: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Mercedes Tourismo GT (54 seats)',
      'Setra TopClass (56 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Mercedes Tourismo GT (54 pax), Setra TopClass (56 pax)',
    pax_capacity: '19, 54, 56 pax',
    fleet_segment: 'both'
  },

  // 45. Autoservizi Rainoldi NCC (Bormio (Alps))
  partner_1793030996978_x4p9: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (8–20 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (8–20 pax)',
    pax_capacity: '8–20 pax',
    fleet_segment: 'standard'
  },

  // 46. Luxury Transfer Milan (Varese)
  partner_1793030997076_cyc8: {
    fleet_categories: [
      'Mercedes Sprinter Bus (14 seats)'
    ],
    bus_models: 'Mercedes Sprinter Bus (14 pax)',
    pax_capacity: '14 pax',
    fleet_segment: 'luxury'
  },

  // 47. Frigerio Trasporti (Monza)
  partner_1793031033153_oyw9: {
    fleet_categories: [
      'Executive Midibus (28 seats)',
      'Pullman GT (54 seats)'
    ],
    bus_models: 'Executive Midibus (28 pax), Pullman GT (54 pax)',
    pax_capacity: '28, 54 pax',
    fleet_segment: 'both'
  },

  // 48. Gardabus Exclusive (Lake Garda)
  partner_1793030996491_wete: {
    fleet_categories: [
      'Mercedes Sprinter VIP (16 seats)',
      'Setra GT Coach (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter VIP (16 pax), Setra GT Coach (54 pax)',
    pax_capacity: '16, 54 pax',
    fleet_segment: 'both'
  },

  // 49. Ugolini Viaggi (Lake Maggiore)
  partner_1793030997210_o8w4: {
    fleet_categories: [
      'Executive Midibus (28 seats)',
      'Setra & Mercedes GT Coach (54 seats)'
    ],
    bus_models: 'Executive Midibus (28 pax), Setra & Mercedes GT Coach (54 pax)',
    pax_capacity: '28, 54 pax',
    fleet_segment: 'both'
  },

  // 50. Consorzio Eurobus Verona (Lake Garda)
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

  // 51. Zani Viaggi Executive (Milano)
  partner_1793031032498_gxg7: {
    fleet_categories: [
      'Mercedes Sprinter Executive (19 seats)',
      'Pullman Gran Turismo (54 seats)'
    ],
    bus_models: 'Mercedes Sprinter Executive (19 pax), Pullman Gran Turismo (54 pax)',
    pax_capacity: '19, 54 pax',
    fleet_segment: 'both'
  },

  // 52. Air Pullman VIP Line (Milano)
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

  // 53. Exclusive Cars Milano (Milano)
  partner_1792765279743_bk0p: {
    fleet_categories: [
      'Mercedes-Benz Sprinter Minibus (20 seats)',
      'Irizar GT Coach (52 seats)'
    ],
    bus_models: 'Mercedes-Benz Sprinter Minibus (20 pax), Irizar GT Coach (52 pax)',
    pax_capacity: '20, 52 pax',
    fleet_segment: 'both'
  },

  // 54. Peschiera Viaggi Luxury Coaches (Lake Garda)
  partner_1793030996360_0w9g: {
    fleet_categories: [
      'Mercedes Sprinter Minibus (19 seats)',
      'Midibus (30 seats)',
      'Pullman GT (54–62 seats)'
    ],
    bus_models: 'Mercedes Sprinter Minibus (19 pax), Midibus (30 pax), Pullman GT (54–62 pax)',
    pax_capacity: '19, 30, 54–62 pax',
    fleet_segment: 'both'
  }
};

async function applyUpdates() {
  console.log("Applying ground-truth custom website fleet to all 54 operators in Supabase...");

  const res = await fetch(`${SUPABASE_URL}/bus_partners?select=*`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}` }
  });
  const partners = await res.json();
  console.log(`Loaded ${partners.length} partners from Supabase.`);

  let updatedCount = 0;
  for (const p of partners) {
    const verified = VERIFIED_CUSTOM_FLEET_MAP[p.id];
    if (!verified) {
      console.log(`Skipping ${p.name} (${p.id}): no custom mapping found`);
      continue;
    }

    const card = p.score_breakdown?.partner_card || {};
    const updatedCard = {
      ...card,
      bus_models: verified.bus_models,
      pax_capacity: verified.pax_capacity,
      fleet_segment: verified.fleet_segment
    };
    const updatedScoreBreakdown = {
      ...(p.score_breakdown || {}),
      partner_card: updatedCard
    };

    const patchRes = await fetch(`${SUPABASE_URL}/bus_partners?id=eq.${p.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fleet_categories: verified.fleet_categories,
        score_breakdown: updatedScoreBreakdown,
        updated_at: new Date().toISOString()
      })
    });

    if (patchRes.ok) {
      updatedCount++;
      console.log(`✓ [${updatedCount}/${Object.keys(VERIFIED_CUSTOM_FLEET_MAP).length}] Updated ${p.name}: [${verified.fleet_categories.join(', ')}]`);
    } else {
      console.error(`✗ Failed to update ${p.name}:`, await patchRes.text());
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} operators in Supabase!`);
}

if (process.argv[1].endsWith('apply_verified_custom_fleet_all_54.mjs')) {
  applyUpdates();
}
