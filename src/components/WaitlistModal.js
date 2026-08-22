"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function WaitlistModal({ onClose }) {
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
                setError("That email is already registered.");
            } else {
                console.error("Failed to join waitlist:", insertError.message);
                setError("Something went wrong. Please try again.");
            }
            return;
        }

        setJoined(true);
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-card nbtc" ref={trapRef} onClick={(e) => e.stopPropagation()}>
                <h2 className="auth-title">JOIN THE WAITLIST</h2>
                {joined ? (
                    <>
                        <p className="auth-subtitle">
                            You&apos;re on the list! We&apos;ll email you when CamelClock Pro
                            launches.
                        </p>
                        <button className="auth-button" type="button" onClick={onClose}>
                            CLOSE
                        </button>
                    </>
                ) : (
                    <form className="waitlist-form" onSubmit={handleSubmit}>
                        <p className="auth-subtitle">
                            Be first in line for early access to CamelClock Pro.
                        </p>
                        <label className="auth-label">
                            EMAIL
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
                            {loading ? "JOINING..." : "JOIN WAITLIST"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
