"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { auth } from "@/content/auth";
import LoadingSpinner from "../LoadingSpinner";

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
            setError(error.message || auth.login.errors.generic);
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
                {auth.login.emailLabel}
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
                {auth.login.passwordLabel}
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
                <Link href="/forgot-password">{auth.login.forgot}</Link>
            </p>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-button" type="submit" disabled={loading}>
                {loading ? <LoadingSpinner size="sm" inline /> : <LogIn className="button-icon" />}
                {loading ? auth.login.signingIn : auth.login.signIn}
            </button>

            <p className="auth-switch">
                New to CamelClock?{" "}
                {onSwitchMode ? (
                    <button className="auth-switch-link" type="button" onClick={onSwitchMode}>
                        {auth.signup.signUp.toLowerCase().includes("account") ? "Create an account" : auth.signup.signUp}
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
