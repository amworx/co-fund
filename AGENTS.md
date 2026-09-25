# co-fund — Project AGENTS.md

> Inherits global doctrine in `C:\Users\HP\.config\opencode\AGENTS.md` (orchestrator, memory system, UI Design Playbook).
> This file overrides ONLY project structure, naming, workflows, tech stack.

## Project

* **Name:** co-fund — صندوق الفطور المشترك
* **Type:** Web Application (mobile-friendly, Arabic only, RTL)
* **Purpose:** Office breakfast fund for ~10 dynamic members + temporary guests. Track payments in and meals out, show balances and next due date, keep audit trail. Voting stays in WhatsApp.
* **Hosting (100% free constraint):** Frontend Vercel Free (Hobby) + Backend Supabase Free. No paid services. Keep receipt photos compressed. Total must stay $0.

## Tech Stack

* Frontend: React + TypeScript + Vite + Tailwind (RTL)
* Backend/DB: Supabase Free (Postgres + Storage)
* Hosting: Vercel Free
* Language of UI: Arabic only

## Project Structure

```
co-fund/
  AGENTS.md
  docs/
  plans/
  tasks/
  src/        # app code (to be scaffolded only on explicit approval)
  memory/
    events.md
    lessons.md
    patterns.md
    decisions.md
    playbooks.md
```

## Core Domain Rules (do not break)

1. **No base currency, no conversion.** 3 independent buckets: SYP / TRL / USD.
2. **Multi-line records:** Any single payment OR single meal can have 1-3 lines, one per currency. Example: meal = 500,000 SYP + 200 TRL. Payment = 200,000 SYP + 100 TRL.
3. **Balances per currency:** balance[CUR] = sum(payments[CUR]) - sum(meals[CUR]).
4. **Forecast per currency:** burn[CUR] = avg spend per day for CUR. days_left[CUR] = balance[CUR] / burn[CUR]. Next due = min(days_left).
5. **Dynamic members:** active / inactive / guest (ضيف مؤقت — single week). Guests can pay and participate.
6. **Everyone is manager:** anyone can add/edit. Every create/edit/delete must store footprint: `who + when + old/new` in audit log for review.
7. **Auth for now:** pick name from members list + 4-digit PIN. No real login yet.
8. **Voting out of scope:** polls stay in WhatsApp. App may optionally store link/reference to WhatsApp poll, no voting UI.
9. **Arabic only, RTL.** All UI strings Arabic.

## Naming Conventions

* Tables (Supabase, snake_case): `members`, `contributions`, `contribution_lines`, `expenses`, `expense_lines`, `audit_logs`
* Currencies as codes: `SYP`, `TRL`, `USD` — never symbols in DB
* UI routes (Arabic labels, English paths): `/`, `/payments`, `/meals`, `/members`, `/activity`

## Workflows

* PLAN -> BUILD -> REVIEW. Research before implementing if external knowledge needed.
* Minimum changes, never modify unrelated files.
* Before UI work, load `ui-design.md` playbook.
* Never `npm install` / scaffold / lock files / node_modules / venv unless user explicitly requests.

## Safety

* Inherits global safety + memory/event/failure rules. This file does NOT override them.
