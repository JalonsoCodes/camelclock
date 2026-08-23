"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
    const trapRef = useFocusTrap(true);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onCancel]);

    return (
        <div className="auth-modal-overlay" onClick={onCancel}>
            <div className="auth-card nbtc" ref={trapRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close-x" type="button" title="Close" onClick={onCancel} aria-label="Close">
                    <X aria-hidden="true" />
                </button>
                <p className="auth-subtitle">{message}</p>
                <div className="confirm-actions">
                    <button className="auth-button" type="button" onClick={onConfirm}>
                        <Check className="button-icon" />
                        CONFIRM
                    </button>
                    <button className="auth-close nbtc" type="button" onClick={onCancel}>
                        <X className="button-icon" />
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}
