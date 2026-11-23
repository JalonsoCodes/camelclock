"use client";

import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";
import { getBackgroundBgVar } from "@/content/backgrounds";

export default function EmbedShell({ clock, id, initialTheme, initialCard, initialSize = "sm", initialNotion = false }) {
    return (
        <>
            <EmbedMode theme={initialTheme} card={initialCard} size={initialSize} notion={initialNotion} />
            <div className="public-clock-card nbtc" style={{ backgroundColor: clock.background ? getBackgroundBgVar(clock.background) : undefined }}>
                <EmbedClock clock={clock} id={id} newTab />
            </div>
        </>
    );
}