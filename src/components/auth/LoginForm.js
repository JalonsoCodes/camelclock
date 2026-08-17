"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginForm({ next = "/dashboard", onSuccess, onSwitchMode }) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (onSuccess) {
            onSuccess();
        } else {
            router.push(next);
            router.refresh();
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
                    autoComplete="current-password"
                />
            </label>

            <p className="auth-forgot">
                <Link href="/forgot-password">Forgot password?</Link>
            </p>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-button" type="submit" disabled={loading}>
                {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>

            <p className="auth-switch">
                New to CamelClocks?{" "}
                {onSwitchMode ? (
                    <button className="auth-switch-link" type="button" onClick={onSwitchMode}>
                        Create an account
                    </button>
                ) : (
                    <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>
                        Create an account
                    </Link>
                )}
            </p>
        </form>
    );
}
