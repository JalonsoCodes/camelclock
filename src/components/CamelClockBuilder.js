"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CamelClock from "./CamelClock";
import ShareDialog from "./ShareDialog";
import { supabase } from "@/lib/supabaseClient";

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export default function CamelClockBuilder({ initialValues = null, clockId = null }) {
    const clockRef = useRef(null);
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
            if (e.key.toLowerCase() !== "r" || e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target;
            if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
            randomiseColours();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [randomiseColours]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMessage("");

        // Calculate target timestamp
        const now = new Date();
        const currentYear = now.getFullYear();
        const [hours, minutes] = time.split(":").map(Number);
        
        let targetDate = new Date(currentYear, month, day, hours || 0, minutes || 0);

        // If chosen date/time is in the past, default to next year
        if (targetDate <= now) {
            targetDate.setFullYear(currentYear + 1);
        }

        try {
            const payload = {
                title: title,
                target_at: targetDate.toISOString(),
                intro_text: introText,
                celebration_message: celebrationMessage,
                primary_colour: primaryColour,
                secondary_colour: secondaryColour,
            };

            const { data, error } = clockId
                ? await supabase.from("clocks").update(payload).eq("id", clockId).select()
                : await supabase.from("clocks").insert([payload]).select();

            if (error) {
                throw error;
            }

            setSavedClockId(data?.[0]?.id ?? clockId);
            setStatusMessage("Saved successfully!");
            console.log("Saved clock:", data);
        } catch (error) {
            console.error("Error saving clock:", error);
            setStatusMessage("Failed to save. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="camel-builder">
            <div className="canvas-wrapper nbtc">
                <CamelClock ref={clockRef} title={title} month={month} day={day} time={time} introText={introText} celebrationMessage={celebrationMessage} primaryColour={primaryColour} secondaryColour={secondaryColour} />
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
                        <select className="nbtc" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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

                        <button className="preview-button" type="button" onClick={() => clockRef.current?.preview()}>
                            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                                <polygon points="6 3 20 12 6 21 6 3" />
                            </svg>
                            Preview completion
                        </button>
                    </div>
                </details>

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

                <button className="randomise-button" type="button" onClick={randomiseColours}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                    <span className="randomise-text">
                        {"Randomise colours".split("").map((char, i) => (
                            <span key={i} className="randomise-char" style={{ animationDelay: `${i * 0.08}s` }}>
                                {char}
                            </span>
                        ))}
                    </span>
                    <span className="randomise-hint">
                        <kbd>
                            <svg className="keyboard-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="2" y="6" width="20" height="12" rx="2" />
                                <line x1="6" y1="10" x2="6" y2="10" />
                                <line x1="10" y1="10" x2="10" y2="10" />
                                <line x1="14" y1="10" x2="14" y2="10" />
                                <line x1="18" y1="10" x2="18" y2="10" />
                                <line x1="6" y1="14" x2="18" y2="14" />
                            </svg>
                            r
                        </kbd>
                    </span>
                </button>

                <button
                    className="share-button nbtc" type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : (clockId ? "Save changes" : "Create and share")}
                </button>

                {/* Status Message Feedback */}
                {statusMessage && (
                    <p style={{ marginTop: "0.5rem", textAlign: "center", fontSize: "1.2rem" }}>
                        {statusMessage}
                    </p>
                )}
            </form>

            {savedClockId && (
                <ShareDialog clockId={savedClockId} title={title} onClose={() => setSavedClockId(null)} />
            )}
        </div>
    );
}