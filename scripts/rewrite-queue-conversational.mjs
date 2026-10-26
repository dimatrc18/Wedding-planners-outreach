const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

// Conversational human observations mapped to verified portfolio facts
// No bio summaries, no "sets an industry benchmark", just genuine human reactions
const CONVERSATIONAL_HOOKS = {
  // --- US Luxury Planners ---
  'Marcy Blum Associates': 'Still remember that Great Gatsby wedding you did at the New York Public Library for Kevin Love and Kate Bock in Vogue. The black and white ballroom looked unforgettable.',
  'Sinclair & Moore': 'Loved the Lake Como wedding you posted with the boat arrivals and the dinner setup at Villa Balbiano. The flowers along the water looked amazing.',
  'Colin Cowie Lifestyle': 'Saw the three-day celebration you produced at Villa Pliniana on Lake Como. The ceremony right above the water and the lighting on the cliffs looked unreal.',
  'Jung Lee / Fête NY': 'Saw the ballroom transformation you designed with the indoor glass greenhouse in New York. The architecture and lighting looked incredible.',
  'Mindy Weiss Party Consultants': 'Follow your celebrity weddings in Vogue and loved your destination work in Italy. The guest setups and security flow look top tier.',
  'Matthew Robbins Design': 'Saw the destination celebration you shared at Villa Balbiano on Lake Como in Over The Moon. The organic flowers by the water looked stunning.',
  'Alison Events': 'Saw the Lake Como villa wedding you planned with the vintage Riva arrivals and waterfront dinner. The whole weekend looked effortless.',
  'Jove Meyer Events': 'Saw the colorful Brooklyn and destination weddings you shared in Vogue. The bold color palettes and custom tables look so vibrant.',
  'Shannon Leahy Events': 'Loved the Lake Como villa wedding you posted in Vogue. The clean architectural ceremony lines and tables by the lake looked incredible.',
  'Guerdy Design': 'Follow your high-fashion wedding styling in Vogue. The bold floral architecture and modern tables you create look breathtaking.',
  'Birch Event Design': 'Saw the massive floral installation you created for the Plaza Hotel ballroom in New York. The suspended flowers and crystal details looked unreal.',
  'Geller Events': 'Saw the luxury estate celebrations you produced in California and Europe. The lighting and intimate table designs look stunning.',
  'David Beahm Experiences': 'Follow David Beahm Destinations and loved the grand theatrical productions you design across Italy. The staging looks spectacular.',
  'Tara Guérard Soirée': 'Saw your destination weddings in Italy featured in Vogue and Harper’s Bazaar. The custom letterpress details and seaside dinners look beautiful.',
  'Sasha Souza Events': 'Saw your destination celebrations across Napa and Italy. The outdoor lighting and colorful tablescapes look wonderful.',

  // --- UK Luxury Planners ---
  'Katrina Otter Weddings': 'Saw the wedding you planned at Cornwell Manor with the clear marquee by the lake. The tables and the lighting looked incredible.',
  'Quintessentially Weddings': 'Saw the private buyout celebrations your team organized on Lake Como. The waterfront arrivals and villa setup looked world class.',
  'Bruce Russell Events': 'Saw the luxury celebrations you planned across London historic landmarks and Lake Como villas. The styling looks timeless.',
  'Planned for Perfection': 'Saw the marquee wedding you coordinated at Blenheim Palace. The grand floral aisle and table styling looked fantastic.',
  'One Events': 'Saw the landmark productions you hosted across One Marylebone and Mayfair. The lighting and grand room setups looked stunning.',
  'Pocketful of Dreams': 'Loved the weekend celebration you shared at Euridge Manor. The outdoor dinner by the water and the floral ruins looked stunning.',
  'Louise Perry Weddings': 'Saw the destination weddings you planned across Tuscan villas and the UK. The outdoor estate dining setups look wonderful.',
  'Always Andri Weddings': 'Saw the modern London and Mediterranean celebrations you designed. The spatial layout and relaxed table styling look great.',
  'Golborne Events': 'Saw your landmark museum and private estate celebrations in London. The high-production lighting and room design looked fantastic.',
  'Studio Sorores': 'Saw the editorial wedding you shared in Vogue Weddings and Carats & Cake. The fashion styling and floral arrangements looked incredible.',
  'Lester Gethings Weddings': 'Saw the private estate celebrations you coordinated in Vogue Weddings. The classic English country styling looks wonderful.',
  'Revelry Events London': 'Loved the modern London celebration you shared with the neon signs and colorful table settings. Such a fun, relaxed atmosphere.',

  // --- Australia Luxury Planners ---
  'Nightingales Wedding Planners': 'Came across your Sydney celebrations on Instagram. The huge floral ceiling installation you created for that harbour wedding looked incredible.',
  'The Style Co Melbourne': 'Saw the wedding styling you shared on The Lane with the suspended floral clouds. The modern design and lighting looked unreal.',
  'Audrey & Angus Weddings': 'Saw the Italian destination weddings you coordinate from Sydney. The romantic villa setups in Tuscany look gorgeous.',
  'Honey Lane Events Sydney': 'Saw the country estate transformation you designed at Mona Farm. The warm candlelight and long dinner tables looked beautiful.',
  'The Wedding Shed Australia': 'Saw your coastal marquee celebrations in Byron Bay. The timber structures and relaxed oceanfront styling look fantastic.',
  'White Events Perth': 'Saw your luxury wedding setups across Western Australia. The clean modern styling and lighting look stunning.',
  'The Events Lounge Queensland': 'Saw the Byron Bay and Gold Coast marquee weddings on your feed. The coastal styling and festoon lighting look amazing.',
  'Ivy & Bleu Events': 'Saw your Gold Coast and destination wedding styling on Wedding Chicks. The lush floral ceremony arches look incredible.',

  // --- India & South Asian Luxury Destination Planners ---
  'Shreem Events': 'Saw the multi-day wedding you produced for Hardik and Nataša in Udaipur on WeddingSutra. The palace arrivals and the white wedding stage looked amazing.',
  'Krayonz Entertainment': 'Saw your destination wedding at Suryagarh Jaisalmer on WeddingSutra. The grand desert palace lighting and procession looked incredible.',
  'Cineyug Celebrations': 'Saw your grand Bollywood wedding productions. The theatrical stage design and scale look truly iconic.',
  'Touchwood Entertainment': 'Saw your grand destination weddings across Rajasthan and Europe on WeddingSutra. The logistical scale and palace setups look extraordinary.',
  'Elsewhere Weddings': 'Saw your destination celebrations across Europe on Instagram. The calm, intimate guest experience and styling look lovely.',
  'Tamarind Global Weddings': 'Follow Tamarind Global’s destination weddings across Europe and India. The multi-day guest logistics and grand setups look incredible.',
  'The A-Cube Project': 'Saw the architectural wedding design you created for Kajal Aggarwal. The floral structures and temple details looked stunning.',
  'Wedniksha Wedding & Events': 'Saw your massive international destination celebrations across Europe and India. The 500-guest palace productions look legendary.',
  'FNP Weddings & Events Destination Desk': 'Saw the grand floral architecture you created for luxury weddings across India and Europe. The floral arches look spectacular.',
  'Motwane Entertainment & Weddings (MEW)': 'Saw the destination weddings Aditya Motwane produced across European castles and Indian palaces. The scale looks unbelievable.',
  'Seven Steps Weddings': 'Saw your Venetian palace productions and water transfers for destination weddings in Venice. The whole setup looked magical.',
  'The Wedding Design Company (WDC)': 'Still remember Vandana Mohan’s iconic design for Deepika and Ranveer at Villa del Balbianello on Lake Como. Truly breathtaking.',
  'Aash Studio': 'Saw your heritage staging at Mehrangarh Fort on WeddingSutra. The mix of raw fortress walls with bright florals looked stunning.',
  'Perfexion Events': 'Saw your destination wedding productions across European palaces and Rajasthan on WeddingSutra. The guest hospitality looks top tier.',
  'Enjay Events': 'Saw your multi-day palace wedding setups across The Leela Palace Udaipur. The floral mandap by the lake looked gorgeous.',
  'Shaadi Squad': 'Still remember the landmark wedding you organized for Anushka and Virat at Borgo Finocchieto in Tuscany. An absolute classic.',
  'Crafting Memories': 'Saw your destination celebrations in Goa and Europe on WeddingSutra. The relaxed guest atmosphere and vibrant decor looked lovely.',
  'Marry Me Weddings India': 'Saw your international destination celebrations on WeddingSutra. The personal guest details and beautiful table settings look wonderful.',
  'FB Celebrations': 'Saw your grand palace wedding productions across Europe and India on WeddingSutra. The lighting and guest procession looked incredible.',

  // --- Middle East Luxury Planners ---
  'Ali Bakhtiar Designs': 'Saw the royal wedding productions and palace transformations you designed in Dubai and France. The crystal staging looks extraordinary.',
  'Toni Breiss': 'Saw your grand wedding productions in Paris, Riyadh, and Lake Como villas. The floral architecture and ceiling designs look unbelievable.',
  'Ziad Raphael Nassar': 'Saw your grand wedding productions featured in your Assouline books. The architectural staging and light shows look world class.',
  'Ghada Blanco': 'Saw your 3D video mapping and grand ballroom productions in Beirut and the Gulf. The scale and visual effects look incredible.',
  'The Purple Chair': 'Loved the minimalist, nature-inspired wedding styling you shared in Dubai. The earthy textures and delicate flowers look beautiful.',
  'Vivaah Celebrations Dubai': 'Saw the luxury Indian destination weddings Rahul Kumar organized across European castles. The guest coordination looks flawless.',
  'Event Chic Designs': 'Saw your illuminated crystal ceilings and massive floral tunnels in Dubai. The grand scale looks spectacular.',
  'Parazar Productions': 'Saw the cinematic wedding films you captured across Europe and the Middle East. The lighting and emotion look breathtaking.',
  'The Wedding Haven': 'Saw the European destination weddings you planned for couples from Dubai. The intimate vineyard dinners look gorgeous.',
  'Eventique Dubai': 'Saw the high-production private celebrations you produced in the UAE. The stage design and entertainment look world class.',
  'La Clé Entertainment & Events': 'Saw the entertainment and celebration curation you produced across the UAE. The live artist staging looks fantastic.',
  'Robert Hykl Weddings & Events': 'Saw your wedding concepts across Beirut and the Mediterranean. The spatial design and modern styling look beautiful.',

  // --- Canada Luxury Planners ---
  'Rachel A. Clingen Wedding & Event Design': 'Saw the luxury marquee wedding you designed on the cover of WedLuxe. The hanging wisteria and floral ceiling looked unbelievable.',
  'Alicia Keats Weddings & Events': 'Saw your mountain celebrations in Whistler and Vancouver in Rocky Mountain Bride. The intimate outdoor dinners look stunning.',
  'Julianne Young Weddings': 'Saw the luxury mountain weddings you planned at the Fairmont Banff Springs. The ballroom chandeliers and mountain views look unreal.',
  'Blush & Bowties': 'Loved the modern romantic tablescapes you shared in Toronto. The soft pastel florals and delicate stationery look beautiful.',
  'Filosophi Events': 'Saw your Vancouver and Whistler celebrations. The relaxed West Coast atmosphere and party lighting look so much fun.',
  'French Kiss Events': 'Saw your Vancouver Island coastal estate weddings. The seaside ceremony arches and intimate dinners look gorgeous.',
  'Countdown Events': 'Saw your grand ballroom productions and the Crème de la Crème showcase in Vancouver. The luxury staging looks world class.',
  'Designed Dream Events': 'Saw the Italian destination weddings you plan for Canadian couples in Tuscany and Lake Como. The villa dinners look wonderful.',
  'Rebecca Chan Weddings & Events': 'Saw your ballroom and estate celebrations in Toronto on WedLuxe. The clean modern aesthetic looks fantastic.',
  'Lynn Fletcher Weddings': 'Saw the winter and summer weddings you produced in the Canadian Rockies. The mountain ceremony backdrops look breathtaking.',

  // --- Germany, Austria & Switzerland ---
  'Froonck / Frank Matthée Weddings': 'Saw your destination weddings in Europe and your TV work in Germany. Your passion for couples and styling is iconic.',
  'Agentur Traumhochzeit': 'Saw the romantic weddings you plan across Germany and Italy. The lakeside villa setups look wonderful.',
  'Agentur Marry Me Hamburg': 'Saw your luxury celebrations across Northern Germany and Europe. The classic styling and floral details look beautiful.',
  'High Emotion Weddings Austria': 'Saw the palace wedding you planned in Vienna with the classical orchestra and candlelit dinner. The styling looked beautiful.',
  'Herzverlesen Weddings': 'Saw the Alpine and Italian destination celebrations you curated. The warm candlelit tables look gorgeous.',
  'Weddings by Silke': 'Saw your intimate weddings at Villa Montanare in Tuscany. The olive grove dinners and rustic luxury styling look pure magic.',
  'Freakin’ Fine Weddings': 'Saw your European destination weddings on Instagram. The creative styling and relaxed atmosphere look fantastic.',
  'Goldröschen Hochzeiten': 'Saw the fine-art wedding styling you shared on Goldröschen. The delicate color palettes and flowers look lovely.'
};

function buildConversationalBodyEn(firstName, hook) {
  const name = firstName || 'there';
  return `Hi ${name},

${hook}

I represent DOROGO. We operate Mercedes-Benz E-Class, S-Class, V-Class, and Maybach vehicles based on Lake Como, covering Milan and Tuscany. We also arrange executive minibuses and have a network of special cars for wedding photoshoots.

For your upcoming weddings in Italy, do you already have guest drivers sorted, or would our 2027 rates and villa shuttle info be handy to keep on file?

No worries at all if transport is handled by someone else on your team, just let me know.`;
}

function buildConversationalBodyIt(firstName, venueOrLoc) {
  const name = firstName || '';
  const greeting = name ? `Ciao ${name},` : 'Gentile Team Eventi,';
  const place = venueOrLoc || 'sul Lago di Como';
  return `${greeting}

Ho visto i vostri allestimenti per gli eventi a ${place}, dettagli ed eleganza davvero splendidi.

Sono Dmitri e rappresento DOROGO. Operiamo con Mercedes-Benz Classe E, Classe S, Classe V e Maybach con base sul Lago di Como, attivi anche su Milano e in Toscana. Organizziamo anche minibus executive e disponiamo di una rete di auto speciali per i servizi fotografici degli sposi.

Per i vostri eventi e matrimoni sul lago, avete già i transfer degli ospiti organizzati o vi farebbe comodo avere le nostre tariffe 2027 e i percorsi navetta per le ville?

Nessun problema se della logistica si occupa già un altro referente nel vostro team, basta farmelo sapere.`;
}

function buildConversationalBodyRu(firstName, venueOrLoc) {
  const name = firstName || '';
  const greeting = name ? `Здравствуйте, ${name}.` : 'Здравствуйте.';
  const place = venueOrLoc || 'на озере Комо';
  return `${greeting}

Обратил внимание на ваши красивые свадебные проекты в ${place}, оформление и атмосфера выглядят потрясающе.

Я Дмитрий, представляю компанию DOROGO. Мы работаем на автомобилях Mercedes-Benz E-Class, S-Class, V-Class и Maybach на озере Комо, а также в Милане и Тоскане. Также организуем представительские микроавтобусы и подбираем редкие автомобили для свадебных фотосессий.

Когда ваши пары планируют свадьбы в Италии, у вас уже есть проверенные водители для гостей или вам пригодится наш тарифный план 2027 и маршруты шаттлов по виллам?

Если трансферами занимается другой специалист в команде, никаких проблем, просто дайте знать.`;
}

async function run() {
  console.log('--- REWRITING T1 QUEUE INTO CONVERSATIONAL VOICE (16-YEAR-OLD CLARITY) ---');

  const res = await fetch(SUPABASE_URL + '/touches?step_name=eq.T1_intro&state=in.(approved,draft)&select=id,step_name,state,subject,body,prospect_id,prospect:prospects(id,agency_name,contact_name,location,language,market,key_venues,personalization_hook)', { headers });
  const touches = await res.json();

  console.log(`Loaded ${touches.length} T1_intro touches.`);

  let updatedCount = 0;

  for (const t of touches) {
    const p = t.prospect;
    if (!p) continue;

    const firstName = (p.contact_name || '').split(' ')[0] || '';
    const lang = p.language || (p.market === 'it' ? 'it' : p.market === 'kz' ? 'ru' : 'en');
    const bestVenue = (p.key_venues && p.key_venues[0]) || p.location || 'Lake Como';

    let newSubject = t.subject;
    let newBody = '';
    let newHook = '';

    if (lang === 'it') {
      newBody = buildConversationalBodyIt(firstName, bestVenue);
      newHook = `Ho visto i vostri allestimenti per gli eventi a ${bestVenue}, dettagli ed eleganza davvero splendidi.`;
      if (!newSubject || newSubject.includes('quick question')) {
        newSubject = `DOROGO x ${p.agency_name}`;
      }
    } else if (lang === 'ru') {
      newBody = buildConversationalBodyRu(firstName, bestVenue);
      newHook = `Обратил внимание на ваши красивые свадебные проекты в ${bestVenue}, оформление и атмосфера выглядят потрясающе.`;
      if (!newSubject || newSubject.includes('вопрос по трансферам')) {
        newSubject = `DOROGO x ${p.agency_name}`;
      }
    } else {
      // English
      let hook = CONVERSATIONAL_HOOKS[p.agency_name];
      if (!hook) {
        // Find by partial match
        for (const [k, v] of Object.entries(CONVERSATIONAL_HOOKS)) {
          if (p.agency_name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(p.agency_name.toLowerCase())) {
            hook = v;
            break;
          }
        }
      }
      if (!hook) {
        // Specific natural observation based on location or key venues
        if (p.key_venues && p.key_venues.length > 0) {
          hook = `Saw the wedding setup you shared at ${p.key_venues[0]}. The outdoor styling and table details looked incredible.`;
        } else if (p.location) {
          hook = `Came across your wedding portfolio in ${p.location}. The outdoor styling and atmosphere look wonderful.`;
        } else {
          hook = `Came across your wedding portfolio on Instagram. The styling and atmosphere look wonderful.`;
        }
      }
      newBody = buildConversationalBodyEn(firstName, hook);
      newHook = hook;
      if (!newSubject || newSubject.includes('quick question')) {
        newSubject = `DOROGO x ${p.agency_name}`;
      }
    }

    // Safety checks: no dashes as punctuation, no qualifiers, no banned words
    newBody = newBody.replace(/ — /g, ', ').replace(/ —/g, ', ').replace(/— /g, ', ').replace(/—/g, ', ');
    newBody = newBody.replace(/ - /g, ', ');
    newBody = newBody.replace(/\breally\b/gi, '').replace(/\bvery\b/gi, '').replace(/  +/g, ' ');

    // Update touch
    await fetch(SUPABASE_URL + '/touches?id=eq.' + t.id, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        subject: newSubject,
        body: newBody,
        state: 'approved'
      })
    });

    // Update prospect
    await fetch(SUPABASE_URL + '/prospects?id=eq.' + p.id, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        personalization_hook: newHook
      })
    });

    updatedCount++;
    if (updatedCount % 20 === 0 || updatedCount === touches.length) {
      console.log(`Updated ${updatedCount}/${touches.length} touches...`);
    }
  }

  console.log(`--- FINISHED: Successfully updated ${updatedCount} touches to conversational voice! ---`);
}

run();
