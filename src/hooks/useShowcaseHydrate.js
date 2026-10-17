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
 * The count is the taps and nothing else. The scripted build equips boosts, but
 * CamelClock renders whatever rack it is handed, so the hero's level never has
 * to be lifted to unlock them — and because the level banner is hidden here, a
 * build-driven floor would only ever fire a stray splash on scroll. Counting
 * taps alone means every click paints the water front.
 *
 * The reaction split is lifted from queueHydrate so a tap reads the same as it
 * does on a real clock — a legend backflip on a level-up, an ordinary hop otherwise.
 */
export default function useShowcaseHydrate() {
    const [taps, setTaps] = useState(0);
    const camelRef = useRef(null);
    const tapsRef = useRef(0);

    const hydrateCount = taps;

    const hydrate = useCallback(() => {
        const previous = tapsRef.current;
        tapsRef.current += 1;
        camelRef.current?.triggerNow(levelFromCount(tapsRef.current) > levelFromCount(previous) ? "legend" : "hop");
        setTaps(tapsRef.current);
    }, []);

    return {
        camelRef,
        hydrateCount,
        // The level prop is what CamelClock watches for its level-up flash, and
        // deriving it from the count keeps it in step with questState.
        level: levelFromCount(hydrateCount),
        hydrate,
    };
}
