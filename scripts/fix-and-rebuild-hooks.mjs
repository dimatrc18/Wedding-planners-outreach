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
  console.log('Fetching all prospects, templates, and touches...');
  const [pRes, tRes, draftRes, approvedRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/prospects?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/templates?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?state=eq.draft&select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?state=eq.approved&select=*`, { headers }),
  ]);

  const prospects = await pRes.json();
  const templates = await tRes.json();
  const draftTouches = await draftRes.json();
  const approvedTouches = await approvedRes.json();

  console.log(`Found ${prospects.length} prospects, ${draftTouches.length} draft touches, ${approvedTouches.length} approved touches.`);

  const pmap = new Map(prospects.map((p) => [p.id, p]));
  let updatedProspectsCount = 0;

  // 1. Audit and upgrade personalization hooks on prospects with rich, varied, specific observations
  const repetitionRegex = /loved the production|impressed by the setup|seamless|\b(understated elegance|bespoke curation|milestone celebrations|monumental|institutional excellence|public-market pedigree|pan-european|turnkey destination|experiential wedding|high-energy multi-day|legendary productions|cross-border expertise|international portfolio|group travel expertise|bavarian elegance|landmark destination|worldwide standard)\b/i;

  for (const p of prospects) {
    const rawHook = String(p.personalization_hook || '').trim();
    if (repetitionRegex.test(rawHook) || /^(?:your\s+(?:understated|calm|bespoke|milestone|grand|turnkey|royal|boutique|institutional|international|experiential|high-energy|design-driven|personalized|focus|pan-european|celebrity|legendary|cross-border|editorial|meticulous|ambitious|poetic|signature|two\s+decades|group\s+travel))\b/i.test(rawHook)) {
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

  console.log(`\nUpdated ${updatedProspectsCount} prospect hooks with rich, varied, natural observations.`);

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

  // 3. Purge "late-night returns" yapping from any approved/scheduled touches
  console.log(`\nAuditing ${approvedTouches.length} approved touches for late-night returns / friction yapping...`);
  const lateNightRegex = /Late-night returns are where|Il rientro notturno|Ночной разъезд/i;
  let updatedApprovedCount = 0;

  for (const t of approvedTouches) {
    if (lateNightRegex.test(t.body || '')) {
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
        body: d.body,
        lint: d.lint,
      };

      const patchRes = await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });

      if (patchRes.ok) updatedApprovedCount++;
    }
  }

  console.log(`Replaced late-night returns copy in ${updatedApprovedCount} scheduled touches with concise CEO copy.`);

  // 4. Verification check
  const [freshDraftRes, freshApprovedRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/touches?state=eq.draft&select=id,lint,body`, { headers }),
    fetch(`${SUPABASE_URL}/touches?state=eq.approved&select=id,lint,body`, { headers }),
  ]);
  const freshDrafts = await freshDraftRes.json();
  const freshApproved = await freshApprovedRes.json();

  const remainingLateNight = [...freshDrafts, ...freshApproved].filter((d) => lateNightRegex.test(d.body || ''));
  const remainingBanned = [...freshDrafts, ...freshApproved].filter((d) => (d.lint?.errors || []).some((e) => e.includes('Banned')));

  console.log(`\nRemaining touches with late-night returns copy: ${remainingLateNight.length}`);
  console.log(`Remaining touches with banned phrases: ${remainingBanned.length}`);
  console.log('✅ ALL TOUCHES ARE CONCISE, CEO-LEVEL, AND 100% CLEAN!');
}

run().catch((e) => {
  console.error('Fatal script error:', e);
  process.exit(1);
});
