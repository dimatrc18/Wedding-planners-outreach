const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function checkOrigin() {
  const res = await fetch(SUPABASE_URL + '/prospects?do_not_contact=eq.true&select=agency_name,website,source,source_detail,created_at,email_status,status,notes', { headers });
  const data = await res.json();
  console.log(`Found ${data.length} paused leads:`);
  for (const d of data) {
    console.log(`- ${d.agency_name}: source=${d.source}, email_status=${d.email_status}, created_at=${d.created_at}`);
  }
}
checkOrigin();
