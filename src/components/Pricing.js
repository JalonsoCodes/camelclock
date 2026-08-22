"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./auth/AuthModal";
import WaitlistModal from "./WaitlistModal";

// ============================================================
// EDIT YOUR PRICING FEATURES HERE
//   label:  the visible bullet text
//   detail: shown on hover (the dotted-underline tooltip)
// ============================================================
const FREE_FEATURES = [
    {
        label: "3 Active Live CamelClocks",
        detail: "Seamless website embedding and shareable directly links.",
    },
    {
        label: "Unlimited Drafts",
        detail: "Experiment and design as many personal CamelClocks as you like.",
    },
    {
        label: "Core Customisation",
        detail: "Choose your primary colors and access 5 starter wearables.",
    },
    {
        label: "Celebration Animation",
        detail: "Triggers 10 frame animation when your countdown hits zero.",
    },
    {
        label: "Subtle Watermark",
        detail: "A small CamelClocks text appears below CamelClocks and links back to us.",
    },
];

const COMING_SOON_TIER = {
    features: [
        {
            label: "Unlimited Active CamelClocks",
            detail: "Keep as many live embeds running as you need.",
        },
        {
            label: "Full Wearables Closet",
            detail: "Access all premium cosmetics, hats, and seasonal gear.",
        },
        {
            label: "Interactive Boosts",
            detail: "Hype up visitors as they click to trigger live animations like backflips, glowing aura, and particle effects.",
        },
        {
            label: "Zero CamelClock Watermark",
            detail: "Remove CamelClock branding across every clock on your account.",
        },
        {
            label: "Waitlist + Email Capture",
            detail: "Convert visitor excitement into mailing list subscribers directly inside the widget.",
        },
        {
            label: "Engagement Analytics",
            detail: "Track views, embed sites, boost clicks, and email conversion rates.",
        },
    ],
};

function FeatureList({ features }) {
    return (
        <ul>
            {features.map((feature) => (
                <li key={feature.label}>
                    <span className="feature-term" tabIndex={0}>
                        {feature.label}
                        <span className="feature-tooltip" role="tooltip">
                            {feature.detail}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

export default function Pricing() {
    const router = useRouter();
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);

    return (
        <section id="pricing">
            <h2>Pricing</h2>
            <p className="section-subtitle">
                Free to get started today. Paid plans are coming soon — join the waitlist for
                early access.
            </p>
            <div className="pricing-grid">
                <div className="pricing-card nbtc pricing-free">
                    <h3>Free</h3>
                    <p className="pricing-price">£0</p>
                    <FeatureList features={FREE_FEATURES} />
                    <button
                        className="pricing-button"
                        type="button"
                        onClick={() => setAuthOpen(true)}
                    >
                        Create Account
                    </button>
                </div>

                <div className="pricing-card nbtc pricing-pro">
                    <span className="pricing-badge">COMING SOON</span>
                    <FeatureList features={COMING_SOON_TIER.features} />
                    <button
                        className="pricing-button"
                        type="button"
                        onClick={() => setShowWaitlist(true)}
                    >
                        Join Waitlist
                    </button>
                </div>
            </div>

            {authOpen && (
                <AuthModal
                    mode="signup"
                    onClose={() => setAuthOpen(false)}
                    onSuccess={() => {
                        setAuthOpen(false);
                        router.push("/dashboard");
                    }}
                />
            )}
            {showWaitlist && <WaitlistModal onClose={() => setShowWaitlist(false)} />}
        </section>
    );
}
