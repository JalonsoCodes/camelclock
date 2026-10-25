"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/utils/passwordValidation";
import PasswordRequirements from "@/components/PasswordRequirements";
import { auth } from "@/content/auth";

function getTokenParams(searchParams) {
    const hashParams = typeof window !== "undefined"
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();
    return {
        tokenHash: hashParams.get("token_hash") ?? searchParams.get("token_hash"),
        tokenType: hashParams.get("type") ?? searchParams.get("type"),
        code: searchParams.get("code"),
    };
}

export default function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { tokenHash, tokenType, code } = getTokenParams(searchParams);
    const hasLink = Boolean(tokenHash || code);

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [linkError, setLinkError] = useState(hasLink ? "" : auth.reset.invalidBody);

    const handleVerify = async () => {
        setVerifying(true);
        setLinkError("");

        const resolve = tokenHash
            ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType || "recovery" })
            : supabase.auth.exchangeCodeForSession(code);

        const { error: verifyError } = await resolve;

        if (verifyError) {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (session) {
                setVerified(true);
            } else {
                setLinkError(auth.reset.invalidBody);
            }
            setVerifying(false);
            return;
        }

        setVerified(true);
        setVerifying(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError(auth.reset.errors.mismatch);
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({ password });

        setLoading(false);

        if (error) {
            setError(error.message || auth.reset.errors.generic);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    if (hasLink && !verified && !linkError) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <h2 className="auth-title">RESET PASSWORD</h2>
                    <p className="auth-subtitle">
                        Press the button below to verify this reset link.
                    </p>

                    <button className="auth-button" type="button" onClick={handleVerify} disabled={verifying}>
                        <KeyRound className="button-icon" />
                        {verifying ? "VERIFYING..." : "VERIFY RESET LINK"}
                    </button>

                    <p className="auth-back">
                        <a href="/forgot-password">Request a new reset link</a>
                    </p>
                </div>
            </div>
        );
    }

    if (linkError) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <h2 className="auth-title">RESET PASSWORD</h2>
                    <p className="auth-error">{linkError}</p>
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
                        <h2 className="auth-title">{auth.reset.title}</h2>
                        <p className="auth-subtitle">{auth.reset.subtitle}</p>

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
                    <PasswordRequirements password={password} />

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
                        <KeyRound className="button-icon" />
                        {loading ? "SAVING..." : "UPDATE PASSWORD"}
                    </button>
                </form>
            </div>
        </div>
    );
}