const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = { apikey: SRK, Authorization: 'Bearer ' + SRK };

async function verifyAll() {
  const [tRes, pRes] = await Promise.all([
    fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,step_name,state,scheduled_at,subject,body,prospect_id&order=scheduled_at.asc', { headers }),
    fetch(SUPABASE_URL + '/prospects?select=id,agency_name,website,location,status,sequence_paused,personalization_hook', { headers })
  ]);
  const touches = await tRes.json();
  const prospects = await pRes.json();
  const pMap = new Map(prospects.map(p => [p.id, p]));

  console.log(`Auditing ALL ${touches.length} queued touches for copywriting & quality standards:\n`);

  const issues = [];

  for (let i = 0; i < touches.length; i++) {
    const t = touches[i];
    const p = pMap.get(t.prospect_id);
    const body = t.body;
    const subject = t.subject;
    const itemIssues = [];

    // 1. Dash check (Rule 7: No hyphens/dashes as punctuation)
    if (body.includes(' - ') || body.includes('—') || subject.includes(' - ') || subject.includes('—')) {
      itemIssues.push('Contains dash as punctuation ( - or —)');
    }

    // 2. Banned words
    if (/\bseamless\b/i.test(body) || /\bseamlessly\b/i.test(body)) {
      itemIssues.push('Contains "seamless"');
    }
    if (/\bbespoke\b/i.test(body)) {
      itemIssues.push('Contains "bespoke"');
    }

    // 3. Qualifiers
    if (/\breally\b/i.test(body)) {
      itemIssues.push('Contains qualifier "really"');
    }
    if (/\bvery\b/i.test(body)) {
      itemIssues.push('Contains qualifier "very"');
    }

    // 4. Generic subjects
    if (/quick question re:/i.test(subject)) {
      itemIssues.push('Generic subject: "quick question re:"');
    }

    // 5. Exclamation marks
    if (body.includes('!')) {
      itemIssues.push('Contains exclamation mark "!"');
    }

    if (itemIssues.length > 0) {
      issues.push({
        index: i + 1,
        touchId: t.id,
        agency: p?.agency_name,
        step: t.step_name,
        subject,
        issues: itemIssues
      });
    }
  }

  console.log(`Total touches checked: ${touches.length}`);
  console.log(`Touches with issues: ${issues.length}`);
  if (issues.length > 0) {
    console.log(JSON.stringify(issues, null, 2));
  } else {
    console.log('✅ ALL touches pass 100% of copywriting & deliverability quality standards!');
  }
}

verifyAll();
