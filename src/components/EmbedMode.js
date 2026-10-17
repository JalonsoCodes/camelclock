"use client";

import { useEffect } from "react";

export default function EmbedMode({ theme = "light", card = "card", size = "sm" }) {
    useEffect(() => {
        document.body.classList.add("embed-mode", `embed-size-${size}`);
        if (card === "transparent") document.body.classList.add("embed-transparent");
        if (theme === "dark") document.documentElement.classList.add("dark");

        return () => {
            document.body.classList.remove("embed-mode", "embed-transparent", "embed-size-sm", "embed-size-md", "embed-size-lg");
            document.documentElement.classList.remove("dark");
        };
    }, [theme, card, size]);

    return null;
}
