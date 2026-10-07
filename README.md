# DOROGO Partner Outreach

Mini-CRM, outreach engine and traction dashboard for DOROGO's wedding-planner partnership channel (Lake Como and Northern Italy). One person runs it in about 15 minutes a day: approve drafts, send Instagram DMs by hand, answer replies, and see whether the campaign has traction.

- **App:** https://dimatrc18.github.io/Wedding-planners-outreach/ (once GitHub Pages is on, see Setup step 1)
- **Demo:** open the app and choose “Explore with demo data”, or add `#demo` to the URL. Fictional agencies; nothing is saved or sent.
- **Data:** Dmitri's Supabase project `qjarhdrrbjeeqbhfgmnp` (Postgres, Row Level Security, edge functions). Nothing lives anywhere else.

## How it works

```
Browser app (GitHub Pages, static)            Supabase (project qjarhdrrbjeeqbhfgmnp)
  index.html + app/*.js  ──── supabase-js ───▶  Postgres tables, RLS: allowed_users only
        │                                      Storage bucket "outreach" (rate card PDF)
        └── outreach-api (user session) ─────▶  Edge functions
                                                  outreach-api       enrich, send now, AI rewrite, health
  pg_cron every 10 min ──────────────────────▶    outreach-cron      inbox → draft → send → 08:30 digest
  Telegram buttons ──────────────────────────▶    outreach-telegram  approve / skip from the phone
```

All business rules (cadence timing, send windows, caps, do-not-contact, copy-lint, reply classification, stats) live once in `supabase/functions/_shared/core/` and are imported by the browser, the edge functions and the tests.

## Daily routine (Today view)

1. **Replies waiting** first. Each shows the classification and a suggested answer (rate card with the PDF attached, prices, call times). Aim for 15 minutes on positive replies.
2. **Approval queue.** `J`/`K` move, `A` approves, `E` edits (`⌘↵` saves), `S` skips. A draft with a banned phrase, an empty `{{hook}}` or another blank cannot be approved. Approved emails get the next free slot in the send window.
3. **Instagram DMs.** Copy the text, open the DM, send it from your phone, then “Mark as sent”. Instagram is never automated.
4. **Follow-ups & reminders** (stale conversations, quotes without an answer, FAM rides, nurture dates) and **Research next** (highest-priority prospects still missing an email or hook).

## Adding prospects

- **Add prospects → From a website link:** paste the planner's own website. The function reads the public homepage and contact page for email, phone, Instagram, venues and town; with a Gemini key it drafts a hook and quotes the sentence it is based on. Instagram links only fill in the handle, and listing sites (Matrimonio.com, WeddingWire) are not fetched, per their terms.
- **Quick add**, **CSV import** (with duplicate check by email, domain, Instagram and name) and a **bookmarklet** for one-click adds from any planner's site.
- A prospect stays in **Researching** until it has a verified email and a hook. **Mark Ready** and the intro email is drafted for approval.

## The cadence

| Step | Day | Channel | Notes |
|---|---|---|---|
| T1 intro | 0 | Email | Ask only: “May I send our 1-page rate card?” A/B subject. |
| T2 DM | 3 | Instagram | Sent by hand. Skipped automatically if there is no handle. |
| T3 follow-up | 8 | Email, same thread | Late-night villa shuttle. |
| T4 breakup | 14 | Email, same thread | Closes the loop. |

- Any real reply stops the cadence for good. Out-of-office replies pause it until the return date.
- Bounce, “stop”, “remove me” or a plain “no” → Do Not Contact; nothing is ever drafted or sent again.
- “Not now / next season” → Nurture until 1 October next year, or the month they name.
- Sends only Tue–Thu 09:00–11:30 recipient time, never on Italian holidays or 7 December. Warm-up starts at 6 emails a day (+3 a week, up to 12), halved May–September (season mode “auto”). Auto-pause above 3% bounces. Kill switch in Settings.
- Every step needs approval until you switch it off per step (Sequence & templates).

## Setup (one-time)

Already done: database schema and seed (22 planners and venues from the brief, contacts empty), templates, edge functions deployed, sign-in redirect URLs, cron secret.

1. **GitHub Pages** (repo owner): Settings → Pages → Deploy from branch → `main` / root.
2. **Mailbox and integrations** (project owner), from the repo folder:
   ```bash
   supabase secrets set --project-ref qjarhdrrbjeeqbhfgmnp \
     OUTREACH_SMTP_HOST=smtp.example.com OUTREACH_SMTP_PORT=465 \
     OUTREACH_SMTP_USER=booking@dorogo.eu OUTREACH_SMTP_PASS='…' \
     OUTREACH_IMAP_HOST=imap.example.com OUTREACH_IMAP_SENT_FOLDER=Sent \
     GEMINI_API_KEY='…' \
     OUTREACH_TELEGRAM_BOT_TOKEN='…' OUTREACH_TELEGRAM_CHAT_ID='…' OUTREACH_TELEGRAM_SECRET="$(openssl rand -hex 16)"
   ```
   For Google Workspace use `smtp.gmail.com` / `imap.gmail.com` with an app password.
3. **Scheduler:** run `supabase/setup/cron.sql` in the SQL editor with the cron secret filled in. (Chris has a filled-in copy at `supabase/setup/cron.local.sql`, which is not committed.)
4. **Telegram webhook** (only if Telegram is used):
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d url=https://qjarhdrrbjeeqbhfgmnp.supabase.co/functions/v1/outreach-telegram \
     -d secret_token=<OUTREACH_TELEGRAM_SECRET>
   ```
5. **Rate card:** Settings → Rate card PDF → upload `Dorogo_Wedding_Partner_Rate_Card_2026.pdf`.
6. **Team:** add people with `insert into public.allowed_users (email) values ('name@dorogo.eu');`

Settings → Mailbox & integrations shows what is connected and lets you test SMTP, sync the inbox or send the digest by hand.

### Environment variables (edge function secrets)

| Name | Needed for |
|---|---|
| `OUTREACH_SMTP_HOST`, `_PORT`, `_USER`, `_PASS` | Sending. Without them approved emails wait for “Open in mail” + “Mark sent”. |
| `OUTREACH_IMAP_HOST`, `_PORT` (993), `_USER`, `_PASS` | Reply, bounce and out-of-office detection (defaults to the SMTP login). |
| `OUTREACH_IMAP_SENT_FOLDER` | Optional: copy sent outreach into the mailbox's Sent folder. |
| `OUTREACH_FROM_EMAIL` | Optional override of the From address in Settings. |
| `GEMINI_API_KEY`, `OUTREACH_GEMINI_MODEL` | Hooks from websites, AI rewrites, unclear replies (default `gemini-2.5-flash`). |
| `OUTREACH_TELEGRAM_BOT_TOKEN`, `_CHAT_ID`, `_SECRET` | Alerts, 08:30 digest, approve/skip buttons. |
| `OUTREACH_CRON_SECRET` | Set. Authenticates pg_cron calls. |
| `OUTREACH_APP_URL` | Set. Links in Telegram messages. |

## Development

```bash
npm test                        # 37 unit tests: sequence engine, copy-lint, classifier, stats, CSV, extraction
python3 -m http.server 8080     # open http://localhost:8080/#demo
node scripts/gen-migration.mjs  # rebuild the seed migration after editing supabase/schema.sql or the core
supabase db push                # apply migrations
supabase functions deploy outreach-api --no-verify-jwt --use-api   # same for outreach-cron, outreach-telegram
```

No build step: the app is plain ES modules. `config.js` holds the Supabase URL and the publishable key, which is safe to publish because Row Level Security only lets `allowed_users` read or write. The secret key and mailbox passwords exist only as function secrets.

## Files

```
index.html, config.js            app entry
app/                             store (Supabase or demo), actions, views, styles
supabase/functions/_shared/core  shared rules: sequence, lint, classify, drafts, stats, prospects, rate card
supabase/functions/_shared       server helpers: mail (SMTP/IMAP), AI (Gemini, versioned prompts), jobs, Telegram
supabase/functions/outreach-*    edge functions
supabase/schema.sql              schema; supabase/migrations/ applied migrations
supabase/setup/cron.sql          scheduler setup
tests/                           node --test suites
DECISIONS.md                     choices made and why
```
