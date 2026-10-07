// Telegram webhook: Approve / Skip buttons from the digest, and /today for an on-demand digest.
// Only the configured chat is obeyed, and Telegram must send the secret token set with setWebhook.
import { handle, json, env, admin, loadSettings, logEvent } from '../_shared/server.ts';
import { approveTouch, sendDigest } from '../_shared/jobs.ts';
import { tg } from '../_shared/telegram.ts';

Deno.serve((req) => handle(req, async () => {
  const url = new URL(req.url);
  const secret = env('OUTREACH_TELEGRAM_SECRET');
  if (req.method === 'GET' && secret && url.searchParams.get('register') === secret) {
    const webhookUrl = `${env('SUPABASE_URL')}/functions/v1/outreach-telegram`;
    const hookRes = await tg('setWebhook', { url: webhookUrl, secret_token: secret });
    const db = admin();
    const { data: row } = await db.from('outreach_settings').select('data').eq('id', 1).maybeSingle();
    if (row?.data) {
      const updated = { ...row.data, sender: { ...(row.data.sender || {}), name: 'Dmitri', display_name: 'Dmitri | DOROGO', email: 'dmitri@dorogo.eu', reply_to: 'dmitri@dorogo.eu' } };
      await db.from('outreach_settings').upsert({ id: 1, data: updated });
    }
    return json({ ok: true, webhook: hookRes, sender: 'dmitri@dorogo.eu' });
  }
  if (!secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return json({ error: 'forbidden' }, 403);
  const update = await req.json();
  const chatId = String(update.callback_query?.message?.chat?.id ?? update.message?.chat?.id ?? '');
  if (chatId !== env('OUTREACH_TELEGRAM_CHAT_ID')) return json({ ok: true });
  const db = admin();
  const settings = await loadSettings(db);
  if (update.callback_query) {
    const [action, id] = String(update.callback_query.data || '').split(':');
    let text = '';
    if (action === 'approve') {
      const r: any = await approveTouch(db, id, settings, 'telegram');
      text = r.ok ? (r.scheduled_at ? `Approved. Sends ${new Date(r.scheduled_at).toLocaleString('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Approved. Send it by hand.') : `Not approved: ${r.reason}`;
    } else if (action === 'skip') {
      await db.from('touches').update({ state: 'skipped' }).eq('id', id).eq('state', 'draft');
      await logEvent(db, 'draft_skipped', { touch_id: id, via: 'telegram' }, null, 'telegram');
      text = 'Skipped.';
    }
    await tg('answerCallbackQuery', { callback_query_id: update.callback_query.id, text });
    await tg('editMessageReplyMarkup', { chat_id: chatId, message_id: update.callback_query.message.message_id, reply_markup: { inline_keyboard: [[{ text, callback_data: 'noop' }]] } });
    return json({ ok: true });
  }
  if (/^\/(today|digest)/.test(update.message?.text || '')) await sendDigest(db, settings, new Date(), true);
  return json({ ok: true });
}));
