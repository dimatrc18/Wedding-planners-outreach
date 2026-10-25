const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function checkFollowups() {
  const res = await fetch(SUPABASE_URL + '/touches?step_name=in.(T3_followup,T4_breakup)&state=in.(approved,draft)&select=id,step_name,subject,body,prospect:prospects(agency_name,contact_name,language)', { headers });
  const touches = await res.json();
  for (const t of touches) {
    console.log('--- ' + t.prospect?.agency_name + ' (' + t.step_name + ') ---');
    console.log('Subj: ' + t.subject);
    console.log('Body: ' + t.body.slice(0, 180).replace(/\n/g, ' '));
  }
}
checkFollowups();
