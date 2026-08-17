"use client";

export default function GlobalError({ error, reset }) {
    return (
        <html lang="en">
            <body>
                <div className="auth-page">
                    <div className="auth-card nbtc">
                        <h2 className="auth-title">SOMETHING WENT WRONG</h2>
                        <p className="auth-subtitle">An unexpected error occurred.</p>
                        <button className="auth-button" type="button" onClick={reset}>
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
