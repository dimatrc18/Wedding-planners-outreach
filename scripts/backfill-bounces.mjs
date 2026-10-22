// Backfill historical bounce records for complete honest accounting
const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function main() {
  console.log('1. Checking existing prospects in Supabase...');
  const pRes = await fetch(`${SUPABASE_URL}/prospects?select=id,agency_name,email,enrichment`, { headers });
  const prospects = await pRes.json();

  const easton = prospects.find(p => p.agency_name.toLowerCase().includes('easton'));
  const mandarin = prospects.find(p => p.agency_name.toLowerCase().includes('mandarin'));
  let sinclair = prospects.find(p => p.agency_name.toLowerCase().includes('sinclair'));

  // 1. Backfill Sinclair Events tombstone if missing
  if (!sinclair) {
    console.log('Inserting Sinclair Events tombstone prospect...');
    const sinclairData = {
      agency_name: 'Sinclair Events',
      contact_name: 'Concierge Desk',
      role: 'Events Team',
      email: 'concierge@sinclairevents.com',
      email_status: 'bounced',
      status: 'do_not_contact',
      do_not_contact: true,
      tags: ['dead_domain', 'bounced'],
      notes: 'Historical bounce backfill: domain expired / no mailbox (concierge@sinclairevents.com)',
      enrichment: {
        known_bad_emails: ['concierge@sinclairevents.com'],
        tombstone: true,
      },
    };
    const insRes = await fetch(`${SUPABASE_URL}/prospects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sinclairData),
    });
    const [inserted] = await insRes.json();
    sinclair = inserted;
    console.log('✓ Created Sinclair Events prospect:', sinclair?.id);
  }

  // 2. Insert bounced touches
  const bouncedTouchesToInsert = [];

  // Sinclair bounced touch
  if (sinclair?.id) {
    bouncedTouchesToInsert.push({
      prospect_id: sinclair.id,
      direction: 'out',
      state: 'sent',
      channel: 'email',
      step_name: 'T1_intro',
      subject: 'Guest transport partner · Sinclair Events',
      to_address: 'concierge@sinclairevents.com',
      bounced: true,
      sent_at: '2026-10-21T08:00:00.000Z',
      error: '550 Mailbox does not exist (no_mailbox)',
    });
  }

  // Easton historical bounced touch (step_name: 'custom' avoids violating touches_one_live_step since approved T1_intro exists)
  if (easton?.id) {
    const knownBad = Array.from(new Set([...(easton.enrichment?.known_bad_emails || []), 'info@eastonevents.com']));
    await fetch(`${SUPABASE_URL}/prospects?id=eq.${easton.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        enrichment: { ...(easton.enrichment || {}), known_bad_emails: knownBad },
      }),
    });
    console.log('✓ Updated Easton Events with known_bad_emails: info@eastonevents.com');

    bouncedTouchesToInsert.push({
      prospect_id: easton.id,
      direction: 'out',
      state: 'sent',
      channel: 'email',
      step_name: 'custom',
      subject: 'Guest transport partner · Easton Events',
      to_address: 'info@eastonevents.com',
      bounced: true,
      sent_at: '2026-10-21T09:00:00.000Z',
      error: '550 Invalid mailbox (info@eastonevents.com)',
    });
  }

  // Mandarin Oriental historical bounced touch
  if (mandarin?.id) {
    const knownBad = Array.from(new Set([...(mandarin.enrichment?.known_bad_emails || []), 'molco-events@mohg.com']));
    await fetch(`${SUPABASE_URL}/prospects?id=eq.${mandarin.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        enrichment: { ...(mandarin.enrichment || {}), known_bad_emails: knownBad },
      }),
    });
    console.log('✓ Updated Mandarin Oriental with known_bad_emails: molco-events@mohg.com');

    bouncedTouchesToInsert.push({
      prospect_id: mandarin.id,
      direction: 'out',
      state: 'sent',
      channel: 'email',
      step_name: 'custom',
      subject: 'Guest transport partner · Mandarin Oriental Lago di Como',
      to_address: 'molco-events@mohg.com',
      bounced: true,
      sent_at: '2026-10-22T05:32:00.000Z',
      error: '554 Relay access denied (molco-events@mohg.com)',
    });
  }

  console.log(`Inserting ${bouncedTouchesToInsert.length} historical bounced touches...`);
  const tInsRes = await fetch(`${SUPABASE_URL}/touches`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bouncedTouchesToInsert),
  });
  if (tInsRes.ok) {
    console.log('✓ Historical bounced touches backfilled successfully.');
  } else {
    console.error('Failed to insert touches:', await tInsRes.text());
  }
}

main().catch(console.error);
