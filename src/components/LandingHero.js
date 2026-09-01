"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CamelClock from "./CamelClock";
import CamelClockBuilder from "./CamelClockBuilder";
import "./landing-hero.css";

gsap.registerPlugin(ScrollTrigger);

const FALLBACK_PRESET = {
    title: "My Amazing Promotion",
    primaryColour: "#DBB279",
    secondaryColour: "#8E652C",
    introText: "in",
    wearables: [],
    celebrationMessage: "TIME IS UP!",
    celebrationType: "spit",
    targetAt: new Date(Date.now() + 17 * 86400000).toISOString(),
};

export default function LandingHero({ presets: rawPresets }) {
    const presets = (rawPresets && rawPresets.length > 0) ? rawPresets : [FALLBACK_PRESET];

    const containerRef = useRef(null);
    const [presetIndex, setPresetIndex] = useState(0);
    const [builderVisible, setBuilderVisible] = useState(false);
    const [revealProgress, setRevealProgress] = useState(0);
    const [wearableRevealProgress, setWearableRevealProgress] = useState(0);
    const lastProgress = useRef(0);
    const scrollLockedRef = useRef(false);
    const lockRef = useRef(null);
    const canvasRect = useRef(null);
    const canvasReady = useRef(false);
    const [canvasMeasured, setCanvasMeasured] = useState(false);

    const activePreset = presets[presetIndex] ?? presets[0];
    const activeTarget = useMemo(() => new Date(activePreset.targetAt), [activePreset]);

    const clockProps = useMemo(() => ({
        title: activePreset.title,
        month: activeTarget.getMonth(),
        day: activeTarget.getDate(),
        time: `${String(activeTarget.getHours()).padStart(2, "0")}:${String(activeTarget.getMinutes()).padStart(2, "0")}`,
        introText: activePreset.introText,
        celebrationMessage: activePreset.celebrationMessage,
        primaryColour: activePreset.primaryColour,
        secondaryColour: activePreset.secondaryColour,
        celebrationType: activePreset.celebrationType,
        boosts: activePreset.wearables ?? [],
        revealProgress: presetIndex === 0 ? revealProgress : 1,
        wearableRevealProgress: presetIndex === 0 ? wearableRevealProgress : 1,
    }), [activePreset, activeTarget, presetIndex, revealProgress, wearableRevealProgress]);

    const measureRef = useCallback((node) => {
        if (node) {
            const rect = node.getBoundingClientRect();
            canvasRect.current = rect;
            canvasReady.current = true;
            setCanvasMeasured(true);
        }
    }, []);

    useEffect(() => {
        if (!canvasReady.current) return;

        const canvasRectVal = canvasRect.current;
        const scrollClockEl = containerRef.current?.querySelector(".scroll-clock-wrapper");
        if (!scrollClockEl) return;
        const scrollClockRect = scrollClockEl.getBoundingClientRect();

        const canvasCX = canvasRectVal.left + canvasRectVal.width / 2;
        const canvasCY = canvasRectVal.top + canvasRectVal.height / 2;
        const clockCX = scrollClockRect.left + scrollClockRect.width / 2;
        const clockCY = scrollClockRect.top + scrollClockRect.height / 2;

        const targetX = canvasCX - clockCX;
        const targetY = canvasCY - clockCY;
        const targetScale = canvasRectVal.width / scrollClockRect.width;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) return;

        document.body.classList.add("scroll-anim-active");

        const numPresets = presets.length;

        let lockHero;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 0.5,
                    pin: ".scroll-sticky",
                    onLeave: () => {
                        document.body.classList.remove("scroll-anim-active");
                    },
                    onEnterBack: () => {
                        document.body.classList.add("scroll-anim-active");
                    },
                },
            });

            tl.to(".scroll-clock-wrapper", {
                    scale: targetScale,
                    x: targetX,
                    y: targetY,
                    duration: 0.12,
                    ease: "power1.inOut",
                }, 0.85)
                .to(".scroll-clock-wrapper", {
                    opacity: 0,
                    duration: 0.04,
                }, 0.96)
                .to(".builder-overlay", {
                    opacity: 1,
                    duration: 0.05,
                    onStart: () => setBuilderVisible(true),
                }, 0.96)
                .fromTo(".builder-overlay .canvas-wrapper",
                    { opacity: 0 },
                    { opacity: 1, duration: 0.05 },
                    0.96
                )
                .fromTo(".camel-builder-form",
                    { opacity: 0 },
                    { opacity: 1, duration: 0.08 },
                    0.98
                )

            lockHero = () => {
                if (scrollLockedRef.current) return;
                const container = containerRef.current;
                if (!container) return;
                scrollLockedRef.current = true;
                setBuilderVisible(true);
                // Preserve the builder's current on-screen position so it doesn't jump
                // when the pinned animation collapses beneath it.
                const builderEl = container.querySelector(".camel-builder");
                const anchoredY = builderEl ? builderEl.getBoundingClientRect().top : null;
                requestAnimationFrame(() => {
                    // Clean up GSAP pins/inline styles so the layout collapses cleanly
                    ctx.revert();
                    document.body.classList.remove("scroll-anim-active");
                    // Force builder visible, animation elements hidden
                    container.classList.add("locked");
                    const overlay = container.querySelector(".builder-overlay");
                    const canvasWrapper = container.querySelector(".builder-overlay .canvas-wrapper");
                    const form = container.querySelector(".camel-builder-form");
                    if (overlay) overlay.style.opacity = "1";
                    if (canvasWrapper) canvasWrapper.style.opacity = "1";
                    if (form) form.style.opacity = "1";
                    // Re-scroll just enough to keep the builder at its pre-collapse
                    // vertical position (bypass CSS smooth scroll), avoiding a jump.
                    if (anchoredY != null && builderEl) {
                        const newTop = builderEl.getBoundingClientRect().top + window.scrollY;
                        window.scrollTo({ top: newTop - anchoredY, behavior: "instant" });
                    }
                });
            };

            ScrollTrigger.create({
                trigger: containerRef.current,
                start: "top top",
                end: "bottom bottom",
                onUpdate: (self) => {
                    const p = self.progress;

                    // Preset cycling (0.55–0.85)
                    const phaseStart = 0.55;
                    const phaseWidth = 0.30;
                    const phaseSize = phaseWidth / numPresets;
                    if (p >= phaseStart && p < phaseStart + phaseWidth) {
                        const idx = Math.min(
                            Math.floor((p - phaseStart) / phaseSize),
                            numPresets - 1
                        );
                        setPresetIndex(idx);
                    } else if (p >= phaseStart + phaseWidth) {
                        setPresetIndex(numPresets - 1);
                    }

                    // Scroll direction / builder visibility
                    const scrollingDown = p > lastProgress.current;
                    lastProgress.current = p;

                    if (!scrollingDown && p < 0.93) {
                        setBuilderVisible(false);
                    }

                    // Reveal progress (0.25–0.45 fill, 0.45–0.55 wearables)
                    if (p <= 0.25) {
                        setRevealProgress(0);
                    } else if (p >= 0.45) {
                        setRevealProgress(1);
                    } else {
                        setRevealProgress((p - 0.25) / 0.20);
                    }

                    if (p <= 0.45) {
                        setWearableRevealProgress(0);
                    } else if (p >= 0.55) {
                        setWearableRevealProgress(1);
                    } else {
                        setWearableRevealProgress((p - 0.45) / 0.10);
                    }

                    // Pre-reveal text fade (0.00–0.25)
                    const textEl = containerRef.current?.querySelector(".pre-reveal-text");
                    if (textEl) {
                        const textOpacity = p <= 0.25 ? Math.max(0, 1 - p / 0.25) : 0;
                        textEl.style.opacity = String(textOpacity);
                    }

                    // Lock transition — animation complete, builder becomes the page
                    if (p >= 0.995) lockHero();
                },
            });
        }, containerRef);

        lockRef.current = lockHero;

        return () => {
            lockRef.current = null;
            if (!scrollLockedRef.current) {
                ctx.revert();
            }
            document.body.classList.remove("scroll-anim-active");
            document.body.classList.remove("show-navbar");
            document.body.classList.remove("locked");
        };
    }, [canvasMeasured, presets.length]);

    // Deep-link support for the navbar's in-page section links when arriving
    // from another page (e.g. /login -> /?section=features). Forces the hero to
    // lock once ScrollTrigger is ready, then scrolls to the target section.
    useEffect(() => {
        const section = new URLSearchParams(window.location.search).get("section");
        if (!section) return;
        let raf;
        const attempt = () => {
            const container = containerRef.current;
            const target = document.getElementById(section);
            if (lockRef.current && container && target) {
                lockRef.current();
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    const navEl = document.querySelector(".navbar");
                    const offset = navEl ? navEl.getBoundingClientRect().height : 0;
                    const top = target.getBoundingClientRect().top + window.scrollY - offset;
                    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
                }));
                return;
            }
            raf = requestAnimationFrame(attempt);
        };
        attempt();
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (builderVisible) {
            document.body.classList.add("show-navbar");
        } else {
            document.body.classList.remove("show-navbar");
        }
    }, [builderVisible]);

    return (
        <section className="scroll-container" ref={containerRef}>
            <div className="scroll-sticky">
                <div className="clock-layer">
                    <p className="pre-reveal-text">Your event deserves more than a <span className="pre-reveal-accent">boring timer</span>.</p>
                    <div className="scroll-clock-wrapper">
                        <CamelClock {...clockProps} />
                    </div>
                </div>

                <div className={`builder-overlay${builderVisible ? " visible" : ""}`}>
                    <CamelClockBuilder
                        key={builderVisible ? `builder-${presets.length - 1}` : "builder-hidden"}
                        createLabel="Create + Share"
                        initialValues={clockProps}
                        canvasRef={measureRef}
                    />
                </div>
            </div>
        </section>
    );
}
