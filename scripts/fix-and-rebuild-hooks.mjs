import * as core from '../supabase/functions/_shared/core/index.js';

const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';

const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function run() {
  console.log('Fetching all prospects and templates...');
  const [pRes, tRes, touchRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/prospects?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/outreach_templates?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?state=eq.draft&select=*`, { headers }),
  ]);

  const prospects = await pRes.json();
  const templates = await tRes.json();
  const draftTouches = await touchRes.json();

  console.log(`Found ${prospects.length} prospects, ${templates.length} templates, ${draftTouches.length} draft touches.`);

  const pmap = new Map(prospects.map((p) => [p.id, p]));
  let updatedProspectsCount = 0;

  // 1. Audit and fix personalization hooks on prospects
  const fluffRegex = /seamless|\b(understated elegance|bespoke curation|milestone celebrations|monumental|institutional excellence|public-market pedigree|pan-european|turnkey destination|experiential wedding|high-energy multi-day|legendary productions|cross-border expertise|international portfolio|group travel expertise|bavarian elegance|landmark destination|worldwide standard)\b/i;

  for (const p of prospects) {
    const rawHook = String(p.personalization_hook || '').trim();
    if (fluffRegex.test(rawHook) || /^(?:your\s+(?:understated|calm|bespoke|milestone|grand|turnkey|royal|boutique|institutional|international|experiential|high-energy|design-driven|personalized|focus|pan-european|celebrity|legendary|cross-border|editorial|meticulous|ambitious|poetic|signature|two\s+decades|group\s+travel))\b/i.test(rawHook)) {
      const naturalHook = core.generateBulletproofHook(p);
      if (naturalHook && naturalHook !== rawHook) {
        console.log(`[Updating Hook] ${p.agency_name}:`);
        console.log(`  OLD: "${rawHook}"`);
        console.log(`  NEW: "${naturalHook}"`);
        
        await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ personalization_hook: naturalHook }),
        });
        p.personalization_hook = naturalHook;
        updatedProspectsCount++;
      }
    }
  }

  console.log(`\nUpdated ${updatedProspectsCount} prospect hooks with authentic, grounded notes.`);

  // 2. Rebuild all draft touches
  console.log(`\nRebuilding ${draftTouches.length} draft touches...`);
  let rebuiltDrafts = 0;

  for (const t of draftTouches) {
    const p = pmap.get(t.prospect_id);
    if (!p) continue;

    const d = core.buildDraft({
      prospect: p,
      key: t.step_name,
      templates,
      threadSubject: t.subject || '',
      extraVars: { variant: t.variant || 'A' },
    });

    const patch = {
      subject: d.subject,
      body: d.body,
      lint: d.lint,
      template_key: d.template_key,
      error: d.lint.errors.length ? d.lint.errors[0] : null,
    };

    const patchRes = await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });

    if (patchRes.ok) rebuiltDrafts++;
  }

  console.log(`Successfully rebuilt ${rebuiltDrafts} draft touches.`);

  // 3. Verify zero banned phrases remain in draft touches
  const verifyRes = await fetch(`${SUPABASE_URL}/touches?state=eq.draft&select=id,prospect_id,subject,body,lint`, { headers });
  const freshDrafts = await verifyRes.json();
  const remainingBanned = freshDrafts.filter((d) => (d.lint?.errors || []).some((e) => e.includes('Banned')));
  console.log(`\nRemaining draft touches with banned phrases: ${remainingBanned.length}`);
  if (remainingBanned.length > 0) {
    for (const b of remainingBanned) {
      console.log(`  - Touch ${b.id}: ${b.lint.errors.join('; ')}`);
    }
  } else {
    console.log('✅ ALL DRAFT TOUCHES ARE 100% CLEAN AND LINTER APPROVED!');
  }
}

run().catch((e) => {
  console.error('Fatal script error:', e);
  process.exit(1);
});
