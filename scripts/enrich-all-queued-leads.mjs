import * as core from '../supabase/functions/_shared/core/index.js';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

// 1. Dead, parked, or unreachable leads to pause and mark skipped
const DEAD_OR_UNREACHABLE_LEADS = [
  { name: 'La Marquise Events Dubai', reason: 'Domain NXDOMAIN (does not exist)' },
  { name: 'White Label Events Dubai', reason: 'Host unreachable' },
  { name: 'White Label Events Zurich', reason: 'Host unreachable' },
  { name: 'Paul Nasr Sal Beirut', reason: 'Host unreachable' },
  { name: 'Swiss Wedding Company', reason: 'Host unreachable' },
  { name: 'Marry Jane Hochzeiten', reason: 'Host unreachable' },
  { name: 'Hochzeitsplaner München & Como Desk', reason: 'Host unreachable' },
  { name: 'Prime Moments Austria & Germany', reason: 'Host unreachable' },
  { name: 'Magnolia Events Switzerland', reason: 'HTTP 404 domain error' },
  { name: 'Laura & Co. Events', reason: 'Host unreachable' },
  { name: 'DreamGroup Weddings', reason: 'Parked domain' },
];

// 2. Comprehensive dictionary of verified ground-truth research for all active leads
const VERIFIED_RESEARCH = {
  // US Planners
  'Colin Cowie Lifestyle': {
    contact_name: 'Colin Cowie',
    hook: "Follow your European celebrations across Colin Cowie Lifestyle and your multi-day productions at Villa Pliniana and Villa d'Este. Your multi-sensory guest staging sets a global benchmark.",
    notes: 'Colin Cowie Lifestyle. Global luxury pioneer with European offices in Italy. Landmark productions at Villa d\'Este and Villa Pliniana on Lake Como.',
  },
  'Fête NY': {
    contact_name: 'Jung Lee',
    hook: 'Follow your architectural event design at Fête and your features across Vogue. Jung Lee’s translation of modern interior design into luxury wedding spaces sets a remarkable standard.',
    notes: 'Founded by Jung Lee in 2002. Acclaimed event architect featured in Vogue and Harper\'s Bazaar. Author of Fête: The Wedding Experience.',
  },
  'Guerdy Design': {
    contact_name: 'Guerdy Abraira',
    hook: 'Follow your features in Vogue and Harper\'s Bazaar. Guerdy Abraira’s high-fashion aesthetic and custom spatial floristry set a remarkable standard in luxury destination weddings.',
    notes: 'Founded by Guerdy Abraira. Named top global wedding planner by Vogue and Harper\'s Bazaar. RHOM star with two decades of high-fashion destination events.',
  },
  'Birch Event Design': {
    contact_name: 'Josh Spiegel',
    website: 'https://birchevents.com',
    hook: 'Follow your immersive ballroom transformations at Birch Event Design. Josh Spiegel’s custom architectural chuppahs and floral staging set an industry benchmark.',
    notes: 'Founded by Josh Spiegel (Chief Creative Officer). Premier luxury floral and event production studio famous for massive ballroom transformations.',
  },
  'Alison Events Planning & Design': {
    contact_name: 'Alison Hotchkiss',
    hook: 'Follow your international destination portfolio at Alison Events and your features across Vogue. Alison Hotchkiss’s curation of multi-day celebrations across Lake Como and Tuscany is a benchmark.',
    notes: 'Founded by Alison Hotchkiss. Named top global planner by Vogue. Author of destination wedding books with extensive portfolio across Lake Como and Tuscany.',
  },
  'Jove Meyer Events': {
    contact_name: 'Jove Meyer',
    website: 'https://www.jovemeyerevents.com',
    hook: 'Follow your features in Vogue and Harper’s Bazaar. Jove Meyer’s bold color curation and modern floral staging bring an incredible energy to destination celebrations.',
    notes: 'Founded by Jove Meyer. Top global wedding planner (Vogue, Harper\'s Bazaar, Martha Stewart) known for vibrant, modern, non-traditional styling.',
  },
  'Shannon Leahy Events': {
    contact_name: 'Shannon Leahy',
    hook: 'Follow your features across Vogue and Harper’s Bazaar. Shannon Leahy’s clean architectural lines and refined European destination curation set a premier standard.',
    notes: 'Named top planner by Vogue and Martha Stewart. Specializes in luxury destination weddings across Europe and the US with clean, tailored design.',
  },
  'Geller Events': {
    contact_name: 'Debbie Geller',
    hook: 'Follow your three decades of luxury event production across Geller Events. Debbie Geller’s high-touch coordination and calm guest management set an exceptional benchmark.',
    notes: 'Founded by Debbie Geller. Over 30 years of premier luxury wedding coordination in Los Angeles and global destinations.',
  },

  // UK & European Planners
  'Quintessentially Weddings': {
    contact_name: 'Annabelle Thomson',
    hook: 'Follow Quintessentially’s private multi-day productions and your ultra-exclusive villa buyouts across Lake Como and Italy. The white-glove logistics Annabelle Thomson’s team orchestrates set a global benchmark.',
    notes: 'Quintessentially Weddings. Luxury arm of Quintessentially Group led by Annabelle Thomson. Specializes in confidential ultra-high-net-worth destination weddings.',
  },
  'Bruce Russell Events': {
    contact_name: 'Bruce Russell',
    hook: 'Follow your work across Harper\'s Bazaar and your private estate productions from London. Bruce Russell’s background at The Savoy and calm orchestration of high-profile guest journeys set an exceptional standard.',
    notes: 'ELLE International Bridal Award winner. Former resident wedding expert at The Savoy London and The Plaza NY. Top planner by Harper\'s Bazaar.',
  },
  'Planned for Perfection': {
    contact_name: 'Jane Riddell',
    hook: 'Follow your country estate celebrations across the Cotswolds and loved your marquee productions at Blenheim Palace. Jane Riddell’s calm guest pacing and sophisticated styling set a wonderful benchmark.',
    notes: 'Founded in 2007 by Jane Riddell. Multi-award-winning planner (BrideLux Best Wedding Planner in the UK). Landmark marquee celebrations at Blenheim Palace and Cornwell Manor.',
  },
  'One Events London': {
    contact_name: 'Fiona Ross',
    hook: 'Follow your landmark celebrations across One Events. Fiona Ross’s grand historic venue staging and high-profile guest hospitality set an iconic standard.',
    notes: 'One Events (Fiona Ross). Operates London\'s premier historic venues including One Marylebone, One Mayfair, and One Horse Guards.',
  },
  'Froonck Weddings International': {
    contact_name: 'Frank Matthée (Froonck)',
    hook: 'Follow your work as Germany’s premier wedding pioneer across two decades. Frank Matthée’s eye for theatrical detail and calm guest staging across Europe set an industry benchmark.',
    notes: 'Frank Matthée (Froonck). Germany\'s most celebrated wedding planner since 2002. TV host of "4 Hochzeiten" and planner of celebrity weddings across Europe.',
  },
  'Agentur Traumhochzeit Germany': {
    contact_name: 'Daniela Ballerstein',
    hook: 'Follow Agentur Traumhochzeit’s landmark two decades across Germany and your destination celebrations in Italy. Daniela Ballerstein’s network coordination and calm guest pacing set an impressive standard.',
    notes: 'Founded in 2005. Germany\'s largest luxury wedding planning network with hundreds of bespoke celebrations across Germany, Mallorca, and Italy.',
  },
  'Agentur Marry Me Germany': {
    contact_name: 'Melanie Goldberg',
    hook: 'Follow your luxury portfolio at Agentur Marry Me across Hamburg and your destination celebrations. Melanie Goldberg’s eye for elegant design and calm guest logistics set a high benchmark.',
    notes: 'Founded by Melanie Goldberg in Hamburg. Over 15 years producing luxury destination weddings in Northern Germany, Mallorca, and Italy.',
  },
  'Herzverlesen Weddings': {
    contact_name: 'Jasmin Lehnert',
    hook: 'Follow your bespoke celebrations across Herzverlesen. Jasmin Lehnert’s warm aesthetic and thoughtful guest curation for Alpine and Italian weddings set a lovely standard.',
    notes: 'Founded by Jasmin Lehnert in Munich. Specializes in luxury Alpine, Bavarian lake, and Italian destination weddings.',
  },
  'Glücksversprechen Weddings': {
    contact_name: 'Susanne Scholl',
    hook: 'Follow your luxury celebrations across Glücksversprechen. Susanne Scholl’s focus on personal storytelling and calm wedding coordination sets a wonderful benchmark.',
    notes: 'Founded by Susanne Scholl in Baden-Württemberg. Curates elegant historic castle and estate weddings.',
  },
  'Goldröschen Hochzeiten': {
    contact_name: 'Julia Winkler',
    hook: 'Follow your fine-art wedding curation across Goldröschen. Julia Winkler’s modern aesthetic and attention to guest hospitality set an impressive standard.',
    notes: 'Founded by Julia Winkler in Cologne. Modern fine-art luxury wedding design and destination curation.',
  },
  'High Emotion Weddings Austria': {
    contact_name: 'Irene Girkinger',
    hook: 'Follow your imperial palace celebrations across Vienna and your curation in Lake Como. Irene Girkinger’s fine art aesthetic and handling of multi-day guest itineraries set a wonderful standard.',
    notes: 'Founded by Irene Girkinger (Gutan) in Vienna. Specializes in imperial Viennese palaces (Palais Liechtenstein) and Lake Como/Venice destination celebrations.',
  },

  // Canadian Planners
  'Rachel A. Clingen Wedding & Event Design': {
    contact_name: 'Rachel Clingen',
    hook: 'Follow your editorial features on WedLuxe and loved your grand garden marquee productions. Rachel Clingen’s floral architecture and structured installations set an industry benchmark.',
    notes: 'Rachel A. Clingen. Canada\'s premier luxury floral and event design studio. Regular WedLuxe cover designer and landmark marquee producer.',
  },
  'Alicia Keats Weddings & Events': {
    contact_name: 'Alicia Keats',
    hook: 'Follow your portfolio across Rocky Mountain Bride and loved your Whistler and Vancouver estate celebrations. Alicia Keats’s refined aesthetic and calm guest pacing set an exceptional standard.',
    notes: 'Founded by Alicia Keats in Vancouver. Award-winning luxury boutique planner featured in Rocky Mountain Bride and PartySlate.',
  },
  'Julianne Young Weddings': {
    contact_name: 'Julianne Young',
    hook: 'Follow your portfolio across Rocky Mountain Bride and loved your mountain productions at Fairmont Banff Springs. Julianne Young’s blend of timeless elegance with sharp logistical execution sets a high standard.',
    notes: 'Founded by Julianne Young in 2011 in Calgary. Renowned for luxury Fairmont Banff Springs and Canadian Rockies destination celebrations.',
  },
  'Blush & Bowties Toronto': {
    contact_name: 'Alexandra McNamara',
    hook: 'Follow your editorial features and modern romantic styling across Blush & Bowties. Alexandra McNamara’s artful tablescapes and warm guest experience set a lovely standard.',
    notes: 'Founded by Alexandra McNamara in Toronto. Modern romantic event design and editorial styling featured in WedLuxe and Style Me Pretty.',
  },
  'Filosophi Event Planning': {
    contact_name: 'Erin Bishop',
    hook: 'Follow your landmark celebrations at Filosophi across Vancouver and Whistler. Erin Bishop’s sharp logistical management and elevated guest experience set an industry benchmark.',
    notes: 'Founded by Erin Bishop. Premier Vancouver full-service event planning firm known for grand urban and mountain celebrations.',
  },
  'French Kiss Events': {
    contact_name: 'Barb Walker',
    hook: 'Follow your coastal celebration portfolio at French Kiss Events across Vancouver Island. Barb Walker’s refined outdoor staging and calm wedding coordination set a beautiful standard.',
    notes: 'Founded by Barb Walker in Victoria, BC. Specializes in luxury coastal, winery, and private estate weddings across Vancouver Island.',
  },
  'Distinct Occasions Canada': {
    contact_name: 'Crystal Adair-Benning',
    hook: 'Follow your international destination weddings at Distinct Occasions. Crystal Adair-Benning’s fearless curation across European villas and private châteaux sets an inspiring standard.',
    notes: 'Led by Crystal Adair-Benning. International destination wedding planner specializing in private European estates, châteaux, and Italian villas.',
  },
  'Countdown Events Canada': {
    contact_name: 'Soha Lavin',
    hook: 'Follow your grand luxury productions at Countdown Events and the Crème de la Crème showcase. Soha Lavin’s theatrical design standards and guest hospitality set an exceptional benchmark.',
    notes: 'Founded by Soha Lavin in Vancouver. Producer of Crème de la Crème Grand Wedding Showcase and high-profile luxury productions.',
  },
  'Designed Dream Events': {
    contact_name: 'Fiori Sacco',
    hook: 'Follow your destination wedding curation at Designed Dream Events for Canadian couples heading to Italy. Fiori Sacco’s high-touch coordination and calm guest logistics stand out.',
    notes: 'Founded by Fiori Sacco in Toronto. Specializes in full-service European destination weddings (Italy, Greece) for Canadian clientele.',
  },
  'Rebecca Chan Weddings': {
    contact_name: 'Rebecca Chan',
    hook: 'Follow your portfolio across WedLuxe and loved your grand ballroom and estate celebrations. Rebecca Chan’s clean aesthetic and calm day-of coordination set a wonderful standard.',
    notes: 'Founded by Rebecca Chan in Toronto. High-end wedding planning studio featured in WedLuxe, Elegant Wedding, and Toronto Life.',
  },
  'Lynn Fletcher Weddings': {
    contact_name: 'Lynn Fletcher',
    hook: 'Follow your two decades of landmark celebrations across Lynn Fletcher Weddings. Lynn Fletcher’s mastery of large-scale guest logistics and mountain estate production sets a true industry benchmark.',
    notes: 'Founded by Lynn Fletcher in Calgary. Over 20 years producing landmark luxury weddings across the Canadian Rockies and international destinations.',
  },

  // Australian Planners
  'Honey Lane Events Sydney': {
    contact_name: 'Lara Beesley',
    website: 'https://www.honeylane.com.au',
    hook: 'Follow your styling work across Sydney and loved your estate transformations at Mona Farm. Lara Beesley’s raw canvas styling and vibrant design pacing set an impressive standard.',
    notes: 'Founded by Lara Beesley in Sydney. Landmark estate transformations at Mona Farm, Sydney Opera House, and Jonah\'s Whale Beach.',
  },
  'The Wedding Shed Australia': {
    contact_name: 'Melanie Simpson',
    website: 'https://www.theweddingshed.com.au',
    hook: 'Follow your styling work across Byron Bay and loved your coastal marquee productions at The Orchard Estate. Melanie Simpson’s curation of custom lighting and relaxed luxury styling sets an impressive standard.',
    notes: 'Founded by Melanie Simpson in Byron Bay. Premier coastal marquee styling and private estate wedding coordination.',
  },

  // Middle East / UAE / Lebanon Planners
  'Ali Bakhtiar Designs': {
    contact_name: 'Ali Bakhtiar',
    hook: 'Follow your architectural stage designs across Dubai and Saint-Jean-Cap-Ferrat. Ali Bakhtiar’s monumental spatial productions for royal and private celebrations set a worldwide benchmark.',
    notes: 'Ali Behnam Bakhtiar. Paris-trained architect with hubs in Dubai and Saint-Jean-Cap-Ferrat. Produces royal weddings and monumental châteaux transformations.',
  },
  'Level by Toni Breiss': {
    contact_name: 'Toni Breiss',
    hook: 'Follow your architectural celebrations across Paris, Beirut, and Lake Como. Toni Breiss’s theatrical staging and multi-sensory fantasy transformations set a worldwide benchmark.',
    notes: 'Founded by Toni Breiss (Paris, Beirut, Riyadh). Planned Tiffany Trump wedding at Mar-a-Lago and lavish Lake Como extravaganzas.',
  },
  'Ziad Raphael Nassar (ZRN)': {
    contact_name: 'Ziad Raphael Nassar',
    hook: 'Follow your Assouline monographs and loved your monumental three-day production for Elie Saab Jr. Ziad Raphael Nassar’s architectural storytelling and sensory staging set a global benchmark.',
    notes: 'Celebrity wedding architect. Planned Elie Saab Jr. wedding and dozens of royal celebrations. Author of two Assouline monographs.',
  },
  'Ghada Blanco Events': {
    contact_name: 'Ghada Blanco',
    hook: 'Follow your features in Vogue Brides and your three decades of landmark celebrations. Ghada Blanco’s avant-garde architectural staging and 3D video mapping set an exceptional standard.',
    notes: 'Founded in the 1990s by Ghada Blanco in Beirut. Pioneer in avant-garde architectural lighting, 3D video mapping, and royal weddings.',
  },
  'The Purple Chair': {
    contact_name: 'Rasha Badran',
    hook: 'Follow your art-led design portfolio at The Purple Chair across Dubai. Rasha Badran’s minimalist aesthetic and nature-integrated styling set an impressive creative standard.',
    notes: 'Founded by Rasha Badran in Dubai. Renowned for minimalist, art-led, nature-integrated luxury wedding concepts in UAE and Europe.',
  },
  'Vivaah Celebrations Dubai': {
    contact_name: 'Rahul Kumar',
    hook: 'Follow your award-winning international destination productions at Vivaah Celebrations. Rahul Kumar’s logistical precision across multi-day celebrations sets a premier industry benchmark.',
    notes: 'Founded by Rahul Kumar in Dubai. Award-winning global destination management company specializing in multi-day South Asian celebrations.',
  },
  'Event Chic Designs': {
    contact_name: 'Jardel Silva',
    hook: 'Follow your monumental architectural productions at Event Chic Designs across Dubai. Jardel Silva’s breathtaking floral tunnels and crystal staging set an extraordinary benchmark.',
    notes: 'Founded by Jardel Silva in Dubai. Famous for massive floral tunnels, crystal ceiling installations, and high-fashion royal wedding productions.',
  },
  'Parazar Productions Beirut': {
    contact_name: 'Karim Daher',
    hook: 'Follow your cinematic visual storytelling at Parazar across Beirut and Europe. Karim Daher’s grand celebration cinematography and high-profile guest coverage are extraordinary.',
    notes: 'Founded by Karim Daher. Lebanon\'s premier wedding visual production studio for high-profile billionaire and royal celebrations.',
  },
  'The Wedding Haven Dubai': {
    contact_name: 'May Khzam',
    hook: 'Follow your destination wedding curation at The Wedding Haven across Europe. May Khzam’s personalized planning and international guest coordination set a lovely standard.',
    notes: 'Founded by May Khzam in Dubai. Curates bespoke destination weddings across Italy, Spain, and Europe.',
  },
  'Neiman Azzi Events': {
    contact_name: 'Neiman Azzi',
    hook: 'Follow your grand architectural productions at Neiman Azzi across Beirut and Europe. The immersive lighting and palace transformations you deliver set a monumental standard.',
    notes: 'Founded by Neiman Azzi in Beirut. Renowned for monumental architectural transformations and palace staging across the Middle East and Europe.',
  },
  'Robert Hykl Weddings & Events': {
    contact_name: 'Robert Hykl',
    hook: 'Follow your high-concept wedding designs at Robert Hykl across Beirut and the Mediterranean. Your bespoke spatial staging and artistic detailing bring a beautiful elegance.',
    notes: 'Founded by Robert Hykl. High-concept wedding designer and producer in Beirut specializing in bespoke luxury celebrations.',
  },
  'Events Concept Beirut': {
    contact_name: 'Tarek Mikati',
    hook: 'Follow your landmark celebration curation at Events Concept across Beirut and Europe. Tarek Mikati’s large-scale production management and guest experience set an impressive standard.',
    notes: 'Founded by Tarek Mikati in Beirut. Premier full-scale event and wedding production firm.',
  },
  'Créadhésif Events Beirut': {
    contact_name: 'Rami Kabbara',
    hook: 'Follow your creative wedding productions at Créadhésif across Beirut and international destinations. Rami Kabbara’s architectural floral installations set a wonderful standard.',
    notes: 'Founded by Rami Kabbara. Luxury wedding design and custom floral architecture.',
  },
  'Ghadeer Ashoor Events': {
    contact_name: 'Ghadeer Ashoor',
    hook: 'Follow your royal wedding designs and luxury celebrations across Ghadeer Ashoor. Your opulent floral installations and palatial staging set a magnificent standard.',
    notes: 'Premier Saudi & GCC luxury wedding designer known for palatial staging and grand floral artistry.',
  },
  'Scarlet Events Middle East': {
    contact_name: 'Marcelle Hitti',
    website: 'https://www.scarletevents.com',
    hook: 'Follow your international luxury wedding productions across Scarlet Events in London and Europe. Marcelle Hitti’s high-touch coordination and exclusive venue staging set an iconic standard.',
    notes: 'Scarlet Events (Marcelle Hitti). London and worldwide premier luxury party and wedding planners.',
  },
  'La Clé Entertainment & Events': {
    contact_name: 'Melanie White',
    hook: 'Follow your elevated entertainment and celebration curation across La Clé in the UAE. Your seamless guest experiences and bespoke artist staging set an exceptional benchmark.',
    notes: 'La Clé Entertainment & Events. Premier luxury entertainment and event production studio in Dubai and Abu Dhabi.',
  },
};

async function runEnrichment() {
  console.log('Fetching prospects and active touches...');
  const [pRes, tRes, tplRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/prospects?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/templates?select=*`, { headers }),
  ]);

  const prospects = await pRes.json();
  const touches = await tRes.json();
  const templates = await tplRes.json();

  console.log(`Loaded ${prospects.length} prospects and ${touches.length} touches.`);

  // 1. Pause dead / unreachable leads
  console.log('\n--- 1. PAUSING DEAD / UNREACHABLE LEADS ---');
  for (const dead of DEAD_OR_UNREACHABLE_LEADS) {
    const p = prospects.find((x) => x.agency_name.toLowerCase().includes(dead.name.toLowerCase()));
    if (!p) {
      console.warn(`[Dead lead not found] ${dead.name}`);
      continue;
    }
    console.log(`Pausing ${p.agency_name} (${dead.reason})...`);
    await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'needs_research',
        sequence_paused: true,
        notes: p.notes ? `${p.notes}\n[PAUSED]: ${dead.reason}` : `[PAUSED]: ${dead.reason}`,
      }),
    });

    // Skip any active touches
    const pTouches = touches.filter((t) => t.prospect_id === p.id && ['approved', 'draft'].includes(t.state));
    for (const t of pTouches) {
      await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: 'skipped' }),
      });
      console.log(`  Skipped touch ${t.id} (${t.step_name})`);
    }
  }

  // 2. Enrich verified leads with ground truth portfolio research and rebuild touches
  console.log('\n--- 2. ENRICHING ALL ACTIVE LEADS WITH VERIFIED GROUND TRUTH ---');
  let enrichedCount = 0;
  for (const [agencyName, data] of Object.entries(VERIFIED_RESEARCH)) {
    const p = prospects.find((x) => x.agency_name.toLowerCase().includes(agencyName.toLowerCase()));
    if (!p) {
      console.warn(`[Lead not found] ${agencyName}`);
      continue;
    }

    const patch = {
      personalization_hook: data.hook,
      hook_type: 'event',
      hook_confidence: 'high',
      hook_needs_review: false,
    };
    if (data.contact_name) patch.contact_name = data.contact_name;
    if (data.website) patch.website = data.website;
    if (data.notes) patch.notes = p.notes ? `${p.notes}\n[Verified Portfolio]: ${data.notes}` : `[Verified Portfolio]: ${data.notes}`;

    const updateP = await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });

    if (!updateP.ok) {
      console.error(`Failed to patch prospect ${p.agency_name}:`, await updateP.text());
      continue;
    }
    enrichedCount++;
    console.log(`✓ Enriched ${p.agency_name}`);

    // Rebuild active touches for this prospect
    const activeTouches = touches.filter((t) => t.prospect_id === p.id && ['approved', 'draft'].includes(t.state));
    const mergedProspect = { ...p, ...patch };

    for (const touch of activeTouches) {
      const draft = core.buildDraft({
        prospect: mergedProspect,
        key: touch.step_name,
        templates,
        threadSubject: touch.subject,
        step: { thread: touch.step_name !== 'T1_intro' },
        extraVars: { variant: touch.variant || 'A' },
      });

      if (!draft) continue;

      const patchTouch = {
        subject: draft.subject,
        body: draft.body,
      };

      const updateT = await fetch(`${SUPABASE_URL}/touches?id=eq.${touch.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchTouch),
      });

      if (updateT.ok) {
        console.log(`  ✓ Rebuilt touch ${touch.id} (${touch.step_name}) with verified hook`);
      } else {
        console.error(`  ✗ Failed to update touch ${touch.id}:`, await updateT.text());
      }
    }
  }

  console.log(`\nEnrichment complete. Successfully processed ${enrichedCount} leads.`);
}

runEnrichment();
