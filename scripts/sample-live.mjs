const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function sampleLive() {
  const res = await fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,step_name,state,scheduled_at,subject,body,prospect:prospects(agency_name,contact_name,website,location,status)&order=scheduled_at.asc&limit=8', { headers });
  const touches = await res.json();
  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    console.log('----------------------------------------------------');
    console.log('AGENCY: ' + t.prospect?.agency_name + ' | CONTACT: ' + t.prospect?.contact_name + ' (' + t.prospect?.location + ')');
    console.log('SUBJECT: ' + t.subject);
    console.log('SCHEDULED: ' + t.scheduled_at);
    console.log('BODY:\n' + t.body);
  }
}
sampleLive();
