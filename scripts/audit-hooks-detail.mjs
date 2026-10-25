// Using native fetch in Node 18+
const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function auditAll() {
  const [tRes, pRes] = await Promise.all([
    fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,step_name,state,scheduled_at,subject,body,prospect_id&order=scheduled_at.asc', { headers }),
    fetch(SUPABASE_URL + '/prospects?select=id,agency_name,website,location,status,sequence_paused,personalization_hook', { headers })
  ]);
  const touches = await tRes.json();
  const prospects = await pRes.json();
  const pMap = new Map(prospects.map(p => [p.id, p]));

  console.log(`Auditing ${touches.length} queued touches:\n`);

  const suspicious = [];

  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const p = pMap.get(t.prospect_id);
    const bodyLines = t.body.split('\n').map(l => l.trim()).filter(Boolean);
    const salutation = bodyLines[0] || '';
    const hook = bodyLines[1] || '';
    
    // Check if hook is generic or suspicious
    const isGeneric = 
      hook.startsWith('When your') ||
      hook.startsWith('Came across your portfolio and high-end') ||
      hook.startsWith('Follow your bespoke destination celebrations and editorial') ||
      hook.startsWith('Follow your high-profile multi-day celebrations and luxury destination') ||
      hook.includes('quick question re:') ||
      t.subject.includes('quick question re:');

    if (isGeneric) {
      suspicious.push({
        index: i + 1,
        touchId: t.id,
        prospectId: p?.id,
        agency: p?.agency_name,
        location: p?.location,
        website: p?.website,
        subject: t.subject,
        hook: hook,
        prospectHook: p?.personalization_hook
      });
    }
  }

  console.log(`Found ${suspicious.length} touches with generic hooks or subjects:`);
  console.log(JSON.stringify(suspicious, null, 2));
}

auditAll();
