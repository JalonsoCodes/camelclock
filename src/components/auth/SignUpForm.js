"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/utils/passwordValidation";
import { validateUsername, normalizeUsername } from "@/utils/usernameValidation";
import PasswordRequirements from "@/components/PasswordRequirements";
import { auth } from "@/content/auth";

const PENDING_KEY = "camelClock.pending";

export default function SignUpForm({ next = "/dashboard", onSuccess, onSwitchMode, onAwaitingConfirm }) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [handle, setHandle] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(auth.signup.errors.mismatch);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        const trimmedHandle = normalizeUsername(handle);
        if (trimmedHandle) {
            const handleError = validateUsername(trimmedHandle);
            if (handleError) {
                setError(handleError);
                return;
            }
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
        });

        if (error) {
            setError(error.message || auth.signup.errors.generic);
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
            return;
        }

        if (trimmedHandle) {
            try {
                const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null") ?? {};
                localStorage.setItem(PENDING_KEY, JSON.stringify({ ...pending, handle: trimmedHandle }));
            } catch {
                // ignore
            }
        }

        onAwaitingConfirm?.(email);
    };

    return (
        <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label">
                {auth.signup.emailLabel}
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
                {auth.signup.passwordLabel}
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
            <PasswordRequirements password={password} />

            <label className="auth-label">
                {auth.signup.confirmLabel}
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

            <label className="auth-label">
                {auth.signup.handleLabel}
                <input
                    className="auth-input nbtc"
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    minLength={3}
                    maxLength={20}
                    autoComplete="off"
                    placeholder={auth.signup.handlePlaceholder}
                />
            </label>
            <p className="auth-hint">{auth.signup.handleHint}</p>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-button" type="submit" disabled={loading}>
                <UserPlus className="button-icon" />
                {loading ? auth.signup.signingUp : auth.signup.signUp}
            </button>

            <p className="auth-switch">
                {auth.signup.hasAccount}{" "}
                {onSwitchMode ? (
                    <button className="auth-switch-link" type="button" onClick={onSwitchMode}>
                        {auth.login.signIn}
                    </button>
                ) : (
                    <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
                        {auth.login.signIn}
                    </Link>
                )}
            </p>
        </form>
    );
}
