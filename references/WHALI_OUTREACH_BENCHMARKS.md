# Whali Cold Outreach Benchmarks & DOROGO Execution Guidelines

This document establishes the operational parameters and messaging rules based on Whali's executive cold outreach study, implemented across DOROGO B2B outreach (Trade Fairs & Exhibiting Teams, Wedding Planners, and Luxury Transport Partners).

---

## 1. Core Data Benchmarks

| Metric | Whali Finding | DOROGO Implementation |
| :--- | :--- | :--- |
| **Subject Line Length** | **< 30 characters: 83.7% open rate** (vs. 69.5% for > 70 chars). Pitching in subject fails. | All T1 & T2 subjects enforced **< 30 chars** (e.g. `{{fair_event}} logistics`, `DOROGO x {{agency}}`). |
| **Body Word Count** | **< 100 words: 6x higher reply rate** than 200–300 words. Long = sales pitch; Short = peer question. | First touch strictly **under 75 words**. Senior directors decide in 3 lines. |
| **Send Days** | **Tuesday (78.3%) & Wednesday (79.4%)**. Thursday & Friday drop < 70%. | Cadence prioritized for **Tuesday & Wednesday**. Avoid Thursday/Friday blast. |
| **Send Times** | **12:00 PM, 3:00 PM, 5:00 PM** (Natural breaks: lunch, coffee, end-of-day inbox triage). | Default schedule slots anchored at natural break intervals (Europe/Rome). |
| **Follow-Up Cadence** | **1 follow-up yields +60% reply lift**. Risk of unsubscribe triples after 4th email. | Strictly **2 cold touches max** (T1 intro + T2 follow-up). Zero spam cadence. |
| **Target Persona** | **Directors & Managers get 3x more replies than CEOs/HR** (only 4% sent to HR). | Screen for **Trade Fair Director / Logistics Lead / Operations Director**. |

---

## 2. The 3-Line Winning Template Structure (< 100 Words)

```
Good morning {{contact_person}},

[Line 1: Specific Trigger]
Noticed {{company_name}} is exhibiting at {{fair_event}} this January.

[Line 2: One-Line Credential / Fleet Capability]
Dorogo provides unbranded Mercedes-Benz V-Class and E-Class transfers between Milan hotels and Fiera Milano Rho, including direct airport meet & greet (MXP/LIN).

[Line 3: Low-Friction Question]
Would our 1-page corporate rate card and vehicle allocation be helpful for your team?

Best regards,
Igor
Executive Mobility Desk · DOROGO
igor@b2b-dorogo.it
```

---

## 3. Linter & UI Safeguards

1. **Linter Guardrails (`supabase/functions/_shared/core/lint.js`):**
   - Warns if subject length > 30 characters.
   - Warns if body word count > 100 words.
2. **Event Templates Simulator (`app/views/event_templates.js`):**
   - Live badge counters display character length (`✓ <30 chars`) and word count (`✓ <100w (6x reply)`).
   - Summary card highlights optimal days and break times.
