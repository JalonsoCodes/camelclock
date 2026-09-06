"use client";

import { useEffect, useState } from "react";
import EmbedMode from "./EmbedMode";
import EmbedClock from "./EmbedClock";
import OptionSlider from "./OptionSlider";

const THEME_OPTIONS = [
    { value: "light", label: "LIGHT" },
    { value: "dark", label: "DARK" },
];

const CARD_OPTIONS = [
    { value: "card", label: "CARD" },
    { value: "transparent", label: "TRANSPARENT" },
];

export default function EmbedShell({ clock, id, initialTheme, initialCard }) {
    const [theme, setTheme] = useState(initialTheme);
    const [card, setCard] = useState(initialCard);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("theme", theme);
        if (card === "transparent") {
            url.searchParams.set("card", "transparent");
        } else {
            url.searchParams.delete("card");
        }
        window.history.replaceState(null, "", url);
    }, [theme, card]);

    return (
        <>
            <EmbedMode theme={theme} card={card} />
            <div className="public-clock-card nbtc">
                <EmbedClock clock={clock} id={id} />
            </div>
            <div className="embed-theme-switch">
                <OptionSlider
                    ariaLabel="Theme"
                    options={THEME_OPTIONS}
                    value={theme}
                    onChange={setTheme}
                />
                <OptionSlider
                    ariaLabel="Card style"
                    options={CARD_OPTIONS}
                    value={card}
                    onChange={setCard}
                />
            </div>
        </>
    );
}