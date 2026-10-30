# 🤝 DOROGO Partner Onboarding & Engineering Guide

> **Welcome to the DOROGO Partner Outreach & Fleet Intelligence Infrastructure.**  
> This guide explains how the system works end-to-end, how to run it locally on your computer, why a dedicated email domain/subdomain is strongly recommended, and how to build out your own isolated **Event & MICE Outreach** vertical with zero risk to existing Wedding or Bus operations.

---

## ⚡ Quick Access Status for Partner
- **Authorized Login Email**: `traciuc04@gmail.com`  
  *(Already whitelisted in Supabase `allowed_users` with full Row-Level Security permissions. You can log in immediately via Magic Link / OTP without needing to create a new account).*
- **GitHub Repository**: [`dimatrc18/Wedding-planners-outreach`](https://github.com/dimatrc18/Wedding-planners-outreach)  
  *(Collaborator invite sent to `@Igrik04`).*
- **Current Test Suite**: **168 passing tests**, 0 failures (`npm test`).
- **Pre-Built Dedicated Vertical**: Route `#event_partners` is already scaffolded and live in the dashboard navigation bar.

---

## 🏛 1. High-Level System Architecture

The DOROGO platform is a zero-friction, production-tested outreach and mobility operating system built on five integrated layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. FRONTEND DASHBOARD (app/)                          │
│  • Single-Page App (Vanilla ES Modules, Zero Build Step, Zero NPM Bloat)   │
│  • Stripe Sail UI Design System: crisp typography, data tables, calculators │
│  • 3 Isolated Verticals in Sidebar:                                         │
│    - 💍 Wedding Outreach (#prospects, #today, #pipeline, #visibility)       │
│    - 🚌 Bus Fleet Network (#bus-partners, #fleet-showcase)                  │
│    - 🎪 Event & MICE Outreach (#event_partners) [YOUR WORKSPACE]            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Realtime Queries & REST (RLS Protected)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. BACKEND & SUPABASE (supabase/)                        │
│  • Postgres Database (Row-Level Security, allowed_users gatekeeper)         │
│  • Deno Serverless Edge Functions:                                          │
│    - outreach-api: UI actions, quote calculation, manual approvals         │
│    - outreach-cron: automated warm-up sending, IMAP inbox sync, escalations │
│  • Triple-Tier Email Deliverability Router: ZeroBounce -> DeBounce -> MV    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SMTP / IMAP Transmissions
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                 3. REPUTATION & COMMUNICATION CHANNELS                      │
│  • Dedicated Mailbox (Hostinger SMTP / IMAP with TLS & SPF/DKIM/DMARC)      │
│  • Zero-Bounce Policy (hard gate: unverified mailboxes never sent)          │
│  • Telegram Bot Alerts: real-time notifications ONLY on human replies       │
│  • Silent Outgoing Policy: no spam alerts on outgoing batch runs            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 2. Getting Started on Your Computer (5-Minute Setup)

You do **not** need complex container setups, Docker, or bundlers. The repository runs on standard Node.js and native browser ES modules.

### Prerequisites
- **Git**: Installed on your machine.
- **Node.js**: Version 20 or higher (`node -v`).
- **Web Browser**: Chrome, Edge, Safari, or Firefox.
- **AI Coding Editor (Strongly Recommended)**: Cursor, Windsurf, VS Code with Claude Code / Antigravity.

### Step 1: Clone the Repository & Create Your Feature Branch
Once you accept the GitHub invite sent to `@Igrik04`, clone the repo and create your own dedicated branch:
```bash
git clone https://github.com/dimatrc18/Wedding-planners-outreach.git
cd Wedding-planners-outreach

# IMPORTANT: Always work on your own branch to prevent git conflicts with Dmitri's work on main:
git checkout -b feature/event-outreach
```

### Step 2: Verify the Test Suite
Before touching any code, run the native test runner:
```bash
npm test
```
*You should see **168 passing tests** with 0 failures.*

### Step 3: Run the Local Development Server
Launch the local HTTP server:
```bash
npm run serve
# Or: npx serve .
# Or: python3 -m http.server 8080
```
Open your browser at `http://localhost:8080` (or the URL printed in terminal).  
- **Live Mode**: Sign in with `traciuc04@gmail.com` using the Supabase Magic Link / OTP.
- **Instant Demo Mode**: Or simply click **"Explore with demo data"** on the login screen to start inspecting and building the UI immediately without waiting for an email.
- **Your Workspace**: Click the **🎪 Event & MICE Outreach** section in the left sidebar to reveal your `#event_partners` pipeline.

---

## 🛡️ 3. Why a Dedicated Email Domain / Subdomain is Strongly Recommended

In cold B2B outreach, email deliverability and sender reputation are your single most important assets. Using a dedicated email address on a separate subdomain or domain for Events Outreach is critical for three specific reasons:

### Reason 1: Domain Reputation Shielding (Zero Blast Radius)
- Cold outreach to event agencies, DMC managers, and corporate planners involves testing new subject lines, new angles, and new contact lists.
- If an event campaign experiences unexpected spam reports, unsubscribes, or recipient bounces, using `dmitri@dorogo.eu` would risk degrading the sender reputation of the entire `dorogo.eu` domain.
- Protecting `dorogo.eu` is essential because it actively handles high-value wedding dispatch quotes, active passenger bookings, and mission-critical partner correspondence.
- Setting up a dedicated sending domain (e.g., `dorogo-events.eu`) or subdomain (e.g., `events.dorogo.eu`) creates an impenetrable firewall: even if an event campaign encounters strict spam filters, **the main `dorogo.eu` business domain remains 100% unaffected**.

### Reason 2: Separate Warmup Caps & Throughput Limits
- High-deliverability cold email engines require strict daily caps to remain undetectable by Gmail and Microsoft spam algorithms.
- The wedding outreach pipeline currently operates under a warm-up schedule of **6–12 emails per day**, spaced **4–11 minutes apart** during business hours (Tue–Thu).
- If both Wedding Outreach and Event Outreach shared the same `dmitri@dorogo.eu` mailbox:
  - Both campaigns would have to split the daily 12-email cap, severely throttling your outreach speed.
  - Or worse, exceeding provider sending limits would trigger Hostinger / Google rate limit bans.
- With a dedicated event mailbox, your event pipeline gets its own independent **15–25 emails/day** capacity and its own ramp-up schedule.

### Reason 3: Clean Inbox Management & Reply Ownership
- The DOROGO IMAP syncer automatically listens to incoming mailboxes to detect replies, pause cadences, and alert via Telegram.
- Wedding planners ask about lake villas, bride logistics, and vintage Alfa Romeos; event agencies ask about multi-van standby disposals, corporate invoicing, and congress shuttles.
- Keeping replies in separate inboxes ensures Dmitri answers wedding planners, while you answer event directors—with zero confusion, zero overlapping emails, and zero accidental double-replies.

### Recommended Domain Options:
- **Option A (Subdomain)**: `events.dorogo.eu` (e.g. `igor@events.dorogo.eu` or `events@events.dorogo.eu`)
- **Option B (Dedicated Domain)**: `dorogo-events.eu` or `dorogo-mobility.com`

### Required DNS Records for the Sending Domain:
| Record Type | Host | Target / Value | Purpose |
| :--- | :--- | :--- | :--- |
| **MX** | `@` | Hostinger / Google Workspace mail server | Mail reception & IMAP sync |
| **TXT (SPF)** | `@` | `v=spf1 include:_spf.yourprovider.com ~all` | Authenticates your sending server |
| **TXT (DKIM)** | `default._domainkey` | Cryptographic public key from your host | Signs outgoing email headers |
| **TXT (DMARC)**| `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:...` | Protects domain from spoofing |

### Configuring Your Dedicated Credentials in Supabase Secrets:
Store your credentials safely in Supabase environment secrets:
```bash
# Dmitri's Wedding Credentials (DO NOT TOUCH):
OUTREACH_SMTP_USER=dmitri@dorogo.eu
OUTREACH_SMTP_PASS=...

# Your New Dedicated Events Outreach Credentials:
EVENTS_SMTP_HOST=smtp.hostinger.com
EVENTS_SMTP_PORT=465
EVENTS_SMTP_USER=events@dorogo-events.eu  # Or igor@events.dorogo.eu
EVENTS_SMTP_PASS=...
EVENTS_IMAP_HOST=imap.hostinger.com
EVENTS_IMAP_PORT=993
EVENTS_IMAP_USER=events@dorogo-events.eu
EVENTS_IMAP_PASS=...
```

---

## ⚙️ 4. How the Current System Works End-to-End

Understanding the lifecycle of a contact from discovery to signed booking:

### Layer A: The Frontend UI (`app/`)
- Built in pure Vanilla ES Modules (`import`/`export`).
- No build command (`webpack`, `vite`, `babel`) is needed; browsers load native ES modules directly.
- The sidebar router in [`app/main.js`](file:///Users/User/Downloads/Wedding-planners-outreach/app/main.js) organizes the dashboard into three distinct sections:
  1. 💍 **Wedding Outreach**: `#prospects` (CRM), `#today` (action queue), `#pipeline` (funnel), `#visibility` (AI search presence).
  2. 🚌 **Bus Fleet Outreach**: `#bus-partners` (41 verified operators), `#fleet-showcase` (interactive rate calculator & fleet ledger).
  3. 🎪 **Event & MICE Outreach**: `#event_partners` (your specialized event agency table with metrics, filters, and add/edit modals).
- Reactive store in [`app/store.js`](file:///Users/User/Downloads/Wedding-planners-outreach/app/store.js) synchronizes Supabase data with local caching so views load instantly.

### Layer B: The Deliverability Gatekeeper (`supabase/functions/_shared/verify.ts`)
Under our **Zero-Bounce Policy**, cold outreach emails are never transmitted without prior validation:
1. When an email is queued, it passes through our triple-tier verification cascade:
   - **Tier 1 (ZeroBounce)**: Primary verification engine.
   - **Tier 2 (DeBounce)**: Automated failover if credits or timeouts occur.
   - **Tier 3 (MillionVerifier)**: Final authority gate.
2. If an email is marked `invalid`, `spamtrap`, `abuse`, or `disposable`, it is quarantined. It will never be sent, preserving our 99%+ deliverability score.

### Layer C: The Dispatch & Cadence Engine (`supabase/functions/outreach-cron/`)
- A scheduled cron job runs every 10 minutes on Supabase Edge Functions (Deno).
- For scheduled contacts, it verifies:
  - Is the global `kill_switch` off?
  - Is today an allowed sending day (Tue–Thu)?
  - Is the current time within European business hours (09:00–18:00 Europe/Rome)?
  - Has the daily sending cap been reached?
- Each email is dispatched with human-like random jitter (4–11 minutes between individual sends).
- **Silent Outgoing Policy**: Outgoing emails do **not** trigger Telegram alerts, preventing notification noise.

### Layer D: Inbound Reply Sync & Instant Telegram Alerts
- The cron worker runs `syncInbox` via IMAP every 10 minutes.
- When an agency replies:
  1. It fetches the email and strips quoted text (`stripQuoted`).
  2. It classifies the intent: `positive`, `quote_requested`, `has_supplier`, `out_of_office`, `unsubscribe`.
  3. It automatically updates the contact status to `replied` and pauses any automated follow-up sequence.
  4. It sends an **instant high-priority Telegram alert** directly to your phone with the agency's name, message snippet, and quick links to review and reply.

---

## 🧩 5. How to Copy and Adapt the System for Your Event Vertical

The foundation is already built for you. Here is how you can customize it for your specific vision:

### Step 1: Open and Explore `#event_partners`
Navigate to `#event_partners` in the dashboard. You will see:
- 4 Stripe Sail KPI metric cards (Total Agencies, Need Review, In Contact, Confirmed Partners).
- Specialization tabs (All, Fashion & Luxury, Corporate & Summits, DMC & Incoming, Sports & Media).
- A table pre-loaded with **7 verified Milan event agencies** (`data/event_planners.json`).
- An "Add Event Agency" modal and CSV Export functionality.

### Step 2: Add or Import Your Target Event Agencies
- You can add agencies one by one using the interactive modal in the UI.
- Or you can edit [`data/event_planners.json`](file:///Users/User/Downloads/Wedding-planners-outreach/data/event_planners.json) directly with your curated list of agencies.

### Step 3: Customize Event Email Templates & Cadence
In [`supabase/functions/_shared/jobs.ts`](file:///Users/User/Downloads/Wedding-planners-outreach/supabase/functions/_shared/jobs.ts), the `sendDueEvents()` function handles sending for the `event_planners` table:
- You can design tailored B2B Italian or English copy specifically for event organizers (e.g. focusing on VIP guest shuttles, multi-day standby vans, late-night gala departures, and luggage logistics).
- Templates should use our clean token interpolation (`{{name}}`, `{{contact_person}}`, `{{base_city}}`).

### Step 4: Hook Up Your Dedicated Mailbox
Once your domain or subdomain DNS is active:
- Set `EVENTS_SMTP_USER`, `EVENTS_SMTP_PASS`, `EVENTS_SMTP_HOST` in your Supabase project settings.
- The cron worker `events_send` will automatically route through your mailbox.

---

## 🎙️ 6. The Mandatory AI Intake Protocol (Run `/grill-me` First)

When you open this repository in your AI coding tool (Cursor, Windsurf, Claude Code, or Antigravity), **do not start by writing code or guessing features**.

Instead, your AI agent must execute this **3-Step Intake & Interview Protocol**:

### Step A: The 5-Sentence Deep Dive (Mandatory Intake)
Before touching any file, prompt your AI assistant:
> *"I am starting my new Event & MICE Outreach vertical on DOROGO. Before we write any code, interview me so I describe my project in 5 sentences with as many details as possible."*

You should answer covering:
1. **Target Clients & Niches**: Exactly what event agencies, production houses, MICE planners, or luxury brands are you targeting?
2. **Mobility Services & Vehicles**: What fleet classes will you promote (Mercedes V-Class 7–8 pax VIP, Sprinters 8–16 pax, luxury coaches 30–54 pax, standby disposals)?
3. **Pricing & Commission Model**: Are you offering fixed route transfers (e.g. Malpensa–Milan), hourly standby packages (4h/8h), net B2B wholesale rates, or agency commissions?
4. **Outreach Angle & Tone**: What is your hook? Emergency peak-week backup fleet? Direct bilingual 24/7 dispatch? What language (Italian vs English)?
5. **30/60-Day Success Goals**: How many active agency relationships or monthly bookings are you aiming to secure?

---

### Step B: The Infrastructure Leverage Assessment (How Much to Borrow?)
Your AI assistant must evaluate **how much of Dmitri's existing Wedding and Bus infrastructure you need to leverage**, and recommend the best setup:

| Infrastructure Layer | What You Get | Recommended When |
| :--- | :--- | :--- |
| **Option 1: 100% Isolated Pipeline** (`#event_partners`) | Clean slate. Reuses only the core engine (ZeroBounce router, Deno cron scheduler, Stripe Sail UI, anti-flood protection). Zero risk to anything else. | **Best default** for corporate congresses, brand galas, fashion week, and incoming DMCs. |
| **Option 2: Event + Bus Fleet Network Leverage** (`#bus-partners` & `#fleet-showcase`) | Connects your event agencies directly to our **41 verified Northern Italy coach operators** and live WhatsApp rate ledger (Vincenzo's rates: 19–54 pax coaches, top Sprinters, airport transfers, standby rates). | **Strongly recommended** if your events require group guest shuttles, multi-coach congress motorcades, or VIP Sprinter transfers. You get instant quoting power without having to scout bus operators yourself! |
| **Option 3: Event + Wedding Cross-Over** (`#prospects`) | Cross-references high-end destination wedding planners on Lake Como who also produce multi-day private anniversary celebrations, luxury brand retreats, and VIP family buyouts. | Useful for dual-hat agencies producing both weddings and luxury private corporate galas. |

> **AI Recommendation**: Start with **Option 2** (Isolated Event Pipeline + Bus Fleet Network Leverage). This gives you complete isolation for your outreach, but full access to our pre-negotiated Northern Italy coach network and live quote ledger when your event clients ask for 19–54 seat buses!

---

### Step C: Deep Architectural Interview (`/grill-me`)
Once you provide your 5 sentences and select your leverage level, instruct your AI:
> *"/grill-me on every detail of my Event Outreach vertical. Ask me questions one by one, walk down each branch of the design tree, and provide your recommended answer for each question based on the Northern Italy luxury mobility market."*

#### Key Questions the AI Will Grill You On:
1. **Agency Categorization**: Do you want specialization tabs in `#event_partners` for Fashion/Luxury, Corporate MICE, DMC Incoming, and Sports/Media, or custom tags?
2. **Quote Calculator**: Do you need a dedicated Event Standby & Disposal Calculator embedded in your view (e.g. 4-hour and 8-hour disposal packages with ZTL and VAT toggles)?
3. **Outreach Sequence Cadence**: What touch cadence do you want (T1 Intro $\rightarrow$ T2 Follow-up 4 days later $\rightarrow$ T3 Call/WhatsApp), and should it send Tuesday–Thursday?
4. **Custom Table Columns**: What extra fields do you need in the table (e.g. annual event volume, key decision-maker LinkedIn, WhatsApp number)?

Once the `/grill-me` session resolves these decisions, your AI assistant will implement your vertical with 100% precision on the very first attempt.

---

## 🔒 7. The 4 Golden Rules of Isolation (Zero Blast Radius)

To ensure that both Dmitri's wedding outreach and your event outreach thrive without interfering with each other:

1. **NEVER modify or query the `prospects` table** for event leads. The `prospects` table is reserved 100% for Wedding Planners.
2. **NEVER modify or query the `bus_partners` table** for event leads. The `bus_partners` table is reserved 100% for Northern Italy coach and bus operators.
3. **NEVER send emails from `dmitri@dorogo.eu`** for event campaigns. All event outreach must use your dedicated events domain or subdomain (`EVENTS_SMTP_USER`).
4. **NEVER bypass email verification**. Under our Zero-Bounce Policy, unverified or risky email addresses must never receive cold outreach.

### 🗺️ File Ownership & Conflict-Free Boundaries:
| File / Directory | Status | Owner | Rules |
| :--- | :--- | :--- | :--- |
| `data/event_planners.json` | 🟢 **Safe Zone** | Igor | Your seed database of event agencies. Edit freely. |
| `app/event_planners_data.js` | 🟢 **Safe Zone** | Igor | Your caching & helper logic. Edit freely. |
| `app/views/event_partners.js` | 🟢 **Safe Zone** | Igor | Your UI view (#event_partners). Customize tables, modals, filters. |
| `tests/event_partners.test.js` | 🟢 **Safe Zone** | Igor | Your automated test suite. Add new tests for your features. |
| `supabase/functions/_shared/jobs.ts` (`sendDueEvents`) | 🟢 **Safe Zone** | Igor | Only modify the `sendDueEvents()` function. |
| `supabase/migrations/20261030220000_event_planners.sql` | 🟢 **Safe Zone** | Igor | Your Supabase database table schema & seed migration. |
| `app/views/prospects.js`, `today.js`, `pipeline.js` | 🔴 **Forbidden** | Dmitri | Active Wedding CRM. Never modify. |
| `app/views/bus_partners.js`, `fleet_showcase.js` | 🔴 **Forbidden** | Dmitri | Bus Fleet & WhatsApp rate ledger. Never modify. |
| `data/bus_partners.json` | 🔴 **Forbidden** | Dmitri | Verified coach operator data. Never modify. |
| `jobs.ts` (`sendDue()`, `sendDueBuses()`, `syncInbox()`) | 🔴 **Forbidden** | Dmitri | Live wedding & bus sending cron. Never modify. |
| `app/main.js`, `app/styles.css`, `app/store.js` | 🟡 **Shared** | Coordinate | App routing & global store. Inform Dmitri before altering core logic. |

---

## 🗄️ 8. Database & Cloud Sync (Supabase)

- **Offline / Local Development Works Out-of-the-Box**: `app/event_planners_data.js` automatically uses `data/event_planners.json` and local storage cache, so you can test and build immediately without connecting to Supabase.
- **Production Supabase Migration**: When you want live cloud database syncing, run the migration file [`supabase/migrations/20261030220000_event_planners.sql`](file:///Users/User/Downloads/Wedding-planners-outreach/supabase/migrations/20261030220000_event_planners.sql) in the Supabase SQL Editor. It creates the `event_planners` table, Row-Level Security policies for `allowed_users`, triggers, and seed records.

---

## 🧪 9. Pre-Flight Checklist Before Committing or Merging

Before you commit your changes or merge into `main`:

```bash
# 1. Verify all 168 tests pass:
npm test

# 2. Check git status to ensure you did not accidentally touch Wedding/Bus files:
git status

# 3. Push your feature branch:
git push origin feature/event-outreach
```

### Emergency Kill Switch
If you ever need to pause all automated outgoing email activity across the entire system for maintenance, set the global flag in Supabase:
```json
{ "kill_switch": true }
```
This immediately freezes all scheduled sends across all crons without deleting any data.

---

## 🤝 Contacts & Coordination
- **Dmitri Traciuc**: Senior Dispatcher / Architecture Lead (`dmitri@dorogo.eu`)
- **Igor Traciuc**: Partner / Event & MICE Outreach Lead (`traciuc04@gmail.com`)
