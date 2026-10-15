"use client";

import { useState, useSyncExternalStore } from "react";
import OptionSlider from "@/components/OptionSlider";
import { detectHourCycle, formatDisplayTime, formatTypingTime, meridiemOf, normaliseTimeInput, parseClockTime } from "@/utils/time";

const FORMAT_KEY = "camelClock.timeFormat";

const MODE_OPTIONS = [
    { value: "12", label: "12H" },
    { value: "24", label: "24H" },
];

const MERIDIEM_OPTIONS = [
    { value: "AM", label: "AM" },
    { value: "PM", label: "PM" },
];

function subscribe(onChange) {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
}

function getSnapshot() {
    try {
        const stored = window.localStorage.getItem(FORMAT_KEY);
        if (stored === "12" || stored === "24") return stored;
    } catch {
        /* ignore storage failures */
    }
    return detectHourCycle();
}

function getServerSnapshot() {
    return null;
}

export default function TimeField({ value, onChange }) {
    const preferred = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const [modeOverride, setModeOverride] = useState(null);
    const mode = modeOverride ?? preferred ?? "24";

    const [meridiem, setMeridiem] = useState(() => meridiemOf(parseClockTime(value).h24));
    const [text, setText] = useState(() => formatDisplayTime(value, "24"));

    const [prevValue, setPrevValue] = useState(value);
    const [prevMode, setPrevMode] = useState(mode);

    if (value !== prevValue) {
        setPrevValue(value);
        setText(formatDisplayTime(value, mode));
        setMeridiem(meridiemOf(parseClockTime(value).h24));
    }

    if (mode !== prevMode) {
        setPrevMode(mode);
        setText(formatDisplayTime(value, mode));
        setMeridiem(meridiemOf(parseClockTime(value).h24));
    }

    const handleChange = (event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
        setText(formatTypingTime(digits));
        if (digits.length === 4) {
            const canonical = normaliseTimeInput(digits, mode, meridiem);
            if (canonical) onChange(canonical);
        }
    };

    const handleBlur = () => {
        const canonical = normaliseTimeInput(text, mode, meridiem);
        if (canonical) {
            onChange(canonical);
            setText(formatDisplayTime(canonical, mode));
            setMeridiem(meridiemOf(parseClockTime(canonical).h24));
        } else {
            setText(formatDisplayTime(value, mode));
            setMeridiem(meridiemOf(parseClockTime(value).h24));
        }
    };

    const handleMode = (next) => {
        setModeOverride(next);
        try {
            window.localStorage.setItem(FORMAT_KEY, next);
        } catch {
            /* ignore storage failures */
        }
    };

    const handleMeridiem = (next) => {
        setMeridiem(next);
        const canonical = normaliseTimeInput(text, "12", next);
        if (canonical) onChange(canonical);
    };

    return (
        <div className="time-field">
            <input
                className="nbtc"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={5}
                value={text}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={(event) => event.target.select()}
                aria-label="Time"
            />
            {mode === "12" && (
                <OptionSlider options={MERIDIEM_OPTIONS} value={meridiem} onChange={handleMeridiem} ariaLabel="AM or PM" />
            )}
            <OptionSlider options={MODE_OPTIONS} value={mode} onChange={handleMode} ariaLabel="Time format" />
        </div>
    );
}
