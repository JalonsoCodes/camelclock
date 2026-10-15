"use client";

import { useCallback, useRef } from "react";

/**
 * Scroll geometry for the landing hero.
 *
 * The accordion is pinned, so all of its rows sit at the same viewport offset
 * and none of them can be measured against the scroll. The steps therefore ride
 * invisible sentinels tiled through the track, in normal flow, and those are
 * what the observer watches and what a title click scrolls to.
 *
 * That indirection is the whole point. Both consumers work by querying the track
 * for their own attributes: useShowcaseSteps takes the block crossing the
 * viewport midline, and scrollToStep takes the sentinel itself.
 *
 * The sentinels carry no visual styles at all. They are geometry, nothing more,
 * and their height is what sets how far the reader has to travel per section —
 * see .hero-sentinel in landing-hero.css.
 *
 * This is the desktop-only path now: below the breakpoint the hero renders a
 * plain page with no sentinels at all, so both consumers no-op there.
 */
export default function useHeroSentinels(count) {
    const trackRef = useRef(null);

    /* Where the page has to sit for a sentinel to come to rest: centred in the
       viewport. Measured on demand rather than cached, so webfont loading or any
       other late reflow can't leave a title click aiming at a stale offset. */
    const scrollToStep = useCallback((step) => {
        const block = trackRef.current?.querySelector(`[data-showcase-step="${step}"]`);
        if (!block) return false;

        const rect = block.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const offset = top + rect.height / 2 - window.innerHeight / 2;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

        window.scrollTo({ top: Math.min(maxScroll, Math.max(0, offset)), behavior: "smooth" });
        return true;
    }, []);

    return { trackRef, count, scrollToStep };
}
