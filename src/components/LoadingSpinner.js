"use client";

import { useEffect, useState } from "react";

export default function LoadingSpinner({ size = "sm", inline = false, className = "" }) {
    const [frame, setFrame] = useState(0);
    const sizeClass = size === "lg" ? "camel-spinner--lg" : size === "md" ? "camel-spinner--md" : "camel-spinner--sm";
    const inlineClass = inline ? "camel-spinner--inline" : "";
    
    useEffect(() => {
        const interval = setInterval(() => {
            setFrame((prev) => (prev + 1) % 4);
        }, 250);
        return () => clearInterval(interval);
    }, []);
    
    return (
        <span className={`camel-spinner ${sizeClass} ${inlineClass} camel-spinner--frame${frame} ${className}`} aria-hidden="true">
            <span className="camel-spinner__row">
                <span className="camel-spinner__pixel"></span>
                <span className="camel-spinner__pixel"></span>
            </span>
            <span className="camel-spinner__row">
                <span className="camel-spinner__pixel"></span>
                <span className="camel-spinner__pixel"></span>
            </span>
        </span>
    );
}
