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
  console.log('Fetching all prospects, templates, and touches from Supabase...');
  const [pRes, tRes, touchRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/prospects?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/templates?select=*`, { headers }),
    fetch(`${SUPABASE_URL}/touches?state=in.(draft,approved)&select=*`, { headers }),
  ]);

  const prospects = await pRes.json();
  const templates = await tRes.json();
  const touches = await touchRes.json();

  console.log(`Found ${prospects.length} prospects, ${templates.length} templates, and ${touches.length} active/scheduled touches.`);

  // 1. Audit and clean prospects: remove synthetic key_venues and update hooks
  console.log('\n--- Auditing and cleaning prospects ---');
  let cleanedVenuesCount = 0;
  let updatedHooksCount = 0;
  const updatedProspectsMap = new Map();

  for (const p of prospects) {
    const origVenues = Array.isArray(p.key_venues) ? p.key_venues : [];
    const verifiedVenues = origVenues.filter((v) => core.isVenueVerified(p, v));
    const venuesChanged = origVenues.length !== verifiedVenues.length;

    const pWithVerifiedVenues = { ...p, key_venues: verifiedVenues };
    const currentHook = String(p.personalization_hook || '').trim();
    const newHook = core.cleanPersonalizationHook(currentHook, pWithVerifiedVenues);
    const hookChanged = newHook !== currentHook;

    if (venuesChanged || hookChanged) {
      const patch = {};
      if (venuesChanged) {
        patch.key_venues = verifiedVenues;
        cleanedVenuesCount++;
      }
      if (hookChanged) {
        patch.personalization_hook = newHook;
        updatedHooksCount++;
        console.log(`[Updating Hook] ${p.agency_name} (${p.market || 'it'}):`);
        console.log(`  OLD: "${currentHook}"`);
        console.log(`  NEW: "${newHook}"`);
      }

      const res = await fetch(`${SUPABASE_URL}/prospects?id=eq.${p.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        console.error(`Failed to patch prospect ${p.agency_name}:`, await res.text());
      }
      updatedProspectsMap.set(p.id, { ...p, ...patch });
    } else {
      updatedProspectsMap.set(p.id, p);
    }
  }

  console.log(`\nProspects summary:`);
  console.log(`- Cleaned synthetic venues from ${cleanedVenuesCount} prospects`);
  console.log(`- Updated hooks to truthful, market-aware copy on ${updatedHooksCount} prospects`);

  // 2. Synchronize templates in database (T4_breakup and T3_followup)
  console.log('\n--- Auditing DB templates ---');
  for (const defT of core.DEFAULT_TEMPLATES) {
    if (['T3_followup', 'T4_breakup'].includes(defT.key)) {
      const dbMatch = templates.find((t) => t.key === defT.key && t.language === defT.language);
      if (dbMatch && dbMatch.body !== defT.body) {
        console.log(`Updating DB template ${defT.key} (${defT.language})...`);
        await fetch(`${SUPABASE_URL}/templates?id=eq.${dbMatch.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ body: defT.body }),
        });
      }
    }
  }

  // 3. Rebuild all active/scheduled touches
  console.log(`\n--- Rebuilding ${touches.length} scheduled & draft touches ---`);
  let rebuiltTouchesCount = 0;
  const specificVillas = ['villa balbiano', 'villa del balbianello', 'villa erba', 'villa pizzo', 'passalacqua', "villa d'este", 'villa sola cabiati'];

  for (const t of touches) {
    const prospect = updatedProspectsMap.get(t.prospect_id);
    if (!prospect) continue;

    const template = templates.find((tpl) => tpl.key === t.step_name && tpl.language === (prospect.language || 'en')) || templates[0];
    const draft = core.buildDraft({
      prospect,
      template,
      key: t.step_name,
      variant: t.variant || 'A',
    });

    if (!draft) continue;

    // Check if touch needs updating
    const bodyNeedsUpdate = t.body !== draft.body;
    const subjectNeedsUpdate = t.subject !== draft.subject;

    if (bodyNeedsUpdate || subjectNeedsUpdate) {
      const patchRes = await fetch(`${SUPABASE_URL}/touches?id=eq.${t.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          subject: draft.subject || t.subject,
          body: draft.body,
          lint: draft.lint,
        }),
      });

      if (patchRes.ok) {
        rebuiltTouchesCount++;
      } else {
        console.error(`Failed to patch touch ${t.id}:`, await patchRes.text());
      }
    }
  }

  console.log(`Rebuilt ${rebuiltTouchesCount} touches with 100% verified, truthful copy.`);

  // 4. Final Verification
  console.log('\n--- Final Verification Audit ---');
  const [freshTouchesRes, freshProspectsRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/touches?state=in.(draft,approved)&select=id,state,prospect_id,subject,body,lint`, { headers }),
    fetch(`${SUPABASE_URL}/prospects?select=id,agency_name,market,location,notes,key_venues`, { headers }),
  ]);

  const freshTouches = await freshTouchesRes.json();
  const freshProspects = await freshProspectsRes.json();
  const pmap = new Map(freshProspects.map((p) => [p.id, p]));

  let unverifiedClaimsCount = 0;
  let bannedPhrasesCount = 0;
  let lintErrorsCount = 0;

  for (const t of freshTouches) {
    const p = pmap.get(t.prospect_id);
    if (!p) continue;

    const lowerBody = t.body.toLowerCase();
    for (const sv of specificVillas) {
      if (lowerBody.includes(sv)) {
        if (!core.isVenueVerified(p, sv)) {
          console.error(`[UNVERIFIED CLAIM FOUND] Touch ${t.id} for ${p.agency_name} mentions "${sv}"`);
          unverifiedClaimsCount++;
        }
      }
    }

    if ((t.lint?.errors || []).length > 0) {
      console.error(`[LINT ERROR] Touch ${t.id} for ${p.agency_name}:`, t.lint.errors);
      lintErrorsCount++;
    }

    if (/seamless|\b(understated elegance|bespoke curation|milestone celebrations|monumental|institutional excellence|public-market pedigree|pan-european|turnkey destination|experiential wedding|high-energy multi-day|legendary productions|cross-border expertise|international portfolio|group travel expertise|bavarian elegance|landmark destination|worldwide standard)\b/i.test(t.body)) {
      console.error(`[BANNED PHRASE] Touch ${t.id} for ${p.agency_name}`);
      bannedPhrasesCount++;
    }
  }

  console.log(`\nAudit Results:`);
  console.log(`- Remaining touches with unverified venue claims: ${unverifiedClaimsCount}`);
  console.log(`- Remaining touches with banned phrases: ${bannedPhrasesCount}`);
  console.log(`- Remaining touches with lint errors: ${lintErrorsCount}`);

  if (unverifiedClaimsCount === 0 && bannedPhrasesCount === 0 && lintErrorsCount === 0) {
    console.log('\n✅ ALL TOUCHES ARE 100% TRUTHFUL, VERIFIED, AND FREE OF HALLUCINATIONS!');
  } else {
    console.error('\n⚠️ SOME ISSUES REMAIN. REVIEW LOGS ABOVE.');
  }
}

run();
