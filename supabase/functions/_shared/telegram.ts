// Telegram alerts, daily digest and approve/skip buttons. Bot token and chat id come from function secrets.
import { env } from './server.ts';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export { esc as tgEscape };

export async function tg(method: string, payload: Record<string, unknown>) {
  const token = env('OUTREACH_TELEGRAM_BOT_TOKEN');
  if (!token) return null;
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.ok) console.error('telegram', method, j.description);
  return j;
}

export function tgSend(text: string, buttons: { text: string; data?: string; url?: string }[][] = []) {
  const chat_id = env('OUTREACH_TELEGRAM_CHAT_ID');
  if (!chat_id) return Promise.resolve(null);
  return tg('sendMessage', {
    chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true,
    reply_markup: buttons.length ? { inline_keyboard: buttons.map((row) => row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }))) } : undefined,
  });
}

export const appUrl = (hash = '') => `${env('OUTREACH_APP_URL', 'https://dimatrc18.github.io/Wedding-planners-outreach/')}${hash ? `#${hash}` : ''}`;
