# 🤖 DOROGO System Playbook & AI Agent Specification

> **For AI Assistants (Cursor, Windsurf, Claude Code, Antigravity, Copilot, ChatGPT):**  
> This file contains the complete system architecture, coding guidelines, safety guardrails, and step-by-step blueprint for building new outreach verticals (e.g., Events, Corporate, MICE) using the existing DOROGO engine.

---

## 🧭 1. Architectural File Anatomy

```
/
├── app/                                 # 100% Vanilla JS Frontend (ES Modules, Zero Build Step)
│   ├── main.js                          # Hash-based router (#prospects, #bus-partners, #fleet-showcase)
│   ├── styles.css                       # Stripe Sail Design System (CSS variables, tables, badges)
│   ├── bus_partners_data.js             # Offline fallback data & partner records
│   └── views/                           # View controllers
│       ├── prospects.js                 # Wedding Planners CRM view
│       ├── bus_partners.js              # Bus & Fleet Partners CRM view
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
│           ├── jobs.ts                  # Core orchestrator: sendDue, syncInbox, verifyEmail
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
│   └── ground_truth_fleet_audit.json    # Verified fleet capacities, unbranded photos & websites
│
├── tests/                               # Comprehensive Automated Test Suite (Native node:test)
│   ├── bus_partners.test.js             # Bus scoring, schedule invariant, copy-lint tests
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

## 🏗️ 4. Blueprint for Scaffolding the New "Events" Module

To add the new **Events Outreach** pipeline without touching or risking Wedding Planners or Bus Partners, the AI agent must implement the following 6 steps:

### Step 1: Create Database Table & Fallback Seed Data
1. In Supabase Postgres, create `event_planners`:
   ```sql
   CREATE TABLE event_planners (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     agency_type TEXT, -- e.g. corporate, fashion, gala, mice
     contact_person TEXT,
     email TEXT,
     phone TEXT,
     website TEXT,
     base_city TEXT,
     relevance_score INT DEFAULT 70,
     status TEXT DEFAULT 'TO_REVIEW', -- TO_REVIEW | WANT_TO_CONTACT | CONTACTED | APPROVED_PARTNER
     score_breakdown JSONB DEFAULT '{}'::jsonb,
     notes TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. Create seed file: `data/event_planners.json` and fallback exporter: `app/event_planners_data.js`.

### Step 2: Implement Isolated Core Scoring & Templates
Create `supabase/functions/_shared/core/events_scoring.js`:
- Scoring tailored to event planners (scale of events, VIP clientele, Milan/Como coverage).
- Personalized B2B email templates (T1 Intro, T2 Follow-up) tailored to luxury corporate and event transportation.
- Safe copy-linting (preventing placeholder tokens like `[Company Name]` or phone leaks).

### Step 3: Implement the Frontend View Controller
Create `app/views/events.js`:
- Export `render(el)` function.
- Render Stripe Sail metrics (Total Leads, Contacted, Replied, Conversion Rate).
- Render `.sail-table` listing event planners, contact details, status pills, and action buttons (`Contact`, `Review`, `Archive`).
- Support search filtering and status tabs (`All`, `To Review`, `Contacted`, `Replied`).

### Step 4: Register Route in `app/main.js`
In [`app/main.js`](file:///Users/User/Downloads/Wedding-planners-outreach/app/main.js):
- Add `#events` to the navigation bar.
- Add route handler in `loadRoute(hash)`:
  ```javascript
  if (hash === 'events') {
    const { render } = await import('./views/events.js');
    return render(document.getElementById('view-root'));
  }
  ```

### Step 5: Implement Dedicated Edge Function Sending Routine
In `supabase/functions/_shared/jobs.ts`:
- Add `export async function sendDueEvents(db, settings, now = new Date())`.
- Use **dedicated event credentials** (`EVENTS_SMTP_USER`, `EVENTS_SMTP_PASS`, `EVENTS_SMTP_HOST`).
- Check email deliverability with `verifyEmailUnified(email, { db })`.
- Transmit via `sendMail` and record audit log in `events_audit_logs`.
- In `supabase/functions/outreach-cron/index.ts`, add scheduled execution:
  ```typescript
  if (job === 'all' || job === 'events_send') await run('events_send', () => sendDueEvents(db, settings, now));
  ```

### Step 6: Add Automated Tests
Create `tests/event_partners.test.js`:
- Test scoring calculation.
- Test template copy-linting and token sanitization.
- Test that sending to `event_planners` never reads or writes to `prospects` or `bus_partners`.
- Run `npm test` to verify all 164 existing tests + new tests pass.

---

## 🔒 5. The 4 Golden Rules of Isolation (Strictly Enforced)

1. **NEVER modify or query the `prospects` table** for event leads. The `prospects` table is reserved 100% for Wedding Planners.
2. **NEVER modify or query the `bus_partners` table** for event leads.
3. **NEVER send emails from `dmitri@dorogo.eu`** for event campaigns. All event outreach must use the dedicated events domain/subdomain (`EVENTS_SMTP_USER`).
4. **NEVER bypass email verification**. Under our Zero-Bounce Policy, unverified mailboxes must never be emailed.

---

## 📋 6. Master AI System Prompt (Copy & Paste for Your Agent)

*Copy the text below into your AI editor (Cursor, Windsurf, Claude Code, or Antigravity) to begin development:*

```markdown
You are an expert full-stack engineer and AI assistant working on the DOROGO Partner Outreach repository.

TASK:
Implement the new "Events Outreach" pipeline according to the specifications in `AI_AGENT_PLAYBOOK.md` and `PARTNER_ONBOARDING.md`.

STRICT CONSTRAINTS & ISOLATION PRINCIPLES:
1. Zero Blast Radius: Do NOT modify or rename existing tables (`prospects`, `bus_partners`, `touches`).
2. Design Fidelity: All new UI in `app/views/events.js` MUST use the Stripe Sail design system defined in `app/styles.css` (`.sail-table`, `.sail-pill`, `.sail-btn`, `.sail-card`).
3. Zero-Bounce Deliverability: Connect to `verifyEmailUnified` in `supabase/functions/_shared/verify.ts`.
4. Dedicated Email Pipeline: Use `EVENTS_SMTP_USER` and `EVENTS_SMTP_PASS` from environment variables. Do NOT use `dmitri@dorogo.eu`.
5. Testing: Create `tests/event_partners.test.js`. All existing 164 tests in `tests/` MUST pass (`npm test`).

BEGIN BY:
1. Reading `AI_AGENT_PLAYBOOK.md` and `PARTNER_ONBOARDING.md`.
2. Inspecting `app/views/bus_partners.js` as the reference implementation.
3. Scaffolding the Events module step-by-step.
```
