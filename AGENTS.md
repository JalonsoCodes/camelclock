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
- The builder (`CamelClockBuilder`) is identical everywhere (landing, `/new`, `/edit/[id]`): MORE OPTIONS collapsed by default, no status/embedding controls. Creates always save as drafts; edits never touch status. Status is managed via dashboard card buttons; embedding via the share modal's owner toggle. Editing saves redirect to the clock's viewing page; creates open the share dialog.
- `<button>` elements get the press effect automatically.
- Any non-button interactive element (an `<a>` or `<div>` acting as a button) must add the `pressable` class to get identical behaviour, including suppression of the default link hover underline.
- Legacy classes already listed in the shared selector: `.btn-link`, `.sign-out-button`, `.edit-fab`, `.social-share-button`.
- Deliberate exception: the clock watermark's save CTA keeps the standard link underline on hover instead of the press animation. Don't "fix" it.
- Global gotchas: `button:hover { transform: translate(8px,8px) }` moves every real button; `a:hover { text-decoration: 4px solid underline }` underlines every link. Interactive anchors that shouldn't look like links need `pressable` (or an explicit override).

## Workflow

- The user runs all SQL against Supabase themselves — hand over SQL snippets, never assume schema changes are applied.
- No comments in code unless asked.
- Icons: `lucide-react` for UI icons (`button-icon` class sizes them), `react-icons/si` for brand logos.
- Embeds: `/clock/[id]/embed` is the only frameable route (frame headers exclude it in next.config.mjs — don't duplicate). Embed theme comes from `?theme=light|dark|transparent`; EmbedMode applies body/html classes, so keep using it rather than new CSS entry points.
