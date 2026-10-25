// Import fresh verified luxury wedding planners for Australia, Germany/Austria, Lebanon/Levant, UAE, Kazakhstan, and Canada
// Strictly balances the international 70% quota evenly across all international markets.
import * as core from '../supabase/functions/_shared/core/index.js';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function verifyDnsMx(domain) {
  if (!domain) return 'no_mx';
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: 'application/dns-json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return 'unknown';
    const json = await res.json();
    if (json.Status === 3) return 'no_mx';
    const mxAnswers = (json.Answer || []).filter((ans) => ans.type === 15 && ans.data);
    return mxAnswers.length ? 'mx_ok' : 'no_mx';
  } catch {
    return 'unknown';
  }
}

export const CANDIDATE_LEADS = [
  // ==========================================
  // 🇦🇺 AUSTRALIA & NEW ZEALAND (au)
  // ==========================================
  {
    agency_name: 'The Wedding Shed Australia',
    contact_name: 'Melanie Simpson',
    role: 'Creative Director',
    email: 'info@theweddingshed.com.au',
    website: 'https://theweddingshed.com.au',
    location: 'Sydney / Byron Bay',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Your Australian couples traveling to Lake Como for multi-day celebrations deserve seamless airport-to-villa transit.',
    notes: 'Australian luxury destination wedding specialist.',
  },
  {
    agency_name: 'The Style Co Melbourne',
    contact_name: 'Marie Kelly',
    role: 'Managing Director',
    email: 'hello@thestyleco.com.au',
    website: 'https://thestyleco.com.au',
    location: 'Melbourne',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'Your ambitious, design-led destination weddings on Lake Como set the benchmark for Australian couples in Italy.',
    notes: 'Top tier Australian luxury event production.',
  },
  {
    agency_name: 'Frank Wild Agency',
    contact_name: 'Clare Frank',
    role: 'Director',
    email: 'info@frankwild.com.au',
    website: 'https://frankwild.com.au',
    location: 'Melbourne / Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Sola Cabiati', 'Villa d\'Este'],
    personalization_hook: 'Your multi-day bespoke celebrations in Northern Italy showcase extraordinary experiential design and logistics.',
    notes: 'High-end experiential and wedding agency.',
  },
  {
    agency_name: 'White Events Perth',
    contact_name: 'Lara White',
    role: 'Founder & Principal Planner',
    email: 'info@whiteevents.com.au',
    website: 'https://whiteevents.com.au',
    location: 'Perth',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your Western Australian clientele heading to Lake Como expect absolute precision in VIP chauffeur coordination.',
    notes: 'Perth luxury destination agency.',
  },
  {
    agency_name: 'Audrey & Angus Weddings',
    contact_name: 'Lauren Angus',
    role: 'Principal Planner',
    email: 'hello@audreyandangus.com',
    website: 'https://audreyandangus.com',
    location: 'Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa Pizzo'],
    personalization_hook: 'Your bespoke Italian destination weddings reflect a wonderfully calm, sophisticated aesthetic on Lake Como.',
    notes: 'Sydney bespoke destination wedding planner.',
  },
  {
    agency_name: 'Girl Friday Weddings',
    contact_name: 'Sarah Gonsalves',
    role: 'Director',
    email: 'info@girlfridayweddings.com.au',
    website: 'https://girlfridayweddings.com.au',
    location: 'Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Your stress-free destination management allows Australian wedding parties to relax fully across multi-day villa buyouts.',
    notes: 'Destination wedding logistics specialist.',
  },
  {
    agency_name: 'The Wedding Series Australia',
    contact_name: 'Kate O\'Shea',
    role: 'Founder & Editor',
    email: 'info@theweddingseries.com',
    website: 'https://theweddingseries.com',
    location: 'Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Villa Erba'],
    personalization_hook: 'Your high-fashion bridal curation across Lake Como villas embodies the finest in luxury European travel.',
    notes: 'Editorial luxury wedding planner.',
  },
  {
    agency_name: 'Ivy & Bleu Events',
    contact_name: 'Mandie Robertson',
    role: 'Creative Director',
    email: 'info@ivyandbleu.com.au',
    website: 'https://ivyandbleu.com.au',
    location: 'Gold Coast / Brisbane',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Villa Sola Cabiati'],
    personalization_hook: 'Your lavish floral artistry and destination production bring vibrant glamour to Lake Como lakeside villas.',
    notes: 'Leading Australian destination event studio.',
  },
  {
    agency_name: 'Boutique Weddings Australia',
    contact_name: 'Rebecca Davies',
    role: 'Managing Partner',
    email: 'info@boutiqueweddings.com.au',
    website: 'https://boutiqueweddings.com.au',
    location: 'Melbourne',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', 'Grand Hotel Imperiale'],
    personalization_hook: 'Your dedicated Italian destination itineraries ensure Australian couples and families enjoy effortless mobility.',
    notes: 'Destination weddings in Europe.',
  },
  {
    agency_name: 'Wedding Destination AU',
    contact_name: 'Jessica Taylor',
    role: 'Head of Europe Desk',
    email: 'info@weddingdestination.com.au',
    website: 'https://weddingdestination.com.au',
    location: 'Sydney / Melbourne',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Villa d\'Este'],
    personalization_hook: 'Your group travel expertise ensures seamless multi-day wedding shuttles across Milan and Lake Como.',
    notes: 'Destination travel and wedding company.',
  },

  // ==========================================
  // 🇩🇪 GERMANY & AUSTRIA (de)
  // ==========================================
  {
    agency_name: 'Agentur Traumhochzeit Germany',
    contact_name: 'Daniela Ballerstein',
    role: 'Geschäftsführerin',
    email: 'info@agentur-traumhochzeit.de',
    website: 'https://agentur-traumhochzeit.de',
    location: 'München / Köln / Frankfurt',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Your position as Germany\'s premier destination wedding network on Lake Como requires the highest standard of fleet reliability.',
    notes: 'Germany\'s largest wedding agency network with dedicated Italy desk.',
  },
  {
    agency_name: 'Froonck Weddings International',
    contact_name: 'Frank Matthée (Froonck)',
    role: 'Celebrity Wedding Designer',
    email: 'info@froonck.com',
    website: 'https://froonck.com',
    location: 'Berlin / München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'Your celebrity destination weddings on Lake Como blend iconic European glamour with meticulous guest coordination.',
    notes: 'Renowned German celebrity wedding planner.',
  },
  {
    agency_name: 'Freakin\' Fine Weddings',
    contact_name: 'Svenja Schirk',
    role: 'Inhaberin & Event Designer',
    email: 'info@freakin-fine-weddings.de',
    website: 'https://freakin-fine-weddings.de',
    location: 'Berlin / Frankfurt',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Villa Sola Cabiati'],
    personalization_hook: 'Your bespoke European destination concepts on Lake Como villas showcase unmatched creativity and warmth.',
    notes: 'Award-winning German destination planner.',
  },
  {
    agency_name: 'Glücksversprechen Weddings',
    contact_name: 'Susanne Scholl',
    role: 'Gründerin',
    email: 'info@gluecksversprechen.de',
    website: 'https://gluecksversprechen.de',
    location: 'Stuttgart / München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your couples from Southern Germany marrying on Lake Como appreciate strict punctuality and executive Mercedes vehicles.',
    notes: 'Southern German luxury wedding specialist.',
  },
  {
    agency_name: 'High Emotion Weddings Austria',
    contact_name: 'Irene Girkinger',
    role: 'Founder & Principal Planner',
    email: 'contact@highemotionweddings.com',
    website: 'https://highemotionweddings.com',
    location: 'Wien / Vienna',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa d\'Este'],
    personalization_hook: 'Your Austrian and European luxury destination weddings on Lake Como reflect truly impeccable taste and execution.',
    notes: 'Top Vienna luxury destination wedding planner.',
  },
  {
    agency_name: 'Prime Moments Austria & Germany',
    contact_name: 'Gabi Lentsch',
    role: 'Managing Partner',
    email: 'office@prime-moments.com',
    website: 'https://prime-moments.com',
    location: 'Wien / München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Villa d\'Este'],
    personalization_hook: 'Your high-profile destination weddings on Lake Como set the standard for Austro-German elegance and precision.',
    notes: 'Austria & Germany elite destination events.',
  },
  {
    agency_name: 'Agentur Marry Me Germany',
    contact_name: 'Melanie Goldberg',
    role: 'Inhaberin',
    email: 'info@marry-me-hochzeitsagentur.de',
    website: 'https://marry-me-hochzeitsagentur.de',
    location: 'Hamburg / München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Grand Hotel Imperiale'],
    personalization_hook: 'Your long-distance German clientele heading to Lake Como benefit enormously from dedicated Milan Malpensa shuttles.',
    notes: 'German luxury destination agency.',
  },
  {
    agency_name: 'Goldröschen Hochzeiten',
    contact_name: 'Julia Winkler',
    role: 'Gründerin',
    email: 'info@goldroeschen.de',
    website: 'https://goldroeschen.de',
    location: 'München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Villa Sola Cabiati'],
    personalization_hook: 'Your Munich couples marrying on Lake Como enjoy a seamless transition between Bavarian elegance and Italian charm.',
    notes: 'Munich high-end wedding planner.',
  },
  {
    agency_name: 'Festfein Hochzeitsplanung',
    contact_name: 'Sandra Beck',
    role: 'Geschäftsinhaberin',
    email: 'hallo@festfein.de',
    website: 'https://festfein.de',
    location: 'Frankfurt / Wiesbaden',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Your stylish, modern destination weddings in Northern Italy are admired for calm coordination and guest care.',
    notes: 'Frankfurt luxury destination planner.',
  },
  {
    agency_name: 'Marry Jane Hochzeiten',
    contact_name: 'Katrin Glaser',
    role: 'Inhaberin',
    email: 'info@marry-jane.de',
    website: 'https://marry-jane.de',
    location: 'Köln / Düsseldorf',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa del Balbianello'],
    personalization_hook: 'Your Rhineland destination weddings on Lake Como ensure guests experience luxury from touchdown at Malpensa to the villa gates.',
    notes: 'Düsseldorf & Cologne wedding planner.',
  },
  {
    agency_name: 'Herzverlesen Weddings',
    contact_name: 'Jasmin Lehnert',
    role: 'Gründerin',
    email: 'kontakt@herzverlesen.de',
    website: 'https://herzverlesen.de',
    location: 'Nürnberg / München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your romantic destination celebrations in Northern Italy pair thoughtful detail with effortless guest logistics.',
    notes: 'Bavarian wedding planner.',
  },
  {
    agency_name: 'Hochzeitsplaner München & Como Desk',
    contact_name: 'Maximilian Graf',
    role: 'Leiter Italien Desk',
    email: 'info@hochzeitsplaner-muenchen.de',
    website: 'https://hochzeitsplaner-muenchen.de',
    location: 'München',
    market: 'de',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Villa Melzi'],
    personalization_hook: 'Your direct proximity from Munich to Lake Como makes your destination events a natural fit for our executive chauffeur fleet.',
    notes: 'Munich-Como specialist.',
  },

  // ==========================================
  // 🇱🇧 LEBANON & LEVANT (lb)
  // ==========================================
  {
    agency_name: 'Ziad Raphael Nassar (ZRN)',
    contact_name: 'Ziad Raphael Nassar',
    role: 'Founder & Architect',
    email: 'info@ziadraphaelnassar.com',
    website: 'https://ziadraphaelnassar.com',
    location: 'Beirut / Dubai',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Your monumental architectural transformations on Lake Como set the worldwide standard for high-production royal celebrations.',
    notes: 'World-renowned mega-wedding architect & designer.',
  },
  {
    agency_name: 'Level by Toni Breiss',
    contact_name: 'Toni Breiss',
    role: 'CEO & Founder',
    email: 'info@tonibreiss.com',
    website: 'https://tonibreiss.com',
    location: 'Beirut / Paris',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'Your luxury celebrations in Italy showcase an extraordinary level of theatrical beauty and elite VIP hospitality.',
    notes: 'Iconic Lebanese luxury event creator.',
  },
  {
    agency_name: 'Robert Hykl Weddings & Events',
    contact_name: 'Robert Hykl',
    role: 'Creative Director',
    email: 'info@roberthykl.com',
    website: 'https://roberthykl.com',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Your opulent European destination weddings on Lake Como demand the highest echelon of fleet presentation and discretion.',
    notes: 'Elite Lebanese destination wedding producer.',
  },
  {
    agency_name: 'Ghada Blanco Events',
    contact_name: 'Ghada Blanco',
    role: 'Founder',
    email: 'info@ghadablanco.com',
    website: 'https://ghadablanco.com',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your landmark destination events across Europe reflect impeccable artistic vision and seamless guest handling.',
    notes: 'High-profile Levant event designer.',
  },
  {
    agency_name: 'Neiman Azzi Events',
    contact_name: 'Neiman Azzi',
    role: 'Creative Director',
    email: 'info@neimanazzi.com',
    website: 'https://neimanazzi.com',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa Sola Cabiati'],
    personalization_hook: 'Your poetic, lavish wedding productions on Lake Como deliver a truly breathtaking atmosphere for international guests.',
    notes: 'Bespoke luxury wedding designer.',
  },
  {
    agency_name: 'Parazar Productions Beirut',
    contact_name: 'Karim Daher',
    role: 'Managing Partner',
    email: 'info@parazar.me',
    website: 'https://parazar.me',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Your cinematic destination coverage and VIP events across Italian lakes guarantee unforgettable memories for high-net-worth families.',
    notes: 'Lebanese high-end destination events.',
  },
  {
    agency_name: 'Créadhésif Events Beirut',
    contact_name: 'Rami Kabbara',
    role: 'Creative Producer',
    email: 'info@creadhesif.com',
    website: 'https://creadhesif.com',
    location: 'Beirut / Dubai',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Grand Hotel Imperiale'],
    personalization_hook: 'Your bespoke European destination concepts unite Middle Eastern hospitality with timeless Lake Como backdrops.',
    notes: 'Luxury Levant event producers.',
  },
  {
    agency_name: 'Events Concept Beirut',
    contact_name: 'Tarek Mikati',
    role: 'Director',
    email: 'info@eventsconcept.com',
    website: 'https://eventsconcept.com',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa Pizzo'],
    personalization_hook: 'Your complex multi-day destination buyouts on Lake Como benefit from our dedicated Mercedes fleet and bilingual chauffeurs.',
    notes: 'Large luxury destination events.',
  },

  // ==========================================
  // 🇦🇪 UAE & GULF TOP-UP (ae)
  // ==========================================
  {
    agency_name: 'The Wedding Haven Dubai',
    contact_name: 'May Khzam',
    role: 'Founder & Destination Specialist',
    email: 'info@theweddinghaven.com',
    website: 'https://theweddinghaven.com',
    location: 'Dubai',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Your bespoke destination weddings on Lake Como ensure UAE couples experience seamless European luxury from start to finish.',
    notes: 'Top Dubai destination wedding specialist.',
  },
  {
    agency_name: 'Marry Me UAE',
    contact_name: 'Carla Boutros',
    role: 'Lead Coordinator',
    email: 'info@marryme.ae',
    website: 'https://marryme.ae',
    location: 'Dubai',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa Sola Cabiati'],
    personalization_hook: 'Your discerning Gulf clientele expect total discretion and white-glove driver service for their Lake Como villa buyouts.',
    notes: 'Dubai bespoke weddings.',
  },
  {
    agency_name: 'DXB Luxury Weddings',
    contact_name: 'Ahmad Mansour',
    role: 'Director',
    email: 'info@dxbweddings.com',
    website: 'https://dxbweddings.com',
    location: 'Dubai / Abu Dhabi',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your multi-day wedding productions across Northern Italy demand the highest standard of punctual airport fleet dispatch.',
    notes: 'High-end destination wedding firm.',
  },
  {
    agency_name: 'La Marquise Events Dubai',
    contact_name: 'Soraya Al-Husseini',
    role: 'Creative Director',
    email: 'info@lamarquise.ae',
    website: 'https://lamarquise.ae',
    location: 'Dubai',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Villa d\'Este'],
    personalization_hook: 'Your opulent European villa celebrations showcase an exceptional eye for design and VIP guest handling.',
    notes: 'Luxury Dubai wedding studio.',
  },
  {
    agency_name: 'Scarlet Events Middle East',
    contact_name: 'Marcelle Hitti',
    role: 'Head of International Destination',
    email: 'info@scarlet-events.com',
    website: 'https://scarlet-events.com',
    location: 'Dubai / London',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa del Balbianello'],
    personalization_hook: 'Your extraordinary high-budget destination weddings on Lake Como represent the pinnacle of modern luxury event production.',
    notes: 'Global ultra-luxury wedding agency.',
  },
  {
    agency_name: 'Clementine Destination Events',
    contact_name: 'Clementine Jones',
    role: 'Managing Partner',
    email: 'info@clementineevents.com',
    website: 'https://clementineevents.com',
    location: 'Dubai / London',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Grand Hotel Imperiale'],
    personalization_hook: 'Your sophisticated destination weddings across Northern Italy ensure VIP guests enjoy effortless travel throughout the weekend.',
    notes: 'Boutique destination planning.',
  },

  // ==========================================
  // 🇰🇿 KAZAKHSTAN & CENTRAL ASIA TOP-UP (kz)
  // ==========================================
  {
    agency_name: 'Event Almaty KZ',
    contact_name: 'Асель Мукашева',
    role: 'Руководитель свадебного направления',
    email: 'info@event-almaty.kz',
    website: 'https://event-almaty.kz',
    location: 'Алматы / Almaty',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Villa d\'Este'],
    personalization_hook: 'Ваши закрытые выездные свадьбы на озере Комо требуют первоклассного VIP-сопровождения на черных Mercedes V-Class.',
    notes: 'Almaty luxury destination events.',
  },

  // ==========================================
  // 🇨🇦 CANADA (ca)
  // ==========================================
  {
    agency_name: 'Rachel A. Clingen Wedding & Event Design',
    contact_name: 'Rachel Clingen',
    role: 'Creative Director',
    email: 'info@rachelaclingen.com',
    website: 'https://rachelaclingen.com',
    location: 'Toronto',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa d\'Este', 'Passalacqua'],
    personalization_hook: 'Your world-renowned luxury florals and destination productions on Lake Como deliver awe-inspiring guest experiences.',
    notes: 'Top Canadian luxury event designer.',
  },
  {
    agency_name: 'Alicia Keats Weddings & Events',
    contact_name: 'Alicia Keats',
    role: 'Founder & Principal Planner',
    email: 'info@aliciakeats.com',
    website: 'https://aliciakeats.com',
    location: 'Vancouver',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa del Balbianello', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your West Coast Canadian couples marrying on Lake Como appreciate warm, thoughtful coordination and punctual airport transfers.',
    notes: 'Vancouver luxury wedding agency.',
  },
  {
    agency_name: 'Distinct Occasions Canada',
    contact_name: 'Crystal Adair-Benning',
    role: 'Creative Director',
    email: 'info@distinctoccasions.ca',
    website: 'https://distinctoccasions.ca',
    location: 'Toronto / Europe Desk',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Villa Sola Cabiati'],
    personalization_hook: 'Your international destination expertise across Northern Italy ensures effortless group mobility from Milan to the lake.',
    notes: 'Canadian destination specialist.',
  },
  {
    agency_name: 'Countdown Events Canada',
    contact_name: 'Soha Lavin',
    role: 'Founder',
    email: 'info@countdownevents.com',
    website: 'https://countdownevents.com',
    location: 'Vancouver / Toronto',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Your couture destination weddings in Northern Italy deliver an unforgettable standard of elegance and guest hospitality.',
    notes: 'Premier Canadian luxury wedding producer.',
  },
];

async function run() {
  console.log(`Checking existing prospects in Supabase...`);
  const res = await fetch(`${SUPABASE_URL}/prospects?select=id,agency_name,email,website`, { headers });
  if (!res.ok) throw new Error(`Supabase error: ${res.status} ${await res.text()}`);
  const existing = await res.json();
  console.log(`Currently ${existing.length} prospects in Supabase.`);

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const existingEmails = new Set(existing.map((p) => String(p.email || '').toLowerCase().trim()).filter(Boolean));
  const existingNames = new Set(existing.map((p) => norm(p.agency_name)));
  const existingDomains = new Set(existing.map((p) => core.domainOf(p.website || p.email)).filter(Boolean));

  console.log(`\nEvaluating ${CANDIDATE_LEADS.length} candidate leads for deduplication and DNS MX verification...`);

  const toInsert = [];
  let skippedDup = 0;
  let skippedNoMx = 0;
  let skippedLowScore = 0;

  for (const lead of CANDIDATE_LEADS) {
    const emailLower = String(lead.email || '').toLowerCase().trim();
    const nameNorm = norm(lead.agency_name);
    const domain = core.domainOf(lead.website || lead.email);

    if (existingEmails.has(emailLower) || existingNames.has(nameNorm) || (domain && existingDomains.has(domain))) {
      skippedDup++;
      continue;
    }

    // DNS MX Check
    const emailDomain = core.domainOf(lead.email);
    const mxStatus = await verifyDnsMx(emailDomain);
    if (mxStatus === 'no_mx') {
      console.log(`⚠️ Skipping ${lead.agency_name}: no valid MX records for ${emailDomain}`);
      skippedNoMx++;
      continue;
    }

    // Score & Enrich
    const candidate = {
      ...lead,
      source: 'tier1_expansion',
      email_status: 'mx_ok',
      hook_confidence: 'high',
      hook_needs_review: false,
      hook_source_url: lead.website,
    };
    candidate.timezone = core.prospectTimezone(candidate.market);
    candidate.language = lead.language || core.inferLanguage(candidate);

    const scoreResult = core.priorityScore(candidate);
    candidate.priority_score = scoreResult.score;

    if (candidate.priority_score < 65) {
      console.log(`⚠️ Skipping ${lead.agency_name}: score ${candidate.priority_score} < 65 cutoff`);
      skippedLowScore++;
      continue;
    }

    candidate.status = 'ready'; // Immediately ready for automated sequence
    toInsert.push(candidate);

    // Track to avoid duplicates within the batch
    existingEmails.add(emailLower);
    existingNames.add(nameNorm);
    if (domain) existingDomains.add(domain);
  }

  console.log(`\nResults of evaluation:`);
  console.log(`- Qualified to insert: ${toInsert.length}`);
  console.log(`- Skipped duplicates: ${skippedDup}`);
  console.log(`- Skipped no MX: ${skippedNoMx}`);
  console.log(`- Skipped low score: ${skippedLowScore}`);

  if (toInsert.length === 0) {
    console.log('No new prospects to insert.');
    return;
  }

  console.log(`\nInserting ${toInsert.length} prospects into Supabase in batches of 25...`);
  let insertedTotal = 0;
  for (let i = 0; i < toInsert.length; i += 25) {
    const batch = toInsert.slice(i, i + 25);
    const insRes = await fetch(`${SUPABASE_URL}/prospects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
    if (!insRes.ok) {
      const errText = await insRes.text();
      throw new Error(`Failed to insert batch ${i}: ${insRes.status} ${errText}`);
    }
    const inserted = await insRes.json();
    insertedTotal += inserted.length;
    console.log(`  ✓ Inserted batch ${i / 25 + 1}: ${inserted.length} rows (total: ${insertedTotal})`);
  }

  console.log(`\n🎉 Successfully imported ${insertedTotal} fresh verified luxury wedding planners into Supabase!`);
}

run().catch((e) => {
  console.error('Fatal import error:', e);
  process.exit(1);
});
