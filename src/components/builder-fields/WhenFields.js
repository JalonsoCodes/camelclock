"use client";

import TimeField from "@/components/builder-fields/TimeField";
import { getDaysInMonth } from "@/utils/time";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export default function WhenFields({ month, day, time, onMonthChange, onDayChange, onTimeChange }) {
    const handleMonth = (value) => {
        const newMonth = Number(value);
        onMonthChange(newMonth);
        const maxDays = getDaysInMonth(newMonth, new Date().getFullYear());
        onDayChange((d) => Math.min(d, maxDays));
    };

    return (
        <>
            <div className="form-group three-quarter-split">
                <label>
                    MONTH
                    <select className="nbtc" value={month} onChange={(e) => handleMonth(e.target.value)}>
                        {MONTH_NAMES.map((name, i) => (
                            <option key={name} value={i}>{name}</option>
                        ))}
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
                        onChange={(e) => onDayChange(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                    />
                </label>
            </div>

            <label>
                TIME
                <TimeField value={time} onChange={onTimeChange} />
            </label>
        </>
    );
}
