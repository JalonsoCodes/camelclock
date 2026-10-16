# CamelClocks

Build pixel-art countdown clocks, share them, and embed them anywhere. Built with Next.js (App Router) and Supabase.

## Features

- Countdown clock builder with live preview, wearables, and celebration animations
- Draft/live publishing with a free-tier cap on live clocks
- Hydration system with per-clock hydrator counts
- Embeddable widget route with light/dark/transparent themes
- Dynamic social-preview (OG) images per clock
- Admin showcase manager that keeps landing-page demo clocks in sync
- Account settings with password change and self-service account deletion

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only secret key (account deletion)
   - `NEXT_PUBLIC_SITE_URL` — leave as localhost for development

3. Run the database schema/migrations against your Supabase project (tables: `clocks`, `hydrations`, `profiles`, `waitlist`, plus RLS policies, the live-limit trigger, and the `count_my_live_clocks` RPC).

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Scripts

| Command         | Purpose                    |
| --------------- | -------------------------- |
| `npm run dev`   | Start the dev server       |
| `npm run build` | Production build           |
| `npm run start` | Serve the production build |
| `npm run lint`  | ESLint                     |

## Deployment

Deploys as a standard Next.js app (e.g. Vercel). Set all four environment variables in your hosting dashboard, and point `NEXT_PUBLIC_SITE_URL` at your production domain. Configure Supabase Auth's Site URL and redirect allowlist to match.
