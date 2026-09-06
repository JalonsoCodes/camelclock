"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const PENDING_KEY = "camelClock.pending";

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

export default function ConfirmForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { tokenHash, tokenType, code } = getTokenParams(searchParams);
    const hasLink = Boolean(tokenHash || code);

    const [verifying, setVerifying] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState(hasLink ? "" : "This confirmation link is incomplete.");
    const [saveError, setSaveError] = useState("");

    const savePendingClock = async () => {
        let pending = null;
        try {
            pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
        } catch {
            pending = null;
        }
        if (!pending?.payload) return { ok: true };
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return { ok: true };
            const { error: insertError } = await supabase
                .from("clocks")
                .insert([{ ...pending.payload, status: "draft", user_id: user.id }]);
            if (insertError) return { ok: false };
            try {
                localStorage.removeItem(PENDING_KEY);
            } catch {
                // ignore
            }
            return { ok: true };
        } catch {
            return { ok: false };
        }
    };

    const handleConfirm = async () => {
        setVerifying(true);
        setError("");

        const resolve = tokenHash
            ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType || "signup" })
            : supabase.auth.exchangeCodeForSession(code);

        const { error: verifyError } = await resolve;

        if (verifyError) {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user?.email_confirmed_at) {
                const saved = await savePendingClock();
                setSaveError(saved.ok ? "" : "Your clock couldn't be saved. You can rebuild it from the builder.");
                setConfirmed(true);
            } else {
                setError("This confirmation link is invalid, expired, or has already been used.");
            }
            setVerifying(false);
            return;
        }

        const saved = await savePendingClock();
        setSaveError(saved.ok ? "" : "Your clock couldn't be saved. You can rebuild it from the builder.");
        setConfirmed(true);
        setVerifying(false);
    };

    if (confirmed) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc confirm-card">
                    <div className="confirm-check">
                        <Check aria-hidden="true" />
                    </div>
                    <h2 className="auth-title">EMAIL CONFIRMED</h2>
                    <p className="auth-subtitle">You&apos;re all set. Your account is verified.</p>
                    {saveError && <p className="auth-error">{saveError}</p>}
                    <button className="auth-button" type="button" onClick={() => router.push("/dashboard")}>
                        GO TO DASHBOARD
                    </button>
                </div>
            </div>
        );
    }

    if (!hasLink) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <h2 className="auth-title">EMAIL CONFIRMATION</h2>
                    <p className="auth-error">{error}</p>
                    <p className="auth-back">
                        <a href="/login">← Back to sign in</a>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">CONFIRM YOUR EMAIL</h2>
                <p className="auth-subtitle">
                    Press the button below to finish confirming your email address.
                </p>

                {error && <p className="auth-error">{error}</p>}

                <button className="auth-button" type="button" onClick={handleConfirm} disabled={verifying}>
                    <MailCheck className="button-icon" />
                    {verifying ? "CONFIRMING..." : "CONFIRM MY EMAIL"}
                </button>

                <p className="auth-back">
                    <a href="/login">← Back to sign in</a>
                </p>
            </div>
        </div>
    );
}