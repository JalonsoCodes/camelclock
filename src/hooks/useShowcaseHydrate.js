"use client";

import { useCallback, useRef, useState } from "react";
import { levelFromCount } from "@/utils/boost";

/**
 * The landing hero's hydrate interaction.
 *
 * This is the whole of useHydrate's counted-hydrate path and none of its
 * persistence: the counter lives in local state, there is no clock_id to write
 * to, so no hydrate_clock RPC, no realtime channel and no auth listener. Every
 * visitor gets their own throwaway meter, and it survives the whole scroll —
 * this camel is built up rather than swapped, so a per-slide reset would throw
 * away the taps you just made.
 *
 * `floor` is the count the build-up script has already earned by equipping boosts
 * (see useHeroBuild). Taps count above it, never below, so the script's boosts
 * can't be walked back down by an idle visitor.
 *
 * The reaction split is lifted from queueHydrate so a tap reads the same as it
 * does on a real clock — a legend backflip on a level-up, an ordinary hop otherwise.
 */
export default function useShowcaseHydrate({ floor = 0 } = {}) {
    const [taps, setTaps] = useState(0);
    const camelRef = useRef(null);
    const tapsRef = useRef(0);

    const hydrateCount = Math.max(taps, floor);

    const hydrate = useCallback(() => {
        const previous = Math.max(tapsRef.current, floor);
        tapsRef.current += 1;
        const next = Math.max(tapsRef.current, floor);
        camelRef.current?.triggerNow(levelFromCount(next) > levelFromCount(previous) ? "legend" : "hop");
        setTaps(tapsRef.current);
    }, [floor]);

    return {
        camelRef,
        hydrateCount,
        // The level prop is what CamelClock watches for its level-up flash, and
        // deriving it from the count keeps it in step with questState instead of
        // leaving a floor for the two to disagree about.
        level: levelFromCount(hydrateCount),
        hydrate,
    };
}