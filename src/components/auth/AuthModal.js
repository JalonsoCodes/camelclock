"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { MailCheck, X } from "lucide-react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import useFocusTrap from "@/hooks/useFocusTrap";
import { auth } from "@/content/auth";

const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;

export default function AuthModal({ mode = "signup", next = "/dashboard", onSuccess, onClose }) {
    const [activeMode, setActiveMode] = useState(mode);
    const [awaitingEmail, setAwaitingEmail] = useState(null);
    const trapRef = useFocusTrap(true);
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => typeof document !== "undefined",
        getServerSnapshot
    );

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && onClose) onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    if (!isClient) return null;

    return createPortal(
        <div className="auth-modal-overlay" onClick={onClose}>
            <div
                className="auth-card nbtc"
                ref={trapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                {onClose && (
                    <button className="auth-close-x" type="button" title={auth.modal.closeLabel} onClick={onClose} aria-label={auth.modal.closeLabel}>
                        <X aria-hidden="true" />
                    </button>
                )}

                {awaitingEmail ? (
                    <>
                        <div className="confirm-check">
                            <MailCheck aria-hidden="true" />
                        </div>
                        <h2 className="auth-title" id="auth-modal-title">{auth.modal.awaitingTitle}</h2>
                        <p className="auth-subtitle">
                            {auth.modal.awaitingBody(awaitingEmail)}
                        </p>
                        <p className="auth-hint">{auth.modal.awaitingHint}</p>
                        <button className="auth-button" type="button" onClick={onClose}>
                            {auth.modal.gotIt}
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="auth-title" id="auth-modal-title">{activeMode === "login" ? auth.modal.signInTitle : auth.modal.createTitle}</h2>
                        <p className="auth-subtitle">
                            {activeMode === "login" ? auth.modal.signInSubtitle : auth.modal.createSubtitle}
                        </p>

                        {activeMode === "login" ? (
                            <LoginForm
                                next={next}
                                onSuccess={onSuccess}
                                onSwitchMode={() => setActiveMode("signup")}
                            />
                        ) : (
                            <SignUpForm
                                next={next}
                                onSuccess={onSuccess}
                                onSwitchMode={() => setActiveMode("login")}
                                onAwaitingConfirm={setAwaitingEmail}
                            />
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
