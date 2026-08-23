"use client";

import { useEffect, useRef } from "react";

export default function useFocusTrap(isOpen) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const container = containerRef.current;
        if (!container) return;

        const getFocusable = () =>
            Array.from(
                container.querySelectorAll(
                    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );

        const focusables = getFocusable();
        if (focusables.length > 0) focusables[0].focus();

        const handleKeyDown = (e) => {
            if (e.key !== "Tab") return;

            const focusable = getFocusable();
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            const escaped = document.activeElement !== null && !container.contains(document.activeElement);

            if (e.shiftKey) {
                if (document.activeElement === first || escaped) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last || escaped) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        container.addEventListener("keydown", handleKeyDown);
        return () => container.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    return containerRef;
}
