"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Check, Keyboard, Play, Save, Shuffle } from "lucide-react";
import CamelClock from "./CamelClock";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";
import { BACKGROUNDS, getBackgroundBgVar } from "@/content/backgrounds";
import TitleField from "./builder-fields/TitleField";
import WhenFields from "./builder-fields/WhenFields";
import ColourField from "./builder-fields/ColourField";
import useClockCreate, { PENDING_KEY } from "@/hooks/useClockCreate";
import { randomisePalette } from "@/utils/colour";
import { formatClockTime } from "@/utils/clockValues";
import { wearables as wearableData, wearablesByCategory } from "@/utils/grids";

export default function CamelClockBuilder({ initialValues = null, clockId = null, createLabel = "Create", initialClock = null }) {
    const clockRef = useRef(null);
    const autoSavedRef = useRef(false);
    const initTarget = initialClock ? new Date(initialClock.target_at) : null;
    const [title, setTitle] = useState(initialValues?.title ?? initialClock?.title ?? "My Amazing Promotion");
    const [month, setMonth] = useState(initialValues?.month ?? (initTarget ? initTarget.getMonth() : 11));
    const [day, setDay] = useState(initialValues?.day ?? (initTarget ? initTarget.getDate() : 25));
    const [time, setTime] = useState(initialValues?.time ?? (initTarget ? formatClockTime(initTarget) : "00:00"));
    const [introText, setIntroText] = useState(initialValues?.introText ?? initialClock?.intro_text ?? "in");
    const [celebrationMessage, setCelebrationMessage] = useState(initialValues?.celebrationMessage ?? initialClock?.celebration_message ?? "TIME IS UP!");
    const [primaryColour, setPrimaryColour] = useState(initialValues?.primaryColour ?? initialClock?.primary_colour ?? "#DBB279");
    const [secondaryColour, setSecondaryColour] = useState(initialValues?.secondaryColour ?? initialClock?.secondary_colour ?? "#8E652C");
    const [selectedWearables, setSelectedWearables] = useState(initialValues?.wearables ?? initialClock?.wearables ?? []);
    const [background, setBackground] = useState(initialValues?.background ?? initialClock?.background ?? null);

    /* Boost equipment is not a creation option — it is earned, and equipped on the viewing page
       once the clock is live. The builder only has to carry two things: the rack a brand new
       clock starts with (Shine, the free level-1 rung) and whatever an existing clock already
       has, so the preview still animates what is actually saved. */
    const initialBoosts = useMemo(() => {
        const existing = initialValues?.boosts ?? initialClock?.boosts ?? null;
        if (existing != null) return existing.map((boost) => (typeof boost === "string" ? { id: boost } : boost));
        return initialClock ? [] : [{ id: "shine" }];
    }, [initialValues, initialClock]);

    const { isSaving, statusMessage, authOpen, closeAuth, submit, effectiveId } = useClockCreate({ clockId });

    useEffect(() => {
        document.documentElement.style.setProperty('--primary-colour', primaryColour);
        return () => document.documentElement.style.setProperty('--primary-colour', '#DBB279');
    }, [primaryColour]);

    useEffect(() => {
        document.documentElement.style.setProperty('--secondary-colour', secondaryColour);
        return () => document.documentElement.style.setProperty('--secondary-colour', '#8E652C');
    }, [secondaryColour]);

    // Sync grid colour to document root for the fixed body::before grid
    useEffect(() => {
        if (background) {
            document.documentElement.style.setProperty('--grid-colour', getBackgroundBgVar(background));
        } else {
            document.documentElement.style.removeProperty('--grid-colour');
        }
        return () => document.documentElement.style.removeProperty('--grid-colour');
    }, [background]);

    const randomiseColours = useCallback(() => {
        const { primaryColour, secondaryColour } = randomisePalette();
        setPrimaryColour(primaryColour);
        setSecondaryColour(secondaryColour);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!e.key) return;
            if (e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target;
            if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
            if (document.querySelector(".auth-modal-overlay, .share-dialog-overlay")) return;
            randomiseColours();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [randomiseColours]);

    const currentValues = useCallback(() => ({
        title,
        month,
        day,
        time,
        introText,
        celebrationMessage,
        primaryColour,
        secondaryColour,
        wearables: selectedWearables,
        background,
        boosts: initialBoosts,
        boostOrder: initialValues?.boostOrder ?? initialClock?.boost_order,
    }), [title, month, day, time, introText, celebrationMessage, primaryColour, secondaryColour, selectedWearables, background, initialBoosts, initialValues, initialClock]);

    const handleSave = (e) => {
        e.preventDefault();
        submit(currentValues());
    };

    const restoreAndSave = async (pending) => {
        setTitle(pending.title ?? "My Amazing Promotion");
        setMonth(pending.month ?? 11);
        setDay(pending.day ?? 25);
        setTime(pending.time ?? "00:00");
        setIntroText(pending.introText ?? "in");
        setCelebrationMessage(pending.celebrationMessage ?? "TIME IS UP!");
        setPrimaryColour(pending.primaryColour ?? "#DBB279");
        setSecondaryColour(pending.secondaryColour ?? "#8E652C");
        setSelectedWearables(pending.wearables ?? []);
        setBackground(pending.background ?? null);
        await submit(pending);
    };

    const resumePendingIfPresent = () => {
        if (initialValues || autoSavedRef.current) return;
        if (typeof window === "undefined" || window.location.pathname !== "/new") return;

        let pending;
        try {
            pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
        } catch {
            pending = null;
        }
        if (!pending) return;

        autoSavedRef.current = true;
        restoreAndSave(pending);
    };

    /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
    useEffect(() => {
        // initialValues is stable; run-once mount behavior is intentional
        resumePendingIfPresent();
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                resumePendingIfPresent();
            }
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="camel-builder">
            <div className="canvas-wrapper nbtc" style={{ backgroundColor: background ? getBackgroundBgVar(background) : undefined }}>
                <CamelClock ref={clockRef} title={title} month={month} day={day} time={time} introText={introText} celebrationMessage={celebrationMessage} primaryColour={primaryColour} secondaryColour={secondaryColour} celebrationType="spit" wearables={selectedWearables} boosts={initialBoosts} />
            </div>

            <form className="camel-builder-form" onSubmit={handleSave}>
                <TitleField value={title} onChange={setTitle} />

                <WhenFields
                    month={month}
                    day={day}
                    time={time}
                    onMonthChange={setMonth}
                    onDayChange={setDay}
                    onTimeChange={setTime}
                />

                <div className="form-group">
                    <ColourField label="PRIMARY COLOUR" idPrefix={`primary-${effectiveId ?? "new"}`} value={primaryColour} onChange={setPrimaryColour} />
                    <ColourField label="SECONDARY COLOUR" idPrefix={`secondary-${effectiveId ?? "new"}`} value={secondaryColour} onChange={setSecondaryColour} />
                </div>

                <button className="randomise-button" type="button" title="Randomise the colour palette" onClick={randomiseColours}>
                    <Shuffle aria-hidden="true" />
                    <span className="randomise-text">
                        {"Randomise colours".split("").map((char, i) => (
                            <span key={i} className="randomise-char" style={{ animationDelay: `${i * 0.08}s` }}>
                                {char}
                            </span>
                        ))}
                    </span>
                    <span className="randomise-hint">
                        <kbd>
                            <Keyboard className="keyboard-icon" aria-hidden="true" />
                            r
                        </kbd>
                    </span>
                </button>

                <div className="more-options-body">
                    <label>
                        LABEL
                        <input
                            className="nbtc"
                            type="text"
                            value={introText}
                            onChange={(e) => setIntroText(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            maxLength="15"
                        />
                    </label>

                    <label>
                        COMPLETION MESSAGE
                        <textarea
                            className="nbtc"
                            value={celebrationMessage}
                            onChange={(e) => setCelebrationMessage(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            rows="3"
                            maxLength="140"
                            placeholder="Shown at the end of the animation"
                        />
                    </label>

                    <button className="preview-button" type="button" title="Preview the finished countdown" onClick={() => clockRef.current?.preview()}>
                        <Play fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        Preview completion
                    </button>
                </div>

                <div className="wearables-section">
                    <span className="wearables-label">WEARABLES</span>
                    <div className="wearables-box nbtc">
                        {wearablesByCategory().map(([cat, items]) => (
                            <div key={cat} className="wearables-category">
                                <div className="wearables-category-heading">{cat.toUpperCase()}</div>
                                <div className="wearables-list">
                                    {items.map((item) => {
const isSelected = selectedWearables.includes(item.id);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`wearables-item${isSelected ? " selected" : ""}`}
                                                onClick={() => {
                                                    setSelectedWearables((prev) => {
                                                        if (isSelected) return prev.filter((wid) => wid !== item.id);
                                                        return [
                                                            ...prev.filter((wid) => wearableData[wid]?.category !== cat),
                                                            item.id,
                                                        ];
                                                    });
                                                }}
                                            >
                                                <span className="wearables-tick"><span className="wearables-tick-tick"><Check size={14} strokeWidth={4} aria-hidden="true" /></span></span>
                                                <span className="wearables-item-emoji">{item.emoji}</span>
                                                <span className="wearables-item-name">{item.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="background-label">BACKGROUND</label>
                    <div className="background-picker nbtc">
                        {BACKGROUNDS.map((b) => (
                            <button
                                key={b.id}
                                type="button"
                                className={`background-option${background === b.id ? " selected" : ""}`}
                                title={b.label}
                                onClick={() => setBackground(background === b.id ? null : b.id)}
                            >
                                <span className="background-swatch" style={{ backgroundColor: getBackgroundBgVar(b.id) }} aria-hidden="true" />
                                <span className="background-name">{b.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    className="share-button nbtc" type="submit" disabled={isSaving}
                    title={effectiveId ? "Save your changes" : "Create your clock"}>
                    <Save className="button-icon" />
                    {isSaving ? "Saving..." : (effectiveId ? "Save changes" : createLabel)}
                </button>

                {statusMessage && (
                    <p className="builder-status-message">
                        {statusMessage}
                    </p>
                )}
            </form>

            {authOpen && (
                <AuthModal
                    mode="signup"
                    onClose={closeAuth}
                    onSuccess={() => {
                        closeAuth();
                        submit(currentValues());
                    }}
                />
            )}
        </div>
    );
}
