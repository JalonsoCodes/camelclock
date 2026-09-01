# CamelClocks — Agent Notes

Next.js 16 (App Router) + Supabase countdown-clock builder. Neubrutalist pixel-art design.

## Verification

Always run after code changes:

```
npm run lint 2>&1; if ($?) { npm run build 2>&1 }
```

(PowerShell; allow long timeouts — builds take ~30s.)

Known harmless warning: `"middleware" file convention is deprecated` — ignore.

## Styling conventions

- Design system is vanilla CSS in `src/app/globals.css`. Components use plain global class names (CamelClock uses a CSS module).
- `nbtc` = neubrutalist card treatment (4px border + 8px hard offset shadow). Apply to cards and button-like elements.
- **Pressable motion is centralised.** The shared rules near the top of globals.css (`button, .pressable, .btn-link, ...`) own ALL hover press behaviour (translate + shadow collapse + transition). Never re-declare `transition`, `transform`, or `:hover` press styles on an individual component.
- Multi-state toggles (2+ options where one is always active — e.g. the embed style picker and embedding toggle in the share modal) use `src/components/OptionSlider.js` with the `.option-slider` classes. Don't build ad-hoc pill toggles. (Exception: the navbar theme toggle stays a compact Sun/Moon icon button by design.)
- The builder (`CamelClockBuilder`) is identical everywhere (landing, `/new`, `/edit/[id]`): MORE OPTIONS collapsed by default, no status/embedding controls. Creates always save as drafts; edits never touch status. Editing saves redirect to the clock's viewing page; creates open the share dialog in go-live mode (`status="draft" allowGoLive`) — a two-way DRAFT/LIVE slider that reveals the share fields only once live.
- Live clocks are capped at `MAX_LIVE_CLOCKS = 3` (src/utils/liveLimit.js, `checkLiveLimit()` returns a `reason`). Every publish entry point gates through it: share modal go-live slider, dashboard PUBLISH button, viewer draft-banner PUBLISH. When `reason === "limit"`, open the waitlist modal (heading "YOU'VE HIT THE FREE LIMIT") instead of an inline error. Never add a new publish path without this check.
- Status is managed via dashboard card buttons or the share modal's go-live/embedding toggles; embedding via the share modal's owner toggle only.
- The viewer page (`ClockViewer`) shows an explicit blue `.follow-button` beside SHARE for non-owners on live clocks (FOLLOW → FOLLOWING states); signed-out clicks route through the existing auth-prompt + deferred-follow flow, and it coexists with the on-camel pixel CTA.
- Watermark = pure branding ("Powered by CamelClock", always present, even for Pro). The follow CTA lives ON the camel: grid cells valued `9` in `grids.js` (`camelTemplate`) are rendered tinted by `drawCamel` — darkened 35% in light mode, lightened 35% in dark mode (theme detected via the `pixelDark` param's luminance) — and go full pixel-black/white on hover/active (`ctaState`). When no CTA is active (`ctaState === null`, e.g. builder previews) they render as plain primary. `CamelClock` props: `showCta` + either `ctaHref` (embeds/landing cards link out, target _top) or `onCtaClick` + `ctaActive` (viewer follow toggle). Whole canvas area is the hover/click target (`.ctaOverlay`).
- Landing scroll animation presets are managed from `/admin/showcases` (`showcases` table, `AdminShowcases.js`, actions in `src/app/admin/showcases/actions.js`). Each showcase stores: title, target_at, intro_text, celebration_message, celebration_type, primary_colour, secondary_colour, wearables. They are **not** live clocks — no `clock_id`, no `clocks` table involvement. The landing page fetches showcases server-side and passes them as `presets` to `LandingHero`, which scroll-cycles through them. Scroll animation (900vh container, responsive 780/700vh): 0.00–0.25 PRE-REVEAL — the "Your event deserves more than a boring timer." text (`.pre-reveal-text`) shows above the camel at the theme text colour (`--fg-colour`) and fades out (opacity 1→0) over the range, while the camel shows as a ticking outline (humps count down normally, NOT frozen) → 0.25–0.45 first-showcase camel fill pixel reveal (`revealProgress` = (p−0.25)/0.20) — humps freeze once reveal begins, text is fully gone → 0.45–0.55 wearables fade in (`wearableRevealProgress`, separate from camel fill — wearables only appear after all camel colours) → 0.55–0.80 colour cycling across presets → 0.80 shrink to builder → 0.92 builder appears (navbar pops up) → 0.97 scroll-clock fades. The digital timer + BORING stamp were removed. During the first-showcase reveal the title/intro/value labels show immediately in the theme text colour (`--fg-colour`) via CSS `color-mix()` interpolation (`--reveal` custom property on the clock container, inline from the `revealProgress` prop so it matches between server and client — no `getComputedStyle`/`Date` in render) and blend to their real colours (secondary/primary) as fill pixels reveal — never hidden, only colour-interpolated. Hump countdown is **frozen** only while `0 < revealProgress < 1` (via `revealActiveRef`) so it ticks during the pre-reveal stage and freezes once the fill reveal starts, plus a current-grid guard skips cached fill pixels that no longer sit on a fill colour and a level-signature cache (`levels|eyeFrame`) that rebuilds the shuffled fill list when humps change so hump pixels are woven in. Fallback hardcoded presets are used when the table is empty. Pixel reveal in `CamelClock` (`revealProgress` prop, driven only for `presetIndex === 0`) renders camel pixels AND wearable pixels progressively (wearables merged into the same shuffled reveal array with their own fill colours). The showcase editor is a fullscreen spreadsheet (`/admin/showcases` — a real `<table>` in `.showcase-sheet`, preview `<td>` leftmost and sticky while scrolling sideways, one row per showcase, fixed-width columns with divider borders and compact emoji wearables chips) and has full builder parity: wearables picker, colour randomiser, completion preview.
- Waitlist modal (`WaitlistModal`) takes `heading`/`subline`/`highlightFeature`; feature list comes from `PRO_FEATURES` exported by Pricing.js — one source of truth for Pro copy. Entry points: pricing section, navbar live pill, all limit-hit paths.
- Navbar shows a signed-in live-count pill (`N/3`, amber at cap via `.at-cap`); clicking opens the waitlist modal.
- `<button>` elements get the press effect automatically.
- Any non-button interactive element (an `<a>` or `<div>` acting as a button) must add the `pressable` class to get identical behaviour, including suppression of the default link hover underline.
- Legacy classes already listed in the shared selector: `.btn-link`, `.account-trigger`, `.edit-fab`, `.social-share-button`.
- Deliberate exception: the clock watermark's save CTA keeps the standard link underline on hover instead of the press animation. Don't "fix" it.
- Global gotchas: `button:hover { transform: translate(8px,8px) }` moves every real button; `a:hover { text-decoration: 4px solid underline }` underlines every link. Interactive anchors that shouldn't look like links need `pressable` (or an explicit override).

## Workflow

- The user runs all SQL against Supabase themselves — hand over SQL snippets, never assume schema changes are applied.
- No comments in code unless asked.
- Icons: `lucide-react` for UI icons (`button-icon` class sizes them), `react-icons/si` for brand logos.
- Embeds: `/clock/[id]/embed` is the only frameable route (frame headers exclude it in next.config.mjs — don't duplicate). Embed theme comes from `?theme=light|dark|transparent`; EmbedMode applies body/html classes, so keep using it rather than new CSS entry points.
