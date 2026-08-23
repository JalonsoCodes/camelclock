"use client";

export default function OptionSlider({ options, value, onChange, disabled = false, ariaLabel }) {
    return (
        <div
            className="option-slider nbtc"
            role={ariaLabel ? "radiogroup" : "group"}
            aria-label={ariaLabel}
        >
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    className={`option-slider-button${value === option.value ? " active" : ""}`}
                    disabled={disabled}
                    onClick={() => {
                        if (option.value !== value) onChange(option.value);
                    }}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
