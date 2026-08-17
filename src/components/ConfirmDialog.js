"use client";

import { useEffect } from "react";
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
            <div className="auth-card nbtc" ref={trapRef} onClick={(e) => e.stopPropagation()}>
                <p className="auth-subtitle">{message}</p>
                <div className="confirm-actions">
                    <button className="auth-button" type="button" onClick={onConfirm}>
                        CONFIRM
                    </button>
                    <button className="auth-close nbtc" type="button" onClick={onCancel}>
                        CANCEL
                    </button>
                </div>
            </div>
        </div>
    );
}
