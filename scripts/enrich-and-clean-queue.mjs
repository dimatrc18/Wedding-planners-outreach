import * as core from '../supabase/functions/_shared/core/index.js';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

// 1. Dead / Parked / Invalid leads to pause immediately
const DEAD_OR_INVALID_LEADS = [
  { name: 'Boutique Weddings Australia', reason: 'Parked domain (/lander)' },
  { name: 'Wedding Destination AU', reason: 'Parked domain for sale (Above.com)' },
  { name: 'Festfein Hochzeitsplanung', reason: 'Dead domain (LiveConfig error)' },
  { name: 'DXB Luxury Weddings', reason: 'Parked domain (Parking/1.0)' },
  { name: 'Clementine Destination Events', reason: 'Parked domain (/lander)' },
  { name: 'Jam Wedding Planner Dubai', reason: 'Personal couple blog from 2011, not a planner' },
  { name: 'Marry Me UAE', reason: 'Directory portal (marryme.ae), not a planning agency' },
];

// 2. Real ground-truth portfolio research for active and upcoming planners
const VERIFIED_RESEARCH = {
  'Touchwood Entertainment': {
    contact_name: 'Vijay Arora',
    hook: 'Follow Touchwood’s milestone as India\'s first NSE-listed event company and your grand destination weddings. The scale and logistical precision Vijay Arora\'s team delivers set an industry benchmark.',
    notes: 'Co-founded in 1997 by Manjit Singh and Vijay Arora. India\'s 1st NSE-listed event management company. Pioneer in 25+ years of grand luxury weddings and artist management.',
  },
  'Memorable Indian Weddings': {
    agency_name: 'Elsewhere Weddings',
    contact_name: 'Sunaina Sharma',
    website: 'https://elsewhereweddings.com',
    email: 'hello@elsewhereweddings.com',
    hook: 'Follow your transition to Elsewhere Weddings and your work across @theelsewhereweddings. Sunaina\'s high-touch coordination and calm destination guest experience stand out.',
    notes: 'Rebranded from Memorable Indian Weddings to Elsewhere Weddings. Led by Sunaina Sharma. Boutique destination planning across India and Europe.',
  },
  'Magnificence Events': {
    agency_name: 'The A-Cube Project',
    contact_name: 'Ambika Gupta',
    website: 'https://thea3project.com',
    hook: 'Follow your architectural design standard at The A-Cube Project and your work for Kajal Aggarwal. Ambika Gupta’s blend of spatial structure with heritage florals is stunning.',
    notes: 'Founded by Ambika Gupta (The A-Cube Project). Celebrated spatial wedding designer and TEDx speaker. Curated Kajal Aggarwal celebrity wedding and luxury European celebrations.',
  },
  'FNP Weddings & Events Destination Desk': {
    contact_name: 'Vikaas Gutgutia',
    hook: 'Follow FNP Weddings and your three decades of grand floral architecture across landmark celebrations. The scale and production quality your destination team delivers are legendary.',
    notes: 'Luxury wedding division of Ferns N Petals (Vikaas Gutgutia). Over 30 years in grand floral architecture and premier destination wedding production.',
  },
  'Aash Studio': {
    contact_name: 'Aashna Saran',
    hook: 'Follow your bespoke design work at Aash Studio and loved your heritage staging at Mehrangarh Fort. Aashna Saran’s balance of raw architecture with artisanal florals is stunning.',
    notes: 'Founded by Aashna Saran. Pioneer in sustainable weddings (Dia Mirza wedding), raw industrial transformations (Mukesh Mills), and heritage fort productions at Mehrangarh Fort.',
  },
  'Enjay Events': {
    contact_name: 'Nikhil Jani',
    hook: 'Follow Enjay’s multi-day palace wedding productions and your grand setups across The Leela Palace in Udaipur and Jaipur. Your handling of guest hospitality across massive guest lists is exceptional.',
    notes: 'Enjay Weddings & Luxury Events (Nikhil Jani). Over a decade of royal palace destination weddings in Rajasthan (Udaipur, Jaipur, Jaisalmer).',
  },
  'Tasneem Alibhai Weddings Dubai': {
    agency_name: 'TA Weddings & Special Occasions',
    contact_name: 'Tasneem Alibhai',
    website: 'https://tasneemalibhai.com',
    hook: 'Follow your multicultural celebration portfolio across TA Weddings and loved your destination curation in Florence. Tasneem Alibhai’s 3D spatial staging and guest coordination set an exceptional standard.',
    notes: 'TA Weddings (Tasneem Alibhai). Operating since 2008 in Dubai. Specializes in luxury multicultural destination weddings across Florence, Turkey, and UAE.',
  },
  'Sarah Haywood Weddings & Celebrations': {
    contact_name: 'Sarah Haywood',
    hook: 'Follow your portfolio on US Vogue’s master list and your celebrations at Castiglion del Bosco and Villa Astor. The logistics and guest journey Sarah Haywood delivers across Italy are a masterclass.',
    notes: 'US Vogue Ultimate Master List. Luxury UK & European wedding producer with iconic Italian celebrations at Castiglion del Bosco, Villa Astor, and Lake Como.',
  },
  'Nightingales Wedding Planners': {
    website: 'https://www.ebn.com.au',
    contact_name: 'Kathy Apostolidis',
    hook: 'Follow your work in Sydney across @eventsbynightingales. Your three decades of luxury event styling and architectural tablescapes set an industry benchmark.',
    notes: 'Founded by Kathy Apostolidis in 1994. Modern portal ebn.com.au (Events by Nightingales). Sydney luxury styling and architectural tablescapes.',
  },
};

async function execute() {
  console.log('Fetching prospects and touches...');
  const [pRes, tRes, tplRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/prospects?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/templates?select=*`, { headers }),
  ]);

  const prospects = await pRes.json();
  const touches = await tRes.json();
  const templates = await tplRes.json();

  console.log(`Loaded ${prospects.length} prospects and ${touches.length} touches.`);

  // 1. Pause dead / invalid leads
  console.log('\n--- PAUSING DEAD / INVALID LEADS ---');
  for (const dead of DEAD_OR_INVALID_LEADS) {
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

    // Skip any approved or draft touches
    const pTouches = touches.filter((t) => t.prospect_id === p.id && ['approved', 'draft'].includes(t.state));
    for (const t of pTouches) {
      await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          state: 'skipped',
        }),
      });
      console.log(`  Skipped touch ${t.id} (${t.step_name})`);
    }
  }

  // 2. Enrich verified leads with real portfolio research and rebuild touches
  console.log('\n--- ENRICHING VERIFIED LEADS WITH GROUND TRUTH ---');
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
    if (data.agency_name) patch.agency_name = data.agency_name;
    if (data.contact_name) patch.contact_name = data.contact_name;
    if (data.website) patch.website = data.website;
    if (data.email) patch.email = data.email;
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
    console.log(`✓ Enriched ${p.agency_name} -> ${patch.agency_name || p.agency_name}`);

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

  console.log('\nExecution complete.');
}

execute();
