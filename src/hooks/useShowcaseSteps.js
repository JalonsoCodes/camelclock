"use client";

import { useCallback, useEffect, useState } from "react";

/* Which step is current: the block crossing the viewport midline. A 0%-tall band
   at 50% means exactly one block is ever inside it, so a non-empty entry is
   always the active step. The blocks are the hero's sentinels, not the
   accordion rows — those are pinned, so they cannot cross anything. The intro
   carries no step attribute, so it is never observed, which is what lets the
   initial 0 stand for "nothing built yet" rather than colliding with step 1. */
const OBSERVER_MARGIN = "-45% 0px -45% 0px";

/**
 * Scroll-driven step tracking for the landing hero.
 *
 * Steps are a linear build-up, so this only tracks. Laying the layers on top of
 * the current step is useHeroBuild's job — and it needs the index to follow the
 * scroll in both directions, so scrolling back up walks the build back off the
 * camel. Every intersection is written through as-is, with no monotonic guard:
 * the observer fires on each block entering the band, so a two-step jump (a hard
 * flick) still lands on the step actually reached, and a single step back down
 * unwinds exactly one layer.
 *
 * `scrollToStep` is useHeroSentinels', so a clicked accordion title lands on
 * exactly the same place the reader would come to rest, rather than guessing
 * its own offset. It is the only navigation this hook offers: the accordion rows
 * are the nav. The page itself scrolls freely — nothing here intercepts it.
 *
 * The second effect paints the per-step progress bars. It reads the same
 * sentinels the observer does but measures them itself, because a bar needs a
 * continuous value where the step index only ever jumps between integers.
 */
export default function useShowcaseSteps(count, trackRef, scrollToStep) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const track = trackRef.current;
        if (!track || count === 0) return;

        const blocks = Array.from(track.querySelectorAll("[data-showcase-step]"));
        if (blocks.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const next = Number(entry.target.dataset.showcaseStep);
                    if (!Number.isNaN(next)) setIndex(next);
                }
            },
            { rootMargin: OBSERVER_MARGIN }
        );

        blocks.forEach((block) => observer.observe(block));
        return () => observer.disconnect();
    }, [trackRef, count]);

    /* The rule under each row is that step's progress bar, filled as the step's
       sentinel travels through the observer band.

       Written straight onto the nodes as --p rather than held in state. This
       updates on every scroll frame, and routing it through setState would
       re-render the whole accordion at 60fps — including re-rendering the open
       panel whose grid-template-rows is mid-transition, which is exactly the
       thing that must not be disturbed. Nothing reads these back into React.

       Progress is measured against the same 50% midline the observer uses, so a
       bar reads 0 the instant its step opens and 1 at the moment the next one
       takes over. Rows are offset by one against the sentinels: the rule under
       row N lives on row N+1, as its border-top, which is also why the last row
       has no bar — there is no sixth row to hold it. */
    useEffect(() => {
        const track = trackRef.current;
        if (!track || count === 0) return;

        const blocks = Array.from(track.querySelectorAll("[data-showcase-step]"));
        const rows = Array.from(track.querySelectorAll(".hero-accordion-item"));
        if (blocks.length === 0 || rows.length === 0) return;

        let frame = 0;
        const paint = () => {
            frame = 0;
            const midline = window.innerHeight / 2;

            blocks.forEach((block, i) => {
                const row = rows[i + 1];
                if (!row) return;
                const rect = block.getBoundingClientRect();
                const progress = rect.height > 0
                    ? Math.min(1, Math.max(0, (midline - rect.top) / rect.height))
                    : 0;
                row.style.setProperty("--p", progress);
            });
        };

        /* rAF-throttled, so a fast flick coalesces into one measurement per frame
           instead of one per scroll event. */
        const schedule = () => {
            if (frame) return;
            frame = requestAnimationFrame(paint);
        };

        schedule();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
        };
    }, [trackRef, count]);

    /* Called with a 0-based row index by the accordion titles, and crossing into
       the 1-based step space here. The hero's index is 1-based so the intro's 0
       is a real state rather than colliding with the first step. Only correct
       the step ourselves if there was no sentinel to scroll to — otherwise the
       observer picks it up on arrival. */
    const goTo = useCallback((target) => {
        if (count === 0) return;
        const step = Math.max(1, Math.min(count, target + 1));
        if (scrollToStep?.(step)) return;
        setIndex(step);
    }, [count, scrollToStep]);

    return { index, goTo };
}