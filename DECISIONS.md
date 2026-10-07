# Decisions

Choices made while building, and the assumptions behind them. Change any of them; most are a setting.

## Architecture

- **Separate app on Supabase, not an extension of `dorogo-ai-concierge`.** The concierge lives on Dmitri's machine and Fly.io and was not available to inspect from this build. A separate app carries zero risk to the live concierge, keeps outreach in its own tables, functions and secrets, and the data stays in Dmitri's Supabase project. Hand-off to the concierge is a free-text booking reference on each opportunity (`concierge_ref`) for now.
- **Static app (GitHub Pages) + Supabase Postgres + Edge Functions.** No server to run, nothing to patch, and the shared repo deploys itself. Row Level Security limits every table to emails in `allowed_users`.
- **One copy of the rules.** Cadence timing, windows, caps, DND, linting, classification and stats live in `supabase/functions/_shared/core/` as dependency-free ES modules used by the browser, the functions and the tests. The browser and the cron can never disagree about whether something may be sent.
- **Single sequence, stored in settings.** The brief allows a `sequences` table; with one campaign, steps live in `outreach_settings.data.steps` and are editable in the UI. A table can come later if a second campaign appears.
- **No build step.** Plain ES modules and CSS, so anyone on the repo can edit a view without tooling.

## Sending and safety

- **Approval on for every step by default**; each email step can be switched to auto-approve (only drafts with zero lint errors). Instagram is always manual.
- **One gate for every send** (`canSend`): kill switch → DND → approved → email channel → bounce auto-pause → reply stops cold steps → season pause → scheduled time → send window → daily cap. Replies to a planner (rate card, answers) skip windows and caps but never DND or the kill switch.
- **Copy-lint blocks** banned phrases and unfilled `{{variables}}` (including an empty hook); it **warns** on length, missing opt-out, more than one question, call requests in T1, vehicle naming, exclamation marks. The send job re-lints before sending.
- **Warm-up:** 6 emails a day in week one, +3 per week up to the cap of 12. **Season mode “auto”** halves the cap May to September.
- **Holidays:** Italian national holidays, Easter Monday, and 7 December (Sant'Ambrogio, Milan) are skipped.
- **Open tracking off by default.** Plain-text mail delivers better and Apple Mail Privacy makes opens unreliable. A setting adds a pixel if wanted; the open-rate KPI shows “not tracked” otherwise.
- **Plain text with `List-Unsubscribe`**, explicit `Message-ID`, `In-Reply-To`/`References` threading for T3/T4 and replies; optional copy to the mailbox's Sent folder.
- **A plain “no” reply = Do Not Contact**, because the opt-out line says “reply ‘no’ and I won't write again”.
- **Hard bounce → DND**; soft bounce only marks the address.
- **Unknown senders are never stored.** The inbox sync only keeps mail from prospects or replies in a known thread.

## AI

- **Gemini via REST** (no SDK) with versioned prompts in `_shared/ai.ts`; every call is written to `ai_log`.
- **Hooks must quote their evidence.** The model returns the exact page sentence it relied on; if that text is not on the fetched page, the hook is marked low confidence and flagged for review. AI never fills an email address: emails come only from the page HTML.
- **Rules before AI for replies.** A rule-based classifier (EN/IT, some DE/FR) runs on every reply; Gemini is asked only when the rules are unsure. Opt-outs, bounces and out-of-office never depend on the model.
- **Drafts come from templates, not free generation.** “AI rewrite” is an explicit button and the result is linted like any draft.

## Data and scope

- **Seeded the 22 planners and venues from the brief** with contacts empty (no invented emails). Tier 1/2 agencies are tagged `tier1`/`low_priority`, Sabine `unverified`.
- **Priority score** is explainable (hover the score): type, rating, reviews (log scale), segment, tier/unverified penalties, has email/hook/Instagram.
- **Templates written fresh** because `wedding_partner_outreach_pipeline_plan.md` was not available here; T1–T4 in English and Italian plus reply templates per intent. They pass the linter; T1 is under 110 words.
- **Statistics:** Wilson 95% intervals on every rate; the verdict compares the interval with the 10% target (“above”, “below”, or “not yet distinguishable”), states how many more contacts would narrow it to ±5 points, and A/B uses a two-proportion test. Rate card → quote counts only rate cards at least 30 days old (or already converted).
- **Funnel “quote requested”** = stage Quote Requested or later, or an opportunity with a wedding date or a sent quote.
- **No public partner page or quote calculator.** The rate card's net rates are confidential (Model B), so the calculator stays inside the opportunity editor.
- **Instagram and listing sites are never fetched.** Website research reads only the planner's own public pages, at most four per request.

## Not done yet

- Live SMTP/IMAP/Gemini/Telegram paths are deployed and boot, but could not be exercised without credentials. Test with Settings → “Test SMTP” and “Sync inbox now” once secrets are set.
- Google Calendar events for FAM rides and calls, Google Sheets sync, and WhatsApp alerts are not built. Telegram covers alerts.
- Concierge hand-off is a reference field, not an API link.
- The `Amelaryas` display font is not in this repo; headings fall back to Cormorant Garamond. Add the font file and an `@font-face` in `app/styles.css` to switch.
