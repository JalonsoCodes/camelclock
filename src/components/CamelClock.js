"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { drawCamel, drawCamelBoost, drawGrid, drawWearables, buildCamelGrid, makeShineShade, makeSunShade, drawSun, drawRainCloud, drawRainDrops, drawSandstorm, drawSparkles, drawFireworks, makeHydrationShade, resolveWearableColours } from "@/utils/drawing";
import { camelTemplate, celebrationFrames, celebrationFrameDurationMs, wearables as wearableData, BOOSTS } from "@/utils/grids";
import { hydrateNoteText, questState, QUEST_LEVELS, HYDRATION_SPLASH_MS } from "@/utils/boost";
import { getConfiguredTarget, getNextTarget } from "@/utils/time";
import { createBoostEngine } from "@/utils/boostEngine";
import styles from "./CamelClock.module.css";

export { HYDRATION_SPLASH_MS };

const LEVEL_BANNER_COLS = 25;
const LEVEL_BANNER_ROWS = 4;

function getLevels(now, target) {
    const diffMs = target - now;

    let yearsLeft = target.getFullYear() - now.getFullYear();
    let monthsLeft = target.getMonth() - now.getMonth();
    let daysLeft = target.getDate() - now.getDate();

    const targetTimeOfDay = target.getHours() * 3600000 + target.getMinutes() * 60000 + target.getSeconds() * 1000;
    const nowTimeOfDay = now.getHours() * 3600000 + now.getMinutes() * 60000 + now.getSeconds() * 1000;

    if (targetTimeOfDay < nowTimeOfDay) {
        daysLeft--;
    }

    if (daysLeft < 0) {
        const previousMonthDays = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
        daysLeft += previousMonthDays;
        monthsLeft--;
    }

    if (monthsLeft < 0) {
        monthsLeft += 12;
        yearsLeft--;
    }
    
    const totalMonthsLeft = (yearsLeft * 12) + monthsLeft;
    const hoursLeft = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutesLeft = Math.floor((diffMs / (1000 * 60)) % 60);
    const secondsLeft = (diffMs / 1000) % 60;
    
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const allUnits = [
        { 
            label: "Months", 
            value: totalMonthsLeft, 
            displayValue: totalMonthsLeft, 
            max: 12 
        },
        { 
            label: "Days", 
            value: daysLeft, 
            displayValue: daysLeft, 
            max: daysInCurrentMonth 
        },
        { 
            label: "Hours", 
            value: hoursLeft, 
            displayValue: hoursLeft, 
            max: 24 
        },
        { 
            label: "Mins", 
            value: minutesLeft, 
            displayValue: minutesLeft, 
            max: 60 
        },
        { 
            label: "Secs", 
            value: secondsLeft, 
            displayValue: Math.floor(secondsLeft), 
            max: 60 
        } 
    ];

    const firstActiveIndex = allUnits.findIndex(unit => unit.value > 0);

    const activeUnits = firstActiveIndex === -1 
        ? [allUnits[4]] 
        : allUnits.slice(firstActiveIndex);

    return activeUnits.map(unit => ({
        level: Math.min(59, Math.floor((unit.value / unit.max) * 60)),
        label: unit.label,
        value: unit.displayValue
    }));
}

function getPreviewLevels(secondsRemaining) {
    const now = new Date();
    const target = new Date(now.getTime() + secondsRemaining * 1000);
    return getLevels(now, target);
}

export default function CamelClock({ title, month, day, time, targetAt, introText, celebrationMessage, primaryColour, secondaryColour, _celebrationType, wearables = [], boosts = [], showWatermark = false, watermarkExternal = false, watermarkHref = null, titleHref = null, titleExternal = false, viewerHydrates = false, hydrateCount = 0, level = 1, isOwner = false, dropLeft = 0, onHydrateClick = null, ctaIcon = null, ctaLabel = "Hydrate this CamelClock", revealProgress, wearableRevealProgress, hideHydrateNote = false, hideWatermarkLink = false, hideLevelBanner = false, boostCadence = true, finishRowText = null, levelBannerRef = null, titleRef = null, levelLabelRef = null, camelArtRef = null, onAnimatingChange = null, ref }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const phaseRef = useRef("counting");
    const revealPixelsRef = useRef(null);
    const wearableRevealPixelsRef = useRef(null);
    const revealActiveRef = useRef(false);
    const boostEngineRef = useRef(null);
    const lastAlignedSecondRef = useRef(null);
    const [levels, setLevels] = useState([
        { level: 0 }, 
        { level: 0 }, 
        { level: 0 }, 
        { level: 0 }, 
        { level: 0 }
    ]);
    const [eyeFrame, setEyeFrame] = useState(0);
    const [calculatedScale, setCalculatedScale] = useState(4);
    const [displayScale, setDisplayScale] = useState(4);
    const [themeToken, setThemeToken] = useState(0);
    const [phase, setPhase] = useState("counting");
    const [frameIndex, setFrameIndex] = useState(celebrationFrames.length - 1);
    const [isPreview, setIsPreview] = useState(false);
    const [boostFrame, setBoostFrame] = useState(0);
    const [hydrationHover, setHydrationHover] = useState(false);
    const quest = questState({ count: hydrateCount, floorLevel: level });
    const activeBoosts = boosts;
    const questSatisfied = quest.level - 1;
    const questPrevHydrates = questSatisfied > 0 ? QUEST_LEVELS[questSatisfied - 1].hydrations : 0;
    const questSpan = quest.next.hydrations - questPrevHydrates;
    // Max 25 boxes per row x 4 rows. Wider spans mark each box as more than one hydration, so the
    // track never shrinks into an unreadable sliver and every last box is always visible.
    const questHydratesPerBox = questSpan > LEVEL_BANNER_COLS * LEVEL_BANNER_ROWS ? Math.ceil(questSpan / (LEVEL_BANNER_COLS * LEVEL_BANNER_ROWS)) : 1;
    const questBoxes = Math.ceil(questSpan / questHydratesPerBox);
    const questFilled = quest.maxed ? questBoxes : Math.max(0, Math.min(questBoxes, Math.floor((quest.countProgress * questSpan) / questHydratesPerBox)));
    const questPerRow = Math.min(questBoxes, LEVEL_BANNER_COLS);
    const [hydrateSplash, setHydrateSplash] = useState({ active: false, t: 0, wash: 0 });
    const prevHydrateCountRef = useRef(hydrateCount);
    const splashTimersRef = useRef([]);
    // The boosts the reader started by hand (a preview), so a run can be told apart from the
    // clock's own ambient cadence.
    const previewIdsRef = useRef(new Set());
    const animatingRef = useRef(false);

    useEffect(() => {
        if (hydrateCount > prevHydrateCountRef.current) {
            prevHydrateCountRef.current = hydrateCount;
            splashTimersRef.current.forEach((t) => clearTimeout(t));
            setHydrateSplash({ active: true, t: 0, wash: 0 });
            let start = performance.now();
            const step = (now) => {
                const dt = Math.min(1, (now - start) / HYDRATION_SPLASH_MS);
                setHydrateSplash((s) => ({ ...s, t: dt, wash: dt < 0.25 ? dt * 4 : Math.max(0, 1 - (dt - 0.25) * 1.333) }));
                if (dt < 1) {
                    const id = requestAnimationFrame(step);
                    splashTimersRef.current[0] = id;
                } else {
                    setHydrateSplash({ active: false, t: 0, wash: 0 });
                }
            };
            const id = requestAnimationFrame(step);
            splashTimersRef.current[0] = id;
        } else {
            prevHydrateCountRef.current = hydrateCount;
        }
    }, [hydrateCount]);

    useEffect(() => {
        const timers = splashTimersRef.current;
        return () => {
            timers.forEach((t) => clearTimeout(t));
        };
    }, []);

    // Reports the animations the reader caused: the hydration splash, the hop/legend reactions
    // and a boost they previewed by hand. The clock's own ambient cadence is deliberately left
    // out - it must never blink a tour tip out from under the reader.
    useEffect(() => {
        const snap = boostEngineRef.current?.snapshot();
        const running = new Set();
        if (snap?.motion) running.add(snap.motion.id);
        if (snap?.effects) for (const id of snap.effects.keys()) running.add(id);
        for (const id of [...previewIdsRef.current]) {
            if (!running.has(id)) previewIdsRef.current.delete(id);
        }
        let previewRunning = false;
        for (const id of previewIdsRef.current) {
            if (running.has(id)) {
                previewRunning = true;
                break;
            }
        }
        const reactiveRunning = Boolean(snap?.motion) && Boolean(BOOSTS[snap.motion.id]?.reactive);
        const busy = hydrateSplash.active || previewRunning || reactiveRunning;
        if (busy !== animatingRef.current) {
            animatingRef.current = busy;
            onAnimatingChange?.(busy);
        }
    }, [boostFrame, hydrateSplash.active, onAnimatingChange]);

    useEffect(() => {
        return () => {
            if (!animatingRef.current) return;
            animatingRef.current = false;
            onAnimatingChange?.(false);
        };
    }, [onAnimatingChange]);

    if (boostEngineRef.current == null) {
        boostEngineRef.current = createBoostEngine(() => setBoostFrame((f) => f + 1));
    }

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        revealActiveRef.current = revealProgress != null && revealProgress > 0 && revealProgress < 1;
        if (revealProgress === 0) revealPixelsRef.current = null;
    }, [revealProgress]);

    /* The wearable pixel list is only valid for the wearables it was built from,
       and the reveal clears it on every slide change. Without this the cache
       survives a step change, so each slide reveals the *previous* slide's
       wearables — which is why every camel put on the same hat mid-fade before
       snapping to its own. */
    useEffect(() => {
        if (wearableRevealProgress === 0) wearableRevealPixelsRef.current = null;
    }, [wearableRevealProgress]);

    const startHydrate = useCallback((id) => {
        const def = BOOSTS[id];
        if (!def) return;
        if (phaseRef.current !== "counting") return;
        if (revealActiveRef.current) return;
        boostEngineRef.current?.start(id);
    }, []);

    useEffect(() => {
        const checkAligned = () => {
            if (phaseRef.current !== "counting") {
                lastAlignedSecondRef.current = null;
                return;
            }
            if (revealActiveRef.current) return;
            /* The lab harness turns this off: it wants to watch one run of an effect, not a
               clock-driven loop, so every run there comes from triggerNow instead. */
            if (!boostCadence) {
                lastAlignedSecondRef.current = null;
                return;
            }

            const now = new Date();
            const configuredTarget = getConfiguredTarget(month, day, time, now.getFullYear());
            const target = targetAt ? new Date(targetAt) : (configuredTarget <= now ? getNextTarget(month, day, time) : configuredTarget);
            if (now >= target) return;

            const remainingSec = Math.floor((target - now) / 1000);
            if (remainingSec === lastAlignedSecondRef.current) return;
            lastAlignedSecondRef.current = remainingSec;

            for (const boost of activeBoosts) {
                const def = BOOSTS[boost?.id];
                if (!def?.cadenceMs) continue;
                const blockSec = Math.max(1, Math.round(def.cadenceMs / 1000));
                if (remainingSec % blockSec === 0) startHydrate(def.id);
            }
        };

        const timer = setInterval(checkAligned, 250);
        checkAligned();
        return () => clearInterval(timer);
    }, [activeBoosts, startHydrate, month, day, time, targetAt, boostCadence]);

    useEffect(() => {
        return () => boostEngineRef.current?.destroy();
    }, []);

    useEffect(() => {
        const observer = new MutationObserver(() => setThemeToken((t) => t + 1));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries) => {
            for (let entry of entries) {
                const containerWidth = entry.contentRect.width;
                const templateColumns = camelTemplate[0].length;
                
                const availableWidth = containerWidth; 
                
                const newScale = Math.max(1, Math.floor(availableWidth / templateColumns));
                setCalculatedScale(newScale);
                setDisplayScale(Math.max(1, containerWidth / templateColumns));
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        let timer;

        const tick = () => {
            const now = new Date();
            const configuredTarget = getConfiguredTarget(month, day, time, now.getFullYear());
            const target = targetAt ? new Date(targetAt) : (configuredTarget <= now ? getNextTarget(month, day, time) : configuredTarget);

            if (phaseRef.current === "counting") {
                if (now >= target) {
                    setPhase("celebrating");
                } else {
                    setLevels(getLevels(now, target));
                    setEyeFrame(prev => (prev + 1) % 4);
                }
            }
        };

        tick();
        timer = setInterval(() => {
            if (!revealActiveRef.current) tick();
        }, 250);
        return () => clearInterval(timer);
    }, [month, day, time, targetAt]);

    useEffect(() => {
        if (phase !== "previewing") return;

        let secondsRemaining = 2;
        let timeoutId;

        const tickPreview = () => {
            if (secondsRemaining < 0) {
                setPhase("celebrating");
                return;
            }
            setLevels(getPreviewLevels(secondsRemaining));
            timeoutId = setTimeout(() => {
                secondsRemaining -= 1;
                tickPreview();
            }, 1000);
        };

        tickPreview();
        return () => clearTimeout(timeoutId);
    }, [phase]);

    useEffect(() => {
        if (phase !== "celebrated" || !isPreview) return;

        const timeoutId = setTimeout(() => {
            setIsPreview(false);
            const now = new Date();
            if (targetAt && now >= new Date(targetAt)) {
                setPhase("celebrated");
                return;
            }
            setPhase("counting");
            const configuredTarget = getConfiguredTarget(month, day, time, now.getFullYear());
            const target = targetAt ? new Date(targetAt) : (configuredTarget <= now ? getNextTarget(month, day, time) : configuredTarget);
            setLevels(getLevels(now, target));
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [phase, isPreview, month, day, time, targetAt]);

    useEffect(() => {
        if (phase !== "celebrating") return;

        let cancelled = false;
        let timeoutId;

        const showFrame = (i) => {
            if (cancelled) return;
            setFrameIndex(i);
            if (i >= celebrationFrames.length - 1) {
                setPhase("celebrated");
                return;
            }
            timeoutId = setTimeout(() => showFrame(i + 1), celebrationFrameDurationMs);
        };

        showFrame(0);
        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [phase]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const celebrating = phase === "celebrating" || phase === "celebrated";
        const template = celebrating ? celebrationFrames[frameIndex] : camelTemplate;

        canvas.width = template[0].length * calculatedScale;
        canvas.height = template.length * calculatedScale;

        const pixelDark = getComputedStyle(document.documentElement).getPropertyValue("--pixel-dark").trim() || "#000000";
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = pixelDark;
            ctx.lineWidth = calculatedScale;
            ctx.setLineDash([calculatedScale * 2, calculatedScale * 2]);

            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(canvas.width, 0);
            ctx.stroke();

            // Baseline shifted to row 80 for expanded template height
            ctx.beginPath();
            ctx.moveTo(0, 80 * calculatedScale);
            ctx.lineTo(canvas.width, 80 * calculatedScale);
            ctx.stroke();

            ctx.setLineDash([]);

            const revealAction = revealProgress != null ? revealProgress : 1;
            const revealActive = revealProgress != null && revealProgress < 1;
            const wearablesActive = (wearableRevealProgress != null && wearableRevealProgress < 1 && wearables.length > 0);
            if ((revealActive || wearablesActive) && !celebrating) {
                const levelNumbers = levels.map(l => l.level);
                const grid = buildCamelGrid(template, levelNumbers, eyeFrame, ctaIcon);
                const sig = `${levelNumbers.join(",")}|${eyeFrame}|${ctaIcon ?? ""}`;

                let fillPixels = revealPixelsRef.current;

                if (!fillPixels || fillPixels.sig !== sig) {
                    fillPixels = [];
                    for (let r = 0; r < grid.length; r++) {
                        for (let c = 0; c < grid[0].length; c++) {
                            const val = grid[r][c];
                            if (val !== 0 && val !== 1) fillPixels.push([r, c, val]);
                        }
                    }
                    const shuffle = (arr) => {
                        for (let i = arr.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [arr[i], arr[j]] = [arr[j], arr[i]];
                        }
                        return arr;
                    };
                    revealPixelsRef.current = { sig, pixels: shuffle(fillPixels) };
                    fillPixels = revealPixelsRef.current;
                }
                fillPixels = fillPixels.pixels;

                for (let r = 0; r < grid.length; r++) {
                    for (let c = 0; c < grid[0].length; c++) {
                        if (grid[r][c] === 1) {
                            ctx.fillStyle = pixelDark;
                            ctx.fillRect(c * calculatedScale, r * calculatedScale, calculatedScale, calculatedScale);
                        }
                    }
                }

                const count = Math.floor(fillPixels.length * revealAction);
                for (let i = 0; i < count; i++) {
                    const [r, c, val] = fillPixels[i];
                    const currentVal = grid[r]?.[c];
                    if (currentVal === 0 || currentVal === 1 || currentVal === undefined) continue;
                    ctx.fillStyle = val === 3 ? secondaryColour : primaryColour;
                    ctx.fillRect(c * calculatedScale, r * calculatedScale, calculatedScale, calculatedScale);
                }

                if (wearables.length > 0) {
                    /* Signed like the body pixels above, so a slide change
                       rebuilds against the new wearables on the very first
                       frame instead of one frame late — which is what put every
                       camel in the same top hat for a beat before it corrected
                       to its own. The effect above still clears the cache on
                       each reveal so the shuffle is fresh every time. */
                    const wearableSig = `${themeToken}|${wearables.join(",")}`;
                    let wearablePixels = wearableRevealPixelsRef.current;

                    if (!wearablePixels || wearablePixels.sig !== wearableSig) {
                        const bgColour = getComputedStyle(document.documentElement).getPropertyValue("--card-colour").trim() || "#ffffff";
                        const wearableMap = wearableData;
                        const built = [];
                        for (const wearableId of wearables) {
                            const wearable = wearableMap[wearableId];
                            if (!wearable) continue;
                            const { grid: wgrid, colours } = wearable;
                            const wColours = resolveWearableColours(colours);
                            const wpositions = wearable.positions || [wearable.anchor, wearable.mirrorAnchor].filter(Boolean);
                            for (const pos of wpositions) {
                                for (let r = 0; r < wgrid.length; r++) {
                                    for (let c = 0; c < wgrid[r].length; c++) {
                                        const idx = wgrid[r][c];
                                        if (idx === 0) continue;
                                        let fill = idx === 100 ? bgColour : wColours[idx];
                                        if (!fill) continue;
                                        built.push([pos.row + r, pos.col + c, fill]);
                                    }
                                }
                            }
                        }
                        const shuffle = (arr) => {
                            for (let i = arr.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [arr[i], arr[j]] = [arr[j], arr[i]];
                            }
                            return arr;
                        };
                        wearableRevealPixelsRef.current = { sig: wearableSig, pixels: shuffle(built) };
                        wearablePixels = wearableRevealPixelsRef.current;
                    }

                    const pixels = wearablePixels.pixels;
                    const wReveal = wearableRevealProgress != null ? wearableRevealProgress : 1;
                    const wCount = Math.floor(pixels.length * wReveal);
                    for (let i = 0; i < wCount; i++) {
                        const [r, c, fill] = pixels[i];
                        ctx.clearRect(c * calculatedScale, r * calculatedScale, calculatedScale, calculatedScale);
                        ctx.fillStyle = fill;
                        ctx.fillRect(c * calculatedScale, r * calculatedScale, calculatedScale, calculatedScale);
                    }
                }
                return;
            }
        }

        const snap = boostEngineRef.current?.snapshot();
        const motion = snap?.motion ?? null;
        const hasEffects = snap?.effects ? snap.effects.size > 0 : false;
        const washAmount = hydrateSplash.active ? hydrateSplash.wash : 0;
        const hydrateSpread = hydrateSplash.active ? Math.min(1, hydrateSplash.t / 0.5) : 0;

        if (celebrating) {
            drawGrid(canvas, template, calculatedScale, primaryColour, secondaryColour, pixelDark);
        } else {
            const levelNumbers = levels.map(l => l.level);

            const ctaState = viewerHydrates ? (hydrateSplash.active ? "hydrating" : hydrationHover ? "hover" : "idle") : null;

            if (motion || hasEffects || hydrateSplash.active) {
                const grid = buildCamelGrid(template, levelNumbers, eyeFrame, ctaIcon);
                const shadeFns = [];
                let sparkleColour = null;
                let sparkleProgress = 0;
                let fireworksProgress = null;
                let fireworksColours = null;
                let weather = null;
                if (snap) {
                    for (const [id, frame] of snap.effects) {
                        const eff = BOOSTS[id];
                        if (!eff) continue;
                        const effProgress = eff.frames > 1 ? frame / (eff.frames - 1) : 0;
                        if (eff.overlay === "shine") {
                            shadeFns.push(makeShineShade(grid.length, grid[0].length, effProgress));
                        } else if (eff.overlay === "sparkle") {
                            sparkleColour = pixelDark;
                            sparkleProgress = effProgress;
                        } else if (eff.overlay === "fireworks") {
                            fireworksProgress = effProgress;
                            fireworksColours = eff.colours;
                        } else if (eff.overlay === "sun") {
                            shadeFns.push(makeSunShade(effProgress, grid[0].length, eff.profile));
                            weather = { kind: "sun", progress: effProgress, profile: eff.profile };
                        } else if (eff.overlay === "rain" || eff.overlay === "sandstorm") {
                            weather = { kind: eff.overlay, progress: effProgress, profile: eff.profile };
                        }
                    }
                }
                if (hydrateSplash.active) shadeFns.push(makeHydrationShade(grid, hydrateSpread, washAmount));
                const overlayShade = shadeFns.length
                    ? (fill, r, c) => {
                        let result = fill;
                        for (const fn of shadeFns) result = fn(result, r, c);
                        return result;
                    }
                    : null;
                const activeDef = motion ? BOOSTS[motion.id] : null;
                const boostProgress = activeDef && activeDef.frames > 1 ? motion.frame / (activeDef.frames - 1) : 0;
                if (weather?.kind === "sun") drawSun(ctx, grid, calculatedScale, weather.progress, weather.profile);
                else if (weather?.kind === "rain") drawRainCloud(ctx, grid, calculatedScale, weather.profile);
                drawCamelBoost(canvas, grid, calculatedScale, primaryColour, secondaryColour, pixelDark, boostProgress, ctaState, activeDef ?? (overlayShade || hydrateSplash.active ? { anim: "static" } : null), overlayShade, wearables);
                if (sparkleColour) drawSparkles(ctx, grid, calculatedScale, sparkleProgress, sparkleColour);
                if (fireworksProgress != null) drawFireworks(ctx, grid, calculatedScale, fireworksProgress, fireworksColours);
                if (weather && weather.kind !== "sun") {
                    if (weather.kind === "rain") drawRainDrops(ctx, grid, calculatedScale, weather.progress, weather.profile);
                    else drawSandstorm(ctx, grid, calculatedScale, weather.progress, weather.profile);
                }
            } else {
                drawCamel(canvas, template, levelNumbers, eyeFrame, calculatedScale, primaryColour, secondaryColour, pixelDark, ctaState, ctaIcon);
            }
        }

        if (!celebrating && !motion && !hasEffects && wearables.length > 0) {
            drawWearables(canvas, wearables, calculatedScale);
        }
    }, [levels, eyeFrame, calculatedScale, themeToken, phase, frameIndex, primaryColour, secondaryColour, wearables, boostFrame, viewerHydrates, hydrationHover, revealProgress, wearableRevealProgress, hydrateSplash, ctaIcon]);

    const startPreview = () => {
        setIsPreview(true);
        setLevels(getPreviewLevels(2));
        setFrameIndex(0);
        setPhase("previewing");
    };

    useImperativeHandle(ref, () => ({
        preview: startPreview,
        triggerNow: (id) => {
            const def = BOOSTS[id];
            if (!def) return;
            // A hand-triggered run, so it can be told apart from the clock's own cadence.
            previewIdsRef.current.add(id);
            boostEngineRef.current?.start(id);
        },
        stopNow: (id) => {
            boostEngineRef.current?.stop(id);
        },
    }));

    const handleReplay = () => {
        startPreview();
    };

    const totalCols = camelTemplate[0].length;
    const numHumps = levels.length;
    const humpWidth = numHumps ** 2 - 11 * numHumps + 40;
    const totalWidthOfHumps = humpWidth * numHumps;
    const startCol = 22 + (50 - totalWidthOfHumps) / 2;

    const revealT = revealProgress != null ? Math.max(0, Math.min(1, revealProgress)) : 1;

    return (
        <div ref={containerRef} className={`${styles.clockContainer}${phase === "celebrated" ? ` ${styles.celebrated}` : ""}`} style={{ "--clock-primary": primaryColour, "--clock-secondary": secondaryColour, "--clock-scale": displayScale, "--reveal": revealT }}>
            <h2 ref={titleRef} className={styles.clockTitle}>
                {titleHref ? (
                    <Link
                        href={titleHref}
                        className={styles.clockTitleLink}
                        {...(titleExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                        {title}
                    </Link>
                ) : title}
            </h2>

            {finishRowText && (
                <span className="clock-finish-row">
                    {finishRowText}
                </span>
            )}

            <div className={styles.wrapper}>
                <div className={styles.canvasWrap} ref={camelArtRef}>
                    <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: "100%", display: "block" }} />
                    {phase === "counting" && (
                        viewerHydrates && onHydrateClick ? (
                            <button
                                className={styles.ctaOverlay}
                                type="button"
                                title={ctaLabel}
                                aria-label={ctaLabel}
                                onClick={onHydrateClick}
                                onMouseEnter={() => setHydrationHover(true)}
                                onMouseLeave={() => setHydrationHover(false)}
                                onFocus={() => setHydrationHover(true)}
                                onBlur={() => setHydrationHover(false)}
                            />
                        ) : null
                    )}
                    {phase === "celebrated" && celebrationMessage && (
                        <div className={styles.completionMessage}>{celebrationMessage}</div>
                    )}
                </div>

                <div className={styles.digitalRow}>
                    {phase === "counting" || phase === "previewing" ? (
                        <>
                            {introText && (
                                <div 
                                    className={styles.introLabel}
                                    style={{ left: `${(startCol / totalCols) * 100}%` }}
                                >
                                    {introText}
                                </div>
                            )}

                            {levels.map((unit, index) => {
                                const humpLeft = startCol + index * humpWidth;
                                const humpCenter = humpLeft + (humpWidth / 2);
                                const leftPercentage = `${(humpCenter / totalCols) * 100}%`;

                                return (
                                    <div 
                                        key={index} 
                                        className={styles.unit}
                                        style={{ left: leftPercentage }}
                                    >
                                        <div className={styles.value}>{unit.value}</div>
                                        <div className={styles.label}>{unit.label}</div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className={styles.endedLabel}>
                            ENDED
                        </div>
                    )}
                </div>
            </div>

            {phase === "celebrated" && (
                <button className={styles.replayButton} onClick={handleReplay}>
                    <RotateCcw aria-hidden="true" />
                    Replay completion animation
                </button>
            )}

            {!hideLevelBanner && viewerHydrates && (
                <div ref={levelBannerRef} className={styles.levelBanner} style={{ "--per-row": questPerRow }}>
                    <span ref={levelLabelRef} className={styles.levelBannerLabel}>LEVEL {quest.level}</span>
                    <span className={styles.levelTrackWrap} role="presentation">
                        <span className={styles.levelTrack}>
                            {Array.from({ length: questBoxes }, (_, i) => (
                                <span key={i} className={i < questFilled ? `${styles.levelCell} ${styles.levelCellFilled}` : styles.levelCell} />
                            ))}
                        </span>
                        {questHydratesPerBox > 1 && (
                            <span className={styles.levelScaleNote}>1 BOX = {questHydratesPerBox} HYDRATIONS</span>
                        )}
                    </span>
                    <span className={styles.levelBannerCount}>{quest.maxed ? "MAXED" : `${quest.hydratesToNext} TO LEVEL ${quest.level + 1}`}</span>
                </div>
            )}

            {showWatermark && (
                <div className={styles.hydrateWatermarkWrap}>
                    {viewerHydrates && !hideHydrateNote && isOwner && (() => {
                        const note = hydrateNoteText({ dropLeft });
                        return note ? <span className={styles.hydrateNote}>{note}</span> : null;
                    })()}
                    {!hideWatermarkLink && (
                        <Link
                            href={watermarkHref ?? "/"}
                            className={styles.watermarkLink}
                            {...(watermarkExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                            Create your CamelClock
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}