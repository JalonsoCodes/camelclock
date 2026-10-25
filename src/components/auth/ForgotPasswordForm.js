"use client";

import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { auth as authCopy } from "@/content/auth";

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

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);

        if (resetError) {
            setError(resetError.message || authCopy.forgot.errors.generic);
        } else {
            setMessage(authCopy.forgot.success);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">{authCopy.forgot.title}</h2>
                <p className="auth-subtitle">{authCopy.forgot.subtitle}</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-label">
                        {authCopy.forgot.emailLabel}
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
                        <Send className="button-icon" />
                        {loading ? authCopy.forgot.sending : authCopy.forgot.send}
                    </button>
                </form>

                <p className="auth-switch">
                    <Link href="/login">{authCopy.forgot.backToSignIn}</Link>
                </p>
            </div>
        </div>
    );
}
