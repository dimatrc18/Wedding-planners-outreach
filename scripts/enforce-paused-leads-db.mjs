const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

const PAUSED_LEADS = [
  { name: 'Boutique Weddings Australia', reason: 'Parked domain (/lander)' },
  { name: 'Wedding Destination AU', reason: 'Parked domain for sale (Above.com)' },
  { name: 'Festfein Hochzeitsplanung', reason: 'Dead domain (LiveConfig error)' },
  { name: 'La Marquise Events Dubai', reason: 'Dead domain (DNS NXDOMAIN)' },
  { name: 'White Label Events Dubai', reason: 'Dead host (unreachable)' },
  { name: 'White Label Events Zurich', reason: 'Dead host (unreachable)' },
  { name: 'Paul Nasr Sal Beirut', reason: 'Host down (unreachable)' },
  { name: 'Swiss Wedding Company', reason: 'Host down (unreachable)' },
  { name: 'Marry Jane Hochzeiten', reason: 'Host down (unreachable)' },
  { name: 'Hochzeitsplaner München & Como Desk', reason: 'Host down (unreachable)' },
  { name: 'Prime Moments Austria & Germany', reason: 'Host down (unreachable)' },
  { name: 'Magnolia Events Switzerland', reason: 'HTTP 404 (host down)' },
  { name: 'Laura & Co. Events', reason: 'Host down (unreachable)' },
  { name: 'DreamGroup Weddings', reason: 'Parked domain' },
  { name: 'DXB Luxury Weddings', reason: 'Parked domain (Parking/1.0)' },
  { name: 'Clementine Destination Events', reason: 'Parked domain (/lander)' },
  { name: 'Jam Wedding Planner Dubai', reason: 'Personal couple blog from 2011, not a planner' },
  { name: 'Marry Me UAE', reason: 'Directory portal (marryme.ae), not a planner' },
  { name: 'Emma Westmacott Weddings', reason: 'Broken SSL and non-planner (ceramic artist / maker)' },
  { name: 'Grace & Tailor Events', reason: 'Corporate technical AV production, not wedding planners' }
];

async function enforceAll() {
  console.log('--- ENFORCING PAUSED LEADS STATUS IN DATABASE ---');
  for (const item of PAUSED_LEADS) {
    const pRes = await fetch(`${SUPABASE_URL}/prospects?agency_name=eq.${encodeURIComponent(item.name)}&select=id,agency_name,status,sequence_paused,do_not_contact`, { headers });
    const prospects = await pRes.json();
    if (!prospects || prospects.length === 0) {
      console.warn(`[Not found] ${item.name}`);
      continue;
    }
    const p = prospects[0];

    // Update prospect to do_not_contact, sequence_paused: true
    const updateRes = await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'do_not_contact',
        do_not_contact: true,
        sequence_paused: true,
        notes: `[PAUSED]: ${item.reason}`
      })
    });

    console.log(`Updated prospect ${p.agency_name} -> status: do_not_contact, sequence_paused: true (HTTP ${updateRes.status})`);

    // Ensure all touches are marked skipped
    const tRes = await fetch(`${SUPABASE_URL}/touches?prospect_id=eq.${p.id}&select=id,state,step_name`, { headers });
    const touches = await tRes.json();
    for (const t of touches) {
      if (t.state !== 'skipped') {
        await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ state: 'skipped' })
        });
        console.log(`  Set touch ${t.id} (${t.step_name}) from ${t.state} -> skipped`);
      } else {
        console.log(`  Touch ${t.id} was already skipped`);
      }
    }
  }
  console.log('--- ENFORCEMENT COMPLETE ---');
}

enforceAll();
