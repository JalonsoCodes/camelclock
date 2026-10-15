"use client";

export default function TitleField({ value, onChange }) {
    return (
        <label>
            TITLE
            <input
                className="nbtc"
                type="text"
                value={value}
                maxLength="72"
                onChange={(e) => onChange(e.target.value)}
                onFocus={(e) => e.target.select()}
            />
        </label>
    );
}
