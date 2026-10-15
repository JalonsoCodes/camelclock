"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { BOOSTS } from "@/utils/grids";
import { POLL_QUORUM } from "@/utils/polls";
import { QUEST_LEVELS } from "@/utils/boost";

const STEP_ORDER = ["publish", "hydrate", "camel", "vote", "effect", "rules"];
const TIP_GAP = 16;
const TIP_WIDTH = 320;
const REACH_LEVEL_2 = QUEST_LEVELS[0].hydrations;

// A first-run guided tour over the owner's own clock, driven entirely by the clock's live state.
// It carries no stored step: the natural step is derived from status / hydrate count / the tutorial
// poll, and a local counter lets the reader step forward through the copy-only rungs. Completion
// is persisted server-side by ClockViewer via complete_tutorial().
export default function ClockTour({
    status,
    hydrateCount,
    camelHydrated,
    polls,
    shareOpen,
    targets,
    onComplete,
}) {
    const [localIndex, setLocalIndex] = useState(0);
    const [rect, setRect] = useState(null);
    const [tipSize, setTipSize] = useState({ w: TIP_WIDTH, h: 220 });
    const tipRef = useRef(null);

    const tutorialPoll = polls.find((p) => p.tutorial);
    const tourPoll = tutorialPoll ?? polls.find((p) => p.level === 2) ?? null;
    const isTutorial = !!tourPoll?.tutorial;
    const winner = tourPoll?.winner ? BOOSTS[tourPoll.winner] : null;

    const naturalIndex = (() => {
        if (status !== "live") return 0;
        if (tourPoll) return tourPoll.resolved_at ? 4 : 3;
        if (hydrateCount < 1) return 1;
        return 2;
    })();
    const index = Math.max(naturalIndex, localIndex);
    const step = STEP_ORDER[Math.min(index, STEP_ORDER.length - 1)];

    // Once the owner has hydrated by clicking the camel, this step has made its point: step aside
    // and let the screen lighten. The tour returns on its own once L2 lands and opens the L2 poll
    // (the next natural step), so there is no nagging popup across the 1-9 hydration gap.
    const idle = step === "camel" && camelHydrated;

    const targetEl = idle ? null
        : step === "publish" ? targets.publish?.current
            : step === "hydrate" ? (targets.hydrate?.current || targets.card?.current)
                : step === "camel" ? targets.card?.current
                    : step === "vote" ? targets.poll?.current
                        : step === "effect" ? targets.panel?.current
                            : null;

    useEffect(() => {
        const measure = () => {
            if (!targetEl) {
                setRect(null);
                return;
            }
            const r = targetEl.getBoundingClientRect();
            setRect((prev) => (prev
                && prev.top === r.top && prev.left === r.left
                && prev.width === r.width && prev.height === r.height
                ? prev
                : { top: r.top, left: r.left, width: r.width, height: r.height }));
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
    }, [targetEl, step]);

    useEffect(() => {
        if (tipRef.current) {
            const r = tipRef.current.getBoundingClientRect();
            setTipSize((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }));
        }
    }, [step, rect]);

    // The single bright spot. The scrim darkens the whole viewport; the target itself is lifted
    // above it with a z-index bump, so exactly one control stays fully lit and no neighbouring
    // element glints through an area-based hole.
    useEffect(() => {
        const el = targetEl;
        if (!el) return undefined;
        el.classList.add("clock-tour-peek");
        return () => el.classList.remove("clock-tour-peek");
    }, [targetEl]);

    if (shareOpen || idle) return null;

    const voteResolved = !!tourPoll?.resolved_at
        || (!!tourPoll && !isTutorial && tourPoll.my_choice != null);
    const canAdvance =
        step === "effect" ||
        (step === "vote" && voteResolved) ||
        step === "rules";

    const tipStyle = rect
        ? (() => {
              // The vote poll and boosts wardrobe live in the right rail. Anchor the tip just to
              // the left of them - over the camel's right side - so the rail stays fully visible
              // (and effect previews are not hidden), yet the tip reads as "near the boosts".
              const railStep = step === "vote" || step === "effect";
              const railLeft = rect.left - TIP_GAP - tipSize.w;
              if (railStep && railLeft >= 16) {
                  const top = Math.min(
                      Math.max(rect.top + rect.height / 2 - tipSize.h / 2, 16),
                      window.innerHeight - tipSize.h - 16,
                  );
                  return { top, left: railLeft, width: tipSize.w };
              }
              const left = Math.min(
                  Math.max(rect.left + rect.width / 2 - tipSize.w / 2, 16),
                  window.innerWidth - tipSize.w - 16,
              );
              const below = rect.top + rect.height + TIP_GAP;
              const fitsBelow = below + tipSize.h < window.innerHeight - 16;
              const top = fitsBelow
                  ? below
                  : Math.max(16, rect.top - TIP_GAP - tipSize.h);
              return { top, left, width: tipSize.w };
          })()
        : undefined;

    const next = () => setLocalIndex(index + 1);

    return (
        <div className="clock-tour" role="dialog" aria-modal="false" aria-label="Guided tour">
            <div className="clock-tour-scrim" aria-hidden="true" />

            <div
                ref={tipRef}
                className={`clock-tour-tip nbtc${rect ? " is-anchored" : " is-centered"}`}
                style={tipStyle}
            >
                <div className="clock-tour-head">
                    <span className="clock-tour-step">
                        STEP {index + 1}/{STEP_ORDER.length}
                    </span>
                    <button
                        type="button"
                        className="btn-link btn-secondary clock-tour-skip"
                        onClick={() => onComplete?.()}
                    >
                        <X size={14} strokeWidth={3} aria-hidden="true" />
                        <span>SKIP</span>
                    </button>
                </div>

                {step === "publish" && (
                    <>
                        <h3 className="clock-tour-title">PUBLISH YOUR CLOCK</h3>
                        <p className="clock-tour-body">
                            This is a draft &mdash; only you can see it. Hit PUBLISH to make it
                            live, so anyone with the link can hydrate it.
                        </p>
                    </>
                )}

                {step === "hydrate" && (
                    <>
                        <h3 className="clock-tour-title">HYDRATE YOUR CLOCK</h3>
                        <p className="clock-tour-body">
                            Tap HYDRATE to hydrate. Every hydration counts toward the next level
                            &mdash; reach {REACH_LEVEL_2} to hit LEVEL 2 and unlock two new effects.
                        </p>
                        <p className="clock-tour-progress">
                            {Math.min(hydrateCount, REACH_LEVEL_2)}/{REACH_LEVEL_2} HYDRATIONS
                        </p>
                        <p className="clock-tour-hint">
                            HYDRATE {Math.max(0, REACH_LEVEL_2 - hydrateCount)} MORE TO CONTINUE
                        </p>
                    </>
                )}

                {step === "camel" && (
                    <>
                        <h3 className="clock-tour-title">CLICK THE CAMEL TOO</h3>
                        <p className="clock-tour-body">
                            You can also click the camel to hydrate. Get to LEVEL 2 to unlock your
                            first two effects.
                        </p>
                        <p className="clock-tour-progress">
                            {Math.min(hydrateCount, REACH_LEVEL_2)}/{REACH_LEVEL_2} HYDRATIONS
                        </p>
                        <p className="clock-tour-hint">
                            {Math.max(0, REACH_LEVEL_2 - hydrateCount)} MORE TO LEVEL 2
                        </p>
                    </>
                )}

                {step === "vote" && (
                    <>
                        <h3 className="clock-tour-title">PICK YOUR FIRST EFFECT</h3>
                        <p className="clock-tour-body">
                            Level 2 unlocked two effects. Vote for the one that joins your show &mdash;{" "}
                            {isTutorial
                                ? "this first vote is yours alone, so it settles right away."
                                : "the community picks the winner."}
                        </p>
                        <p className="clock-tour-hint">
                            {voteResolved ? "THAT ONE'S YOURS." : "CAST YOUR VOTE TO CONTINUE"}
                        </p>
                    </>
                )}

                {step === "effect" && (
                    <>
                        <h3 className="clock-tour-title">EQUIP YOUR PRIZE</h3>
                        <p className="clock-tour-body">
                            {winner ? `${winner.name} joined your show. ` : "Your new effect joined the show. "}
                            Add or remove effects any time &mdash; this is your clock&rsquo;s wardrobe.
                        </p>
                    </>
                )}

                {step === "rules" && (
                    <>
                        <h3 className="clock-tour-title">HOW VOTES WORK</h3>
                        <p className="clock-tour-body">
                            Every level unlocks two effects, and the community picks the winner.
                            Polls close after 24 hours &mdash; or sooner once {POLL_QUORUM} votes
                            agree.
                        </p>
                    </>
                )}

                <div className="clock-tour-actions">
                    {step === "rules" ? (
                        <button
                            type="button"
                            className="btn-link clock-tour-primary"
                            onClick={() => onComplete?.()}
                        >
                            GOT IT
                        </button>
                    ) : step === "publish" ? null : (
                        <button
                            type="button"
                            className="btn-link clock-tour-primary"
                            onClick={next}
                            disabled={!canAdvance}
                        >
                            NEXT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
