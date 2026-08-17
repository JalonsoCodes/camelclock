"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
                <h2 className="auth-title">{activeMode === "login" ? "SIGN IN" : "SIGN UP"}</h2>
                <p className="auth-subtitle">
                    {activeMode === "login" ? "Manage your CamelClocks" : "Create your CamelClocks account"}
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

                {onClose ? (
                    <button className="auth-close nbtc" type="button" onClick={onClose}>
                        CLOSE
                    </button>
                ) : (
                    <Link href="/" className="auth-close nbtc">
                        CLOSE
                    </Link>
                )}
            </div>
        </div>
    );
}
