"use client";

import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";

export default function EmbedShell({ clock, id, initialTheme, initialCard, initialSize = "sm", initialNotion = false }) {
    return (
        <>
            <EmbedMode theme={initialTheme} card={initialCard} size={initialSize} notion={initialNotion} />
            <div className="public-clock-card nbtc">
                <EmbedClock clock={clock} id={id} />
            </div>
        </>
    );
}