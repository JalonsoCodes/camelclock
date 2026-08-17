"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ConfirmForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const [status, setStatus] = useState(
        code ? "Verifying your email..." : "Invalid confirmation link."
    );

    useEffect(() => {
        if (!code) return;

        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
            if (error) {
                setStatus("This confirmation link is invalid or has expired.");
            } else {
                setStatus("Email confirmed! Redirecting...");
                setTimeout(() => {
                    router.push("/dashboard");
                    router.refresh();
                }, 1500);
            }
        });
    }, [code, router]);

    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">EMAIL CONFIRMATION</h2>
                <p className="auth-subtitle">{status}</p>
                {status.includes("Invalid") || status.includes("expired") ? (
                    <p className="auth-back">
                        <a href="/login">← Back to sign in</a>
                    </p>
                ) : null}
            </div>
        </div>
    );
}
