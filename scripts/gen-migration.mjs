// Builds supabase/migrations/<ts>_outreach_crm.sql from supabase/schema.sql plus seed data taken from the
// shared core (templates, default settings) and the planner list in the brief. Run: node scripts/gen-migration.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_TEMPLATES, DEFAULT_SETTINGS, priorityScore } from '../supabase/functions/_shared/core/index.js';

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a && a.length ? `array[${a.map(q).join(',')}]::text[]` : `'{}'::text[]`);

// Seed prospects from the brief (section 10). Contact details are deliberately empty: they get researched in the app.
const P = (o) => ({ type: 'planner', source: 'matrimonio.com', review_source: 'matrimonio.com', tags: [], ...o });
const prospects = [
  P({ agency_name: 'WP Bellagio', rating: 5.0, verified_reviews_count: 27, location: 'Bellagio', segment: 'boutique_local', tags: ['seed', 'priority'] }),
  P({ agency_name: 'Federica Cantù Wedding Planner', rating: 5.0, verified_reviews_count: 41, segment: 'boutique_local', tags: ['seed', 'priority'] }),
  P({ agency_name: 'Como Luxury Wedding', rating: 5.0, verified_reviews_count: 11, segment: 'boutique_local', tags: ['seed', 'priority'] }),
  P({ agency_name: 'Perlee', rating: 5.0, verified_reviews_count: 26, segment: 'boutique_local', tags: ['seed', 'priority'] }),
  P({ agency_name: 'I Do in Lake Como', source: 'manual', review_source: 'google', segment: 'boutique_local', tags: ['seed', 'priority'], notes: 'Strong Google reviews (brief). Re-verify rating and count.' }),
  P({ agency_name: 'SugarEvents', rating: 4.9, verified_reviews_count: 70, location: 'Laglio', segment: 'boutique_local', tags: ['seed', 'priority'], notes: 'Laglio / Milan.' }),
  P({ agency_name: 'Best Day Ever', contact_name: 'Barbara Botta', source: 'manual', review_source: null, tags: ['seed'] }),
  P({ agency_name: 'Kiss & Escape', source: 'manual', review_source: null, tags: ['seed'] }),
  P({ agency_name: 'Lena Freitag Weddings', source: 'manual', review_source: null, tags: ['seed'] }),
  P({ agency_name: 'Romance in Italy', source: 'manual', review_source: null, tags: ['seed'] }),
  P({ agency_name: 'Erika Romano Weddings', source: 'manual', review_source: null, tags: ['seed'] }),
  P({ agency_name: 'Sabine Wedding Planner', source: 'manual', review_source: null, tags: ['seed', 'unverified'], notes: 'Unverified in the brief: deprioritised.' }),
  P({ agency_name: 'Relais Villa Vittoria', type: 'venue', source: 'manual', review_source: null, location: 'Laglio', tags: ['seed', 'backdoor'], notes: 'Venue with in-house event coordinator (referral backdoor).' }),
  P({ agency_name: 'Villa Lario', type: 'venue', source: 'manual', review_source: null, tags: ['seed', 'backdoor'], notes: 'Written "Villa Larío" in the brief. Confirm the exact property.' }),
  P({ agency_name: 'Filario', type: 'venue', source: 'manual', review_source: null, location: 'Lezzeno', tags: ['seed', 'backdoor'] }),
  P({ agency_name: 'Villa Cipressi', type: 'venue', source: 'manual', review_source: null, location: 'Varenna', tags: ['seed', 'backdoor'] }),
  P({ agency_name: 'Grand Hotel Imperiale', type: 'concierge_hotel', source: 'manual', review_source: null, location: 'Moltrasio', tags: ['seed', 'backdoor'] }),
  ...['The Lake Como Wedding Planner', 'SposiamoVi', 'Eventoile', 'Elena Renzi', 'Matthew Oliver'].map((n) =>
    P({ agency_name: n, source: 'manual', review_source: null, segment: 'international', tags: ['seed', 'tier1', 'low_priority'], notes: 'Tier 1/2 agency: judged saturated, kept for later.' })),
];

const cols = ['type', 'agency_name', 'contact_name', 'source', 'review_source', 'rating', 'verified_reviews_count', 'location', 'segment', 'tags', 'notes', 'priority_score'];
const seedProspects = prospects.map((p) => {
  const row = { ...p, priority_score: priorityScore(p).score };
  return `(${cols.map((c) => (c === 'tags' ? arr(row.tags) : q(row[c]))).join(', ')})`;
}).join(',\n');

const seedTemplates = DEFAULT_TEMPLATES.map((t) =>
  `(${[t.key, t.language, t.kind, t.name, t.subject_a || '', t.subject_b || '', t.body].map(q).join(', ')}, ${t.attach_rate_card ? 'true' : 'false'})`).join(',\n');

const sql = `${readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')}
-- ---------------- Seed ----------------
insert into public.outreach_settings (id, data) values (1, ${q(JSON.stringify(DEFAULT_SETTINGS))}::jsonb) on conflict (id) do nothing;

insert into public.templates (key, language, kind, name, subject_a, subject_b, body, attach_rate_card) values
${seedTemplates}
on conflict (key, language) do nothing;

insert into public.prospects (${cols.join(', ')}) values
${seedProspects};
`;
const out = process.argv[2] || 'supabase/migrations/20261007090000_outreach_crm.sql';
writeFileSync(out, sql);
console.log(`wrote ${out}: ${prospects.length} prospects, ${DEFAULT_TEMPLATES.length} templates`);
