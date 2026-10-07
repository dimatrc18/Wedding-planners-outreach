// SMTP sending and IMAP reading for the outreach mailbox (booking@dorogo.eu or an outreach@ address).
// Plain-text mail with proper threading headers. Open tracking is off unless settings.track_opens is on.
import nodemailer from 'npm:nodemailer@6.9.16';
import MailComposer from 'npm:nodemailer@6.9.16/lib/mail-composer/index.js';
import { ImapFlow } from 'npm:imapflow@1.0.171';
import { simpleParser } from 'npm:mailparser@3.7.2';
import { env } from './server.ts';

export function smtpConfig() {
  const port = +env('OUTREACH_SMTP_PORT', '465');
  return {
    host: env('OUTREACH_SMTP_HOST'), port, secure: port === 465,
    auth: { user: env('OUTREACH_SMTP_USER'), pass: env('OUTREACH_SMTP_PASS') },
  };
}

function imapConfig() {
  return {
    host: env('OUTREACH_IMAP_HOST'), port: +env('OUTREACH_IMAP_PORT', '993'), secure: true,
    auth: { user: env('OUTREACH_IMAP_USER') || env('OUTREACH_SMTP_USER'), pass: env('OUTREACH_IMAP_PASS') || env('OUTREACH_SMTP_PASS') },
    logger: false,
  };
}

export async function verifySmtp() {
  const t = nodemailer.createTransport(smtpConfig());
  await t.verify();
  return true;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Build and send one message. Returns { messageId, raw }.
 * opts: { fromName, fromEmail, replyTo, to, subject, text, inReplyTo, references[], attachments[], pixelUrl }
 */
export async function sendMail(opts: any) {
  const domain = (opts.fromEmail.split('@')[1] || 'dorogo.eu').trim();
  const messageId = `<${crypto.randomUUID()}@${domain}>`;
  const mail: any = {
    from: { name: opts.fromName, address: opts.fromEmail },
    to: opts.to,
    replyTo: opts.replyTo || opts.fromEmail,
    subject: opts.subject,
    text: opts.text,
    messageId,
    headers: { 'List-Unsubscribe': `<mailto:${opts.fromEmail}?subject=unsubscribe>` },
    attachments: opts.attachments || [],
  };
  if (opts.inReplyTo) mail.inReplyTo = opts.inReplyTo;
  if (opts.references?.length) mail.references = opts.references;
  if (opts.pixelUrl) mail.html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${esc(opts.text).replace(/\n/g, '<br>')}</div><img src="${opts.pixelUrl}" width="1" height="1" alt="">`;
  const raw: Uint8Array = await new Promise((resolve, reject) =>
    new MailComposer(mail).compile().build((err: Error, msg: Uint8Array) => (err ? reject(err) : resolve(msg))));
  const t = nodemailer.createTransport(smtpConfig());
  await t.sendMail({ envelope: { from: opts.fromEmail, to: [opts.to] }, raw });
  return { messageId, raw };
}

// Put a copy in the mailbox's Sent folder so Dmitri sees outreach in his normal mail client.
export async function appendToSent(raw: Uint8Array) {
  const folder = env('OUTREACH_IMAP_SENT_FOLDER');
  if (!folder || !env('OUTREACH_IMAP_HOST')) return false;
  const client = new ImapFlow(imapConfig());
  await client.connect();
  try { await client.append(folder, raw, ['\\Seen']); } finally { await client.logout(); }
  return true;
}

/**
 * New messages in INBOX since the last UID. Returns { messages, lastUid }.
 * Only metadata and text are kept; attachments are ignored.
 */
export async function fetchNewMessages(lastUid: number | null, maxMessages = 50) {
  const client = new ImapFlow(imapConfig());
  await client.connect();
  const out: any[] = [];
  let newest = lastUid || 0;
  const lock = await client.getMailboxLock('INBOX');
  try {
    const range = lastUid ? { uid: `${lastUid + 1}:*` } : { since: new Date(Date.now() - 3 * 86400000) };
    for await (const msg of client.fetch(range as any, { uid: true, source: true, envelope: true })) {
      if (lastUid && msg.uid <= lastUid) continue;
      newest = Math.max(newest, msg.uid);
      const parsed: any = await simpleParser(msg.source);
      out.push({
        uid: msg.uid,
        messageId: parsed.messageId || null,
        inReplyTo: parsed.inReplyTo || null,
        references: Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [],
        from: parsed.from?.value?.[0]?.address?.toLowerCase() || '',
        fromName: parsed.from?.value?.[0]?.name || '',
        subject: parsed.subject || '',
        date: (parsed.date || new Date()).toISOString(),
        text: String(parsed.text || '').slice(0, 20000),
        autoSubmitted: String(parsed.headers?.get('auto-submitted') || ''),
        failedRecipients: String(parsed.headers?.get('x-failed-recipients') || ''),
      });
      if (out.length >= maxMessages) break;
    }
  } finally {
    lock.release();
    await client.logout();
  }
  return { messages: out, lastUid: newest };
}
