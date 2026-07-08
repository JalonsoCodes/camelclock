"use client";

import { useEffect, useRef, useState } from "react";
import { drawCamel } from "@/utils/drawing";
import { camelTemplate } from "@/utils/grids";

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
    const secondsLeft = Math.floor((diffMs / 1000) % 60);
    
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const allUnits = [
        { value: totalMonthsLeft, max: 12 },
        { value: daysLeft, max: daysInCurrentMonth },
        { value: hoursLeft, max: 24 },
        { value: minutesLeft, max: 60 },
        { value: secondsLeft, max: 60 }
    ];

    const firstActiveIndex = allUnits.findIndex(unit => unit.value > 0);

    const activeUnits = firstActiveIndex === -1 
        ? [allUnits[4]] 
        : allUnits.slice(firstActiveIndex);

    return activeUnits.map(unit => Math.floor((unit.value / unit.max) * 24));
}

export default function CamelClock({ scale, month, day, time }) {
    const canvasRef = useRef(null);
    const [levels, setLevels] = useState([0, 0, 0, 0, 0]);

    useEffect(() => {
        const tick = () => setLevels(getHumpLevels(new Date(), month, day, time));
        tick();

        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [month, day, time]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = camelTemplate[0].length * scale;
        canvas.height = camelTemplate.length * scale;

        drawCamel(canvas, camelTemplate, levels, scale);
    }, [scale, levels]);

    return <canvas ref={canvasRef} style={{ imageRendering: "pixelated" }} />;
}