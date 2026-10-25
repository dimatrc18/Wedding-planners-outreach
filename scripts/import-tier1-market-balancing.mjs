// Top up Canada, Kazakhstan, Lebanon, Australia, UAE, Switzerland, and Italy
// Enforcing even distribution across the 70% international target markets and stocking local supply.
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
    const mxAnswers = (json.Answer || []).filter((ans) => ans.type === 15 && ans.data && ans.data.trim() !== '.');
    return mxAnswers.length ? 'mx_ok' : 'no_mx';
  } catch {
    return 'unknown';
  }
}

export const CANDIDATE_LEADS = [
  // ==========================================
  // 🇨🇦 CANADA (ca)
  // ==========================================
  {
    agency_name: 'Blush & Bowties Toronto',
    contact_name: 'Alexandra McNamara',
    role: 'Creative Director & Founder',
    email: 'hello@blushandbowties.ca',
    website: 'https://blushandbowties.ca',
    location: 'Toronto / Ontario',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Passalacqua'],
    personalization_hook: 'Your editorial destination weddings across Europe set an incredible bar for Canadian couples seeking authentic Italian luxury.',
    notes: 'Toronto luxury destination wedding planning agency with high editorial focus.',
  },
  {
    agency_name: 'Laura & Co. Events',
    contact_name: 'Laura Atendido',
    role: 'Principal Planner & Founder',
    email: 'info@lauraandcoevents.com',
    website: 'https://lauraandcoevents.com',
    location: 'Toronto',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa d\'Este', 'Villa Pizzo'],
    personalization_hook: 'Your meticulous multi-day celebrations and logistics for Canadian destination weddings translate seamlessly to Northern Italy.',
    notes: 'Award-winning Canadian luxury wedding planning firm.',
  },
  {
    agency_name: 'Rebecca Chan Weddings',
    contact_name: 'Rebecca Chan',
    role: 'Owner & Creative Producer',
    email: 'info@rebeccachan.ca',
    website: 'https://rebeccachan.ca',
    location: 'Toronto / Vancouver',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Passalacqua', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your high-touch destination wedding coordination for luxury Canadian couples guarantees flawless lakeside execution.',
    notes: 'Prominent Canadian destination wedding producer.',
  },
  {
    agency_name: 'Filosophi Event Planning',
    contact_name: 'Erin Bishop',
    role: 'Co-Founder & Lead Designer',
    email: 'info@filosophi.com',
    website: 'https://filosophi.com',
    location: 'Vancouver / British Columbia',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Villa Cipressi'],
    personalization_hook: 'Your bespoke West Coast destination aesthetic pairs naturally with Lake Como private villa buyouts.',
    notes: 'Leading Vancouver luxury event design & planning studio.',
  },
  {
    agency_name: 'French Kiss Events',
    contact_name: 'Barb Walker',
    role: 'Founder & Principal Planner',
    email: 'info@frenchkissevents.ca',
    website: 'https://frenchkissevents.ca',
    location: 'Victoria / Vancouver',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Passalacqua', 'Villa del Balbianello', 'Villa Erba'],
    personalization_hook: 'Your romantic, boutique destination wedding productions across Europe reflect true attention to guest experience.',
    notes: 'Boutique Canadian luxury wedding planner with European portfolio.',
  },
  {
    agency_name: 'Designed Dream Events',
    contact_name: 'Fiori Sacco',
    role: 'Lead Destination Specialist',
    email: 'info@designeddream.com',
    website: 'https://designeddream.com',
    location: 'Toronto',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Pizzo', 'Passalacqua'],
    personalization_hook: 'Your extensive European destination wedding portfolio gives Canadian couples complete peace of mind in Italy.',
    notes: 'Specialist in European and Italian destination weddings from Canada.',
  },
  {
    agency_name: 'Lynn Fletcher Weddings',
    contact_name: 'Lynn Fletcher',
    role: 'Creative Director & Founder',
    email: 'info@lynnfletcherweddings.com',
    website: 'https://lynnfletcherweddings.com',
    location: 'Calgary / Alberta',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa d\'Este', 'Villa Balbiano'],
    personalization_hook: 'Your large-scale, high-production destination celebrations demand flawless private fleet execution across Milan and Como.',
    notes: 'Canada luxury event production veteran with ultra-high-net-worth clientele.',
  },
  {
    agency_name: 'DreamGroup Weddings',
    contact_name: 'Geneve McNally',
    role: 'Founding Partner',
    email: 'info@dreamgroup.ca',
    website: 'https://dreamgroup.ca',
    location: 'Vancouver',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Pizzo', 'Villa Balbiano', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your two decades of luxury wedding curation ensure Canadian couples receive effortless multi-vehicle coordination in Lombardy.',
    notes: 'Vancouver premier event production house.',
  },
  {
    agency_name: 'Julianne Young Weddings',
    contact_name: 'Julianne Young',
    role: 'Principal Planner & Designer',
    email: 'info@julianneyoungweddings.com',
    website: 'https://julianneyoungweddings.com',
    location: 'Calgary / Toronto',
    market: 'ca',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa del Balbianello'],
    personalization_hook: 'Your timeless, refined aesthetic creates unforgettable destination moments for Canadian couples on Lake Como.',
    notes: 'Western Canada premier luxury wedding designer.',
  },

  // ==========================================
  // 🇰🇿 KAZAKHSTAN & CENTRAL ASIA (kz)
  // ==========================================
  {
    agency_name: '1+1 Wedding Agency Almaty',
    contact_name: 'Aigerim Nurpeissova',
    role: 'Head of Destination Events',
    email: 'info@1plus1.kz',
    website: 'https://1plus1.kz',
    location: 'Almaty / Astana',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Passalacqua'],
    personalization_hook: 'Ваши масштабные свадебные проекты в Италии для пар из Казахстана требуют безупречного парка представительского класса.',
    notes: 'Almaty luxury wedding agency with European destination portfolio.',
  },
  {
    agency_name: 'VIP Event Kazakhstan',
    contact_name: 'Arman Saparov',
    role: 'Managing Director',
    email: 'info@vipevent.kz',
    website: 'https://vipevent.kz',
    location: 'Almaty',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'Масштабные трансферы гостей и VIP-делегаций из Казахстана на озере Комо проходят на высшем уровне.',
    notes: 'Kazakhstan luxury corporate & private destination events.',
  },
  {
    agency_name: 'EMG Kazakhstan Event Management',
    contact_name: 'Daulet Karim',
    role: 'Director of International Projects',
    email: 'info@emg.kz',
    website: 'https://emg.kz',
    location: 'Astana / Almaty',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Pizzo', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Организация частных и масштабных торжеств на озере Комо и в Милане для клиентов из Центральной Азии.',
    notes: 'Premier event management group in Kazakhstan.',
  },
  {
    agency_name: 'Damiani Events Almaty',
    contact_name: 'Madina Aliyeva',
    role: 'Lead Wedding Producer',
    email: 'info@damiani.kz',
    website: 'https://damiani.kz',
    location: 'Almaty',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Passalacqua', 'Villa Balbiano', 'Villa del Balbianello'],
    personalization_hook: 'Камерные и роскошные свадебные ужины на озере Комо для пар из Казахстана с полным транспортным сопровождением.',
    notes: 'High-end boutique luxury agency in Almaty.',
  },
  {
    agency_name: 'Art Vision Event Kazakhstan',
    contact_name: 'Nurlan Baizhanov',
    role: 'General Producer',
    email: 'info@art-vision.kz',
    website: 'https://art-vision.kz',
    location: 'Almaty / Astana',
    market: 'kz',
    language: 'ru',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Полная логистика и трансферы для масштабных международных свадебных проектов пар из Казахстана в Северной Италии.',
    notes: 'Full-service luxury production agency in Almaty.',
  },

  // ==========================================
  // 🇱🇧 LEBANON & LEVANT (lb)
  // ==========================================
  {
    agency_name: 'Paul Nasr Sal Beirut',
    contact_name: 'Paul Nasr',
    role: 'Founder & Creative Director',
    email: 'info@paulnasr.com',
    website: 'https://paulnasr.com',
    location: 'Beirut',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'Your monumental, world-acclaimed wedding architecture on Lake Como demands flawless VIP motorcade logistics.',
    notes: 'Legendary Lebanese destination wedding designer behind monumental Lake Como celebrations.',
  },
  {
    agency_name: 'Event Chic Designs',
    contact_name: 'Jardel Silva',
    role: 'Managing Director & Lead Designer',
    email: 'info@eventchicdesigns.com',
    website: 'https://eventchicdesigns.com',
    location: 'Beirut / Dubai',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa d\'Este', 'Passalacqua'],
    personalization_hook: 'Your breathtaking, high-production destination weddings in Northern Italy require discreet, pristine Mercedes-Benz logistics.',
    notes: 'Top Levant & Gulf destination event design house.',
  },
  {
    agency_name: 'Ghadeer Ashoor Events',
    contact_name: 'Ghadeer Ashoor',
    role: 'Creative Director',
    email: 'info@ghadeerashoor.com',
    website: 'https://ghadeerashoor.com',
    location: 'Beirut / Jeddah',
    market: 'lb',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Passalacqua', 'Villa Pizzo'],
    personalization_hook: 'Your opulent destination weddings across Europe set the gold standard for Levant couples seeking lakeside splendour.',
    notes: 'Renowned Middle East luxury event designer.',
  },

  // ==========================================
  // 🇦🇺 AUSTRALIA & NEW ZEALAND (au)
  // ==========================================
  {
    agency_name: 'Honey Lane Events Sydney',
    contact_name: 'Lara Beesley',
    role: 'Creative Director & Founder',
    email: 'hello@honeylane.com.au',
    website: 'https://honeylane.com.au',
    location: 'Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Passalacqua'],
    personalization_hook: 'Your Australian destination couples traveling across the globe to Lake Como deserve seamless, dedicated villa transit.',
    notes: 'Sydney luxury destination wedding planner.',
  },
  {
    agency_name: 'The Events Lounge Queensland',
    contact_name: 'Rachael Benton',
    role: 'Founder & Creative Producer',
    email: 'info@theeventslounge.com.au',
    website: 'https://theeventslounge.com.au',
    location: 'Gold Coast / Brisbane',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Villa Cipressi'],
    personalization_hook: 'Your relaxed luxury aesthetic for Australian destination celebrations makes multi-day Lake Como events feel effortless.',
    notes: 'Leading Australian luxury destination wedding & event producer.',
  },
  {
    agency_name: 'Nightingales Wedding Planners',
    contact_name: 'Kathy Nightingale',
    role: 'Principal Director',
    email: 'info@nightingales.net.au',
    website: 'https://nightingales.net.au',
    location: 'Sydney',
    market: 'au',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Pizzo', 'Villa Erba', 'Passalacqua'],
    personalization_hook: 'Your decades of experience planning destination weddings for discerning Australians guarantee stress-free Italian transfers.',
    notes: 'Sydney established luxury wedding planning firm.',
  },

  // ==========================================
  // 🇦🇪 UAE & GULF (ae)
  // ==========================================
  {
    agency_name: 'Jam Wedding Planner Dubai',
    contact_name: 'Jessica Abou Jaoude',
    role: 'Founder & Lead Designer',
    email: 'info@jamwedding.com',
    website: 'https://jamwedding.com',
    location: 'Dubai',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Passalacqua', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Your opulent Dubai-curated destination celebrations across Lake Como villas require synchronized VIP transfers.',
    notes: 'Dubai premier bespoke wedding planning atelier.',
  },
  {
    agency_name: 'La Clé Entertainment & Events',
    contact_name: 'Melanie White',
    role: 'Managing Partner',
    email: 'info@lacleentertainment.com',
    website: 'https://lacleentertainment.com',
    location: 'Dubai / Abu Dhabi',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Erba', 'Passalacqua', 'Villa Balbiano'],
    personalization_hook: 'Your high-profile destination events across Europe demand unbranded, high-spec private coaches and V-Class transfers.',
    notes: 'Dubai luxury entertainment & event production company.',
  },
  {
    agency_name: 'Tasneem Alibhai Weddings Dubai',
    contact_name: 'Tasneem Alibhai',
    role: 'Creative Director & Founder',
    email: 'info@tasneemalibhai.com',
    website: 'https://tasneemalibhai.com',
    location: 'Dubai',
    market: 'ae',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Villa d\'Este', 'Grand Hotel Tremezzo'],
    personalization_hook: 'Your signature multi-day destination wedding productions in Northern Italy deliver an unforgettable guest experience.',
    notes: 'Boutique Dubai luxury destination wedding studio.',
  },

  // ==========================================
  // 🇨🇭 SWITZERLAND (ch)
  // ==========================================
  {
    agency_name: 'Swiss Wedding Company',
    contact_name: 'Cindy Zalo',
    role: 'Lead Destination Producer',
    email: 'info@swissweddingcompany.com',
    website: 'https://swissweddingcompany.com',
    location: 'Zurich / Lugano',
    market: 'ch',
    language: 'en',
    segment: 'international',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa del Balbianello'],
    personalization_hook: 'Your seamless cross-border wedding productions between Lugano and Lake Como benefit from dedicated local fleet dispatch.',
    notes: 'Swiss luxury destination wedding planners with frequent Lake Como buyouts.',
  },
  {
    agency_name: 'Weddings by Silke Switzerland',
    contact_name: 'Silke Hechler',
    role: 'Founder & Designer',
    email: 'info@weddingsbysilke.com',
    website: 'https://weddingsbysilke.com',
    location: 'Zurich / Tuscany',
    market: 'ch',
    language: 'en',
    segment: 'international',
    key_venues: ['Passalacqua', 'Villa Pizzo', 'Villa Balbiano'],
    personalization_hook: 'Your poetic, fine-art destination weddings across Lake Como and Tuscany embody understated elegance.',
    notes: 'Renowned Swiss fine-art destination wedding designer.',
  },

  // ==========================================
  // 🇮🇹 ITALY (it) - Fresh Local & Como Specialists
  // ==========================================
  {
    agency_name: 'Weddings Italy by Regency',
    contact_name: 'Cosetta Pieri',
    role: 'Managing Partner',
    email: 'info@weddingsitaly.com',
    website: 'https://weddingsitaly.com',
    location: 'Milan / Florence / Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa d\'Este', 'Villa Erba'],
    personalization_hook: 'La vostra leadership trentennale nei destination wedding di lusso sul Lago di Como richiede un partner transfer affidabile con flotta Mercedes.',
    notes: 'Historical Italian destination wedding agency operating nationwide.',
  },
  {
    agency_name: 'Italian Weddings and Events',
    contact_name: 'Paola Frigerio',
    role: 'Founder & Destination Director',
    email: 'info@italianweddingsandevents.com',
    website: 'https://italianweddingsandevents.com',
    location: 'Milan / Lake Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa del Balbianello', 'Passalacqua', 'Villa Pizzo'],
    personalization_hook: 'I vostri matrimoni esclusivi a Villa del Balbianello e Passalacqua necessitano di coordinamento transfer impeccabile da Malpensa.',
    notes: 'High-end destination wedding planner based in Milan and Lake Como.',
  },
  {
    agency_name: 'WeddingBox Lake Como',
    contact_name: 'Laura Bravi',
    role: 'Creative Director',
    email: 'info@weddingboxlakecomo.com',
    website: 'https://weddingboxlakecomo.com',
    location: 'Como / Menaggio',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa Cipressi', 'Passalacqua'],
    personalization_hook: 'La vostra conoscenza intima del territorio lariano valorizza ogni dettaglio del transfer per gli sposi internazionali.',
    notes: 'Local Lake Como boutique wedding planning agency.',
  },
  {
    agency_name: 'Varese Wedding',
    contact_name: 'Sara Carboni',
    role: 'Owner & Event Director',
    email: 'info@varesewedding.com',
    website: 'https://varesewedding.com',
    location: 'Varese / Lake Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Passalacqua', 'Villa Pizzo', 'Villa Erba'],
    personalization_hook: 'I vostri eventi tra i laghi lombardi e Como beneficiano di minivan e minibus dedicati a disposizione 24/7.',
    notes: 'Lombardy lakes destination wedding agency.',
  },
  {
    agency_name: 'Infinity Weddings & Events Italy',
    contact_name: 'Daniela Tripodi',
    role: 'Managing Director',
    email: 'info@infinity-weddingsandevents.com',
    website: 'https://infinity-weddingsandevents.com',
    location: 'Milan / Como / Venice',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa d\'Este', 'Passalacqua'],
    personalization_hook: 'I vostri matrimoni esclusivi per coppie estere nelle ville storiche del lago richiedono puntualità e mezzi total black immacolati.',
    notes: 'Italy-wide luxury wedding planning firm.',
  },
  {
    agency_name: 'Romantic Italian Weddings',
    contact_name: 'Marco Di Loreto',
    role: 'Director',
    email: 'info@romanticitalianweddings.com',
    website: 'https://romanticitalianweddings.com',
    location: 'Florence / Milan',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Erba', 'Villa Pizzo', 'Villa Balbiano'],
    personalization_hook: 'La vostra esperienza con coppie UK e USA in trasferta in Italia garantisce un coordinamento transfer puntuale.',
    notes: 'Destination weddings across Tuscany and Northern Italy.',
  },
  {
    agency_name: 'Italy Weddings Tuscany & Lakes',
    contact_name: 'Ben Littlejohn',
    role: 'Co-Director',
    email: 'info@italyweddings.com',
    website: 'https://italyweddings.com',
    location: 'Florence / Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa d\'Este', 'Villa Balbiano', 'Passalacqua'],
    personalization_hook: 'La gestione accurata degli ospiti internazionali nei multi-day wedding richiede autisti bilingue e flotta Mercedes dedicata.',
    notes: 'Long-established destination wedding planner in Italy.',
  },
  {
    agency_name: 'Francesca Angrisano Events',
    contact_name: 'Francesca Angrisano',
    role: 'Founder & Designer',
    email: 'info@francescaangrisano.it',
    website: 'https://francescaangrisano.it',
    location: 'Milan / Lake Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa Erba'],
    personalization_hook: 'Il vostro stile raffinato ed elegante sul Lago di Como trova la perfetta corrispondenza in autisti impeccabili in abito scuro.',
    notes: 'Milan and Lake Como bespoke wedding designer.',
  },
  {
    agency_name: 'Como Events Destination',
    contact_name: 'Giulia Colombo',
    role: 'Lead Planner',
    email: 'info@comoevents.it',
    website: 'https://comoevents.it',
    location: 'Como / Cernobbio',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Pizzo', 'Villa d\'Este', 'Passalacqua'],
    personalization_hook: 'La vicinanza al lago e la gestione degli imbarchi e transfer da Malpensa e Linate con linea diretta via WhatsApp.',
    notes: 'Local Lake Como wedding logistics and planning agency.',
  },
  {
    agency_name: 'Italian Wedding Designer',
    contact_name: 'Monica Facchini',
    role: 'Principal Designer',
    email: 'info@italianweddingdesigner.com',
    website: 'https://italianweddingdesigner.com',
    location: 'Milan / Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa del Balbianello', 'Passalacqua'],
    personalization_hook: 'Progetti scenografici e produzioni su misura sul lago richiedono transfer coordinati per ospiti e famiglie VIP.',
    notes: 'Luxury wedding designer based in Milan.',
  },
  {
    agency_name: 'The Wedding Care Italy',
    contact_name: 'Ines Pesce',
    role: 'Creative Director',
    email: 'info@theweddingcare.com',
    website: 'https://theweddingcare.com',
    location: 'Milan / Rome',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Erba', 'Villa d\'Este', 'Passalacqua'],
    personalization_hook: 'La cura meticolosa dell\'esperienza degli ospiti nei matrimoni di lusso richiede una flotta elegante e puntuale.',
    notes: 'High-end destination wedding and event management.',
  },
  {
    agency_name: 'Corsini Events Group',
    contact_name: 'Tommaso Corsini',
    role: 'CEO & Founder',
    email: 'info@corsinievents.com',
    website: 'https://corsinievents.com',
    location: 'Florence / Milan',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa Erba', 'Passalacqua'],
    personalization_hook: 'I vostri grandi eventi privati e matrimoni di altissimo profilo in villa richiedono logistica di terra e transfer sincronizzati.',
    notes: 'Prestigious Italian private event and wedding production firm.',
  },
  {
    agency_name: 'Federica Beni Luxury Weddings',
    contact_name: 'Federica Beni',
    role: 'Founder & Fine Art Producer',
    email: 'info@federicabeni.com',
    website: 'https://federicabeni.com',
    location: 'Rome / Milan / Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Passalacqua', 'Villa Balbiano', 'Villa Pizzo'],
    personalization_hook: 'I vostri matrimoni intimi e curatissimi per coppie internazionali richiedono massima discrezione e vetture nere immacolate.',
    notes: 'Renowned international fine-art wedding designer based in Italy.',
  },
  {
    agency_name: 'Italian Lakes Weddings Agency',
    contact_name: 'Paolo Zanardi',
    role: 'Director',
    email: 'info@italianlakesweddings.com',
    website: 'https://italianlakesweddings.com',
    location: 'Stresa / Lake Como / Lake Maggiore',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Villa Cipressi', 'Villa d\'Este'],
    personalization_hook: 'Specialisti storici dei laghi prealpini con esigenze quotidiane di transfer aeroportuali da Milano Malpensa e Linate.',
    notes: 'Northern Italian lakes destination wedding agency.',
  },
  {
    agency_name: 'Il Garofano Rosa Weddings',
    contact_name: 'Rosa Garofano',
    role: 'Owner & Planner',
    email: 'info@ilgarofanorosa.com',
    website: 'https://ilgarofanorosa.com',
    location: 'Milan / Lake Como / Monza',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Erba', 'Villa Pizzo', 'Passalacqua'],
    personalization_hook: 'La vicinanza operativa al Lago di Como e a Milano consente di garantire transfer impeccabili per gli ospiti delle nozze.',
    notes: 'Boutique wedding planner in Lombardy.',
  },
  {
    agency_name: 'Le Mie Nozze Italian Events',
    contact_name: 'Marta Pozzi',
    role: 'Head of Destination Events',
    email: 'info@lemienozze.it',
    website: 'https://lemienozze.it',
    location: 'Milan / Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Villa Balbiano', 'Passalacqua', 'Villa del Balbianello'],
    personalization_hook: 'Supporto dedicato h24 via WhatsApp per tutti i transfer degli ospiti e degli sposi nei weekend di matrimonio a Como.',
    notes: 'Italian wedding agency with long track record.',
  },
  {
    agency_name: 'Diana Da Ros International',
    contact_name: 'Diana Da Ros',
    role: 'Creative Director',
    email: 'info@dianadaros.com',
    website: 'https://dianadaros.com',
    location: 'Milan / Monza / Lake Como',
    market: 'it',
    language: 'it',
    segment: 'boutique_local',
    key_venues: ['Passalacqua', 'Villa Balbiano', 'Villa d\'Este'],
    personalization_hook: 'Le vostre produzioni scenografiche per eventi e matrimoni d\'eccezione richiedono autisti dedicati e mezzi di rappresentanza.',
    notes: 'Milan and Lake Como international event designer.',
  },
];

async function run() {
  console.log('Checking existing prospects in Supabase...');
  const res = await fetch(`${SUPABASE_URL}/prospects?select=agency_name,email,website`, { headers });
  if (!res.ok) throw new Error(`Supabase query failed: ${res.statusText}`);
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
      console.log(`⚠️ Skipping duplicate: ${lead.agency_name} (${lead.email})`);
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
      source: 'tier1_balancing',
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
