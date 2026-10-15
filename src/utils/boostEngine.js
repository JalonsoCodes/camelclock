import { BOOSTS } from "@/utils/grids";

const MAX_QUEUE = 4;

function frameInterval(def) {
    if (def.durationMs && def.frames > 1) return def.durationMs / (def.frames - 1);
    return def.frameDurationMs ?? 100;
}

export function createBoostEngine(onTick) {
    const motion = { cur: null };
    const queue = [];
    const effects = new Map();
    const overlayQueues = new Map();
    const timers = new Map();

    function clearTimer(key) {
        const existing = timers.get(key);
        if (existing) {
            clearTimeout(existing);
            timers.delete(key);
        }
    }

    function schedule(key, fn, ms) {
        clearTimer(key);
        timers.set(key, setTimeout(fn, ms));
    }

    function stopEffect(id) {
        clearTimer(id);
        effects.delete(id);
        onTick();
        const cat = BOOSTS[id]?.category;
        if (!cat) return;
        const pending = overlayQueues.get(cat);
        if (!pending?.length) return;
        const nextId = pending.shift();
        if (pending.length === 0) overlayQueues.delete(cat);
        startEffect(nextId);
    }

    function advanceEffect(id) {
        const frame = effects.get(id);
        const def = BOOSTS[id];
        if (frame == null || !def) return;
        const next = frame + 1;
        if (next >= def.frames) {
            stopEffect(id);
            return;
        }
        effects.set(id, next);
        onTick();
        schedule(id, () => advanceEffect(id), frameInterval(def));
    }

    function startEffect(id) {
        if (effects.has(id)) return false;
        const def = BOOSTS[id];
        if (!def) return false;
        if (def.category) {
            for (const activeId of effects.keys()) {
                if (BOOSTS[activeId]?.category !== def.category) continue;
                const pending = overlayQueues.get(def.category) ?? [];
                if (pending.includes(id) || pending.length >= MAX_QUEUE) return false;
                overlayQueues.set(def.category, [...pending, id]);
                return true;
            }
        }
        effects.set(id, 0);
        onTick();
        schedule(id, () => advanceEffect(id), frameInterval(def));
        return true;
    }

    function beginMotion(id) {
        motion.cur = { id, frame: 0 };
        onTick();
        schedule("motion", advanceMotion, frameInterval(BOOSTS[id]));
    }

    function advanceMotion() {
        clearTimer("motion");
        const cur = motion.cur;
        if (!cur) return;
        const def = BOOSTS[cur.id];
        if (!def) {
            motion.cur = null;
            onTick();
            return;
        }
        if (cur.frame >= def.frames - 1) {
            const nextId = queue.shift();
            if (nextId == null) {
                motion.cur = null;
                onTick();
                return;
            }
            beginMotion(nextId);
            return;
        }
        cur.frame += 1;
        onTick();
        schedule("motion", advanceMotion, frameInterval(def));
    }

    function startMotion(id) {
        if (motion.cur) {
            if (queue.includes(id)) return false;
            if (queue.length >= MAX_QUEUE) return false;
            queue.push(id);
            return true;
        }
        beginMotion(id);
        return true;
    }

    /* Hard-stops a specific effect wherever it is — running overlay, queued overlay, the current
       motion or a queued one. Used by a preview so leaving the control drops its effect at once,
       rather than letting a pushup or a sparkle play out after the cursor has gone. */
    function stop(id) {
        if (effects.has(id)) {
            clearTimer(id);
            effects.delete(id);
            onTick();
        }
        const cat = BOOSTS[id]?.category;
        if (cat) {
            const pending = overlayQueues.get(cat);
            const idx = pending ? pending.indexOf(id) : -1;
            if (idx !== -1) {
                pending.splice(idx, 1);
                if (pending.length === 0) overlayQueues.delete(cat);
            }
        }
        if (motion.cur?.id === id) {
            clearTimer("motion");
            motion.cur = null;
            onTick();
        } else {
            const idx = queue.indexOf(id);
            if (idx !== -1) queue.splice(idx, 1);
        }
    }

    /* Reactions cut the line. hop and legend are what a person did just now, so they must land
       immediately rather than sitting behind an exercise anim that is up to a second and a half
       long — anything already running or queued is dropped, which costs nothing because both
       reactions are short and re-triggerable. */
    function startReactive(id) {
        clearTimer("motion");
        motion.cur = null;
        queue.length = 0;
        return startMotion(id);
    }

    return {
        start(id) {
            const def = BOOSTS[id];
            if (!def) return false;
            if (def.reactive) return startReactive(id);
            if (def.overlay) return startEffect(id);
            return startMotion(id);
        },
        stop,
        snapshot() {
            return { motion: motion.cur, effects: new Map(effects) };
        },
        destroy() {
            for (const key of [...timers.keys()]) clearTimer(key);
            motion.cur = null;
            queue.length = 0;
            effects.clear();
            overlayQueues.clear();
        },
    };
}
