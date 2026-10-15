"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const TOP_LIMIT = 5;
const REFRESH_DEBOUNCE_MS = 450;

async function fetchStats(clockId) {
    const { data, error } = await supabase.rpc("get_clock_hydrate_stats", {
        clock_id: clockId,
        top_limit: TOP_LIMIT,
    });
    if (error || !data) return null;
    return data;
}

// The one place hydrate stats are read. The public RPC is the only thing that exposes other
// people's handles, and it is also how the caller's own drop entitlement is reconciled,
// so both the viewer and the embed go through here.
export default function useHydrateStats(clockId, serverCount, onStats) {
    const [stats, setStats] = useState(null);
    const loadedRef = useRef(false);
    const onStatsRef = useRef(onStats);

    // Held in a ref so callers can pass an inline callback without re-running the load effect.
    useEffect(() => {
        onStatsRef.current = onStats;
    }, [onStats]);

    useEffect(() => {
        if (!clockId) return;
        let mounted = true;

        fetchStats(clockId).then((data) => {
            if (!mounted || !data) return;
            loadedRef.current = true;
            setStats(data);
            onStatsRef.current?.(data);
        });

        return () => {
            mounted = false;
        };
    }, [clockId]);

    // serverCount only moves once the server has confirmed a hydration, so this re-reads the
    // distinct-hydrator tally and the leaderboard a beat after the count settles.
    useEffect(() => {
        if (!clockId || !loadedRef.current) return;
        let mounted = true;

        const t = setTimeout(() => {
            fetchStats(clockId).then((data) => {
                if (mounted && data) setStats(data);
            });
        }, REFRESH_DEBOUNCE_MS);

        return () => {
            mounted = false;
            clearTimeout(t);
        };
    }, [clockId, serverCount]);

    return stats;
}
