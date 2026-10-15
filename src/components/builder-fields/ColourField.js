"use client";

export function ColourInput({ idPrefix, value, onChange }) {
    return (
        <div className="colour-picker-wrapper">
            <input
                className="nbtc colour-swatch"
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <div className="hex-input-container nbtc">
                <span className="hex-hash">#</span>
                <input
                    className="colour-hex-text"
                    type="text"
                    value={undefined}
                    defaultValue={value.replace('#', '').toUpperCase()}
                    key={`${idPrefix}-${value}`}
                    onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                        e.target.value = cleanValue.toUpperCase();
                        if (cleanValue.length === 6) {
                            onChange(`#${cleanValue}`);
                        }
                    }}
                    maxLength={7}
                    onFocus={(e) => e.target.select()}
                />
            </div>
        </div>
    );
}

export default function ColourField({ label, idPrefix, value, onChange }) {
    return (
        <label>
            {label}
            <ColourInput idPrefix={idPrefix} value={value} onChange={onChange} />
        </label>
    );
}
