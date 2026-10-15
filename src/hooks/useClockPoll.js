"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const POLL_TICK_MS = 1000;
const OPEN_POLL_REFRESH_MS = 8000;

/* Owns the level-vote polls for one clock: initial fetch, a realtime subscription to the
   clock_polls rows (so tallies and create/resolve events arrive live), a 1s tick that drives the
   countdown and settles a poll once its window closes, and vote(). Resolution goes through
   get_clock_polls (a SECURITY DEFINER reader that finalises anything overdue), never a direct
   write, so a viewer can settle a poll without any write grant. onResolve fires once per poll the
   first time it appears with a winner, which is when the viewer should re-read the clock so the
   won effect shows up in the owner's rack. */
export default function useClockPoll(clockId, enabled, { onResolve } = {}) {
    const [polls, setPolls] = useState([]);
    const [now, setNow] = useState(() => Date.now());
    const resolvingRef = useRef(false);
    const announcedRef = useRef(new Set());
    const seededRef = useRef(false);
    const onResolveRef = useRef(onResolve);

    useEffect(() => {
        onResolveRef.current = onResolve;
    });

    const load = useCallback(async () => {
        if (!clockId) return;
        const { data, error } = await supabase.rpc("get_clock_polls", { p_clock_id: clockId });
        if (error) {
            console.error("get_clock_polls failed:", error.message);
            return;
        }
        const list = Array.isArray(data) ? data : [];
        setPolls(list);
        for (const poll of list) {
            if (!poll.winner) continue;
            if (!seededRef.current) {
                announcedRef.current.add(poll.id);
                continue;
            }
            if (announcedRef.current.has(poll.id)) continue;
            announcedRef.current.add(poll.id);
            onResolveRef.current?.(poll);
        }
        seededRef.current = true;
    }, [clockId]);

    useEffect(() => {
        if (!enabled || !clockId) return;
        seededRef.current = false;
        announcedRef.current = new Set();
        const initial = Promise.resolve().then(load);
        const channel = supabase
            .channel(`clock-polls-${clockId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "clock_polls", filter: `clock_id=eq.${clockId}` },
                () => load(),
            )
            .subscribe();
        return () => {
            void initial;
            supabase.removeChannel(channel);
        };
    }, [enabled, clockId, load]);

    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setNow(Date.now()), POLL_TICK_MS);
        return () => clearInterval(id);
    }, [enabled]);

    // Realtime can miss clock_polls changes (its RLS reads through clocks), so while any poll is
    // open, refresh on a slow timer to keep the tallies live. A realtime load restarts the timer,
    // and it stops on its own the moment no poll is left open.
    useEffect(() => {
        if (!enabled) return;
        if (!polls.some((p) => !p.resolved_at)) return;
        const id = setTimeout(() => { load(); }, OPEN_POLL_REFRESH_MS);
        return () => clearTimeout(id);
    }, [enabled, polls, load]);

    useEffect(() => {
        if (!enabled || resolvingRef.current) return;
        const hasDue = polls.some(
            (p) => !p.resolved_at && new Date(p.closes_at).getTime() <= now,
        );
        if (!hasDue) return;
        resolvingRef.current = true;
        Promise.resolve()
            .then(() => load())
            .finally(() => {
                resolvingRef.current = false;
            });
    }, [enabled, polls, now, load]);

    const votingRef = useRef(new Set());

    const vote = useCallback(async (pollId, choice) => {
        // One vote per poll in flight, so a fast switch can't land its RPC responses out of order
        // and clobber the newer tally.
        if (votingRef.current.has(pollId)) return {};
        votingRef.current.add(pollId);
        try {
            const { data, error } = await supabase.rpc("vote_poll", {
                p_poll_id: pollId,
                p_choice: choice,
            });
            if (error) return { error };
            setPolls((prev) => prev.map((p) => (p.id === pollId
                ? { ...p, votes_a: data.votes_a, votes_b: data.votes_b, my_choice: data.my_choice }
                : p)));
            // A decisive quorum (or a tutorial poll's single vote) can make the poll ready the
            // moment this vote lands. Refetching runs get_clock_polls' finalise_due_polls sweep,
            // so the winner merges and onResolve fires without waiting for the next timer tick.
            await load();
            return { data };
        } finally {
            votingRef.current.delete(pollId);
        }
    }, [load]);

    return { polls: enabled ? polls : [], now, vote, reload: load };
}
