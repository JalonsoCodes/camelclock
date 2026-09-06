"use client";

import { useEffect } from "react";

export default function EmbedMode({ theme = "light", card = "card" }) {
    useEffect(() => {
        document.body.classList.add("embed-mode");
        if (card === "transparent") document.body.classList.add("embed-transparent");
        if (theme === "dark") document.documentElement.classList.add("dark");

        return () => {
            document.body.classList.remove("embed-mode", "embed-transparent");
            document.documentElement.classList.remove("dark");
        };
    }, [theme, card]);

    return null;
}
