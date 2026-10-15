"use client";

import { RefreshCw } from "lucide-react";

export default function ClockError({ reset }) {
    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">SOMETHING WENT WRONG</h2>
                <p className="auth-subtitle">We couldn&apos;t load this clock.</p>
                <button className="auth-button" type="button" onClick={reset}>
                    <RefreshCw className="button-icon" />
                    TRY AGAIN
                </button>
            </div>
        </div>
    );
}
