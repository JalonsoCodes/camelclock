"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import useFocusTrap from "@/hooks/useFocusTrap";

const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;

export default function AuthModal({ mode = "signup", next = "/dashboard", onSuccess, onClose }) {
    const [activeMode, setActiveMode] = useState(mode);
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
                    <button className="auth-close-x" type="button" title="Close" onClick={onClose} aria-label="Close">
                        <X aria-hidden="true" />
                    </button>
                )}
                <h2 className="auth-title" id="auth-modal-title">{activeMode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}</h2>
                <p className="auth-subtitle">
                    {activeMode === "login" ? "Manage your clocks" : "Create your CamelClock account"}
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
                    />
                )}
            </div>
        </div>,
        document.body
    );
}
