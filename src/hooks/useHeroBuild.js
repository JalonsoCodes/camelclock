"use client";

import { useEffect, useState } from "react";
import { wearables as wearableData } from "@/utils/grids";
import { boostLadderFor, hydratesForLevel } from "@/utils/boost";

/* How long one layer takes to fill itself in. Deliberately the same budget the
   old per-slide reveal used, so the beat feels familiar. */
const FILL_MS = 720;
const STEP_MS = 48;

/* Shown when the hero row itself has no wearables. The wearables step has to land
   something visible or the slide reads as dead. */
const DEFAULT_WEARABLES = ["top_hat", "gold_chain", "rollerskates"];

/* validateWearables keys off category, one per head / neck / feet, but only when
   a row is saved — it never sees a build. The hero's wearables are the hero row's,
   so keep the first of each category and drop the rest, rather than letting two
   necks land on one camel. */
function onePerCategory(ids) {
    const taken = new Set();
    const out = [];
    for (const id of ids) {
        const category = wearableData[id]?.category;
        if (!category || taken.has(category)) continue;
        taken.add(category);
        out.push(id);
    }
    return out;
}

/* A clock only shows boosts its quest level has unlocked, so a boost the hero has
   just equipped needs the count lifted to the threshold that unlocks it under
   this hero's own reveal order. The ladder chunks the order into pairs, so the
   floor is the threshold of the last rung that contains something currently on
   the camel — and landing exactly on a threshold is what makes the meter read
   "0 hydrations to level X" above an empty bar, so a visitor's first tap visibly
   starts filling it. */
function hydrateFloorFor(ids, order) {
    const highest = boostLadderFor(order)
        .filter((entry) => entry.ids.some((id) => ids.includes(id)))
        .reduce((max, entry) => Math.max(max, entry.level), 1);
    return hydratesForLevel(highest);
}

/**
 * The landing hero's build-up.
 *
 * `index` is the step the observer is currently resting on, and it tracks the
 * scroll in both directions: each layer belongs to its own step and to every
 * step after it, so scrolling back up takes the later layers off again rather
 * than leaving a fully-built camel stranded above the fold.
 *
 * Colours are deliberately the one exception. They are the camel's base state
 * and not one of the scroll steps, so they fill in once as the page loads and
 * stay put — a visitor who never scrolls should still get a coloured camel and
 * a title that has finished fading to its own colour. The intro is therefore
 * never a wireframe, only briefly one.
 *
 * A layer you arrive at from *below* animates in; a layer you arrive at from
 * above does not, because that layer is the one that was already there. The
 * layer actually being undone is the one leaving, and it is dropped outright
 * rather than played backwards — see `progressAt`.
 */
export default function useHeroBuild(steps, index, { wearables = [], boostOrder = null } = {}) {
    const [colourFill, setColourFill] = useState(0);
    const [built, setBuilt] = useState(0);
    const [fill, setFill] = useState(1);
    const [rising, setRising] = useState(false);

    /* Render-time adjustment, not an effect: state deriving from an external
       value. An effect here would cascade renders and trip
       react-hooks/set-state-in-effect. */
    if (index !== built) {
        const forward = index > built;
        setRising(forward);
        setBuilt(index);
        /* A backward step is already in the state its layer should hold, so it
           starts full and the fill is skipped entirely. */
        setFill(forward ? 0 : 1);
    }

    /* Both tickers are write-once: they stop themselves at 1 rather than idling
       for the life of the page, and each one re-arms off its own value so the
       interval only exists while there is still distance to cover. */
    useEffect(() => {
        if (colourFill >= 1) return;
        const timer = setInterval(() => {
            const next = Math.min(1, colourFill + STEP_MS / FILL_MS);
            setColourFill(next);
            if (next >= 1) clearInterval(timer);
        }, STEP_MS);
        return () => clearInterval(timer);
    }, [colourFill]);

    useEffect(() => {
        if (fill >= 1) return;
        const timer = setInterval(() => {
            /* Cleared from inside the callback rather than by relying on the
               cleanup alone: a write-once ticker that only stops on unmount
               would leave an interval running for the life of the page. */
            const next = Math.min(1, fill + STEP_MS / FILL_MS);
            setFill(next);
            if (next >= 1) clearInterval(timer);
        }, STEP_MS);
        return () => clearInterval(timer);
    }, [built, fill]);

    const progressAt = (step) => (index > step ? 1 : index < step ? 0 : rising ? fill : 1);

/* Wearables are the hero's own hardcoded set; the step only decides when they
   land. Boosts come from the script instead, because the rack is hand-picked for
   the show it puts on and cannot come from the hero's own rack. */
    const heroWearables = onePerCategory(wearables.length > 0 ? wearables : DEFAULT_WEARABLES);
    const boosts = steps.slice(0, built).flatMap((step) => step.boosts ?? []);

    return {
        colourProgress: colourFill,
        wearableRevealProgress: progressAt(2),
        boostsLive: index >= 3,
        interactive: index >= 4,
        celebrate: index >= 5,
        wearables: index >= 2 ? heroWearables : [],
        boosts,
        hydrateFloor: hydrateFloorFor(boosts, boostOrder),
    };
}
