"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { normalizeUsername, validateUsername } from "@/utils/usernameValidation";
import { track } from "@/utils/analytics";
import { auth } from "@/content/auth";
import LoadingSpinner from "../LoadingSpinner";

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
    const [error, setError] = useState(hasLink ? "" : auth.confirm.errorInvalid);
    const [saveError, setSaveError] = useState("");

    const savePendingClock = async () => {
        let pending = null;
        try {
            pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
        } catch {
            pending = null;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { ok: true };

        // The optional handle chosen at signup rides the pending stash. Write it now the account
        // exists; a taken handle is non-fatal (the user can set one in Settings).
        if (pending?.handle) {
            const handle = normalizeUsername(pending.handle);
            if (!validateUsername(handle)) {
                const { error: handleError } = await supabase
                    .from("profiles")
                    .update({ username: handle })
                    .eq("id", user.id);
                if (handleError && handleError.code !== "23505") {
                    console.error("ConfirmForm: failed to save handle:", handleError.message);
                } else if (!handleError) {
                    track("handle_set", { source: "signup" });
                }
            }
        }

        if (!pending?.payload) {
            if (pending?.handle) {
                try {
                    localStorage.removeItem(PENDING_KEY);
                } catch {
                    // ignore
                }
            }
            return { ok: true };
        }

        try {
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
                setError(auth.confirm.errorInvalid);
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
                    <h2 className="auth-title">{auth.confirm.confirmedTitle}</h2>
                    <p className="auth-subtitle">{auth.confirm.confirmedSubtitle}</p>
                    {saveError && <p className="auth-error">{saveError}</p>}
                    <button className="auth-button" type="button" onClick={() => router.push("/dashboard")}>
                        <Check className="button-icon" />
                        {auth.confirm.goDashboard}
                    </button>
                </div>
            </div>
        );
    }

    if (!hasLink) {
        return (
            <div className="auth-page">
                <div className="auth-card nbtc">
                    <h2 className="auth-title">{auth.confirm.checkingTitle}</h2>
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
                <h2 className="auth-title">{auth.confirm.confirmTitle}</h2>
                <p className="auth-subtitle">
                    Press the button below to finish confirming your email address.
                </p>

                {error && <p className="auth-error">{error}</p>}

                <button className="auth-button" type="button" onClick={handleConfirm} disabled={verifying}>
                    {verifying ? <LoadingSpinner size="sm" inline /> : <Check className="button-icon" />}
                    {verifying ? "CONFIRMING..." : "CONFIRM MY EMAIL"}
                </button>

                <p className="auth-back">
                    <a href="/login">← Back to sign in</a>
                </p>
            </div>
        </div>
    );
}