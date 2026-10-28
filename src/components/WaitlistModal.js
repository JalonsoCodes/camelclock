"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Infinity as InfinityIcon, EyeOff, Mountain, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import useFocusTrap from "@/hooks/useFocusTrap";
import { PRO_FEATURES } from "@/content/pricing";
import { waitlist } from "@/content/pricing";

const FEATURE_ICONS = {
    "unlimited-clocks": InfinityIcon,
    "no-watermark": EyeOff,
    "scenes": Mountain,
};

export default function WaitlistModal({
    onClose,
    heading = waitlist.heading,
    subline = waitlist.subline,
}) {
    const trapRef = useFocusTrap(true);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [joined, setJoined] = useState(false);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        setLoading(true);

        const { error: insertError } = await supabase
            .from("waitlist")
            .insert({ email: email.trim().toLowerCase() });

        setLoading(false);

        if (insertError) {
            if (insertError.code === "23505") {
                setJoined(true);
                return;
            }
            console.error("Failed to join waitlist:", insertError.message);
            setError(waitlist.genericError);
            return;
        }

        setJoined(true);
    };

    return createPortal(
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-card nbtc" ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="waitlist-title" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                    <X aria-hidden="true" />
                </button>
                <h2 className="auth-title" id="waitlist-title">{heading}</h2>
                {joined ? (
                    <>
                        <p className="auth-subtitle">
                            {waitlist.joinedBody}
                        </p>
                        <button className="auth-button" type="button" onClick={onClose}>
                            <X className="button-icon" />
                            {waitlist.closeLabel}
                        </button>
                    </>
                ) : (
                    <form className="waitlist-form" onSubmit={handleSubmit}>
                        <ul className="waitlist-features">
                            {PRO_FEATURES.map((feature) => (
                                <li key={feature.id}>
                                    {(() => {
                                        const Icon = FEATURE_ICONS[feature.id] ?? Bell;
                                        return <span className="waitlist-feature-icon"><Icon aria-hidden="true" /></span>;
                                    })()}
                                    {feature.label}
                                </li>
                            ))}
                        </ul>
                        <p className="auth-subtitle">{subline}</p>
                        <label className="auth-label">
                            {waitlist.emailLabel}
                            <input
                                className="auth-input nbtc"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                autoFocus
                            />
                        </label>
                        {error && <p className="auth-error">{error}</p>}
                        <button
                            className="auth-button"
                            type="submit"
                            disabled={loading}
                        >
                            <Bell className="button-icon" />
                            {loading ? waitlist.joiningLabel : waitlist.joinLabel}
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
