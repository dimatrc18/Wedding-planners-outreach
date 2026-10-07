// Server helpers shared by the outreach edge functions (Deno).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { withDefaults } from './core/sequence.js';

export const env = (k: string, d = '') => Deno.env.get(k) ?? d;

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function serviceKey() {
  return env('SUPABASE_SERVICE_ROLE_KEY') || env('OUTREACH_SERVICE_KEY');
}

// Service-role client: bypasses RLS. Only used after the caller has been authorised.
export function admin() {
  return createClient(env('SUPABASE_URL'), serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
}

// The caller must be a signed-in user whose email is in allowed_users.
export async function requireAllowedUser(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in first');
  const r = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new HttpError(401, 'Session expired, sign in again');
  const user = await r.json();
  const db = admin();
  const { data } = await db.from('allowed_users').select('email').eq('email', user.email).maybeSingle();
  if (!data) throw new HttpError(403, 'This email is not on the allowed list');
  return { user, db };
}

// Cron calls carry x-cron-secret; signed-in allowed users may trigger jobs by hand too.
export async function requireCronOrUser(req: Request) {
  const secret = env('OUTREACH_CRON_SECRET');
  if (secret && req.headers.get('x-cron-secret') === secret) return { user: null, db: admin(), actor: 'cron' };
  const { user, db } = await requireAllowedUser(req);
  return { user, db, actor: user.email };
}

export async function loadSettings(db: any) {
  const { data } = await db.from('outreach_settings').select('data').eq('id', 1).maybeSingle();
  return withDefaults(data?.data || {});
}

export async function getState(db: any, key: string) {
  const { data } = await db.from('outreach_state').select('value').eq('key', key).maybeSingle();
  return data?.value || {};
}

export async function setState(db: any, key: string, value: unknown) {
  await db.from('outreach_state').upsert({ key, value, updated_at: new Date().toISOString() });
}

export async function logEvent(db: any, action: string, detail: Record<string, unknown> = {}, prospect_id: string | null = null, actor = 'system') {
  await db.from('events_log').insert({ action, detail, prospect_id, actor });
}

export const integrations = () => ({
  smtp: !!(env('OUTREACH_SMTP_HOST') && env('OUTREACH_SMTP_USER') && env('OUTREACH_SMTP_PASS')),
  imap: !!(env('OUTREACH_IMAP_HOST') && (env('OUTREACH_IMAP_USER') || env('OUTREACH_SMTP_USER'))),
  gemini: !!env('GEMINI_API_KEY'),
  telegram: !!(env('OUTREACH_TELEGRAM_BOT_TOKEN') && env('OUTREACH_TELEGRAM_CHAT_ID')),
  cron_secret: !!env('OUTREACH_CRON_SECRET'),
  service_key: !!serviceKey(),
});

export async function handle(req: Request, fn: (req: Request) => Promise<Response>) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    return await fn(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: (e as Error).message || String(e) }, status);
  }
}
