const SUPABASE_URL = 'https://qjarhdrrbjeeqbhfgmnp.supabase.co/rest/v1';
const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqYXJoZHJyYmplZXFiaGZnbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTIxNDczNywiZXhwIjoyMTA2NzkwNzM3fQ.VFN95vjwbXkhWXR6ZFHhRgga1BuW-2SDdk2zjLsk374';
const headers = {
  apikey: SRK,
  Authorization: `Bearer ${SRK}`,
  'Content-Type': 'application/json',
};

function cleanAgency(raw = '') {
  let s = String(raw || '').trim().replace(/\s*\(Test\)\s*$/i, '').trim();
  s = s.replace(/\s+(Events?\s*&\s*Concierge|Private\s+Events?|Wedding\s+Planners?|Wedding\s+Planning|Weddings?\s*&\s*Events?|Weddings?|Events?|S\.?r\.?l\.?)$/i, '').trim();
  return s || raw;
}

async function runFleetUpdate() {
  console.log('--- UPDATING FULL FLEET (E, S, V-CLASS, MAYBACH & PHOTOSHOOT CARS) IN SUPABASE ---');

  const res = await fetch(SUPABASE_URL + '/touches?state=in.(approved,draft)&select=id,step_name,subject,body,prospect_id,prospect:prospects(id,agency_name,language,market)', { headers });
  const touches = await res.json();

  console.log(`Loaded ${touches.length} approved/draft touches.`);

  let enUpdated = 0;
  let itUpdated = 0;
  let ruUpdated = 0;
  let subjectsUpdated = 0;

  for (const t of touches) {
    const p = t.prospect || {};
    const agency = cleanAgency(p.agency_name);
    let subjectChanged = false;
    let bodyChanged = false;
    let newSubject = t.subject;
    let newBody = t.body;

    // 1. Subject Line upgrades (eliminate "backup V-Class" restrictions)
    if (newSubject === 'backup V-Class fleet for 2027') {
      newSubject = `DOROGO x ${agency}`;
      subjectChanged = true;
    } else if (newSubject === 'Re: backup V-Class fleet for 2027') {
      newSubject = `Re: DOROGO x ${agency}`;
      subjectChanged = true;
    } else if (newSubject === 'flotta Mercedes di supporto per il 2027') {
      newSubject = `DOROGO x ${agency}`;
      subjectChanged = true;
    } else if (newSubject === 'Re: flotta Mercedes di supporto per il 2027') {
      newSubject = `Re: DOROGO x ${agency}`;
      subjectChanged = true;
    }

    if (subjectChanged) {
      subjectsUpdated++;
    }

    // 2. English Body updates
    if (newBody.includes('We operate a fleet of Mercedes-Benz V-Class vans and executive minibuses')) {
      newBody = newBody.replace(
        'I represent DOROGO. We operate a fleet of Mercedes-Benz V-Class vans and executive minibuses based on Lake Como, also covering Milan and Tuscany.',
        'I represent DOROGO. We operate Mercedes-Benz E-Class, S-Class, V-Class, and Maybach vehicles based on Lake Como, covering Milan and Tuscany. We also arrange executive minibuses and have a network of special cars for wedding photoshoots.'
      );
      newBody = newBody.replace(
        'When your couples plan weddings in Italy, do you already have your guest drivers sorted, or would our 2027 rates and villa shuttle info be handy to keep on file?',
        'For your upcoming weddings in Italy, do you already have guest drivers sorted, or would our 2027 rates and villa shuttle info be handy to keep on file?'
      );
      newBody = newBody.replace(
        'No worries at all if transport is handled by someone else on your team.',
        'No worries at all if transport is handled by someone else on your team, just let me know.'
      );
      bodyChanged = true;
      enUpdated++;
    }

    // 3. Italian Body updates
    if (newBody.includes('Abbiamo una flotta di Mercedes-Benz Classe V e minibus executive')) {
      newBody = newBody.replace(
        'Sono Dmitri e rappresento DOROGO. Abbiamo una flotta di Mercedes-Benz Classe V e minibus executive con base sul Lago di Como, attivi anche su Milano e in Toscana.',
        'Sono Dmitri e rappresento DOROGO. Operiamo con Mercedes-Benz Classe E, Classe S, Classe V e Maybach con base sul Lago di Como, attivi anche su Milano e in Toscana. Organizziamo anche minibus executive e disponiamo di una rete di auto speciali per i servizi fotografici degli sposi.'
      );
      newBody = newBody.replace(
        'Nessun problema se della logistica si occupa già un altro referente nel vostro team.',
        'Nessun problema se della logistica si occupa già un altro referente nel vostro team, basta farmelo sapere.'
      );
      bodyChanged = true;
      itUpdated++;
    }

    // 4. Russian Body updates
    if (newBody.includes('минивэнов Mercedes-Benz V-Class') || newBody.includes('Mercedes V-Class')) {
      newBody = newBody.replace(
        'Я Дмитрий, представляю компанию DOROGO. У нас собственный автопарк минивэнов Mercedes-Benz V-Class и представительских микроавтобусов на озере Комо, также работаем в Милане и Тоскане.',
        'Я Дмитрий, представляю компанию DOROGO. Мы работаем на автомобилях Mercedes-Benz E-Class, S-Class, V-Class и Maybach на озере Комо, а также в Милане и Тоскане. Также организуем представительские микроавтобусы и подбираем редкие автомобили для свадебных фотосессий.'
      );
      bodyChanged = true;
      ruUpdated++;
    }

    if (subjectChanged || bodyChanged) {
      const patchRes = await fetch(SUPABASE_URL + '/touches?id=eq.' + t.id, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          subject: newSubject,
          body: newBody,
          state: 'approved'
        })
      });
      if (!patchRes.ok) {
        console.error(`Failed to patch touch ${t.id}: ${patchRes.statusText}`);
      }
    }
  }

  console.log(`--- PATCHING COMPLETE ---`);
  console.log(`Updated ${enUpdated} English touches`);
  console.log(`Updated ${itUpdated} Italian touches`);
  console.log(`Updated ${ruUpdated} Russian touches`);
  console.log(`Updated ${subjectsUpdated} subject lines`);
}

runFleetUpdate();
