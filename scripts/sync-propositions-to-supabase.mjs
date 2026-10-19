// Syncs updated propositions, templates, and 10% commission into live Supabase DB
import { DEFAULT_TEMPLATES, buildDraft } from '../supabase/functions/_shared/core/index.js';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

async function syncTemplates() {
  console.log(`Syncing ${DEFAULT_TEMPLATES.length} default templates to public.templates...`);
  const rows = DEFAULT_TEMPLATES.map((t) => ({
    key: t.key,
    language: t.language,
    kind: t.kind,
    name: t.name,
    subject_a: t.subject_a || '',
    subject_b: t.subject_b || '',
    body: t.body,
    attach_rate_card: !!t.attach_rate_card,
    active: t.active !== false,
  }));

  const res = await fetch(`${SUPABASE_URL}/templates?on_conflict=key,language`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upsert templates: ${res.status} ${errText}`);
  }
  const result = await res.json();
  console.log(`Successfully synced ${result.length} templates into Supabase.`);
}

async function syncSettings() {
  console.log('Fetching public.outreach_settings...');
  const res = await fetch(`${SUPABASE_URL}/outreach_settings?id=eq.1&select=*`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status} ${await res.text()}`);
  const [row] = await res.json();
  const currentData = row ? row.data || {} : {};
  const updatedData = { ...currentData, commission_rate: 0.10 };

  console.log('Updating settings data.commission_rate to 0.10...');
  const patchRes = await fetch(`${SUPABASE_URL}/outreach_settings?id=eq.1`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ data: updatedData }),
  });
  if (!patchRes.ok) throw new Error(`Failed to patch settings: ${patchRes.status} ${await patchRes.text()}`);
  console.log('Outreach settings updated successfully.');
}

async function refreshPendingDrafts() {
  console.log('Checking for pending touches in state "draft"...');
  const touchesRes = await fetch(`${SUPABASE_URL}/touches?state=eq.draft&select=*`, { headers });
  if (!touchesRes.ok) throw new Error(`Failed to fetch touches: ${touchesRes.status} ${await touchesRes.text()}`);
  const drafts = await touchesRes.json();
  console.log(`Found ${drafts.length} pending draft(s).`);

  if (!drafts.length) return;

  const prospectsRes = await fetch(`${SUPABASE_URL}/prospects?select=*`, { headers });
  const prospects = await prospectsRes.json();
  const prospectMap = new Map(prospects.map((p) => [p.id, p]));

  const templatesRes = await fetch(`${SUPABASE_URL}/templates?select=*`, { headers });
  const templates = await templatesRes.json();

  for (const t of drafts) {
    const p = prospectMap.get(t.prospect_id);
    if (!p) continue;
    const freshDraft = buildDraft({
      prospect: p,
      key: t.step_name,
      templates,
      threadSubject: t.thread_subject || null,
      step: { thread: !!t.thread_subject },
    });
    if (!freshDraft) continue;

    console.log(`Updating pending draft #${t.id} for ${p.agency_name} (${t.step_name})...`);
    await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        subject: freshDraft.subject,
        body: freshDraft.body,
      }),
    });
  }
  console.log('Finished updating pending drafts.');
}

async function main() {
  await syncTemplates();
  await syncSettings();
  await refreshPendingDrafts();
  console.log('All Supabase outreach sync tasks completed successfully.');
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
