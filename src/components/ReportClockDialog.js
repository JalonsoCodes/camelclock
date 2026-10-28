"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Flag, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import useFocusTrap from "@/hooks/useFocusTrap";
import { cleanText } from "@/utils/text";

const MAX_REASON = 500;

export default function ReportClockDialog({ clockId, clockTitle, onClose }) {
    const trapRef = useFocusTrap(true);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [busy, onClose]);

    const cleanReason = cleanText(reason, { multiline: true });
    const canSend = !busy && cleanReason.length > 0;

    const submit = async () => {
        if (!canSend) return;

        setBusy(true);
        setError("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setError("Sign in again to report this clock.");
            setBusy(false);
            return;
        }

        const { error: insertError } = await supabase.from("clock_reports").insert({
            clock_id: clockId,
            reporter_id: user.id,
            reason: cleanReason,
        });

        setBusy(false);

        if (insertError) {
            if (insertError.code === "23505") {
                setError("You've already reported this clock.");
            } else {
                console.error("ReportClockDialog:", insertError.message);
                setError("Couldn't send the report. Please try again.");
            }
            return;
        }

        setSent(true);
    };

    return createPortal(
        <div className="auth-modal-overlay" onClick={busy ? undefined : onClose}>
            <div
                className="auth-card nbtc"
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="auth-close-x" type="button" title="Close" onClick={onClose} disabled={busy} aria-label="Close">
                    <X aria-hidden="true" />
                </button>

                {sent ? (
                    <>
                        <div className="confirm-check">
                            <Check aria-hidden="true" />
                        </div>
                        <h2 className="auth-title" id="report-dialog-title">REPORT SENT</h2>
                        <p className="auth-subtitle">Thanks. We&apos;ll review it.</p>
                        <button className="auth-button" type="button" onClick={onClose} autoFocus>
                            <Check className="button-icon" />
                            GOT IT
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="auth-title" id="report-dialog-title">REPORT THIS CLOCK</h2>
                        <p className="auth-subtitle">
                            Tell us what&apos;s wrong with &ldquo;{clockTitle}&rdquo;.
                        </p>
                        <textarea
                            className="auth-input report-reason"
                            value={reason}
                            maxLength={MAX_REASON}
                            rows={5}
                            placeholder="What's wrong with this clock?"
                            onChange={(e) => setReason(e.target.value)}
                            disabled={busy}
                            autoFocus
                        />
                        {error && <p className="auth-error">{error}</p>}
                        <div className="confirm-actions">
                            <button className="auth-button" type="button" onClick={submit} disabled={!canSend}>
                                <Flag className="button-icon" />
                                {busy ? "SENDING..." : "SEND REPORT"}
                            </button>
                            <button className="auth-close nbtc" type="button" onClick={onClose} disabled={busy}>
                                <X className="button-icon" />
                                CANCEL
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
