# 🤖 DOROGO System Playbook & AI Agent Specification

> **For AI Assistants (Cursor, Windsurf, Claude Code, Antigravity, Copilot, ChatGPT):**  
> This file contains the complete system architecture, coding guidelines, safety guardrails, and step-by-step blueprint for building new outreach verticals (e.g., Events, Corporate, MICE) using the existing DOROGO engine.

---

## 🧭 1. Architectural File Anatomy

```
/
├── app/                                 # 100% Vanilla JS Frontend (ES Modules, Zero Build Step)
│   ├── main.js                          # Hash-based router (#prospects, #bus-partners, #event_partners)
│   ├── styles.css                       # Stripe Sail Design System (CSS variables, tables, badges)
│   ├── bus_partners_data.js             # Offline fallback data & partner records for bus fleet
│   ├── event_planners_data.js           # Offline fallback data & partner records for event agencies
│   └── views/                           # View controllers
│       ├── prospects.js                 # Wedding Planners CRM view
│       ├── bus_partners.js              # Bus & Fleet Partners CRM view
│       ├── event_partners.js            # Event & MICE Outreach CRM view (#event_partners)
│       ├── fleet_showcase.js            # Fleet Ledger & Interactive B2B Quote Calculator
│       ├── visibility.js                # AI Search Visibility (GEO/LLMO) Tracker
│       ├── today.js                     # Daily Action Queue & Review
│       └── pipeline.js                  # Funnel pipeline view
│
├── supabase/                            # Supabase Backend & Serverless Infrastructure
│   └── functions/
│       ├── outreach-cron/index.ts       # Cron runner (runs every 10 min): warm-up, sends, IMAP inbox sync
│       ├── outreach-api/index.ts        # REST API endpoints for frontend actions
│       └── _shared/                     # Shared Deno / TypeScript business logic
│           ├── jobs.ts                  # Core orchestrator: sendDue, sendDueEvents, syncInbox, verifyEmail
│           ├── verify.ts                # Triple-Tier Router: ZeroBounce -> DeBounce -> MillionVerifier
│           ├── mail.ts                  # SMTP sender (Hostinger TLS) + IMAP Sent folder synchronization
│           ├── telegram.ts              # Real-time notifications (strictly for human replies)
│           └── core/                    # Pure ESM business logic (zero dependencies, Node & browser compatible)
│               ├── constants.js         # Settings, funnel stages, signatures, lake venues
│               ├── bus_scoring.js       # 4-pillar 100-point relevance scoring for fleet operators
│               └── ...
│
├── data/                                # Master Seed & Verified JSON Datasets
│   ├── bus_partners.json                # Seed database of Northern Italy bus/coach operators
│   ├── event_planners.json              # Seed database of verified Milan event agencies
│   └── ground_truth_fleet_audit.json    # Verified fleet capacities, unbranded photos & websites
│
├── tests/                               # Comprehensive Automated Test Suite (Native node:test)
│   ├── bus_partners.test.js             # Bus scoring, schedule invariant, copy-lint tests
│   ├── event_partners.test.js           # Event data integrity, CRUD isolation, and SMTP safety tests
│   ├── fleet_ledger_ui.test.js          # Table geometry, calculator quotes, VAT tests
│   ├── outreach_scenarios.test.js       # End-to-end inbound reply classification tests
│   └── sequence.test.js                 # Anti-flood, cadence, market balancer tests
│
├── index.html                           # Single-page HTML shell
├── package.json                         # Scripts ("test": "node --test tests/*.test.js")
├── PARTNER_ONBOARDING.md                # Human onboarding guide
└── AI_AGENT_PLAYBOOK.md                 # THIS FILE (System reference for AI assistants)
```

---

## 🧠 2. The Core DOROGO "Brain" Framework

Any new outreach vertical implemented in this codebase **must** utilize the established core engine components:

### A. Triple-Tier Deliverability Router (`supabase/functions/_shared/verify.ts`)
Under our **Zero-Bounce Policy**, cold outreach emails are never transmitted without prior validation:
- **Tier 1 (ZeroBounce)**: Primary verification engine.
- **Tier 2 (DeBounce)**: Automated failover if Tier 1 credits expire or timeout occurs.
- **Tier 3 (MillionVerifier)**: Final authority gate.
- *Gatekeeper*: Emails marked `invalid`, `disposable`, or `catch_all_unverified` are automatically quarantined to prevent domain blacklisting.

### B. Anti-Flood & Deduplication Shield (`supabase/functions/_shared/jobs.ts`)
To prevent accidental email flooding (e.g., spamming the same recipient twice):
1. **24-Hour Recipient Cooldown**: The engine checks whether the target recipient was contacted within the last 24 hours.
2. **In-Batch Deduplication**: `sentRecipientsThisRun` and `sentProspectsThisRun` prevent concurrent sends within the same cron cycle.
3. **Step State Locks**: Non-draft touches cannot be re-sent or duplicated.

### C. Sentiment & Intent Reply Classifier (`supabase/functions/_shared/jobs.ts`)
When incoming emails are fetched via IMAP:
- Strip quoted reply text (`core.stripQuoted`).
- Automatically detect: `positive`, `neutral`, `quote_requested`, `has_supplier`, `out_of_office`, `unsubscribe`.
- If human intervention is required, hold the draft and trigger a Telegram alert.

### D. Silent Outgoing / Loud Inbound Telegram Policy
- **Outgoing emails**: Run silently in the background (`notify_outreach_sent: false`). No Telegram spam on batch sends.
- **Inbound replies**: Trigger immediate high-priority Telegram alerts with the sender's quote, extracted parameters, and one-click action buttons.

---

## 🎨 3. The Stripe Sail Design System

The frontend UI uses a custom **Stripe Sail Design System** written in pure CSS (`app/styles.css`). When building new views, use existing classes:

| Component | HTML / CSS Pattern | Usage |
| :--- | :--- | :--- |
| **Data Table** | `<div class="sail-table-wrap"><table class="sail-table">` | Single-screen fit table with zero horizontal scroll on desktop. |
| **Table Headers** | `<div class="sail-th-title">Title</div><div class="sail-th-sub">Subtitle</div>` | Prevents text overlap and maintains hierarchy. |
| **Status Pills** | `<span class="sail-pill info">`, `ok`, `missing`, `warn` | Clean status tags (e.g., `8 pax`, `Verified`, `Pending`). |
| **Rate Grid** | `<div class="sail-rate-grid"><span class="sail-rate-route">...</span><span class="sail-rate-amt">...</span></div>` | Displays route prices cleanly without clipping. |
| **Stat Cards** | `<div class="sail-card"><div class="sail-stat-val">...</div><div class="sail-stat-meta">...</div></div>` | Metric overviews and KPIs. |
| **Buttons** | `<button class="sail-btn xs primary">`, `.sail-btn sm`, `.sail-btn default` | Crisp, interactive buttons. |

---

## 🏗️ 4. Status of the "Events & MICE Outreach" Module

The core scaffolding for the **Events & MICE Outreach** pipeline has already been implemented with strict isolation (Zero Blast Radius):

### What is Already Built and Tested (168 Passing Tests):
1. **Database & Seed Data**:
   - `data/event_planners.json`: Pre-loaded with 7 verified Milan event & production agencies.
   - `app/event_planners_data.js`: Caching, local storage fallbacks, specialization categories.
2. **Frontend CRM View (`app/views/event_partners.js`)**:
   - Live at route `#event_partners` (categorized in sidebar under "🎪 Event & MICE Outreach").
   - 4 Stripe Sail KPI cards, agency specialization pills, search filtering, "Add Event Agency" modal, and CSV export.
3. **Data Store Isolation (`app/store.js`)**:
   - Dedicated store slice `S.eventPartners` with reactive helpers (`addEventPartner`, `updateEventPartner`, `removeEventPartner`).
   - Strictly isolated from `S.prospects` (Weddings) and `S.busPartners` (Buses).
4. **Backend Edge Function Scaffolding (`supabase/functions/_shared/jobs.ts`)**:
   - `sendDueEvents()` reads strictly from `event_planners` and enforces dedicated `EVENTS_SMTP_USER`. Throws hard errors if `dmitri@dorogo.eu` is attempted.
   - `outreach-cron` includes the isolated `events_send` job.
5. **Automated Verification (`tests/event_partners.test.js`)**:
   - Verified data schema, CRUD isolation, and backend SMTP safety checks.

---

## 🎙️ 5. Next Steps for AI Assistants: Mandatory 3-Step Intake (Run `/grill-me` First!)

If you are an AI assistant helping Igor Traciuc expand this vertical:
**DO NOT GUESS OR WRITE UNCHECKED CODE.**

Before modifying or adding code, execute this mandatory **3-Step Intake Protocol**:

### Step 1: The 5-Sentence Deep Dive (Intake)
Ask Igor to describe his project in **5 detailed sentences**:
1. What exact event agency niches, production houses, or corporate brands is he targeting?
2. What vehicle fleet classes will he promote (V-Class, Sprinters, large coaches, standby disposals)?
3. What is his pricing/rate model (fixed route transfers, 4h/8h standby packages, wholesale B2B net rates)?
4. What is his outreach angle, hook, and preferred language (Italian vs English)?
5. What are his 30-to-60 day partner acquisition and volume goals?

### Step 2: Infrastructure Leverage Assessment (How Much to Borrow?)
Ask Igor how much of Dmitri's existing Wedding and Bus infrastructure he wants to leverage, and guide him:
- **Option 1 (100% Isolated)**: Independent `#event_partners` pipeline. Only reuses core dispatch/verification engine.
- **Option 2 (Event + Bus Fleet Leverage - RECOMMENDED)**: Connects his event agencies to our **41 Northern Italy bus/coach network** (`#bus-partners`) and live WhatsApp quote ledger (`#fleet-showcase` with Vincenzo's rates) so he can instantly quote 19–54 passenger luxury coaches for large event shuttles.
- **Option 3 (Event + Wedding Cross-Over)**: Cross-references luxury wedding planners on Lake Como who also produce multi-day private corporate retreats and galas.

### Step 3: Deep Architectural Interview (`/grill-me`)
Walk down each branch of the design tree, resolving dependencies one by one. For each question, provide a recommended answer based on Northern Italy luxury mobility market standards:
1. **Agency Specialization**: Configure tabs in `#event_partners` (Fashion/Luxury, Corporate MICE, DMC Incoming, Sports/Media).
2. **Event Standby Calculator**: Whether to embed a custom 4h/8h Standby & Disposal Calculator with Milan ZTL Area C and VAT toggles.
3. **Outreach Cadence**: Exact step delays (e.g. T1 Intro $\rightarrow$ T2 Follow-up 4 days later $\rightarrow$ T3 Call/WhatsApp), restricted to Tuesday–Thursday.
4. **Table Columns & Metadata**: Custom fields (event budget tiers, direct WhatsApp contact, decision-maker LinkedIn).

---

## 🔒 6. The 4 Golden Rules of Isolation (Strictly Enforced)

1. **NEVER modify or query the `prospects` table** for event leads. The `prospects` table is reserved 100% for Wedding Planners.
2. **NEVER modify or query the `bus_partners` table** for event leads. The `bus_partners` table is reserved 100% for Northern Italy coach and bus operators.
3. **NEVER send emails from `dmitri@dorogo.eu`** for event campaigns. All event outreach must use the dedicated events domain or subdomain (`EVENTS_SMTP_USER`).
4. **NEVER bypass email verification**. Under our Zero-Bounce Policy, unverified mailboxes must never be emailed.

### 🗺️ AI File Ownership Matrix:
| File / Directory | Status | Permission |
| :--- | :--- | :--- |
| `data/event_planners.json` | 🟢 Safe Zone | Edit and expand freely |
| `app/event_planners_data.js` | 🟢 Safe Zone | Edit and expand freely |
| `app/views/event_partners.js` | 🟢 Safe Zone | Edit and customize UI |
| `tests/event_partners.test.js` | 🟢 Safe Zone | Add new tests for event features |
| `supabase/functions/_shared/jobs.ts` (`sendDueEvents`) | 🟢 Safe Zone | Customize sending logic for events |
| `supabase/migrations/20261030220000_event_planners.sql` | 🟢 Safe Zone | Database schema for event partners |
| `app/views/prospects.js`, `today.js`, `pipeline.js` | 🔴 Forbidden | DO NOT TOUCH (Wedding CRM) |
| `app/views/bus_partners.js`, `fleet_showcase.js` | 🔴 Forbidden | DO NOT TOUCH (Bus Fleet CRM) |
| `data/bus_partners.json` | 🔴 Forbidden | DO NOT TOUCH (Bus data) |
| `jobs.ts` (`sendDue()`, `sendDueBuses()`, `syncInbox()`) | 🔴 Forbidden | DO NOT TOUCH (Core dispatch engine) |

---

## 📋 7. Master AI System Prompt (Copy & Paste for Your Agent)

*Copy the text below into your AI editor (Cursor, Windsurf, Claude Code, or Antigravity) to begin development:*

```markdown
You are an expert full-stack engineer and AI assistant working on the DOROGO Partner Outreach repository for Igor Traciuc.

TASK:
Customize and scale the "Events & MICE Outreach" pipeline (#event_partners) according to Igor's business needs.

FIRST STEP (MANDATORY INTAKE):
Before writing any code or modifying files, conduct this 3-step intake with Igor:
1. Ask Igor to describe his project in 5 detailed sentences (target niches, vehicle classes, pricing model, outreach angle, conversion targets).
2. Ask Igor how much of Dmitri's existing Wedding and Bus infrastructure he wants to leverage. Recommend Option 2 (Event Outreach + Bus Fleet Network leverage for 19–54 pax coach quoting power).
3. Run an interactive `/grill-me` session asking questions one by one with your recommended answers to finalize agency categories, calculator widgets, email templates, and table columns.

STRICT CONSTRAINTS & ISOLATION PRINCIPLES:
1. Zero Blast Radius: Do NOT modify or rename existing tables (`prospects`, `bus_partners`, `touches`).
2. Design Fidelity: All UI in `app/views/event_partners.js` MUST use the Stripe Sail design system defined in `app/styles.css` (`.sail-table`, `.sail-pill`, `.sail-btn`, `.sail-card`).
3. Zero-Bounce Deliverability: Connect to `verifyEmailUnified` in `supabase/functions/_shared/verify.ts`.
4. Dedicated Email Pipeline: Use `EVENTS_SMTP_USER` and `EVENTS_SMTP_PASS` from environment variables. NEVER use `dmitri@dorogo.eu`.
5. Git Branching: Work exclusively on `feature/event-outreach`, never commit directly to `main`.
6. Testing: All 168 tests in `tests/` MUST pass (`npm test`) before creating any commit.
```
