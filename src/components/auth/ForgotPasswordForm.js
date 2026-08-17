"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setMessage("Check your email for a password reset link.");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">RESET PASSWORD</h2>
                <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
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
                    {message && <p className="auth-message">{message}</p>}

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "SENDING..." : "SEND RESET LINK"}
                    </button>
                </form>

                <p className="auth-back">
                    <Link href="/login">← Back to sign in</Link>
                </p>
            </div>
        </div>
    );
}
