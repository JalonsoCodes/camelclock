# CamelClock - Essential Rules

**Stack:** Next.js 16 (App Router), React 19, Supabase (Auth + Postgres + RLS), vanilla CSS, npm, Node 20. No tests.

## Core Conventions
- **JS only**, `@/*` maps to `./src/*`. Components PascalCase, hooks `use*`, utils camelCase.
- **Vanilla CSS only** in `src/app/globals.css`. Use `nbtc` class (4px border + 8px shadow). Use `OptionSlider` for multi-choice toggles. Buttons get press effects automatically; add `pressable` to non-button interactives.
- **No comments** unless explicitly asked. Read neighbors before editing. Prefer editing existing files.

## Tool Usage
- **File operations:** Use `read`, `glob`, `grep`, `edit`, `write` tools — NOT shell (`cat`, `grep`, `head`, `tail`).
- **Shell commands:** Only for git, npm, docker, etc. Avoid Unix utilities on Windows — use PowerShell or `rg`.
- **Search:** Prefer `grep`/`glob` tools over shell. If using shell, prefer `rg` over `grep`.
- **Reading files:** Use `read` with `offset`/`limit` for large files, not `head`/`tail`.

## Environment Notes
- **Windows:** Unix commands (`grep`, `head`, `tail`) may not be available. Use opencode tools or install ripgrep (`winget install BurntSushi.ripgrep.MSVC`).
- **File paths:** Always quote paths with spaces.

## Performance Tips
- Batch independent tool calls when possible.
- Use `Task` tool for broad exploration.
- Keep context focused — read specific sections with `offset`/`limit`.

## Build & Publish
- **Drafts by default.** `/new` (ClockCreationWizard) and creates save as `draft`. Edits never touch `status` or `viewer_hydrates`.
- **Publish gated.** Max **3 live clocks** per user. Call `checkLiveLimit()` before setting `status: "live"`. Pro/admin exempt. Over limit → open waitlist modal.
- **Viewer hydrates ON by default.** No UI toggle; edits never change it.

## Security & DB
- **RLS enforced** on `clocks`, `hydrations`, `profiles`. Never add `FORCE RLS`.
- **Owner-only writes.** Policies enforce `user_id = auth.uid()`. `hydrations` has no client write/delete (hydration permanent).
- **Service role required** for `deleteAccount`. `SECURITY DEFINER` functions must pin `search_path`.
- **Critical RPCs:** `hydrate_clock()` only writer of `hydrate_count`/`level`; `get_clock_hydrate_stats()` never exposes email/user_id; `clock_reports` INSERT-only for clients (admin RPCs only for reads/resolution); `clock_polls`/`clock_poll_votes` have no client write path.
- **Migrations:** Read newest migration first. Never guess columns. Apply with `npx supabase db push`.
- **Validate migrations before pushing:** `npx supabase start` → `npx supabase db reset` (replays full chain on fresh local DB) → `npx supabase db lint` (squawk) → `npx supabase test db` (pgTAP, files in `supabase/tests/`) → `npx supabase db push --dry-run` → `npx supabase db push`. `db reset` only proves fresh-DB behaviour, so additive migrations are safe but destructive ones need manual migration testing. If the dashboard was ever edited directly, run `npx supabase db pull` first.

## Key Gotchas
- **Embeds:** Only `/clock/[id]/embed` frameable. Theme/card/size via URL params only (no on-screen toggle). Embed camel opens viewer in new tab (no in-place hydrate).
- **Boosts:** 3 categories (exercise/aura/weather), additive rack. `hop`/`legend` are reactive (not equipped). Boost order per-clock, deals round-robin by category.
- **Tour:** Per-clock (`tutorial_completed`), starts on live untoured clocks. Never written by edits.
- **No test suite.** Verify with `npm run lint && npm run build`. Lint promotes `no-unused-vars`/`no-undef` to errors.

## Quick Commands
```powershell
npm run dev
npm run lint 2>&1; if ($?) { npm run build 2>&1 }
npx supabase db push
```