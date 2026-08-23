"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Play, Save, Shuffle } from "lucide-react";
import CamelClock from "./CamelClock";
import ShareDialog from "./ShareDialog";
import AuthModal from "./auth/AuthModal";
import { supabase } from "@/lib/supabase/client";
import { wearables as wearableData } from "@/utils/grids";
import { getConfiguredTarget, getDaysInMonth } from "@/utils/time";
import { validateClock } from "@/utils/validation";

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

const PENDING_KEY = "camelclocks.pending";

export default function CamelClockBuilder({ initialValues = null, clockId = null, createLabel = "Create" }) {
    const router = useRouter();
    const clockRef = useRef(null);
    const autoSavedRef = useRef(false);
    const [title, setTitle] = useState(initialValues?.title ?? "My Amazing Promotion");
    const [month, setMonth] = useState(initialValues?.month ?? 11);
    const [day, setDay] = useState(initialValues?.day ?? 25);
    const [time, setTime] = useState(initialValues?.time ?? "00:00");
    const [introText, setIntroText] = useState(initialValues?.introText ?? "in");
    const [celebrationMessage, setCelebrationMessage] = useState(initialValues?.celebrationMessage ?? "TIME IS UP!");
    const [primaryColour, setPrimaryColour] = useState(initialValues?.primaryColour ?? "#DBB279");
    const [secondaryColour, setSecondaryColour] = useState(initialValues?.secondaryColour ?? "#8E652C");
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [savedClockId, setSavedClockId] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [createdId, setCreatedId] = useState(null);
    const [selectedWearables, setSelectedWearables] = useState(initialValues?.wearables ?? []);

    const effectiveId = clockId ?? createdId;

    useEffect(() => {
        document.documentElement.style.setProperty('--primary-colour', primaryColour);
        return () => document.documentElement.style.setProperty('--primary-colour', '#DBB279');
    }, [primaryColour]);

    useEffect(() => {
        document.documentElement.style.setProperty('--secondary-colour', secondaryColour);
        return () => document.documentElement.style.setProperty('--secondary-colour', '#8E652C');
    }, [secondaryColour]);

    const randomiseColours = useCallback(() => {
        const hue = Math.floor(Math.random() * 360);
        setPrimaryColour(hslToHex(hue, 55, 68));
        const secondaryHue = (hue + 60 + Math.floor(Math.random() * 120)) % 360;
        setSecondaryColour(hslToHex(secondaryHue, 45, 30));
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

    const buildPayload = (values) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        let targetDate = getConfiguredTarget(values.month, values.day, values.time, currentYear);

        if (targetDate <= now) {
            targetDate.setFullYear(currentYear + 1);
        }

        return {
            title: values.title,
            target_at: targetDate.toISOString(),
            intro_text: values.introText,
            celebration_message: values.celebrationMessage,
            primary_colour: values.primaryColour,
            secondary_colour: values.secondaryColour,
            celebration_type: "spit",
            wearables: values.wearables ?? [],
            status: "draft",
        };
    };

    const stashPending = (values) => {
        try {
            sessionStorage.setItem(PENDING_KEY, JSON.stringify(values));
        } catch {
            // ignore
        }
    };

    const clearPending = () => {
        try {
            sessionStorage.removeItem(PENDING_KEY);
        } catch {
            // ignore
        }
    };

    const performSave = async (values) => {
        setIsSaving(true);
        setStatusMessage("");

        const validation = validateClock(values);
        if (!validation.valid) {
            setStatusMessage(validation.errors[0]);
            setIsSaving(false);
            return false;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            stashPending(values);
            setAuthModalOpen(true);
            setStatusMessage("Sign in to save and manage your clocks.");
            setIsSaving(false);
            return false;
        }

        const isNew = !effectiveId;
        const payload = { ...buildPayload(values), user_id: user.id };
        if (!isNew) {
            // Preserve the clock's current publish state — only new clocks start as drafts
            delete payload.status;
        }

        try {
            const { data, error } = isNew
                ? await supabase.from("clocks").insert([payload]).select()
                : await supabase.from("clocks").update(payload).eq("id", effectiveId).select();

            if (error) {
                throw error;
            }

            clearPending();
            const savedId = data?.[0]?.id ?? effectiveId;
            if (savedId) {
                setCreatedId(savedId);
            }

            if (isNew) {
                setStatusMessage("Clock saved!");
                setSavedClockId(savedId);
            } else {
                router.push(`/clock/${savedId}`);
            }
        } catch (error) {
            console.error("Error saving clock:", error);
            setStatusMessage("Failed to save. Please try again.");
            return false;
        } finally {
            setIsSaving(false);
        }

        return true;
    };

    const handleSave = (e) => {
        e.preventDefault();
                        performSave({ title, month, day, time, introText, celebrationMessage, primaryColour, secondaryColour, wearables: selectedWearables });
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
        await performSave(pending);
    };

    const resumePendingIfPresent = () => {
        if (initialValues || autoSavedRef.current) return;
        if (typeof window === "undefined" || window.location.pathname !== "/new") return;

        let pending;
        try {
            pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
        } catch {
            pending = null;
        }
        if (!pending) return;

        autoSavedRef.current = true;
        // Restore and save any pending clock from before auth
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
        // Auto-save the stashed design the moment a session arrives, whichever tab completes sign-in
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="camel-builder">
            <div className="canvas-wrapper nbtc">
                <CamelClock ref={clockRef} title={title} month={month} day={day} time={time} introText={introText} celebrationMessage={celebrationMessage} primaryColour={primaryColour} secondaryColour={secondaryColour} celebrationType="spit" boosts={selectedWearables} />
            </div>

            <form className="camel-builder-form" onSubmit={handleSave}>
                <label>
                    TITLE
                    <input 
                        className="nbtc" 
                        type="text" 
                        value={title} 
                        maxLength="72" 
                        onChange={(e) => setTitle(e.target.value)} 
                        onFocus={(e) => e.target.select()} 
                    />
                </label>

                <div className="form-group three-quarter-split">
                    <label>
                        MONTH
                        <select className="nbtc" value={month} onChange={(e) => {
                            const newMonth = Number(e.target.value);
                            setMonth(newMonth);
                            const maxDays = getDaysInMonth(newMonth, new Date().getFullYear());
                            setDay((d) => Math.min(d, maxDays));
                        }}>
                            <option value={0}>January</option>
                            <option value={1}>February</option>
                            <option value={2}>March</option>
                            <option value={3}>April</option>
                            <option value={4}>May</option>
                            <option value={5}>June</option>
                            <option value={6}>July</option>
                            <option value={7}>August</option>
                            <option value={8}>September</option>
                            <option value={9}>October</option>
                            <option value={10}>November</option>
                            <option value={11}>December</option>
                        </select>
                    </label>

                    <label>
                        DAY
                        <input 
                            className="nbtc"
                            type="number" 
                            min="1" 
                            max="31" 
                            value={day} 
                            onChange={(e) => setDay(Number(e.target.value))} 
                            onFocus={(e) => e.target.select()} 
                        />
                    </label>
                </div>

                <label>
                    TIME
                    <input 
                        className="nbtc"
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)} 
                    />
                </label>

                <div className="form-group">
                    <label>
                        PRIMARY COLOUR
                        <div className="colour-picker-wrapper">
                            <input
                                className="nbtc colour-swatch" 
                                type="color" 
                                value={primaryColour} 
                                onChange={(e) => setPrimaryColour(e.target.value)} 
                            />
                            <div className="hex-input-container nbtc">
                                <span className="hex-hash">#</span>
                                <input
                                    className="colour-hex-text" 
                                    type="text" 
                                    value={undefined} 
                                    defaultValue={primaryColour.replace('#', '').toUpperCase()}
                                    key={`primary-${primaryColour}`} 
                                    onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                        e.target.value = cleanValue.toUpperCase();

                                        if (cleanValue.length === 6) {
                                            setPrimaryColour(`#${cleanValue}`);
                                        }
                                    }} 
                                    maxLength={7} 
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    </label>

                    <label>
                        SECONDARY COLOUR
                        <div className="colour-picker-wrapper">
                            <input
                                className="nbtc colour-swatch" 
                                type="color" 
                                value={secondaryColour} 
                                onChange={(e) => setSecondaryColour(e.target.value)} 
                            />
                            <div className="hex-input-container nbtc">
                                <span className="hex-hash">#</span>
                                <input
                                    className="colour-hex-text" 
                                    type="text" 
                                    value={undefined}
                                    defaultValue={secondaryColour.replace('#', '').toUpperCase()}
                                    key={`secondary-${secondaryColour}`}
                                    onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                        e.target.value = cleanValue.toUpperCase();

                                        if (cleanValue.length === 6) {
                                            setSecondaryColour(`#${cleanValue}`);
                                        }
                                    }} 
                                    maxLength={7}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    </label>
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

                <details className="more-options">
                    <summary className="more-options-summary">
                        MORE OPTIONS
                        <span className="more-options-chevron" aria-hidden="true">▾</span>
                    </summary>
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

                        <div className="wearables-section">
                            <span className="wearables-label">WEARABLES</span>
                            <div className="wearables-box nbtc">
                                {(() => {
                                    const categories = {};
                                    Object.entries(wearableData).forEach(([id, item]) => {
                                        if (!categories[item.category]) categories[item.category] = [];
                                        categories[item.category].push({ id, ...item });
                                    });
                                    return Object.entries(categories).map(([cat, items]) => (
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
                                                            <span className="wearables-tick"><span className="wearables-tick-tick">✓</span></span>
                                                            <span className="wearables-item-emoji">{item.emoji}</span>
                                                            <span className="wearables-item-name">{item.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </details>

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

            {authModalOpen && (
                <AuthModal
                    mode="signup"
                    onClose={() => setAuthModalOpen(false)}
                    onSuccess={() => {
                        setAuthModalOpen(false);
        performSave({ title, month, day, time, introText, celebrationMessage, primaryColour, secondaryColour, wearables: selectedWearables });
                    }}
                />
            )}

            {savedClockId && (
                <ShareDialog clockId={savedClockId} title={title} isOwner allowEmbed onClose={() => setSavedClockId(null)} />
            )}
        </div>
    );
}