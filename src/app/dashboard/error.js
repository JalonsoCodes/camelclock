"use client";

export default function DashboardError({ error, reset }) {
    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">SOMETHING WENT WRONG</h2>
                <p className="auth-subtitle">We couldn&apos;t load your dashboard.</p>
                <button className="auth-button" type="button" onClick={reset}>
                    TRY AGAIN
                </button>
            </div>
        </div>
    );
}
