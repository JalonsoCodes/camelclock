"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { drawCamel, drawGrid, drawWearables } from "@/utils/drawing";
import { camelTemplate, celebrationFrames, celebrationFrameDurationMs } from "@/utils/grids";
import { getConfiguredTarget, getNextTarget } from "@/utils/time";
import styles from "./CamelClock.module.css";

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

export default function CamelClock({ title, month, day, time, introText, celebrationMessage, primaryColour, secondaryColour, celebrationType, boosts = [], showWatermark = false, saveHref, saved, onSaveClick, ref }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const phaseRef = useRef("counting");
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

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

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
                
                const availableWidth = containerWidth - 32; 
                
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
            const target = configuredTarget <= now ? getNextTarget(month, day, time) : configuredTarget;

            if (phaseRef.current === "counting") {
                setLevels(getLevels(now, target));
                setEyeFrame(prev => (prev + 1) % 4);
            }
        };

        tick();
        timer = setInterval(tick, 250);
        return () => clearInterval(timer);
    }, [month, day, time]);

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
            setPhase("counting");
            const now = new Date();
            setLevels(getLevels(now, getNextTarget(month, day, time)));
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [phase, isPreview, month, day, time]);

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
        }

        if (celebrating) {
            drawGrid(canvas, template, calculatedScale, primaryColour, secondaryColour, pixelDark);
        } else {
            const levelNumbers = levels.map(l => l.level);

            drawCamel(canvas, template, levelNumbers, eyeFrame, calculatedScale, primaryColour, secondaryColour, pixelDark);
        }

        if (!celebrating && boosts.length > 0) {
            drawWearables(canvas, boosts, calculatedScale);
        }
    }, [levels, eyeFrame, calculatedScale, themeToken, phase, frameIndex, primaryColour, secondaryColour, boosts]);

    const startPreview = () => {
        setIsPreview(true);
        setLevels(getPreviewLevels(2));
        setFrameIndex(0);
        setPhase("previewing");
    };

    useImperativeHandle(ref, () => ({
        preview: startPreview,
    }));

    const handleReplay = () => {
        startPreview();
    };

    const totalCols = camelTemplate[0].length;
    const numHumps = levels.length;
    const humpWidth = numHumps ** 2 - 11 * numHumps + 40;
    const totalWidthOfHumps = humpWidth * numHumps;
    const startCol = 22 + (50 - totalWidthOfHumps) / 2;

    return (
        <div ref={containerRef} className={`${styles.clockContainer}${phase === "celebrated" ? ` ${styles.celebrated}` : ""}`} style={{ "--clock-primary": primaryColour, "--clock-secondary": secondaryColour, "--clock-scale": displayScale }}>
            <h2 className={styles.clockTitle}>{title}</h2>
            
            <div className={styles.wrapper}>
                <div className={styles.canvasWrap}>
                    <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: "100%", display: "block" }} />
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

            {showWatermark && (
                saveHref ? (
                    <a className={styles.watermark} href={saveHref} target="_top">
                        Save to my CamelClocks
                    </a>
                ) : onSaveClick ? (
                    <a
                        className={styles.watermark}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.preventDefault(); onSaveClick(); }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSaveClick();
                            }
                        }}
                    >
                        {saved ? "Saved to my CamelClocks \u2713" : "Save to my CamelClocks"}
                    </a>
                ) : (
                    <Link href="/" className={styles.watermark}>Powered by CamelClock</Link>
                )
            )}
        </div>
    );
}