# 🤝 DOROGO Partner Onboarding & Engineering Guide

> **Welcome to the DOROGO Partner Outreach & Fleet Intelligence Infrastructure.**  
> This guide explains how the system works, how to run it on your machine, how to configure your dedicated email domain, and how to add your own outreach vertical (Events, Corporate, MICE, etc.) safely without impacting the existing Wedding Planners or Bus Partners pipelines.

---

## 🏛 1. High-Level System Architecture

The DOROGO platform is a zero-friction, production-tested outreach and mobility operating system built on three core pillars:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       1. FRONTEND DASHBOARD (app/)                          │
│  • Single-Page App (Vanilla ES Modules, Zero Build Step, Zero NPM Bloat)   │
│  • Stripe Sail UI Design System: crisp typography, data tables, calculators │
│  • Routes: #prospects (Weddings), #bus-partners (Fleet), #visibility (GEO)  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Realtime Queries & REST
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    2. BACKEND & SUPABASE (supabase/)                        │
│  • Postgres Database (Row-Level Security, audit event logs)                 │
│  • Edge Functions (Deno / TypeScript):                                      │
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
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 2. Getting Started on Your Computer (5-Minute Setup)

You do **not** need complex container setups, Docker, or bundlers. The repository runs on standard Node.js and native browser ES modules.

### Prerequisites
- **Git**: Installed on your machine.
- **Node.js**: Version 20 or higher (`node -v`).
- **Web Browser**: Chrome, Edge, Safari, or Firefox.
- **AI Coding Editor (Recommended)**: Cursor, Windsurf, VS Code with Claude Code / Antigravity, or any AI assistant.

### Step 1: Clone the Repository
Ask Dmitri to invite your GitHub username as a Collaborator on the repository `dimatrc18/Wedding-planners-outreach`. Then run in your terminal:
```bash
git clone https://github.com/dimatrc18/Wedding-planners-outreach.git
cd Wedding-planners-outreach
```

### Step 2: Verify the Test Suite
Before making any changes, verify that all system tests pass:
```bash
npm test
```
*You should see 164 passing tests with 0 failures.*

### Step 3: Run the Local Development Server
Run the local HTTP server:
```bash
npm run serve
# Or: npx serve .
# Or: python3 -m http.server 8080
```
Open your browser at `http://localhost:8080` (or `http://localhost:3000`).  
The dashboard will load immediately with the live Supabase database.

---

## 🛡️ 3. Email Architecture & Reputation Safeguards (Crucial)

### Why You Must Use a Separate Domain or Subdomain
In cold B2B outreach, email deliverability and sender reputation are your most critical assets. 

1. **Strict Volume Limits**: The wedding engine already runs automated warmup caps on `dmitri@dorogo.eu` (6–12 emails/day, spaced 4–11 minutes apart).
2. **Domain Reputation Protection**: If an Events campaign encounters spam flags or unexpected bounces, a separate domain ensures **zero blast radius** to the primary `dorogo.eu` business domain.
3. **Inbox Isolation**: Event inquiries, quotes, and planner conversations stay in a dedicated mailbox without tangling wedding planner threads.

### Recommended Domain Setup:
- **Option A (Subdomain)**: `events.dorogo.eu` (e.g. `alex@events.dorogo.eu`)
- **Option B (Dedicated Domain)**: `dorogo-events.eu` or `dorogo-mobility.com`

### Required DNS Records for Your Sending Domain:
| Record Type | Host | Target / Value | Purpose |
| :--- | :--- | :--- | :--- |
| **MX** | `@` | Hostinger / Google Workspace mail server | Mail reception & IMAP sync |
| **TXT (SPF)** | `@` | `v=spf1 include:_spf.yourprovider.com ~all` | Authenticates your sending server |
| **TXT (DKIM)** | `default._domainkey` | Cryptographic public key from host | Signs outgoing email headers |
| **TXT (DMARC)**| `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:...` | Enforces policy against spoofing |

### Configuring Your Credentials in Supabase Secrets:
To keep Dmitri's wedding outreach and your event outreach completely isolated, store your credentials under dedicated environment variables:
```bash
# Dmitri's Wedding Credentials (DO NOT CHANGE):
OUTREACH_SMTP_USER=dmitri@dorogo.eu
OUTREACH_SMTP_PASS=...

# Your New Events Outreach Credentials:
EVENTS_SMTP_HOST=smtp.hostinger.com
EVENTS_SMTP_PORT=465
EVENTS_SMTP_USER=events@dorogo-events.eu
EVENTS_SMTP_PASS=...
EVENTS_IMAP_HOST=imap.hostinger.com
EVENTS_IMAP_PORT=993
EVENTS_IMAP_USER=events@dorogo-events.eu
EVENTS_IMAP_PASS=...
```

---

## 🧩 4. How to Add Your Events Outreach Module (Zero Blast Radius)

To guarantee that your event outreach uses all the intelligence of the DOROGO engine without altering wedding or bus data, follow the **Module Isolation Pattern** (the exact architecture successfully used for `bus_partners`).

### The 4 Isolation Principles:
1. **Separate Table**: Store event prospects in `event_planners` (or `event_prospects`), **never** inside the `prospects` table.
2. **Separate Sender Pipeline**: The cron job `sendDueEvents()` reads only from `event_planners` and sends through your dedicated SMTP account.
3. **Dedicated UI Tab**: Add an `#events` navigation pill in [`app/main.js`](file:///Users/User/Downloads/Wedding-planners-outreach/app/main.js) rendering [`app/views/events.js`](file:///Users/User/Downloads/Wedding-planners-outreach/app/views/events.js).
4. **Stripe Sail Design System**: Reuse the ready-made CSS classes (`.sail-table`, `.sail-pill`, `.sail-calc-card`, `.sail-btn`) so your view matches the platform's luxury Stripe look.

---

## 🤖 5. Working with Your AI Coding Assistant

When you develop with an AI coding agent (Cursor, Windsurf, Claude Code, Antigravity, or ChatGPT):

1. **Point your bot to [`AI_AGENT_PLAYBOOK.md`](file:///Users/User/Downloads/Wedding-planners-outreach/AI_AGENT_PLAYBOOK.md)**.
2. Copy and paste the **Master AI System Prompt** provided at the bottom of the playbook.
3. The AI bot will automatically read the project structure, follow the safety rules, and implement your Events pipeline without breaking existing code.

---

## 📞 Support & Coordination
- **Dmitri Traciuc**: Senior Dispatcher / Architecture Lead (`dmitri@dorogo.eu`)
- **Emergency Kill Switch**: The global setting `kill_switch: true` in Supabase instantly halts all outgoing outreach across all crons if maintenance is needed.
