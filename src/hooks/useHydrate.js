"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { computeDropLeft, levelFromCount, MAX_LEVEL } from "@/utils/boost";

const FLUSH_DELAY_MS = 750;

function clampLevel(value, count) {
    const derived = levelFromCount(count);
    const incoming = Number(value);
    if (!Number.isFinite(incoming) || incoming <= 0) return derived;
    return Math.max(1, Math.min(MAX_LEVEL, Math.max(incoming, derived)));
}

// Owns the whole hydrate mechanism: an optimistic counter that never goes backwards, a coalesced
// writer to hydrate_clock(), and realtime reconciliation. hydrate_clock() is the only writer of
// clocks.hydrate_count / clocks.level, so the local count is always a guess at the server value
// and every server value is treated as the truth once it arrives.
export default function useHydrateInteraction(clock, enabled, { isOwner = false, drop = 0, onBlocked } = {}) {
    const camelRef = useRef(null);
    const pendingRef = useRef(0);
    const timerRef = useRef(null);
    const inFlightRef = useRef(false);
    const flushRef = useRef(null);
    const countRef = useRef(clock?.hydrate_count ?? 0);
    const levelRef = useRef(clock?.level ?? 1);
    const celebratedLevelRef = useRef(clock?.level ?? 1);
    const serverCountRef = useRef(clock?.hydrate_count ?? 0);
    const pendingHydrateRef = useRef(false);
    const baseRef = useRef({ drop });
    const spentRef = useRef({ drop: 0 });
    const optsRef = useRef({ isOwner, onBlocked });

    // Written in an effect so the async flush always reads the current props without the hook
    // having to be re-created when the owner changes mid-session.
    useEffect(() => {
        optsRef.current = { isOwner, onBlocked };
    }, [isOwner, onBlocked]);

    const [user, setUser] = useState(null);
    const [hydrateCount, setHydrateCount] = useState(clock?.hydrate_count ?? 0);
    const [serverCount, setServerCount] = useState(clock?.hydrate_count ?? 0);
    const [level, setLevel] = useState(clock?.level ?? 1);
    const [hydratePromptOpen, setHydratePromptOpen] = useState(false);
    const [hydrateError, setHydrateError] = useState(null);
    const [entitlementSnapshot, setEntitlementSnapshot] = useState({
        dropLeft: Math.max(0, drop),
    });

    const syncEntitlementDisplay = useCallback(() => {
        const base = baseRef.current;
        const sp = spentRef.current;
        setEntitlementSnapshot({
            dropLeft: Math.max(0, base.drop - sp.drop),
        });
    }, []);

    const setServerCountFloor = useCallback((next) => {
        if (typeof next !== "number") return;
        if (next > serverCountRef.current) {
            serverCountRef.current = next;
        }
        setServerCount(serverCountRef.current);
    }, []);

    const applyCount = useCallback((next, nextLevel) => {
        const incoming = Number(next);
        // Never walk the bar backwards: a late realtime payload or a slow response must not undo
        // a hydration that is already on screen.
        if (Number.isFinite(incoming) && incoming >= countRef.current) {
            countRef.current = incoming;
            setHydrateCount(incoming);
        }
        const lvl = clampLevel(nextLevel, countRef.current);
        levelRef.current = lvl;
        setLevel(lvl);
        if (lvl > celebratedLevelRef.current) {
            celebratedLevelRef.current = lvl;
            camelRef.current?.triggerNow("legend");
        }
    }, []);

    const applyServer = useCallback((next) => {
        // `drop` is spent optimistically, so it waits until nothing is pending before it is
        // reconciled against the server's value.
        if (pendingRef.current !== 0 || typeof next?.drop !== "number") return;
        baseRef.current = { drop: next.drop };
        syncEntitlementDisplay();
    }, [syncEntitlementDisplay]);

    // At most one request is ever in flight. Clicks made while it is running accumulate in
    // pendingRef and are sent the moment it resolves, so responses can never arrive out of
    // order and overwrite newer entitlement state.
    const flush = useCallback(() => {
        if (inFlightRef.current) return;
        if (pendingRef.current <= 0) return;

        const amount = pendingRef.current;
        pendingRef.current = 0;

        // The daily pool is now spent by every hydrator, so the optimistic spend is settled and
        // refunded for visitors exactly as it was for the owner.
        const dropSpent = spentRef.current.drop;
        spentRef.current.drop = 0;
        inFlightRef.current = true;

        supabase
            .rpc("hydrate_clock", { target: clock.id, amount })
            .then(({ data, error }) => {
                if (!error && data) {
                    // Only the spend this request covered is settled; anything clicked while it was
                    // in flight is still held against the new base.
                    setHydrateError(null);
                    baseRef.current = {
                        drop: computeDropLeft(data.drop_day, data.drop_used) ?? baseRef.current.drop,
                    };
                    syncEntitlementDisplay();
                    applyCount(data.hydrate_count, data.level);
                    setServerCountFloor(data.hydrate_count);
                } else {
                    // A failed write rolls the whole transaction back, so the server never moved.
                    // Roll the optimistic count back with it and say so, rather than letting a
                    // rejected hydration look like a click that never registered.
                    setHydrateError({ code: error?.code || null, message: error?.message || null });
                    if (dropSpent > 0) {
                        spentRef.current.drop = Math.min(baseRef.current.drop, spentRef.current.drop + dropSpent);
                    }
                    const refunded = Math.max(0, countRef.current - amount);
                    countRef.current = refunded;
                    setHydrateCount(refunded);
                    applyCount(refunded);
                    // The server never moved, so the confirmed floor stays put, but a level that
                    // only ever rose optimistically has to be re-armed for the next level-up.
                    celebratedLevelRef.current = Math.min(celebratedLevelRef.current, levelFromCount(refunded));
                }
            })
            .finally(() => {
                inFlightRef.current = false;
                if (pendingRef.current > 0) flushRef.current?.();
            });
    }, [clock.id, applyCount, setServerCountFloor, syncEntitlementDisplay]);

    // Lets the debounce timer and the in-flight drain re-enter the writer without the callback
    // having to list itself as a dependency.
    useEffect(() => {
        flushRef.current = flush;
    }, [flush]);

    const scheduleFlush = useCallback(() => {
        if (timerRef.current) return;
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            flushRef.current?.();
        }, FLUSH_DELAY_MS);
    }, []);

    useEffect(() => {
        if (!enabled || !clock?.id) return;
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [enabled, clock?.id]);

    // Single path for every counted hydration, whether it came from a click, a preview or the
    // deferred sign-in hand-off, so the optimistic count can never diverge between them.
    const queueHydrate = useCallback(() => {
        const next = countRef.current + 1;
        if (levelFromCount(next) > levelFromCount(countRef.current)) {
            camelRef.current?.triggerNow("legend");
        } else {
            camelRef.current?.triggerNow("hop");
        }
        pendingRef.current += 1;
        countRef.current = next;
        setHydrateCount(next);
        scheduleFlush();
    }, [scheduleFlush]);

    // The daily pool is shared by every hydrator, so the entitlement check applies to visitors as
    // well as the owner. The one exception is the owner's free sub-L2 allowance: their first 10
    // hydrations on a fresh clock are on the house, so the pool is neither checked nor spent there.
    const spendOrBlock = useCallback(() => {
        const freeOwner = optsRef.current.isOwner && levelRef.current < 2;
        if (freeOwner) return true;
        if (baseRef.current.drop - spentRef.current.drop <= 0) {
            optsRef.current.onBlocked?.();
            return false;
        }
        spentRef.current.drop += 1;
        syncEntitlementDisplay();
        return true;
    }, [syncEntitlementDisplay]);

    const beginHydrate = useCallback(() => {
        if (!user) {
            pendingHydrateRef.current = true;
            setHydratePromptOpen(true);
            return;
        }

        // Clear a previous failure up front so the message disappears the moment they retry,
        // rather than sitting there for the length of the debounce.
        setHydrateError(null);

        if (!spendOrBlock()) return;
        queueHydrate();
    }, [user, queueHydrate, spendOrBlock]);

    useEffect(() => {
        if (!enabled) return;
        supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const u = session?.user ?? null;
            setUser(u);
            if (event === "SIGNED_IN" && pendingHydrateRef.current && u) {
                pendingHydrateRef.current = false;
                setHydratePromptOpen(false);
                // The deferred sign-in hand-off is still a real hydration, so it runs the same
                // pool check rather than bypassing it.
                if (spendOrBlock()) queueHydrate();
            }
        });

        const channel = supabase
            .channel(`hydrates:${clock.id}`)
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "clocks", filter: `id=eq.${clock.id}` },
                (payload) => {
                    const c = payload.new?.hydrate_count;
                    if (typeof c !== "number") return;
                    applyCount(c, payload.new?.level);
                    setServerCountFloor(c);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [enabled, clock.id, applyCount, setServerCountFloor, queueHydrate, spendOrBlock]);

    return {
        camelRef,
        hydrateCount,
        serverCount,
        level,
        dropLeft: entitlementSnapshot.dropLeft,
        beginHydrate,
        applyServer,
        hydrateError,
        hydratePromptOpen,
        setHydratePromptOpen,
    };
}
