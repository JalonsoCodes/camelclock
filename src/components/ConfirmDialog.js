"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";
import LoadingSpinner from "./LoadingSpinner";

export default function ConfirmDialog({
    message,
    onConfirm,
    onCancel,
    typeToConfirm = null,
    confirmLabel = "CONFIRM",
    busy = false,
    danger = false,
}) {
    const trapRef = useFocusTrap(true);
    const [typed, setTyped] = useState("");
    const confirmed = !typeToConfirm || typed.trim().toUpperCase() === typeToConfirm.toUpperCase();

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onCancel, busy]);

    return createPortal(
        <div className="auth-modal-overlay" onClick={busy ? undefined : onCancel}>
            <div className="auth-card nbtc" ref={trapRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close-x" type="button" title="Close" onClick={onCancel} disabled={busy} aria-label="Close">
                    <X aria-hidden="true" />
                </button>
                <p className="auth-subtitle">{message}</p>
                {typeToConfirm && (
                    <input
                        className="auth-input nbtc"
                        type="text"
                        value={typed}
                        placeholder={typeToConfirm}
                        onChange={(e) => setTyped(e.target.value)}
                        autoFocus
                    />
                )}
                <div className="confirm-actions">
                    <button
                        className={`auth-button${danger ? " danger" : ""}`}
                        type="button"
                        disabled={!confirmed || busy}
                        onClick={onConfirm}
                    >
                        {busy ? <LoadingSpinner size="sm" inline /> : <Check className="button-icon" />}
                        {confirmLabel}
                    </button>
                    <button className="auth-close nbtc" type="button" onClick={onCancel} disabled={busy}>
                        <X className="button-icon" />
                        CANCEL
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
