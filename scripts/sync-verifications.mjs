// Sync MillionVerifier verification records to live Supabase database
const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const verifiedProspects = [
  {
    email: 'hello@lenafreitag.com',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'info@exclusiveitalyweddings.com',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'info@sugarevents.it',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'info@romanceinitaly.it',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'info@idoinlakecomoweddingplanner.com',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'info@hotelvillacipressi.it',
    verification: {
      provider: 'millionverifier',
      status: 'verified',
      result: 'ok',
      resultcode: 1,
      subresult: 'ok',
      quality: 'good',
      credits: 497,
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
  {
    email: 'easton@eastonevents.com',
    verification: {
      provider: 'millionverifier',
      status: 'catch_all',
      result: 'catch_all',
      resultcode: 2,
      subresult: 'ok',
      quality: 'risky',
      credits: 497,
      verbatim_proof: true,
      contact_source: 'https://www.eastonevents.com/contact',
      checked_at: new Date().toISOString(),
      safe_to_send: true,
    },
  },
];

async function sync() {
  const pRes = await fetch(`${SUPABASE_URL}/prospects?select=id,agency_name,email,enrichment`, { headers });
  const allProspects = await pRes.json();

  for (const item of verifiedProspects) {
    const p = allProspects.find(x => x.email && x.email.toLowerCase() === item.email.toLowerCase());
    if (!p) {
      console.log(`Prospect with email ${item.email} not found in DB`);
      continue;
    }
    const updatedEnrichment = { ...(p.enrichment || {}), verification: item.verification };
    const patchRes = await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        email_status: 'mx_ok',
        enrichment: updatedEnrichment,
      }),
    });
    if (!patchRes.ok) {
      console.error(`Failed to patch ${p.agency_name}:`, await patchRes.text());
    } else {
      console.log(`✓ Updated ${p.agency_name} (${item.email}) with MillionVerifier verification data`);
    }
  }
}

sync().catch(console.error);
