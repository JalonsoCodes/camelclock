import Link from "next/link";

export default function NotFound() {
    return (
        <div className="auth-page">
            <div className="auth-card nbtc">
                <h2 className="auth-title">404</h2>
                <p className="auth-subtitle">This page doesn&apos;t exist.</p>
                <p className="auth-back">
                    <Link href="/">← Back to home</Link>
                </p>
            </div>
        </div>
    );
}
