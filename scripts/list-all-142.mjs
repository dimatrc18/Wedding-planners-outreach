const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function listAll() {
  const [tRes, pRes] = await Promise.all([
    fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,step_name,state,scheduled_at,subject,body,prospect_id&order=scheduled_at.asc', { headers }),
    fetch(SUPABASE_URL + '/prospects?select=id,agency_name,website,location,status,sequence_paused,personalization_hook', { headers })
  ]);
  const touches = await tRes.json();
  const prospects = await pRes.json();
  const pMap = new Map(prospects.map(p => [p.id, p]));

  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const p = pMap.get(t.prospect_id);
    const bodyLines = t.body.split('\n').map(l => l.trim()).filter(Boolean);
    const salutation = bodyLines[0] || '';
    const hook = bodyLines[1] || '';
    console.log(`${i + 1}. [${p?.agency_name}] | Subj: "${t.subject}" | Hook: "${hook.slice(0, 100)}..."`);
  }
}

listAll();
