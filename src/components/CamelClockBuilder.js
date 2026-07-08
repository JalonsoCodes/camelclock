"use client";

import { useState } from "react";
import CamelClock from "./CamelClock";

export default function CamelClockBuilder() {
    const [month, setMonth] = useState(11);
    const [day, setDay] = useState(25);
    const [time, setTime] = useState("00:00");

    return (
        <div className="camel-builder">
            <div className="canvas-wrapper nbtc">
                <CamelClock scale={4} month={month} day={day} time={time} />
            </div>

            <form className="camel-builder-form" onSubmit={(e) => e.preventDefault()}>
                <label>
                    Month
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
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
                    Day
                    <input 
                        type="number" 
                        min="1" 
                        max="31" 
                        value={day} 
                        onChange={(e) => setDay(Number(e.target.value))} 
                    />
                </label>

                <label>
                    Time
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </label>
            </form>
        </div>
    );
}