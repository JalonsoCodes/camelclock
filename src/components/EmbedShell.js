"use client";

import { useEffect, useState } from "react";
import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";
import OptionSlider from "./OptionSlider";

const THEME_OPTIONS = [
    { value: "light", label: "LIGHT" },
    { value: "dark", label: "DARK" },
    { value: "transparent", label: "TRANSPARENT" },
];

export default function EmbedShell({ clock, id, initialTheme }) {
    const [theme, setTheme] = useState(initialTheme);

    useEffect(() => {
        const url = new URL(window.location.href);
        if (theme === "light") {
            url.searchParams.delete("theme");
        } else {
            url.searchParams.set("theme", theme);
        }
        window.history.replaceState(null, "", url);
    }, [theme]);

    return (
        <>
            <EmbedMode theme={theme} />
            <div className="public-clock-card nbtc">
                <EmbedClock clock={clock} id={id} />
            </div>
            <div className="embed-theme-switch nbtc">
                <OptionSlider
                    ariaLabel="Embed style"
                    options={THEME_OPTIONS}
                    value={theme}
                    onChange={setTheme}
                />
            </div>
        </>
    );
}