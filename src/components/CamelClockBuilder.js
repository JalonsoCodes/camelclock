"use client";

import { useState, useEffect } from "react";
import CamelClock from "./CamelClock";

export default function CamelClockBuilder() {
    const [title, setTitle] = useState("My Amazing Promotion");
    const [month, setMonth] = useState(11);
    const [day, setDay] = useState(25);
    const [time, setTime] = useState("00:00");
    const [primaryColour, setPrimaryColour] = useState("#DBB279");
    const [secondaryColour, setSecondaryColour] = useState("#8E652C");

    useEffect(() => {
        document.documentElement.style.setProperty('--primary-colour', primaryColour);
    }, [primaryColour]);

    useEffect(() => {
        document.documentElement.style.setProperty('--secondary-colour', secondaryColour);
    }, [secondaryColour]);

    return (
        <div className="camel-builder">
            <form className="camel-builder-form" onSubmit={(e) => e.preventDefault()}>
                <label>
                    TITLE
                    <input 
                        className="nbtc" 
                        type="text" 
                        value={title} 
                        maxLength="75" 
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
                                    maxLength={6} 
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
                                    maxLength={6}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    </label>
                </div>
            </form>

            <div className="canvas-wrapper nbtc">
                <CamelClock title={title} month={month} day={day} time={time} primaryColour={primaryColour} secondaryColour={secondaryColour} />
            </div>
        </div>
    );
}