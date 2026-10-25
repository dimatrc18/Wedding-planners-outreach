const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

// 1. Invalid / Non-planner leads to pause immediately
const LEADS_TO_PAUSE = [
  {
    name: 'Emma Westmacott Weddings',
    reason: 'Broken SSL and non-planner (ceramic artist / maker, not a wedding planner)'
  },
  {
    name: 'Grace & Tailor Events',
    reason: 'Corporate technical production / AV company, not a wedding planning agency'
  }
];

// 2. Real verified research and CEO-concise copy for active leads
const VERIFIED_ENRICHMENT = {
  'Shreem Events': {
    subject: 'DOROGO x Shreem Events',
    hook: 'Follow your work across WeddingSutra and loved your grand production for Hardik and Nataša in Udaipur. Your handling of high-profile guest journeys across multi-day celebrations is a masterclass.'
  },
  'Tamarind Global Weddings': {
    subject: 'DOROGO x Tamarind Global',
    hook: 'Follow Tamarind Global’s extensive destination management across Europe and India. Your operational precision across multi-day international guest journeys is a benchmark.'
  },
  'Perfexion Events': {
    subject: 'DOROGO x Perfexion Events',
    hook: 'Follow your luxury destination productions on WeddingSutra. Ashish Bohra’s management of multi-day international guest movements and palace logistics sets a high standard.'
  },
  'Sinclair & Moore': {
    subject: 'DOROGO x Sinclair & Moore',
    hook: 'Follow your multi-day Lake Como wedding itineraries and garden floral styling. Your curated guest journeys from lakeside welcome terraces to private villa ceremonies set a high standard.'
  },
  'Pocketful of Dreams': {
    subject: 'DOROGO x Pocketful of Dreams',
    hook: 'Follow your multi-day estate celebrations across the Cotswolds and Europe. Michelle Kelly’s pioneer work in immersive weekend itineraries and private estate takeovers sets a clear standard.'
  },
  'Louise Perry Weddings': {
    subject: 'DOROGO x Louise Perry',
    hook: 'Follow your destination portfolio across Italy and the UK. Louise Perry’s clear handling of multi-day villa logistics and guest movements between regional airports and private estates is a benchmark.'
  },
  'Always Andri Weddings': {
    subject: 'DOROGO x Always Andri',
    hook: 'Follow your design-led productions across London and Southern Europe. Andri Benson’s theatrical spatial design and handling of multicultural guest itineraries create memorable celebrations.'
  },
  'Mindy Weiss Party Consultants': {
    subject: 'DOROGO x Mindy Weiss',
    hook: 'Follow your landmark celebrity celebrations in Vogue and your destination work across Italy. Mindy Weiss’s ability to orchestrate high-security, multi-day guest travel sets the gold standard.'
  },
  'Matthew Robbins Design': {
    subject: 'DOROGO x Matthew Robbins Design',
    hook: 'Follow your destination celebrations in Over The Moon and loved your organic floral artistry at Villa Balbiano on Lake Como. Matthew Robbins and Luis Otoya create truly memorable Italian villa experiences.'
  },
  'Golborne Events': {
    subject: 'DOROGO x Golborne Events',
    hook: 'Follow your grand London landmark takeovers and private European estate buyouts. Natalia Fallik’s high-production standards across multi-day celebrations are exceptional.'
  },
  'Studio Sorores': {
    subject: 'DOROGO x Studio Sorores',
    hook: 'Follow your editorial wedding productions in Vogue Weddings and Carats & Cake. Jessie Westwood’s fashion-forward styling across the Cotswolds and European destinations is a benchmark.'
  },
  'Lester Gethings Weddings': {
    subject: 'DOROGO x Lester Gethings',
    hook: 'Follow your exclusive estate weddings in Vogue Weddings and Brides. Lester Gethings’s meticulous eye for detail and smooth guest movement across private estates set a wonderful standard.'
  },
  'Revelry Events London': {
    subject: 'DOROGO x Revelry Events',
    hook: 'Follow your modern, rulebook-free wedding productions across London and Europe. Holly Poulter’s creative direction and relaxed yet precise guest itineraries create unforgettable weekends.'
  },
  'Tara Guérard Soirée': {
    subject: 'DOROGO x Tara Guérard Soirée',
    hook: 'Follow your Italian destination celebrations in Vogue and Harper’s Bazaar. Tara Guérard’s blend of custom styling and multi-day estate coordination across Italy is exceptional.'
  },
  'David Beahm Experiences': {
    subject: 'DOROGO x David Beahm Experiences',
    hook: 'Follow David Beahm Destinations and your grand theatrical productions across Italy. Your architectural staging and management of multi-day VIP guest arrivals set a true industry benchmark.'
  },
  'Sasha Souza Events': {
    subject: 'DOROGO x Sasha Souza Events',
    hook: 'Follow your destination work across Italy and California wine country. Sasha Souza’s vibrant design aesthetic and precision in multi-day guest logistics are a model for the industry.'
  },
  'High Emotion Weddings Austria': {
    subject: 'DOROGO x High Emotion Weddings Austria',
    hook: 'Follow your imperial palace celebrations across Vienna and your curation in Lake Como. Irene Girkinger’s fine art aesthetic and handling of multi-day guest itineraries set a wonderful standard.'
  },
  'Crafting Memories': {
    subject: 'DOROGO x Crafting Memories',
    hook: 'Follow your experiential destination celebrations on WeddingSutra. Puja Gupta’s coordination of multi-day guest journeys and overseas celebrations is a benchmark.'
  },
  'Marry Me Weddings India': {
    subject: 'DOROGO x Marry Me Weddings India',
    hook: 'Follow your international destination weddings on WeddingSutra. Candice Pereira’s personalized guest coordination across multi-day celebrations sets a wonderful standard.'
  },
  'FB Celebrations': {
    subject: 'DOROGO x FB Celebrations',
    hook: 'Follow your multi-day international wedding productions on WeddingSutra and your grand setups across European palaces. Farid Khan’s command of large-scale VIP guest movements is impressive.'
  }
};

function buildBody(contactName, hook) {
  const firstName = (contactName || '').split(' ')[0] || 'there';
  return `Hi ${firstName},

${hook}

We operate an executive Mercedes-Benz V-Class and S-Class fleet based on Lake Como and active across Milan, Tuscany, Venice, and Nice (French Riviera), plus vetted minibuses up to 50 seats. We are not looking to replace your usual drivers, but on peak summer dates when villa schedules exceed capacity, we hold dedicated backup fleet slots on reserve for partner studios.

Would having our 2027 partner rate card and villa shuttle circuits be useful for your file, or do you already have fixed transfer partners in Italy?

If transport isn't something you handle, no problem at all, just let me know.`;
}

async function run() {
  console.log('--- Starting Targeted Queue Updates ---');

  // Step 1: Pause invalid leads and skip their touches
  for (const item of LEADS_TO_PAUSE) {
    const pRes = await fetch(`${SUPABASE_URL}/prospects?agency_name=eq.${encodeURIComponent(item.name)}&select=id,agency_name`, { headers });
    const prospects = await pRes.json();
    if (!prospects || prospects.length === 0) {
      console.log(`Prospect not found: ${item.name}`);
      continue;
    }
    const pid = prospects[0].id;
    console.log(`Pausing invalid lead: ${item.name} (${item.reason})`);

    // Update prospect
    await fetch(`${SUPABASE_URL}/prospects?id=eq.${pid}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'needs_research',
        sequence_paused: true,
        notes: `Paused: ${item.reason}`
      })
    });

    // Mark queued touches as skipped
    const tRes = await fetch(`${SUPABASE_URL}/touches?prospect_id=eq.${pid}&state=in.(draft,approved)&select=id`, { headers });
    const touches = await tRes.json();
    for (const t of touches) {
      await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          state: 'skipped'
        })
      });
      console.log(`  Skipped touch ${t.id} for ${item.name}`);
    }
  }

  // Step 2: Update verified enrichment for active leads
  for (const [agency, info] of Object.entries(VERIFIED_ENRICHMENT)) {
    const pRes = await fetch(`${SUPABASE_URL}/prospects?agency_name=eq.${encodeURIComponent(agency)}&select=id,agency_name,contact_name`, { headers });
    const prospects = await pRes.json();
    if (!prospects || prospects.length === 0) {
      console.log(`Prospect not found for enrichment: ${agency}`);
      continue;
    }
    const p = prospects[0];
    console.log(`Enriching ${agency} (${p.contact_name})...`);

    // Update prospect hook
    await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        personalization_hook: info.hook,
        hook_type: 'event',
        hook_confidence: 0.95,
        hook_needs_review: false
      })
    });

    // Update touch
    const tRes = await fetch(`${SUPABASE_URL}/touches?prospect_id=eq.${p.id}&state=in.(draft,approved)&select=id,step_name`, { headers });
    const touches = await tRes.json();
    for (const t of touches) {
      const newBody = buildBody(p.contact_name, info.hook);
      await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          subject: info.subject,
          body: newBody,
          state: 'approved'
        })
      });
      console.log(`  Updated touch ${t.id} for ${agency} with subject "${info.subject}"`);
    }
  }

  console.log('--- Targeted Updates Complete ---');
}

run();
