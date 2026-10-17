<div align="center">

<img src="public/logo.png" alt="CamelClock" width="120" />

# CamelClock

**Build pixel-art countdown clocks, earn effects as people hydrate them, and embed them anywhere.**

CamelClock is a countdown-clock builder with a game layer. You design a clock — a pixel-art camel, a finish date, colours, wearables — and publish it. Visitors "hydrate" it to push a shared community meter, which levels the clock up and reveals new animations. Clocks can be embedded into any site or Notion page with a single link.

Built with **Next.js 16 (App Router)** and **Supabase** (Postgres, Auth, Row-Level Security).

</div>

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Routes](#routes)
- [The hydration loop](#the-hydration-loop)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Deployment](#deployment)

---

## Features

### Build

- **Pixel-art countdown clock** rendered on canvas with a live preview as you edit.
- **Guided create wizard** — title, finish date/time, colours, and wearables in a four-slide flow, usable straight from the landing page.
- **Custom colour schemes** and **wearables** across head / eyes / face / neck / feet slots (one per slot).
- **12-hour and 24-hour time** with an auto-formatting time field that remembers your preference.

### Publish & share

- **Draft / live publishing** with a free-tier cap of **3 live clocks** and a waitlist modal when you hit it.
- **Public viewing page** per clock with hydrator counts, a top-hydrators leaderboard, and a community note.
- **Share dialog** with a link, social share row (WhatsApp, X, Facebook, Email), and copy-link.
- **Per-clock Open Graph images** generated on the fly for rich link previews.

### The hydration loop

- **Hydrations** — signed-in visitors tap to hydrate a clock; hydrating one clock spends the same **shared daily drop** as hydrating any other.
- **Five levels** (thresholds at 0 / 10 / 50 / 100 / 250 hydrations) that each reveal two new effects.
- **Boosts** in three categories — **exercise** (motions like push-ups and jumping jacks), **aura** (shine, sparkles, fireworks) and **weather** (sun, rain, sandstorm) — any number equipped at once.
- **Level voting** — crossing a level puts the two newly revealed effects to a community poll; the winner is merged into the clock automatically.
- **Reactions** — a hop on every hydration, a backflip on every level-up.
- **First-run tour** that walks the owner through publishing, hydrating, and the first poll.

### Embed anywhere

- **Dedicated embed route** (`/clock/[id]/embed`) — the only frameable route in the app.
- **URL-driven theming** — `theme=light|dark`, `card=card|transparent`, and `size=sm|md|lg`, with a no-flash script so the embed never flickers.
- **Notion and site embed helpers** with live-updating previews and ready-to-paste embed code.

### Accounts

- **Email-confirmed signup**, password reset, and **secure password change** via a reauthentication code.
- **Handles** with DB-enforced validation and case-insensitive uniqueness.
- **Account settings**, including self-service account deletion.

---

## Tech stack

| Layer      | Choice                                                       |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 16 (App Router), React 19                            |
| Language   | Plain JavaScript (`@/*` → `./src/*`)                         |
| Backend    | Supabase — Postgres, Auth, Row-Level Security                |
| Styling    | Vanilla CSS (`src/app/globals.css`) — neubrutalist, no Tailwind |
| Icons      | `lucide-react`, `react-icons`                                |
| Lint       | ESLint 9 (flat config)                                       |
| Runtime    | Node 20                                                      |
| Deploy     | Netlify                                                      |

No test suite — verification is `npm run lint` plus `npm run build`.

---

## Project structure

```
camelclock/
├─ public/                     Static assets
├─ src/
│  ├─ app/                     Routes (App Router) — direct Supabase access, no REST layer
│  │  ├─ page.js               Landing: hero + create wizard + examples + pricing
│  │  ├─ new/                  Create a clock (wizard)
│  │  ├─ edit/[id]/            Edit an existing clock
│  │  ├─ clock/[id]/           Public viewer + OG image + error boundary
│  │  ├─ clock/[id]/embed/     Frameable embed route
│  │  ├─ dashboard/            Owner dashboard
│  │  ├─ settings/             Account settings (server actions)
│  │  ├─ admin/                Showcase ordering + boost test harness
│  │  └─ login/ signup/ forgot-password/ reset-password/ auth/confirm/
│  ├─ components/              UI components (incl. auth/ and builder-fields/)
│  ├─ hooks/                   Client hooks (hydrate, polls, hero build, …)
│  ├─ lib/supabase/            Browser, server, admin and session clients
│  └─ utils/                   Boost engine, grids, drawing, time, validation
└─ supabase/
   ├─ config.toml
   └─ migrations/              Forward-only SQL migrations
```

---

## Routes

| Route                  | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| `/`                    | Landing page with hero, create wizard, and showcases     |
| `/new`                 | Create a clock                                           |
| `/edit/[id]`           | Edit one of your clocks                                  |
| `/clock/[id]`          | Public clock viewer                                      |
| `/clock/[id]/embed`    | Embeddable widget (the only frameable route)             |
| `/dashboard`           | Your clocks and hydration stats                          |
| `/settings`            | Handle, password, and account management                 |
| `/login` `/signup`     | Authentication                                           |
| `/forgot-password` `/reset-password` `/auth/confirm` | Password and email flows |
| `/faq` `/privacy` `/terms` | Static content                                       |
| `/admin/showcases`     | Reorder landing-page showcase clocks                     |
| `/admin/boost-test`    | Internal animation tuning harness                        |

---

## The hydration loop

Hydrating is the core interaction, and it is deliberately shared:

1. A **signed-in** user hydrates any clock. Each hydration counts toward that clock's total **and** spends from a **per-user daily pool** (~15–25, resetting every UTC day) that is shared across every clock.
2. A clock's hydration count maps to a **level** (1–5). Crossing a threshold reveals the next two effects from that clock's own shuffled order.
3. The two revealed effects go to a **community vote**. When the poll resolves, the winning effect is merged into the clock and the owner can equip it.
4. Equipping is **additive** — the owner toggles any unlocked effect into or out of the show, but the engine runs at most one effect per category at a time.

Because every clock draws on the same pool, hydrating a clock is a real choice about where to spend attention.

---

## Getting started

### Prerequisites

- **Node 20** (see `.nvmrc`)
- A **Supabase** project

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Copy `.env.example` to `.env.local` and fill in:

| Variable                        | Where to find it                                     |
| ------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only secret; used for account deletion. Never expose or commit. |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` in development               |

### 3. Apply the database schema

The schema lives in forward-only migrations under `supabase/migrations/`. Link the Supabase CLI to your project and push:

```bash
npx supabase link
npx supabase db push
```

This creates the tables (`profiles`, `clocks`, `hydrations`, `user_hydrates`, `clock_polls`, `clock_poll_votes`, `waitlist`), Row-Level Security policies, the RPCs (`hydrate_clock`, `vote_poll`, `finalise_poll`, `get_clock_hydrate_stats`, …) and the live-clock-limit trigger.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Auth email configuration

Email confirmation is enforced, so signup does not auto-log-in. In Supabase, configure:

- **Site URL** and redirect allowlist → your domain (`/auth/confirm`).
- An SMTP provider for confirmation, reset, and reauthentication emails.
- **Secure password change** (Auth → Providers → Email) for the reauthentication-code flow used by settings.

---

## Scripts

| Command              | Purpose                       |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start the dev server          |
| `npm run build`      | Production build              |
| `npm run start`      | Serve the production build    |
| `npm run lint`       | ESLint                        |
| `npx supabase db push` | Apply migrations to Supabase |

---

## Deployment

Deploys as a standard Next.js app (a `netlify.toml` is included; Vercel works too).

1. Set all four environment variables in your hosting dashboard.
2. Point `NEXT_PUBLIC_SITE_URL` at your production domain.
3. Match Supabase Auth's **Site URL** and redirect allowlist to that domain.
