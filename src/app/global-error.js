"use client";

import { RefreshCw } from "lucide-react";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
    weight: "400",
    subsets: ["latin"],
    variable: "--pixelated-font",
});

export default function GlobalError({ reset }) {
    return (
        <html lang="en">
            <body className={pixelatedFont.variable} suppressHydrationWarning>
                <div className="auth-page">
                    <div className="auth-card nbtc">
                        <h2 className="auth-title">SOMETHING WENT WRONG</h2>
                        <p className="auth-subtitle">An unexpected error occurred.</p>
                        <button className="auth-button" type="button" onClick={reset}>
                            <RefreshCw className="button-icon" />
                            TRY AGAIN
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
