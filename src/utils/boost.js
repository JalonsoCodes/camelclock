import { BOOSTS } from "./grids";

export const BOOST_CATEGORIES = ["exercise", "aura", "weather"];

// Quest ladder — KEEP IN SYNC with the SQL quest_level(bigint) function in
// supabase/migrations. Each entry is the cumulative hydrate_count threshold that takes the clock
// to LEVEL N+1, so level = thresholds passed + 1 and the ladder starts at LEVEL 1 for a clock
// with no hydrations. MAX_LEVEL is the ceiling, which is why the last two thresholds both sit at
// the top of the ladder: the final one can never be "passed" into a further level.
export const QUEST_LEVELS = [
    { level: 1, hydrations: 10 },
    { level: 2, hydrations: 50 },
    { level: 3, hydrations: 100 },
    { level: 4, hydrations: 250 },
    { level: 5, hydrations: 500 },
];

export const MAX_LEVEL = QUEST_LEVELS.length;

// How long the hydration splash washes over the camel. Shared so the tour can wait for the wash
// to finish before it puts the next tip on screen.
export const HYDRATION_SPLASH_MS = 675;

// Two new effects per level reached, which is what makes a ladder of 4 gated pairs exactly
// right for the 5 levels above. Level 1 is the free one (shine) and has no pair.
export const UNLOCK_PAIR_SIZE = 2;

export function dailyDropQuota(date = new Date()) {
    // Stable per UTC day (15–25) so JS and SQL agree without storing it. This is a per-USER pool
    // shared across every clock the owner has.
    const days = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
    return 15 + (((days % 11) + 11) % 11);
}

export function computeDropLeft(dropDay, dropUsed) {
    if (typeof dropUsed !== "number") return undefined;
    const today = new Date().toISOString().slice(0, 10);
    return dropDay === today ? Math.max(0, dailyDropQuota() - dropUsed) : dailyDropQuota();
}

// The daily pool is shared by every hydrator, so the claim note is no longer owner-only. The
// caller decides who sees it (the camel keeps its own isOwner guard); this just words it.
export function hydrateNoteText({ dropLeft = 0 } = {}) {
    if (dropLeft > 0) return `${dropLeft} CLAIMABLE TODAY`;
    return "NO CLAIMABLE HYDRATIONS TODAY \u2014 SHARE TO GROW";
}

export function questState({ count = 0, floorLevel } = {}) {
    const c = Math.max(0, Number(count) || 0);
    let satisfied = 0;
    for (const q of QUEST_LEVELS) {
        if (c >= q.hydrations) satisfied += 1;
        else break;
    }
    const floor = Math.max(0, Math.min(MAX_LEVEL, (Number(floorLevel) || 1) - 1));
    satisfied = Math.max(satisfied, floor);
    const level = Math.max(1, Math.min(MAX_LEVEL, satisfied + 1));
    // MAX_LEVEL is the ceiling, so the final threshold cannot be "passed" into a further level —
    // reaching LEVEL 5 is the top of the ladder, not the start of LEVEL 6.
    const maxed = level >= MAX_LEVEL;
    const next = QUEST_LEVELS[Math.min(satisfied, QUEST_LEVELS.length - 1)];
    const prevHydrates = satisfied > 0 ? QUEST_LEVELS[satisfied - 1].hydrations : 0;
    const span = Math.max(1, next.hydrations - prevHydrates);
    const countProgress = maxed ? 1 : Math.max(0, Math.min(1, (c - prevHydrates) / span));
    const hydratesToNext = maxed ? 0 : Math.max(0, next.hydrations - c);
    return { level, next, maxed, countProgress, hydratesToNext };
}

// Count-only approximated level (dashboard cards / showcase sheet): fits the QUEST_LEVELS thresholds.
export function levelFromCount(count) {
    const c = Math.max(0, Number(count) || 0);
    let level = 1;
    for (const q of QUEST_LEVELS) {
        if (c >= q.hydrations) level = Math.min(MAX_LEVEL, q.level + 1);
        else break;
    }
    return Math.max(1, Math.min(MAX_LEVEL, level));
}

// Count-only "X HYDRATIONS TO LEVEL Y" (boost test harness).
export function clicksToNextLevel(count) {
    const c = Math.max(0, Number(count) || 0);
    for (const q of QUEST_LEVELS) {
        if (c < q.hydrations) return q.hydrations - c;
    }
    return 0;
}

/* Effect partition. FREE_BOOST_IDS is the level-1 rung every clock already has; GATED_BOOST_IDS
   is the pool a clock's own ladder is drawn from. Reactive effects are in neither — they are not
   unlockable, they are reactions. */
export const FREE_BOOST_IDS = Object.values(BOOSTS)
    .filter((def) => !def.reactive && def.startsUnlocked)
    .map((def) => def.id);

export const GATED_BOOST_IDS = Object.values(BOOSTS)
    .filter((def) => !def.reactive && !def.startsUnlocked)
    .map((def) => def.id);

export function boostDefsByCategory() {
    const out = {};
    for (const category of BOOST_CATEGORIES) out[category] = [];
    for (const def of Object.values(BOOSTS)) {
        if (def.reactive || !def.category) continue;
        out[def.category]?.push(def);
    }
    return out;
}

// Small deterministic PRNG. The ladder is decided once at creation and then lives in the
// database, so nothing here has to be reproducible across renders — it just has to be
// uniformly random.
function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffled(list, rng) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function randomBoostSeed() {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        return crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 0xffffffff);
}

/* Builds a clock's reveal order: the gated pool shuffled, then dealt ROUND-ROBIN across the
   categories into a flat list. Dealing round-robin is what guarantees the "two effects from
   different categories" rule — within a round every entry is a different category, and across a
   round boundary the last category of one round differs from the first of the next. A
   shuffle-then-repair pass cannot promise that: a repair swap can push a duplicate into a later
   pair that has nothing left to trade with.

   The flat list is chunked into pairs by boostLadderFor, so index 0-1 is level 2, 2-3 is level 3
   and so on. With an odd pool the last chunk is a single effect, which the ladder renders as a
   one-item reveal rather than pretending the pair exists. */
export function shuffleBoostOrder(seed = randomBoostSeed()) {
    const rng = mulberry32(seed);
    const byCategory = {};
    for (const id of GATED_BOOST_IDS) {
        const category = BOOSTS[id]?.category;
        if (!category) continue;
        (byCategory[category] ??= []).push(id);
    }
    const lanes = shuffled(BOOST_CATEGORIES.filter((c) => byCategory[c]?.length), rng);
    for (const lane of lanes) byCategory[lane] = shuffled(byCategory[lane], rng);

    const order = [];
    let dealt = true;
    while (dealt) {
        dealt = false;
        for (const lane of lanes) {
            const next = byCategory[lane].pop();
            if (next == null) continue;
            order.push(next);
            dealt = true;
        }
    }
    return order;
}

// Used when a row has no usable boost_order: a hand-written, rule-abiding ladder so the clock
// still shows something sensible rather than an empty one.
export const DEFAULT_BOOST_ORDER = ["pushup", "sparkle", "sun", "jack", "fireworks", "rain", "sandstorm"];

// Tolerant on purpose. boost_order is fixed at creation and never rewritten, so a clock saved
// before an effect was added keeps its shorter order and that is correct — the ladder simply
// has a thinner last rung. Only a wholly unusable value falls back to the default.
export function normaliseBoostOrder(order) {
    if (!Array.isArray(order)) return DEFAULT_BOOST_ORDER;
    const seen = new Set();
    const ids = [];
    for (const entry of order) {
        const id = typeof entry === "string" ? entry : entry?.id;
        if (!id || seen.has(id)) continue;
        const def = BOOSTS[id];
        if (!def || def.reactive || def.startsUnlocked) continue;
        seen.add(id);
        ids.push(id);
    }
    return ids.length > 0 ? ids : DEFAULT_BOOST_ORDER;
}

// [{ level: 1, ids: ["shine"] }, { level: 2, ids: ["pushup", "sparkle"] }, ...]
export function boostLadderFor(order) {
    const ids = normaliseBoostOrder(order);
    const ladder = [{ level: 1, ids: [...FREE_BOOST_IDS] }];
    for (let i = 0; i < ids.length; i += UNLOCK_PAIR_SIZE) {
        const level = 2 + i / UNLOCK_PAIR_SIZE;
        if (level > MAX_LEVEL) break;
        ladder.push({ level, ids: ids.slice(i, i + UNLOCK_PAIR_SIZE) });
    }
    return ladder;
}

export function unlockedBoostIdsFor(order, level) {
    const ids = new Set(FREE_BOOST_IDS);
    for (const entry of boostLadderFor(order)) {
        if (entry.level > level) continue;
        for (const id of entry.ids) ids.add(id);
    }
    return ids;
}

/* Per-category unlock state for the viewer. A bar reads how much of that category has been
   UNLOCKED, not how far the hydration count has travelled — it is a step function, so it only
   moves when a level hands over a new effect. Hydration count progress belongs to the single
   global bar, which every category legitimately shares.

   `ownedIds` (optional) narrows the tally to effects the clock actually owns. Revealed-but-unwon
   poll candidates stay out until a vote merges a winner, so the count never credits an effect the
   community hasn't picked yet. */
export function categoryProgress(order, level, ownedIds = null) {
    const unlockedIds = unlockedBoostIdsFor(order, level);
    const defs = boostDefsByCategory();

    return BOOST_CATEGORIES.map((category) => {
        const ids = defs[category] ?? [];
        const owned = ids.filter(
            (def) => unlockedIds.has(def.id) && (!ownedIds || ownedIds.has(def.id)),
        );
        return {
            category,
            total: ids.length,
            unlocked: owned.length,
            unlockedIds: owned.map((def) => def.id),
            maxed: ids.length > 0 && owned.length >= ids.length,
        };
    });
}
