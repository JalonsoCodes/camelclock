"use client";

import { useEffect, useRef, useState } from "react";
import { drawCamel, calculateHumpMetrics } from "@/utils/drawing";
import { camelTemplate } from "@/utils/grids";
import styles from "./CamelClock.module.css";

function getHumpLevels(now, month, day, time) {
    const currentYear = now.getFullYear();
    const [hours, minutes] = time.split(":").map(Number);
    let target = new Date(currentYear, month, day, hours || 0, minutes || 0, 0);
    
    if (target <= now) {
        target.setFullYear(currentYear + 1);
    }

    let diffMs = target - now;

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
        { label: "Months", value: totalMonthsLeft, displayValue: totalMonthsLeft, max: 12 },
        { label: "Days", value: daysLeft, displayValue: daysLeft, max: daysInCurrentMonth },
        { label: "Hours", value: hoursLeft, displayValue: hoursLeft, max: 24 },
        { label: "Mins", value: minutesLeft, displayValue: minutesLeft, max: 60 },
        { label: "Secs", value: secondsLeft, displayValue: Math.floor(secondsLeft), max: 60 } 
    ];

    const firstActiveIndex = allUnits.findIndex(unit => unit.value > 0);

    const activeUnits = firstActiveIndex === -1 
        ? [allUnits[4]] 
        : allUnits.slice(firstActiveIndex);

    return activeUnits.map(unit => ({
        level: Math.floor((unit.value / unit.max) * 24),
        label: unit.label,
        value: unit.displayValue
    }));
}

export default function CamelClock({ title, month, day, time, introText, primaryColour, secondaryColour}) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [levels, setLevels] = useState([0, 0, 0, 0, 0]);
    const [eyeFrame, setEyeFrame] = useState(0);
    const [calculatedScale, setCalculatedScale] = useState(4);

    useEffect(() => {
        if (!containerRef.current) return;

        const handleResize = (entries) => {
            for (let entry of entries) {
                const containerWidth = entry.contentRect.width;
                const templateColumns = camelTemplate[0].length;
                
                const availableWidth = containerWidth - 32; 
                
                const newScale = Math.max(1, Math.floor(availableWidth / templateColumns));
                setCalculatedScale(newScale);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        const tick = () => {
            setLevels(getHumpLevels(new Date(), month, day, time));
            setEyeFrame(prev => (prev + 1) % 4);
        };
        tick();

        const timer = setInterval(tick, 250);
        return () => clearInterval(timer);
    }, [month, day, time]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = camelTemplate[0].length * calculatedScale;
        canvas.height = camelTemplate.length * calculatedScale;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = "#000000"
            ctx.lineWidth = calculatedScale;
            ctx.setLineDash([calculatedScale * 2, calculatedScale * 2]);

            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(canvas.width, 0);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, 44 * calculatedScale);
            ctx.lineTo(canvas.width, 44 * calculatedScale);
            ctx.stroke();

            ctx.setLineDash([]);
        }

        const levelNumbers = levels.map(l => l.level);

        drawCamel(canvas, camelTemplate, levelNumbers, eyeFrame, calculatedScale, primaryColour, secondaryColour);
    }, [levels, eyeFrame, calculatedScale]);

    const { startCol, humpWidth, humpSpacing } = calculateHumpMetrics(levels.length);
    const totalCols = camelTemplate[0].length;

    return (
        <div ref={containerRef} className={styles.clockContainer}>
            <h2 className={styles.clockTitle}>{title}</h2>
            
            <div className={styles.wrapper}>
                <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: "100%", display: "block" }} />

                <div className={styles.digitalRow}>
                    <div 
                        className={styles.introLabel}
                        style={{ left: `${(startCol / totalCols) * 100}%` }}
                    >
                        {introText}
                    </div>

                    {levels.map((unit, index) => {
                        const humpLeft = startCol + index * (humpWidth + humpSpacing);
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
                </div>
            </div>
        </div>
    );
}