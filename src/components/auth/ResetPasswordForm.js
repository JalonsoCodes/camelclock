"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [exchanging, setExchanging] = useState(!!code);
    const [exchangeError, setExchangeError] = useState(
        code ? "" : "Invalid or missing reset link."
    );

    useEffect(() => {
        if (!code) return;

        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
                setExchangeError("This reset link is invalid or has expired.");
            }
            setExchanging(false);
        });
    }, [code]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    if (exchanging) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <p className="auth-subtitle">Verifying reset link...</p>
                </div>
            </div>
        );
    }

    if (exchangeError) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <h2 className="auth-title">RESET PASSWORD</h2>
                    <p className="auth-error">{exchangeError}</p>
                    <p className="auth-back">
                        <a href="/forgot-password">Request a new reset link</a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">NEW PASSWORD</h2>
                <p className="auth-subtitle">Enter your new password below.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-label">
                        NEW PASSWORD
                        <input
                            className="auth-input nbtc"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            autoFocus
                        />
                    </label>

                    <label className="auth-label">
                        CONFIRM PASSWORD
                        <input
                            className="auth-input nbtc"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </label>

                    {error && <p className="auth-error">{error}</p>}

                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? "SAVING..." : "UPDATE PASSWORD"}
                    </button>
                </form>
            </div>
        </div>
    );
}
