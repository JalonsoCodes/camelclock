"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import CamelClock from "./CamelClock";
import { formatClockTime, formatFinishRow } from "@/utils/clockValues";
import { BOOSTS, wearables as wearableData, wearablesByCategory } from "@/utils/grids";
import {
    BOOST_CATEGORIES,
    DEFAULT_BOOST_ORDER,
    MAX_LEVEL,
    boostDefsByCategory,
    clicksToNextLevel,
    levelFromCount,
    normaliseBoostOrder,
    shuffleBoostOrder,
    unlockedBoostIdsFor,
} from "@/utils/boost";

const CATEGORY_LABEL = { exercise: "EXERCISE", aura: "AURA", weather: "WEATHER" };
const SLOT_LABEL = { head: "HEAD", eyes: "EYES", face: "FACE", neck: "NECK", feet: "FEET" };

export default function BoostTestHarness() {
    const camelRef = useRef(null);
    const [target] = useState(() => new Date(Date.now() + 40 * 86400000));
    const [equipped, setEquipped] = useState(() => new Set([]));
    const [equippedWearables, setEquippedWearables] = useState([]);
    const [hydrateCount, setHydrateCount] = useState(0);
    const [level, setLevel] = useState(1);
    const [dark, setDark] = useState(false);
    const [boostOrder, setBoostOrder] = useState(() => DEFAULT_BOOST_ORDER);

    const defsByCategory = boostDefsByCategory();

    const toggleEquip = (id) => {
        const def = BOOSTS[id];
        setEquipped((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                return next;
            }
            /* One per category, even here — the limit is what the ladder is balanced around, so
               a lab that allowed three at once would not show what an owner can actually build. */
            for (const other of [...next]) {
                if (BOOSTS[other]?.category === def?.category) next.delete(other);
            }
            next.add(id);
            return next;
        });
    };

    const pickEffect = (id) => {
        const wasEquipped = equipped.has(id);
        toggleEquip(id);
        /* Equipping does not run anything here — the clock's cadence is switched off on this
           camel, so a run only happens when you ask for it. That is the whole point: one run to
           look at, rather than the same animation every ten seconds. */
        if (!wasEquipped) camelRef.current?.triggerNow(id);
    };

    const toggleWearable = (id) => {
        setEquippedWearables((prev) => {
            if (prev.includes(id)) return prev.filter((w) => w !== id);
            const cat = wearableData[id]?.category;
            return [...prev.filter((w) => wearableData[w]?.category !== cat), id];
        });
    };

    const handleHydrate = () => {
        /* A real hydration hops the camel (see startReactive in boostEngine), so the reaction is
           tested through the button that causes it rather than a button of its own. */
        camelRef.current?.triggerNow("hop");
        setHydrateCount((count) => count + 1);
    };

    const handleLevelUp = () => {
        if (level >= MAX_LEVEL) return;
        camelRef.current?.triggerNow("legend");
        setLevel((current) => current + 1);
    };

    const toggleTheme = () => {
        document.documentElement.classList.toggle("dark");
        setDark(!dark);
    };

    const equippedBoosts = [...equipped].map((id) => ({ id }));

    const wearablesBySlot = wearablesByCategory();

    return (
        <div className="boost-test">
            {/* Same three-band shape as the viewer: pick on the sides, look at the middle. */}
            <div className="boost-test-col boost-test-col-wearables">
                <span className="boost-test-label">WEARABLES</span>
                <p className="boost-test-sub">One per slot. Wearables are drawn under every effect.</p>
                <button type="button" className="boost-test-btn nbtc" onClick={() => setEquippedWearables([])}>
                    CLEAR
                </button>
                {wearablesBySlot.map(([slot, items]) => (
                    <div key={slot} className="boost-test-section">
                        <span className="boost-test-slot">{SLOT_LABEL[slot] ?? slot.toUpperCase()}</span>
                        <div className="boost-test-chips">
                            {items.map((item) => {
                                const on = equippedWearables.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`boost-chip${on ? " selected" : " available"}`}
                                        title={item.name}
                                        onClick={() => toggleWearable(item.id)}
                                    >
                                        {on && <Check className="boost-chip-tick" size={14} strokeWidth={4} aria-hidden="true" />}
                                        <span className="boost-chip-emoji" aria-hidden="true">{item.emoji}</span>
                                        <span className="boost-chip-name">{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="boost-test-camel nbtc">
                <CamelClock
                    ref={camelRef}
                    title="BOOST TEST"
                    month={target.getMonth()}
                    day={target.getDate()}
                    time={formatClockTime(target)}
                    targetAt={target.toISOString()}
                    introText="One run per click."
                    celebrationMessage="TARGET!"
                    primaryColour="#DBB279"
                    secondaryColour="#8E652C"
                    celebrationType="spit"
                    wearables={equippedWearables}
                    boosts={equippedBoosts}
                    boostCadence={false}
                    showWatermark
                    watermarkExternal
                    viewerHydrates
                    onHydrateClick={handleHydrate}
                    finishRowText={formatFinishRow(target)}
                    hydrateCount={hydrateCount}
                    level={level}
                />
            </div>

            <div className="boost-test-col boost-test-col-effects">
                <span className="boost-test-label">BOOST EFFECTS</span>
                <p className="boost-test-sub">One per category. Click to fit it and watch a single run.</p>
                {BOOST_CATEGORIES.map((category) => (
                    <div key={category} className="boost-test-section">
                        <span className="boost-test-slot">{CATEGORY_LABEL[category]}</span>
                        <div className="boost-test-chips">
                            {(defsByCategory[category] ?? []).map((def) => {
                                const on = equipped.has(def.id);
                                return (
                                    <button
                                        key={def.id}
                                        type="button"
                                        className={`boost-chip${on ? " selected" : " available"}`}
                                        title={def.description}
                                        onClick={() => pickEffect(def.id)}
                                    >
                                        {on && <Check className="boost-chip-tick" size={14} strokeWidth={4} aria-hidden="true" />}
                                        <span className="boost-chip-emoji" aria-hidden="true">{def.icon}</span>
                                        <span className="boost-chip-name">{def.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="boost-test-bench nbtc">
                <div className="boost-test-row">
                    <button type="button" className="boost-test-btn nbtc" onClick={handleHydrate}>
                        HYDRATE +1
                    </button>
                    <button type="button" className="boost-test-btn nbtc" onClick={handleLevelUp}>
                        LEVEL UP
                    </button>
                    <button
                        type="button"
                        className="boost-test-btn nbtc"
                        onClick={() => { setHydrateCount(0); setLevel(1); }}
                    >
                        RESET
                    </button>
                    <button type="button" className="boost-test-btn nbtc" onClick={() => setBoostOrder(shuffleBoostOrder())}>
                        SHUFFLE ORDER
                    </button>
                    <button
                        type="button"
                        className={`boost-test-btn nbtc${dark ? " boost-test-btn-active" : ""}`}
                        onClick={toggleTheme}
                    >
                        {dark ? "DARK" : "LIGHT"}
                    </button>
                </div>
                <div className="boost-test-info">
                    LEVEL {level} · HYDRATIONS {hydrateCount} · LEVEL FROM COUNT {levelFromCount(hydrateCount)}
                    {level >= MAX_LEVEL
                        ? " · MAX LEVEL REACHED"
                        : ` · ${clicksToNextLevel(hydrateCount)} HYDRATIONS TO LEVEL ${level + 1}`}
                </div>
                <div className="boost-test-info">
                    ORDER {normaliseBoostOrder(boostOrder).join(" → ")}
                </div>
                <span className="boost-test-slot">UNLOCKED AT LEVEL {level}</span>
                <div className="boost-test-chips">
                    {[...unlockedBoostIdsFor(boostOrder, level)].map((id) => {
                        const def = BOOSTS[id];
                        if (!def) return null;
                        return (
                            <span key={id} className="boost-test-unlocked nbtc">
                                {def.icon} {def.name}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}