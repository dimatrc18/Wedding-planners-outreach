const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

async function updateRepresent() {
  console.log('--- UPDATING "I REPRESENT DOROGO" IN SUPABASE TOUCHES ---');

  const res = await fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,body', { headers });
  const touches = await res.json();

  let enUpdated = 0;
  let itUpdated = 0;

  for (const t of touches) {
    let newBody = t.body;
    let changed = false;

    // English update: "I run DOROGO" -> "I represent DOROGO"
    if (newBody.includes('I run DOROGO')) {
      newBody = newBody.replace(
        'I run DOROGO. We operate a fleet of Mercedes V-Class vans and executive minibuses based on Lake Como, also covering Milan and Tuscany.',
        'I represent DOROGO. We operate a fleet of Mercedes-Benz V-Class vans and executive minibuses based on Lake Como, also covering Milan and Tuscany.'
      );
      // In case of slight variations:
      newBody = newBody.replace(/\bI run DOROGO\b/g, 'I represent DOROGO');
      changed = true;
      enUpdated++;
    }

    // Italian update: "gestisco DOROGO" -> "rappresento DOROGO"
    if (newBody.includes('gestisco DOROGO')) {
      newBody = newBody.replace(
        'Sono Dmitri e gestisco DOROGO. Abbiamo una flotta di Mercedes Classe V e minibus executive con base sul Lago di Como, attivi anche su Milano e in Toscana.',
        'Sono Dmitri e rappresento DOROGO. Abbiamo una flotta di Mercedes-Benz Classe V e minibus executive con base sul Lago di Como, attivi anche su Milano e in Toscana.'
      );
      newBody = newBody.replace(/\bgestisco DOROGO\b/g, 'rappresento DOROGO');
      changed = true;
      itUpdated++;
    }

    if (changed) {
      await fetch(SUPABASE_URL + '/touches?id=eq.' + t.id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ body: newBody })
      });
    }
  }

  console.log(`Updated ${enUpdated} English touches and ${itUpdated} Italian touches.`);
  console.log('--- UPDATE COMPLETE ---');
}

updateRepresent();
