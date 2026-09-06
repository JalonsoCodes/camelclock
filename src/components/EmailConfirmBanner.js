"use client";

import { useState } from "react";
import { AlertTriangle, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function EmailConfirmBanner({ email }) {
    const [status, setStatus] = useState("");
    const [sending, setSending] = useState(false);

    const handleResend = async () => {
        setSending(true);
        setStatus("");
        const { error } = await supabase.auth.resend({ type: "signup", email });
        setSending(false);
        if (error) {
            setStatus("Couldn't send the confirmation email right now. Please try again later.");
        } else {
            setStatus("Confirmation email sent! Check your inbox.");
        }
    };

    return (
        <div className="email-confirm-banner nbtc" role="alert">
            <div className="email-confirm-banner-icon">
                <AlertTriangle aria-hidden="true" />
            </div>
            <div className="email-confirm-banner-copy">
                <strong>CONFIRM YOUR EMAIL</strong>
                <p>
                    Your account is not fully verified. Until you confirm <em>{email}</em>, you could be
                    locked out if you sign out, and your clocks may be at risk. Confirm now to keep your
                    account safe.
                </p>
                {status && <p className="email-confirm-banner-status">{status}</p>}
            </div>
            <button className="auth-button" type="button" onClick={handleResend} disabled={sending}>
                <MailCheck className="button-icon" />
                {sending ? "SENDING..." : "RESEND CONFIRMATION"}
            </button>
        </div>
    );
}