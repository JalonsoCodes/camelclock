"use client";

import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";

export default function EmbedShell({ clock, id, initialTheme, initialCard, initialSize = "sm", entitlements = {} }) {
    return (
        <>
            <EmbedMode theme={initialTheme} card={initialCard} size={initialSize} />
            <div className="public-clock-card nbtc">
                <EmbedClock clock={clock} id={id} entitlements={entitlements} />
            </div>
        </>
    );
}