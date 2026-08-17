"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function SignUpForm({ next = "/dashboard", onSuccess, onSwitchMode }) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setLoading(false);

        if (data.session) {
            if (onSuccess) {
                onSuccess();
            } else {
                router.push(next);
                router.refresh();
            }
        } else {
            setMessage("Check your email to confirm your account before signing in.");
        }
    };

    return (
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

            <label className="auth-label">
                PASSWORD
                <input
                    className="auth-input nbtc"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
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
            {message && <p className="auth-message">{message}</p>}

            <button className="auth-button" type="submit" disabled={loading}>
                {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>

            <p className="auth-switch">
                Already have an account?{" "}
                {onSwitchMode ? (
                    <button className="auth-switch-link" type="button" onClick={onSwitchMode}>
                        Sign in
                    </button>
                ) : (
                    <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
                        Sign in
                    </Link>
                )}
            </p>
        </form>
    );
}
