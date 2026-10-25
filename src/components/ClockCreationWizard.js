"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Shuffle } from "lucide-react";
import CamelClock from "./CamelClock";
import AuthModal from "./auth/AuthModal";
import TitleField from "./builder-fields/TitleField";
import WhenFields from "./builder-fields/WhenFields";
import ColourField from "./builder-fields/ColourField";
import { wearables as wearableData, wearablesByCategory } from "@/utils/grids";
import useClockCreate from "@/hooks/useClockCreate";
import { randomisePalette } from "@/utils/colour";
import { getNextTarget } from "@/utils/time";
import { formatFinishRow } from "@/utils/clockValues";
import { quickStart } from "@/content/landing";
import { track } from "@/utils/analytics";
import LoadingSpinner from "./LoadingSpinner";

const SLIDE_MS = 260;
const DEFAULT_BOOSTS = [{ id: "shine" }];
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const STEPS = quickStart.steps;

const BLANK_VALUES = {
    title: quickStart.defaults.title,
    month: quickStart.defaults.month,
    day: quickStart.defaults.day,
    time: quickStart.defaults.time,
    introText: quickStart.defaults.introText,
    celebrationMessage: quickStart.defaults.celebrationMessage,
    primaryColour: quickStart.defaults.primaryColour,
    secondaryColour: quickStart.defaults.secondaryColour,
    wearables: quickStart.defaults.wearables,
};

export default function ClockCreationWizard({ heading = null, subheading = null }) {
    const { isSaving, statusMessage, authOpen, closeAuth, submit } = useClockCreate();

    const [values, setValues] = useState(BLANK_VALUES);
    const [step, setStep] = useState(0);
    const [leaving, setLeaving] = useState(null);
    const [direction, setDirection] = useState(1);
    const slideTimer = useRef(null);
    const stageRef = useRef(null);
    const prevStepRef = useRef(0);

    const lastStep = STEPS.length - 1;
    const isLastStep = step === lastStep;

    const setField = useCallback((key, value) => {
        setValues((prev) => ({
            ...prev,
            [key]: typeof value === "function" ? value(prev[key]) : value,
        }));
    }, []);

    const goToStep = useCallback((next) => {
        setDirection(next > step ? 1 : -1);
        setLeaving(step);
        setStep(next);

        // Funnel top: the first time a visitor moves off slide 1 the wizard is genuinely started.
        if (step === 0 && next > 0) {
            track("wizard_started");
        }

        clearTimeout(slideTimer.current);
        slideTimer.current = setTimeout(() => setLeaving(null), SLIDE_MS);
    }, [step]);

    /* The style slide is far taller than the ones after it, so a step change
       collapses the stage and shifts everything below it. Snap the new question
       so it lands clear of the navbar (which the landing pins over the page) and
       the reader is handed the next question instead of being left adrift. Runs
       before paint, so the un-scrolled reflow is never shown. */
    useIsoLayoutEffect(() => {
        if (step === prevStepRef.current) return;
        prevStepRef.current = step;

        const stage = stageRef.current;
        if (!stage) return;

        // Measure the pinned navbar rather than trusting a fixed token, then leave a gap so the
        // question heading never sits under it; off the landing the CSS scroll-margin is enough.
        let offset = parseFloat(getComputedStyle(stage).scrollMarginTop) || 0;
        if (document.body.classList.contains("show-navbar")) {
            const navbar = document.querySelector(".navbar");
            if (navbar) {
                const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
                offset = Math.max(offset, navbar.getBoundingClientRect().bottom + rem * 4);
            }
        }

        window.scrollTo({
            top: Math.max(0, stage.getBoundingClientRect().top + window.scrollY - offset),
            behavior: "instant",
        });
    }, [step]);

    const randomiseColours = useCallback(() => {
        setValues((prev) => ({ ...prev, ...randomisePalette() }));
    }, []);

    const currentValues = useCallback(() => ({
        ...values,
        boosts: DEFAULT_BOOSTS,
    }), [values]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isLastStep) {
            goToStep(step + 1);
        }
    };

    const toggleWearable = (id, category) => {
        setValues((prev) => {
            const has = prev.wearables.includes(id);
            if (has) {
                return { ...prev, wearables: prev.wearables.filter((w) => w !== id) };
            }
            // One wearable per slot, the same rule the builder applies. Picking a second
            // hat swaps it rather than producing a rack validateWearables would reject.
            return {
                ...prev,
                wearables: [...prev.wearables.filter((w) => wearableData[w]?.category !== category), id],
            };
        });
    };

    const renderQuestion = (index) => {
        const key = STEPS[index].key;

        if (key === "event") {
            return <TitleField value={values.title} onChange={(v) => setField("title", v)} />;
        }

        if (key === "when") {
            return (
                <WhenFields
                    month={values.month}
                    day={values.day}
                    time={values.time}
                    onMonthChange={(v) => setField("month", v)}
                    onDayChange={(v) => setField("day", v)}
                    onTimeChange={(v) => setField("time", v)}
                />
            );
        }

        if (key === "completion") {
            return (
                <>
                    <label>
                        LABEL
                        <input
                            className="nbtc"
                            type="text"
                            value={values.introText}
                            onChange={(e) => setField("introText", e.target.value)}
                            onFocus={(e) => e.target.select()}
                            maxLength="15"
                        />
                    </label>

                    <label>
                        COMPLETION MESSAGE
                        <textarea
                            className="nbtc"
                            value={values.celebrationMessage}
                            onChange={(e) => setField("celebrationMessage", e.target.value)}
                            onFocus={(e) => e.target.select()}
                            rows="3"
                            maxLength="140"
                            placeholder="Shown at the end of the animation"
                        />
                    </label>
                </>
            );
        }

        if (key === "style") {
            return (
                <>
                    <div className="form-group">
                        <ColourField label="PRIMARY COLOUR" idPrefix="qs-primary" value={values.primaryColour} onChange={(v) => setField("primaryColour", v)} />
                        <ColourField label="SECONDARY COLOUR" idPrefix="qs-secondary" value={values.secondaryColour} onChange={(v) => setField("secondaryColour", v)} />
                    </div>
                    <button className="randomise-button" type="button" title="Randomise the colour palette" onClick={randomiseColours}>
                        <Shuffle aria-hidden="true" />
                        Randomise colours
                    </button>
                    <div className="wearables-section">
                        <span className="wearables-label">WEARABLES</span>
                        <div className="wearables-box nbtc">
                            {wearablesByCategory().map(([cat, items]) => (
                                <div key={cat} className="wearables-category">
                                    <div className="wearables-category-heading">{cat.toUpperCase()}</div>
                                    <div className="wearables-list">
                                        {items.map((item) => {
                                            const isSelected = values.wearables.includes(item.id);
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={`wearables-item${isSelected ? " selected" : ""}`}
                                                    onClick={() => toggleWearable(item.id, cat)}
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
                </>
            );
        }

        return null;
    };

    const preview = (
        <div className="quick-start-preview nbtc">
            <CamelClock
                title={values.title}
                month={values.month}
                day={values.day}
                time={values.time}
                introText={values.introText}
                celebrationMessage={values.celebrationMessage}
                primaryColour={values.primaryColour}
                secondaryColour={values.secondaryColour}
                celebrationType="spit"
                wearables={values.wearables}
                boosts={DEFAULT_BOOSTS}
                finishRowText={formatFinishRow(getNextTarget(values.month, values.day, values.time))}
                showWatermark
                hideLevelBanner
            />
        </div>
    );

    return (
        <section id="create">
            {heading && <h2 className="section-title">{heading}</h2>}
            {subheading && <p className="section-subtitle">{subheading}</p>}
            <div className="quick-start">
                <form className="camel-builder-form quick-start-form" onSubmit={handleSubmit}>
                    <div className="quick-start-stage" ref={stageRef}>
                        {leaving !== null && (
                            <div
                                className="quick-start-slide is-leaving"
                                aria-hidden="true"
                                key={`leaving-${leaving}-${direction}`}
                            >
                                <div className="quick-start-question">
                                    <span className="step-panel-number">{leaving + 1}</span>
                                    <span className="step-panel-heading">{STEPS[leaving].question}</span>
                                </div>
                                <div className="step-panel-body">{renderQuestion(leaving)}</div>
                            </div>
                        )}

                        <div
                            className="quick-start-slide"
                            key={`entering-${step}-${direction}`}
                        >
                            <div className="quick-start-question">
                                <span className="step-panel-number">{step + 1}</span>
                                <span className="step-panel-heading">{STEPS[step].question}</span>
                            </div>
                            <div className="step-panel-body">{renderQuestion(step)}</div>
                        </div>
                    </div>

                    <div className="quick-start-actions">
                        {step > 0 && (
                            <button className="btn-link btn-secondary quick-start-back" type="button" onClick={() => goToStep(step - 1)}>
                                <ArrowLeft className="button-icon" aria-hidden="true" />
                                Back
                            </button>
                        )}
                        {isLastStep ? (
                            <button className="share-button nbtc quick-start-create" type="button" onClick={() => submit(currentValues())} disabled={isSaving}>
                                {isSaving ? <LoadingSpinner size="sm" inline /> : null}
                                {isSaving ? "Creating..." : "Create"}
                            </button>
                        ) : (
                            <button className="btn-link quick-start-next" type="button" onClick={() => goToStep(step + 1)}>
                                Next
                                <ArrowRight className="button-icon" aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {statusMessage && <p className="builder-status-message">{statusMessage}</p>}
                </form>
                {preview}
            </div>

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
        </section>
    );
}
