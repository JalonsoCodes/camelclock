"use client";

import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { navigation } from "@/content/navigation";

export default function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setDark(document.documentElement.classList.contains("dark"));
        }, 0);
        return () => clearTimeout(t);
    }, []);

    const toggle = () => {
        setDark((d) => {
            const next = !d;
            document.documentElement.classList.toggle("dark", next);
            localStorage.setItem("theme", next ? "dark" : "light");
            return next;
        });
    };

    return (
        <button
            className="theme-toggle"
            type="button"
            aria-label={dark ? navigation.themeLightLabel : navigation.themeDarkLabel}
            title={dark ? navigation.themeLightLabel : navigation.themeDarkLabel}
            onClick={toggle}
        >
            {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
    );
}
