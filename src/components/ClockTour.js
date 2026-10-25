import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QUEST_LEVELS, HYDRATION_SPLASH_MS, questState } from "@/utils/boost";
import { track } from "@/utils/analytics";
import { tour } from "@/content/tour";

// The guided tour that runs over the owner's own live clock. The two boost rungs only exist
// once the clock has reached level 2, so the tour never claims a level-up that has not happened
// yet - and between the second drink and level 2 there is no rung at all, so the tour simply
// hides until the level-2 poll lands.
const BASE_RUNGS = ["hydrate", "levelbar"];
const BOOST_RUNGS = ["vote", "rack"];
const TAIL_RUNGS = ["daily", "share"];

const TIP_GAP = 16;
const TIP_WIDTH = 320;
// The pointer is a 2.4rem square rotated 45deg. Half of it is 12px, and it has to clear the
// tip's 4px border, so its centre sits 16px outside the border box on the edge it points from.
const POINTER_HALF = 12;
const POINTER_REACH = POINTER_HALF * 2;
const TIP_BORDER = 4;

const SEEN_STORAGE_PREFIX = "camelClock.tourSeen.";

// A first-run guided tour over the owner's own clock, driven entirely by the clock's live state.
// It carries no stored step: the rungs it can show are derived from the clock (the boost rungs
// appear with a level-2 poll), and a set of seen rungs decides where the reader is. Completion is
// persisted server-side by ClockViewer via complete_tutorial().
//
// The steps that can be gated on something the reader does (drink, level up, vote) carry no
// button at all - the tour moves on when the action lands. The copy-only steps keep a real NEXT
// button, because there is nothing to wait for.
export default function ClockTour({
    clockId,
    hydrateCount,
    animating = false,
    polls,
    shareOpen,
    targets,
    onComplete,
}) {
    const [seen, setSeen] = useState(() => new Set());
    const [storageReady, setStorageReady] = useState(false);
    const [target, setTarget] = useState(null);
    const [rect, setRect] = useState(null);
    const [tipSize, setTipSize] = useState({ w: TIP_WIDTH, h: 220 });
    const [tipPos, setTipPos] = useState(null);
    const [pointer, setPointer] = useState(null);
    const tipRef = useRef(null);

    const tutorialPoll = polls.find((p) => p.tutorial);
    const tourPoll = tutorialPoll ?? polls.find((p) => p.level === 2) ?? null;

    // The reader's own vote is enough to move the tour on - the boost may not be unlocked until
    // the poll settles, but the reader has done their part and must never get stuck waiting.
    const voteResolved = !!tourPoll?.resolved_at || tourPoll?.my_choice != null;

    // The level step is about the first level-up, so its countdown always points at the level
    // the level-2 poll unlocks. The ladder is the source of truth for that threshold.
    const targetLevel = QUEST_LEVELS[0].level + 1;
    const drinksToNext = Math.max(0, QUEST_LEVELS[0].hydrations - hydrateCount);

    // Level comes from the count the reader can see, not from a stored step. The poll is born in
    // the same transaction as the level-up, so this is the exact moment the boost rungs are due.
    const level = questState({ count: hydrateCount }).level;

    // The count when the tour opened, and the count whose splash has finished playing. A drink
    // only counts once its wash is over, so the next tip never lands on top of the animation.
    const [countAtOpen] = useState(() => hydrateCount);
    const [settledCount, setSettledCount] = useState(() => hydrateCount);

    useEffect(() => {
        if (hydrateCount <= settledCount) return undefined;
        const id = setTimeout(() => setSettledCount(hydrateCount), HYDRATION_SPLASH_MS);
        return () => clearTimeout(id);
    }, [hydrateCount, settledCount]);

    // Drinks that have finished playing. The drink step ends on the first one, the level step on
    // the next - so a clock that was already hydrated still has to be tapped.
    const drinks = Math.max(0, settledCount - countAtOpen);

    // The rungs that wait on the reader's own action are never stored: they are derived from
    // the clock's live state, so the tour simply moves on when the action lands.
    const done = useMemo(() => {
        const s = new Set(seen);
        if (drinks >= 1) s.add("hydrate");
        if (drinks >= 2) s.add("levelbar");
        // Reaching level 2 proves both base drinks happened, even on a fresh load whose
        // countAtOpen is already past them - so the tour resumes at the vote, not the drinks.
        if (level >= 2) {
            s.add("hydrate");
            s.add("levelbar");
        }
        if (voteResolved) s.add("vote");
        return s;
    }, [seen, drinks, level, voteResolved]);

    // Completion is per clock and survives a reload: a reader who has already seen the tail must
    // not be shown it again just because the earlier rungs derive from this session's drinks.
    // The read happens in an effect (never in the state initialiser) so server and client match.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!clockId) {
            setStorageReady(true);
            return;
        }
        try {
            const raw = window.localStorage.getItem(SEEN_STORAGE_PREFIX + clockId);
            const stored = raw ? JSON.parse(raw) : null;
            if (Array.isArray(stored) && stored.length > 0) {
                setSeen(new Set(stored));
            }
        } catch {
            // A broken/bloked store just means the tour starts fresh.
        }
        setStorageReady(true);
    }, [clockId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // The tail rungs only exist once the boost rungs have actually been seen, so a reader who
    // exits before the poll lands never gets a "last step" they can't understand.
    const boostSeen = done.has("vote") && done.has("rack");
    const rungs = useMemo(() => [
        ...BASE_RUNGS,
        ...(level >= 2 ? BOOST_RUNGS : []),
        ...(level >= 2 && boostSeen ? TAIL_RUNGS : []),
    ], [level, boostSeen]);

    // The rung the reader is on: the first one they have not seen yet. When there is none - a
    // reader who has drunk twice but not yet reached level 2 - the tour hides entirely rather
    // than offering a soft exit, and comes back when the level-2 poll lands.
    const rung = rungs.find((r) => !done.has(r)) ?? null;
    const rungIndex = rung ? rungs.indexOf(rung) : -1;

    // Fold everything derived (drinks, poll resolution) into the stored set, so a reload can't
    // replay a step the reader has already passed.
    useEffect(() => {
        if (!storageReady || !clockId) return;
        try {
            window.localStorage.setItem(SEEN_STORAGE_PREFIX + clockId, JSON.stringify([...done]));
        } catch {
            // Best-effort only; the server-side tutorial stamp is the durable record.
        }
    }, [done, storageReady, clockId]);

    // The targets arrive as a fresh object every render, so the element is resolved from a ref
    // inside the measuring effect rather than during render.
    const targetsRef = useRef(targets);
    useEffect(() => {
        targetsRef.current = targets;
    });

    const resolveTarget = useCallback((name) => {
        const t = targetsRef.current || {};
        if (name === "hydrate") return t.camel?.current || t.card?.current || null;
        if (name === "levelbar") return t.levelLabel?.current || t.level?.current || t.card?.current || null;
        if (name === "vote") return t.poll?.current || t.panel?.current || t.card?.current || null;
        if (name === "rack") return t.panel?.current || t.card?.current || null;
        if (name === "daily") return t.daily?.current || t.card?.current || null;
        if (name === "share") return t.share?.current || t.top?.current || t.card?.current || null;
        if (name === "title") return t.title?.current || null;
        return null;
    }, []);

    useEffect(() => {
        // The tip is placed next to the target, never over it. The position is measured here
        // rather than during render so the component stays safe to server-render.
        const place = (r) => {
            if (!r) {
                setTipPos(null);
                return;
            }
            const width = Math.min(tipSize.w, Math.max(window.innerWidth - 32, 200));
            const clampTop = (value) => Math.min(
                Math.max(value, 16),
                window.innerHeight - tipSize.h - 16,
            );
            const clampLeft = (value) => Math.min(
                Math.max(value, 16),
                window.innerWidth - width - 16,
            );
            // The vote poll and boost rack live in the right rail. Anchor the tip just to the
            // left of them - over the camel's right side - so the rail stays fully visible, yet
            // the tip reads as "near the boosts".
            const railStep = rung === "vote" || rung === "rack";
            const railLeft = r.left - TIP_GAP - width;
            const card = targetsRef.current?.card?.current;
            const cardRect = card?.getBoundingClientRect();
            const cardLeft = cardRect ? cardRect.left : r.left;
            const cardWidth = cardRect ? cardRect.width : r.width;
            let top;
            let left;
            if (rung === "hydrate") {
                // The drink tip sits over the card itself, high up: its bottom aligns with the
                // title's bottom so it covers the creator row + title and stops above the art.
                // The tail points down out of the card at the camel, which stays tappable.
                const titleRect = resolveTarget("title")?.getBoundingClientRect();
                const bottom = titleRect ? titleRect.bottom : r.top - TIP_GAP;
                left = clampLeft(cardLeft + cardWidth / 2 - width / 2);
                top = clampTop(bottom - tipSize.h);
            } else if (rung === "levelbar") {
                // Sit the tail's point against the LEVEL label's left edge, overlapping the card
                // slightly: the tip is pulled back by the pointer's reach so it never covers the
                // start of the word, while still landing on the camel card.
                left = r.left - width - POINTER_REACH;
                if (left >= 16) {
                    top = clampTop(r.top + r.height / 2 - tipSize.h / 2);
                } else {
                    // No room beside the label (the <=1200px stacked card spans the viewport):
                    // drop it under the label instead, still clear of the camel art.
                    left = clampLeft(r.left + r.width / 2 - width / 2);
                    const below = r.bottom + TIP_GAP;
                    top = below + tipSize.h < window.innerHeight - 16
                        ? below
                        : Math.max(16, r.top - TIP_GAP - tipSize.h);
                }
            } else if (railStep && railLeft >= 16) {
                left = railLeft;
                top = Math.min(
                    Math.max(r.top + r.height / 2 - tipSize.h / 2, 16),
                    window.innerHeight - tipSize.h - 16,
                );
            } else {
                left = Math.min(
                    Math.max(r.left + r.width / 2 - width / 2, 16),
                    window.innerWidth - width - 16,
                );
                const below = r.top + r.height + TIP_GAP;
                top = below + tipSize.h < window.innerHeight - 16
                    ? below
                    : Math.max(16, r.top - TIP_GAP - tipSize.h);
            }
            setTipPos((prev) => (prev
                && prev.top === top && prev.left === left && prev.width === width
                ? prev
                : { top, left, width }));
        };

        const measure = () => {
            const el = resolveTarget(rung);
            setTarget((prev) => (prev === el ? prev : el));
            if (!el) {
                setRect(null);
                place(null);
                return;
            }
            const r = el.getBoundingClientRect();
            setRect((prev) => (prev
                && prev.top === r.top && prev.left === r.left
                && prev.width === r.width && prev.height === r.height
                ? prev
                : { top: r.top, left: r.left, width: r.width, height: r.height }));
            place(r);
        };

        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);
        // The target can mount or move after the first paint (a poll banner appears, the viewer
        // restacks at <=1200px), so keep a slow poll going while this step is open.
        const id = setInterval(measure, 400);
        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
            clearInterval(id);
        };
    }, [rung, resolveTarget, rect, tipSize]);

    useEffect(() => {
        if (tipRef.current) {
            const r = tipRef.current.getBoundingClientRect();
            setTipSize((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
        }
    }, [rung, rect]);

    // The single bright spot. The scrim darkens and greyscales the whole viewport; the target
    // itself is lifted above it with a z-index bump, so exactly one control stays fully lit and no
    // neighbour glints through an area-based hole. The level step measures the label but lifts the
    // whole banner, so the water-coloured boxes stay in colour too. The rack step lifts the whole
    // boost panel.
    useEffect(() => {
        const el = rung === "levelbar"
            ? (targetsRef.current?.level?.current || target)
            : rung === "rack"
                ? (targetsRef.current?.panel?.current || target)
                : target;
        if (!el) return undefined;
        el.classList.add("clock-tour-peek");
        return () => el.classList.remove("clock-tour-peek");
    }, [target, rung]);

    // The tip is placed next to the target, never over it - the position lives in tipPos, set
    // from the measuring effect above so the component stays safe to server-render.

    // The pointer sits on the tip's edge that faces the target. It is measured against the tip's
    // border box, not its padding box, so it actually clears the 4px border instead of hiding
    // inside the card.
    useEffect(() => {
        if (!rect || !tipRef.current) {
            setPointer(null);
            return;
        }
        const tip = tipRef.current.getBoundingClientRect();
        // Point from the tip's centre toward the target's centre. Comparing the two axes is
        // steadier than the old largest-gap test when the tip slightly overlaps its target (the
        // daily note sits just above/below the tip, the level label just beside it).
        const dx = (rect.left + rect.width / 2) - (tip.left + tip.width / 2);
        const dy = (rect.top + rect.height / 2) - (tip.top + tip.height / 2);
        const side = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? "right" : "left")
            : (dy > 0 ? "bottom" : "top");
        const horizontal = side === "top" || side === "bottom";
        const along = horizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        const from = horizontal ? tip.left : tip.top;
        const span = horizontal ? tip.width : tip.height;
        const offset = Math.min(
            Math.max(along - from - TIP_BORDER - POINTER_HALF, 0),
            Math.max(span - POINTER_HALF * 2, 0),
        );
        setPointer((prev) => (prev && prev.side === side && prev.offset === offset ? prev : { side, offset }));
    }, [rect, tipSize, tipPos]);

    if (!storageReady || !rung || shareOpen) return null;

    // The steps that wait on the reader's own action carry no button: the tour moves on when
    // the action lands. The copy-only steps keep a real NEXT button, and only the true final
    // rung (share) offers DONE - `rack` must stay a NEXT so it can reveal the tail rungs.
    const gated = rung === "hydrate" || rung === "levelbar" || rung === "vote";

    const next = () => setSeen((prev) => new Set([...prev, rung]));

    const finish = (outcome) => {
        track("tour_completed", { skipped: outcome !== "done", lastStep: rung });
        onComplete?.(outcome);
    };

    const copy = tour.steps[rung];

    return (
            <div className="clock-tour" role="dialog" aria-modal="false" aria-label={tour.ariaLabel || "Guided tour"}>
            <div className={`clock-tour-scrim${animating ? " is-colour" : ""}`} aria-hidden="true" />

            <div
                ref={tipRef}
                className={`clock-tour-tip nbtc${tipPos ? " is-anchored" : " is-centered"}${animating ? " is-hidden" : ""}`}
                style={tipPos ? { top: tipPos.top, left: tipPos.left, width: tipPos.width } : undefined}
            >
                {pointer && (
                    <span
                        className={`clock-tour-tail clock-tour-tail-${pointer.side}`}
                        style={pointer.side === "top" || pointer.side === "bottom"
                            ? { left: pointer.offset }
                            : { top: pointer.offset }}
                        aria-hidden="true"
                    />
                )}

                <div className="clock-tour-tip-inner">
                    <div className="clock-tour-head">
                        <span className="clock-tour-step">
                            STEP {rungIndex + 1}/{rungs.length}
                        </span>
                        <button
                            type="button"
                            className="text-link clock-tour-skip"
                            onClick={() => finish("skipped")}
                        >
                            {tour.skipLabel}
                        </button>
                    </div>

                    <h3 className="clock-tour-title">{copy.title}</h3>
                    <p className="clock-tour-body">{copy.body}</p>

                    {rung === "hydrate" && (
                        <p className="clock-tour-hint clock-tour-hint--action">
                            {hydrateCount >= 1 ? tour.hydrateElsewhere : tour.hydrateHint}
                        </p>
                    )}

                    {rung === "levelbar" && (
                        <p className="clock-tour-hint clock-tour-hint--action">
                            {tour.levelHint
                                .replace("{count}", String(drinksToNext))
                                .replace("{level}", String(targetLevel))}
                        </p>
                    )}

                    {rung === "vote" && (
                        <p className="clock-tour-hint clock-tour-hint--action">
                            {tour.voteHint}
                        </p>
                    )}

                    {rung === "share" ? (
                        <div className="clock-tour-actions">
                            <button
                                type="button"
                                className="btn-link clock-tour-primary"
                                onClick={() => finish("done")}
                            >
                                {tour.doneLabel}
                            </button>
                        </div>
                    ) : gated ? null : (
                        <div className="clock-tour-actions">
                            <button
                                type="button"
                                className="btn-link clock-tour-primary"
                                onClick={next}
                            >
                                {tour.nextLabel}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
