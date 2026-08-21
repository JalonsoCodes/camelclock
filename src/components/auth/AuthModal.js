"use client";

import { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import useFocusTrap from "@/hooks/useFocusTrap";

export default function AuthModal({ mode = "login", next = "/dashboard", onSuccess, onClose }) {
    const [activeMode, setActiveMode] = useState(mode);
    const trapRef = useFocusTrap(true);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape" && onClose) onClose();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div
                className="auth-card nbtc"
                ref={trapRef}
                onClick={(e) => e.stopPropagation()}
            >
                {onClose && (
                    <button className="auth-close-x" type="button" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                )}
                <h2 className="auth-title">{activeMode === "login" ? "SIGN IN" : "SIGN UP"}</h2>
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
        </div>
    );
}
