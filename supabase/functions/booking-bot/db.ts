// Supabase Postgres Draft Storage for Telegram Booking Bot
// Uses native PostgREST with 0 external dependencies for maximum speed & persistence across cold starts

export interface StoredDraft {
  id: string;
  booking_ref: string;
  chat_id: number;
  card_message_id: number | null;
  prompt_message_id: number | null;
  raw_text: string;
  booking_data: any;
  created_at?: string;
  updated_at?: string;
}

function getDbConfig() {
  const url = Deno.env.get("SUPABASE_URL") || "https://qjarhdrrbjeeqbhfgmnp.supabase.co";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return { url, key };
}

function getHeaders(prefer?: string) {
  const { key } = getDbConfig();
  const h: Record<string, string> = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (prefer) h["Prefer"] = prefer;
  return h;
}

export async function upsertDraft(draft: {
  id: string;
  booking_ref: string;
  chat_id: number;
  card_message_id?: number | null;
  prompt_message_id?: number | null;
  raw_text?: string;
  booking_data: any;
}): Promise<void> {
  const { url } = getDbConfig();
  const payload = {
    id: draft.id,
    booking_ref: draft.booking_ref,
    chat_id: draft.chat_id,
    card_message_id: draft.card_message_id ?? null,
    prompt_message_id: draft.prompt_message_id ?? null,
    raw_text: draft.raw_text ?? "",
    booking_data: draft.booking_data,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${url}/rest/v1/booking_drafts`, {
    method: "POST",
    headers: getHeaders("resolution=merge-duplicates"),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to upsert draft:", err);
  }
}

async function querySingleDraft(queryString: string): Promise<StoredDraft | null> {
  const { url } = getDbConfig();
  const res = await fetch(`${url}/rest/v1/booking_drafts?${queryString}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return null;
  const list = await res.json();
  return list && list.length > 0 ? list[0] : null;
}

export async function getDraftById(id: string): Promise<StoredDraft | null> {
  return querySingleDraft(`id=eq.${encodeURIComponent(id)}&select=*`);
}

export async function getDraftByBookingRef(ref: string): Promise<StoredDraft | null> {
  return querySingleDraft(`booking_ref=eq.${encodeURIComponent(ref)}&order=updated_at.desc&limit=1`);
}

export async function getDraftByMessageId(chatId: number, messageId: number): Promise<StoredDraft | null> {
  return querySingleDraft(
    `chat_id=eq.${chatId}&or=(card_message_id.eq.${messageId},prompt_message_id.eq.${messageId})&order=updated_at.desc&limit=1`
  );
}

export async function getLatestDraftForChat(chatId: number): Promise<StoredDraft | null> {
  return querySingleDraft(`chat_id=eq.${chatId}&order=updated_at.desc&limit=1`);
}

export async function deleteDraftById(id: string): Promise<void> {
  const { url } = getDbConfig();
  await fetch(`${url}/rest/v1/booking_drafts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
}
