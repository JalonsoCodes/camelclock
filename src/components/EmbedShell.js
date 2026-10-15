"use client";

import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";

export default function EmbedShell({ clock, id, initialTheme, initialCard }) {
    return (
        <>
            <EmbedMode theme={initialTheme} card={initialCard} />
            <div className="public-clock-card nbtc">
                <EmbedClock clock={clock} id={id} />
            </div>
        </>
    );
}