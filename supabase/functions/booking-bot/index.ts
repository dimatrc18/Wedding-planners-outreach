// Dorogo Booking Copilot Telegram Bot (Supabase Edge Function / Deno)
import { extractBookingWithGemini, patchBookingWithGemini } from "./extract.ts";
import { renderBookingCard, buildEditableBookingText, esc } from "./card.ts";
import { saveBookingToGoogleSheet, saveBookingToGoogleCalendar } from "./google.ts";
import {
  upsertDraft,
  getDraftById,
  getDraftByBookingRef,
  getDraftByMessageId,
  getLatestDraftForChat,
  deleteDraftById,
  type StoredDraft,
} from "./db.ts";
import type { BookingData } from "./schema.ts";
import defaultServiceAccount from "./service_account.json" with { type: "json" };

const BOT_TOKEN = Deno.env.get("BOOKING_BOT_TOKEN") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GOOGLE_SHEET_ID = Deno.env.get("BOOKING_SHEET_ID") || "";
const GOOGLE_CALENDAR_ID = Deno.env.get("BOOKING_CALENDAR_ID") || "";
const WEBHOOK_SECRET = Deno.env.get("BOOKING_TG_SECRET") || "dorogo_booking_bot_secret_2026";

async function tgApi(method: string, payload: Record<string, unknown>) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error on ${method}:`, data.description);
  }
  return data;
}

export function getServiceAccountCreds() {
  const envJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (envJson) {
    try {
      return JSON.parse(envJson);
    } catch {
      // fallback
    }
  }
  return defaultServiceAccount;
}

if (Deno.args.includes("--polling") || Deno.env.get("BOT_MODE") === "polling") {
  startLongPolling();
} else {
  Deno.serve(async (req) => {
    const url = new URL(req.url);

    // Healthcheck / version check
    if (req.method === "GET") {
      if (url.searchParams.get("setup_webhook") === WEBHOOK_SECRET) {
        const webhookUrl = `${url.origin}${url.pathname}`;
        const r = await tgApi("setWebhook", {
          url: webhookUrl,
          secret_token: WEBHOOK_SECRET,
          allowed_updates: ["message", "edited_message", "callback_query"],
        });
        return new Response(JSON.stringify({ ok: true, webhook: r, url: webhookUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        status: "Dorogo Booking Copilot Active (Postgres Engine)",
        has_service_key: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
        has_anon_key: !!Deno.env.get("SUPABASE_ANON_KEY"),
        has_url: !!Deno.env.get("SUPABASE_URL"),
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify secret header
    const secretHeader = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (WEBHOOK_SECRET && secretHeader && secretHeader !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
    }

    const update = await req.json().catch(() => null);
    if (!update) {
      return new Response(JSON.stringify({ ok: true }));
    }

    try {
      // 1. Handle Inline Button Clicks (Callback Queries)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      // 2. Handle Messages (New or Edited)
      if (update.message) {
        await handleIncomingMessage(update.message);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      if (update.edited_message) {
        await handleIncomingMessage(update.edited_message);
        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }
    } catch (err: any) {
      console.error("Error processing update:", err);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  });
}

/**
 * Long Polling Runner
 */
export async function startLongPolling() {
  console.log("🚀 Starting Dorogo Booking Copilot in Long Polling mode...");
  await tgApi("deleteWebhook", { drop_pending_updates: false });

  let offset = 0;
  while (true) {
    try {
      const res = await tgApi("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"],
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          try {
            if (update.callback_query) {
              await handleCallbackQuery(update.callback_query);
            } else if (update.message) {
              await handleIncomingMessage(update.message);
            }
          } catch (itemErr) {
            console.error("Error processing update item:", itemErr);
          }
        }
      } else {
        console.warn(`[Polling] getUpdates paused, retrying in 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (pollErr: any) {
      console.warn("Polling network retry:", pollErr.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}


async function handleIncomingMessage(msg: any) {
  const chatId = msg.chat?.id;
  const user = msg.from;
  const text = (msg.text || msg.caption || "").trim();

  // Handle Commands
  if (text.startsWith("/status")) {
    await sendStatusReport(chatId);
    return;
  }

  if (text.startsWith("/start") || text.startsWith("/help")) {
    const welcome = `👋 <b>Welcome to Dorogo Booking Copilot!</b>\n\n` +
      `Forward or send me <b>any text message with trip details</b> (WhatsApp chat log, draft, schedule with map links, or notes).\n\n` +
      `I will automatically:\n` +
      `1. Extract all transfer segments and map pins\n` +
      `2. Audit missing details (client name, phone, flight numbers)\n` +
      `3. Extract total fare, deposit, and balance\n` +
      `4. Render an interactive draft card for 1-click CRM confirmation.\n\n` +
      `<i>💡 You can edit any booking by tapping «📋 Copy Full Text to Edit», editing directly on your keyboard, and re-sending!</i>`;
    await tgApi("sendMessage", { chat_id: chatId, text: welcome, parse_mode: "HTML" });
    return;
  }

  // Check if voice memo
  let audioBase64: string | undefined;
  let audioMime: string | undefined;
  if (msg.voice || msg.audio) {
    const fileId = (msg.voice || msg.audio).file_id;
    const fileRes = await tgApi("getFile", { file_id: fileId });
    if (fileRes.ok && fileRes.result?.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.result.file_path}`;
      const aRes = await fetch(downloadUrl);
      if (aRes.ok) {
        const buf = await aRes.arrayBuffer();
        audioBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        audioMime = msg.voice ? "audio/ogg" : msg.audio?.mime_type || "audio/mpeg";
      }
    }
  }

  // Check if screenshot / photo
  let imageBase64: string | undefined;
  let imageMime: string | undefined;
  if (msg.photo && msg.photo.length > 0) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    const fileRes = await tgApi("getFile", { file_id: largestPhoto.file_id });
    if (fileRes.ok && fileRes.result?.file_path) {
      const downloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileRes.result.file_path}`;
      const pRes = await fetch(downloadUrl);
      if (pRes.ok) {
        const buf = await pRes.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        imageMime = "image/jpeg";
      }
    }
  }

  // If there's no text, audio, or image, ignore
  if (!text && !audioBase64 && !imageBase64) {
    return;
  }

  // 1. Detect if this incoming message is an EDIT of an existing booking draft
  let existingDraft: StoredDraft | null = null;

  // Check A: Explicit booking ref in text (e.g. [DRG-86D0DA] or DRG-86D0DA)
  const refMatch = text.match(/\b(DRG-[A-Z0-9]{6})\b/);
  if (refMatch) {
    existingDraft = await getDraftByBookingRef(refMatch[1]);
  }

  // Check B: Reply to a previous draft card or prompt message
  const replyTo = msg.reply_to_message;
  if (!existingDraft && replyTo) {
    existingDraft = await getDraftByMessageId(chatId, replyTo.message_id);
  }

  // Check C: If recent unconfirmed draft exists in this chat (< 30 minutes) and text has booking clues
  if (!existingDraft) {
    const recent = await getLatestDraftForChat(chatId);
    if (recent && recent.updated_at) {
      const ageMs = Date.now() - new Date(recent.updated_at).getTime();
      if (ageMs < 30 * 60 * 1000) {
        const isUpdate = /transfer|pickup|dropoff|guests|sprinter|v-class|fare|deposit|\b€\b|flight|phone|\+\d{8,}/i.test(text);
        if (isUpdate) {
          existingDraft = recent;
        }
      }
    }
  }

  // Direct prompt reply handler (full edit / notes / price / missing info) -> Updates card in-place with ZERO chat clutter
  if (
    existingDraft &&
    existingDraft.prompt_message_id &&
    replyTo &&
    (replyTo.message_id === existingDraft.prompt_message_id || replyTo.message_id === existingDraft.card_message_id)
  ) {
    const isFullBookingUpdate = text.length > 80 || /\[transfer|\btransfer\b|pickup|dropoff|sprinter|v-class|\b€\b|min drive/i.test(text);

    if (isFullBookingUpdate) {
      await tgApi("sendChatAction", { chat_id: chatId, action: "typing" });
      const updatedBooking = await extractBookingWithGemini({ text }, GEMINI_API_KEY);
      updatedBooking.booking_ref = existingDraft.booking_ref;
      existingDraft.booking_data = updatedBooking;
      existingDraft.raw_text = text;
    } else {
      const priceMatch = text.match(/^(?:€\s*)?(\d+)(?:\s*[\/\-]\s*(?:€\s*)?(\d+))?$/);
      if (priceMatch) {
        const p = parseFloat(priceMatch[1]);
        const dep = priceMatch[2] ? parseFloat(priceMatch[2]) : existingDraft.booking_data.finance.paid_deposit;
        existingDraft.booking_data.finance.total_price = p;
        existingDraft.booking_data.finance.paid_deposit = dep;
        existingDraft.booking_data.finance.balance_due = p - (dep || 0);
      } else {
        const phoneMatch = text.match(/(\+?\d[\d\s\-()]{6,}\d)/);
        if (phoneMatch && !existingDraft.booking_data.client.phone) {
          existingDraft.booking_data.client.phone = phoneMatch[1].replace(/\s+/g, "");
          existingDraft.booking_data.missing_fields = (existingDraft.booking_data.missing_fields || []).filter((m: string) => !m.includes("phone"));
        } else {
          existingDraft.booking_data.client_notes = text.trim();
        }
      }
    }

    // Clean up prompt message and user reply message
    if (existingDraft.prompt_message_id) {
      await tgApi("deleteMessage", { chat_id: chatId, message_id: existingDraft.prompt_message_id });
    }
    await tgApi("deleteMessage", { chat_id: chatId, message_id: msg.message_id });

    // Update card in place
    const card = renderBookingCard(existingDraft.booking_data, existingDraft.id);
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: existingDraft.card_message_id,
      text: card.text,
      parse_mode: "HTML",
      reply_markup: card.replyMarkup,
      disable_web_page_preview: true,
    });

    await upsertDraft({ ...existingDraft, prompt_message_id: null });
    return;
  }

  // Send native Telegram typing indicator in chat header (Zero chat messages, Zero ghost messages, No draft sync bugs!)
  await tgApi("sendChatAction", { chat_id: chatId, action: "typing" });

  try {
    let booking: BookingData;

    if (existingDraft) {
      // If short message (< 120 chars) and not a full itinerary, patch existing booking
      const isShortPatch = text.length < 120 && !/\[transfer|\btransfer\s*\d/i.test(text);
      if (isShortPatch && existingDraft.booking_data) {
        booking = await patchBookingWithGemini(existingDraft.booking_data, text, GEMINI_API_KEY);
      } else {
        booking = await extractBookingWithGemini(
          { text, audioBase64, audioMime, imageBase64, imageMime },
          GEMINI_API_KEY
        );
      }
      // Preserve consistent booking ref
      booking.booking_ref = existingDraft.booking_ref;

      // DELETE the previous card message from chat!
      if (existingDraft.card_message_id) {
        await tgApi("deleteMessage", {
          chat_id: chatId,
          message_id: existingDraft.card_message_id,
        });
      }

      // DELETE prompt message if one was sent!
      if (existingDraft.prompt_message_id) {
        await tgApi("deleteMessage", {
          chat_id: chatId,
          message_id: existingDraft.prompt_message_id,
        });
      }
    } else {
      booking = await extractBookingWithGemini(
        { text, audioBase64, audioMime, imageBase64, imageMime },
        GEMINI_API_KEY
      );
    }

    const draftId = existingDraft?.id || `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const card = renderBookingCard(booking, draftId);

    // Send the updated/new interactive booking card
    const cardMsg = await tgApi("sendMessage", {
      chat_id: chatId,
      text: card.text,
      parse_mode: "HTML",
      reply_markup: card.replyMarkup,
      disable_web_page_preview: true,
    });

    if (cardMsg.ok) {
      const cardMsgId = cardMsg.result.message_id;
      // Persist in Postgres!
      await upsertDraft({
        id: draftId,
        booking_ref: booking.booking_ref,
        chat_id: chatId,
        card_message_id: cardMsgId,
        prompt_message_id: null,
        raw_text: text,
        booking_data: booking,
      });
    }
  } catch (err: any) {
    console.error("Extraction error:", err);
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: `❌ <b>Extraction error:</b>\n<code>${esc(err.message)}</code>`,
      parse_mode: "HTML",
    });
  }
}

async function handleCallbackQuery(query: any) {
  const queryId = query.id;
  const data = String(query.data || "");
  const [action, draftId, param] = data.split(":");
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;

  // Retrieve draft from Postgres
  let draft: StoredDraft | null = null;
  if (draftId) {
    draft = await getDraftById(draftId);
  }
  if (!draft && messageId && chatId) {
    draft = await getDraftByMessageId(chatId, messageId);
  }

  // 1. CANCEL / DISCARD
  if (action === "discard") {
    await tgApi("answerCallbackQuery", { callback_query_id: queryId });
    if (draft) {
      await deleteDraftById(draft.id);
    }
    // Delete the card completely from chat
    await tgApi("deleteMessage", {
      chat_id: chatId,
      message_id: messageId,
    });
    return;
  }

  // 2. EDIT FULL BOOKING
  if (action === "edit_full" || action === "copy_full") {
    // Answer callback silently (NO alert modal popup!)
    await tgApi("answerCallbackQuery", { callback_query_id: queryId });

    const ref = draft?.booking_ref || "";
    const fullText = (draft?.raw_text && draft.raw_text.trim().length > 10)
      ? draft.raw_text.trim()
      : (draft?.booking_data ? buildEditableBookingText(draft.booking_data) : "No booking text found");

    const promptMsg = await tgApi("sendMessage", {
      chat_id: chatId,
      text: `✏️ <b>Edit Full Booking [${ref}]:</b>\n\n` +
        `<code>${esc(fullText)}</code>\n\n` +
        `<i>💡 <b>How to edit:</b>\n` +
        `1. <b>Tap the box above</b> to copy everything.\n` +
        `2. <b>Paste into chat (Cmd+V)</b>, edit whatever you want, and send.\n` +
        `3. The bot will automatically update the card in-place and clean up this prompt.</i>\n\n` +
        `<i>⚡ <b>Desktop Shortcut:</b> You can also just press <b>↑ (Up Arrow)</b> in chat to edit your original message directly!</i>`,
      parse_mode: "HTML",
    });

    if (draft && promptMsg.ok) {
      await upsertDraft({
        ...draft,
        prompt_message_id: promptMsg.result.message_id,
      });
    }
    return;
  }

  // 3. EDIT NOTES
  if (action === "edit_notes") {
    // Answer callback silently (NO alert modal popup!)
    await tgApi("answerCallbackQuery", { callback_query_id: queryId });

    const ref = draft?.booking_ref || "";
    const notesText = draft?.booking_data?.client_notes || "No notes yet";

    const promptMsg = await tgApi("sendMessage", {
      chat_id: chatId,
      text: `📝 <b>Notes for [${ref}]:</b>\n\n` +
        `<code>${esc(notesText)}</code>\n\n` +
        `<i>💡 Tap the box above to copy, edit what you need, and send your reply to update the card.</i>`,
      parse_mode: "HTML",
    });

    if (draft && promptMsg.ok) {
      await upsertDraft({
        ...draft,
        prompt_message_id: promptMsg.result.message_id,
      });
    }
    return;
  }

  // 3. EDIT PRICE
  if (action === "edit_price") {
    await tgApi("answerCallbackQuery", { callback_query_id: queryId });

    const ref = draft?.booking_ref || "";
    const curFare = draft?.booking_data?.finance?.total_price
      ? `€${draft.booking_data.finance.total_price}`
      : "Not specified";

    const promptMsg = await tgApi("sendMessage", {
      chat_id: chatId,
      text: `💶 <b>Update Fare for [${ref}]:</b>\n` +
        `Current fare: <b>${curFare}</b>\n\n` +
        `Reply with the updated fare (e.g. <i>«1800»</i> or <i>«1610 / 483 deposit»</i>).\n` +
        `The card will update automatically!`,
      parse_mode: "HTML",
      reply_to_message_id: messageId,
    });

    if (draft && promptMsg.ok) {
      await upsertDraft({
        ...draft,
        prompt_message_id: promptMsg.result.message_id,
      });
    }
    return;
  }

  // 4. ADD MISSING INFO
  if (action === "add_info") {
    await tgApi("answerCallbackQuery", { callback_query_id: queryId });

    const ref = draft?.booking_ref || "";
    const missingItems = draft?.booking_data?.missing_fields || [];
    const missingStr = missingItems.length > 0 ? missingItems.map((m: string) => `• ${m}`).join("\n") + "\n\n" : "";

    const promptMsg = await tgApi("sendMessage", {
      chat_id: chatId,
      text: `✏️ <b>Provide missing info for [${ref}]:</b>\n\n` +
        `${missingStr}` +
        `Reply with the missing phone number, flight number, or notes (e.g. <i>«Phone: +39 347 1234567»</i>).\n` +
        `The card will update automatically!`,
      parse_mode: "HTML",
      reply_to_message_id: messageId,
    });

    if (draft && promptMsg.ok) {
      await upsertDraft({
        ...draft,
        prompt_message_id: promptMsg.result.message_id,
      });
    }
    return;
  }

  // 5. SET PRICE (From Suggested)
  if (action === "set_price" && draft && param) {
    const p = parseFloat(param);
    draft.booking_data.finance.total_price = p;
    draft.booking_data.finance.suggested_price = null;
    draft.booking_data.finance.is_suggested = false;
    draft.booking_data.finance.balance_due = p - (draft.booking_data.finance.paid_deposit || 0);

    if (draft.booking_data.rides.length === 2 && draft.booking_data.rides[1].role === "return") {
      draft.booking_data.rides[0].price = Math.round(p / 2);
      draft.booking_data.rides[1].price = p - Math.round(p / 2);
    }

    await upsertDraft(draft);
    await tgApi("answerCallbackQuery", { callback_query_id: queryId, text: `Fare €${p} confirmed.` });

    const card = renderBookingCard(draft.booking_data, draft.id);
    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: card.text,
      parse_mode: "HTML",
      reply_markup: card.replyMarkup,
      disable_web_page_preview: true,
    });
    return;
  }

  // 6. CONFIRM & SAVE TO CRM
  if (action === "confirm") {
    if (!draft) {
      await tgApi("answerCallbackQuery", { callback_query_id: queryId, text: "Draft already confirmed or expired.", show_alert: true });
      return;
    }

    await tgApi("answerCallbackQuery", { callback_query_id: queryId, text: "Saving to Google Sheets & Calendar..." });

    const creds = getServiceAccountCreds();
    let sheetSuccess = false;
    let sheetMsg = "";
    let calSuccess = false;
    let eventLinks: string[] = [];

    // 1. Google Sheets
    try {
      const sheetRes = await saveBookingToGoogleSheet(draft.booking_data, GOOGLE_SHEET_ID, "CRM", creds);
      sheetSuccess = sheetRes.success;
      sheetMsg = sheetRes.message;
    } catch (e: any) {
      sheetMsg = `Error: ${e.message}`;
    }

    // 2. Google Calendar
    try {
      const calRes = await saveBookingToGoogleCalendar(draft.booking_data, GOOGLE_CALENDAR_ID, "Europe/Rome", creds);
      calSuccess = calRes.success;
      eventLinks = calRes.eventLinks;
    } catch (e: any) {
      console.error("Calendar error:", e);
    }

    const statusIcon = sheetSuccess && calSuccess ? "✅" : "⚠️";
    const ref = draft.booking_ref;

    let confirmText = `${statusIcon} <b>BOOKING CONFIRMED & SAVED TO CRM [${ref}]</b>\n\n`;
    confirmText += `👤 <b>Client:</b> ${draft.booking_data.client?.name || "VIP Guest"}\n`;
    confirmText += `🚘 <b>Service:</b> ${draft.booking_data.service_type || "Transfer"} (${draft.booking_data.vehicle?.class || "Mercedes-Benz"})\n`;
    if (draft.booking_data.finance?.total_price !== null && draft.booking_data.finance?.total_price !== undefined) {
      confirmText += `💶 <b>Total Fare:</b> €${draft.booking_data.finance.total_price}`;
      if (draft.booking_data.finance.balance_due) confirmText += ` (Balance due: €${draft.booking_data.finance.balance_due})`;
      confirmText += `\n`;
    }
    confirmText += `📅 <b>Booked Month:</b> ${draft.booking_data.booked_month}\n\n`;
    confirmText += `<b>Database Sync:</b>\n`;
    confirmText += `• 📊 Google Sheet (CRM): ${sheetSuccess ? "<b>Saved</b> ✅" : `❌ ${sheetMsg}`}\n`;
    confirmText += `• 📅 Google Calendar: ${calSuccess ? `<b>${eventLinks.length} Event(s) Created</b> ✅` : "❌ Error"}\n`;

    const buttons: any[] = [];
    const btnRow: any[] = [];
    btnRow.push({
      text: "📊 Open Google Sheet",
      url: `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`,
    });
    if (eventLinks.length > 0) {
      btnRow.push({
        text: "📅 View Calendar Event",
        url: eventLinks[0],
      });
    }
    buttons.push(btnRow);

    await tgApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: confirmText,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    });

    // Delete draft from Postgres table
    await deleteDraftById(draft.id);
    return;
  }
}

async function sendStatusReport(chatId: number | string) {
  const creds = getServiceAccountCreds();
  let sheetStatus = "Testing...";
  let calStatus = "Testing...";

  try {
    const token = await (await import("./google.ts")).getGoogleAccessToken(creds);
    sheetStatus = token ? "Подключено (OAuth2 OK) ✅" : "Ошибка";
    calStatus = token ? "Подключено (OAuth2 OK) ✅" : "Ошибка";
  } catch (e: any) {
    sheetStatus = `Ошибка: ${e.message}`;
    calStatus = `Ошибка: ${e.message}`;
  }

  const report = `🔍 <b>СТАТУС DOROGO BOOKING COPILOT:</b>\n\n` +
    `🤖 <b>Движок:</b> Google Gemini 2.5 Flash\n` +
    `📊 <b>Google Таблица:</b> ${sheetStatus}\n` +
    `• ID таблицы: <code>${GOOGLE_SHEET_ID}</code>\n` +
    `• Вкладка: <code>CRM</code>\n\n` +
    `📅 <b>Google Календарь:</b> ${calStatus}\n` +
    `• ID календаря: <code>${GOOGLE_CALENDAR_ID}</code>\n\n` +
    `👥 <b>Чат:</b> <code>${chatId}</code>`;

  await tgApi("sendMessage", { chat_id: chatId, text: report, parse_mode: "HTML" });
}
