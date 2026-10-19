"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserPlus } from "lucide-react";
import AuthModal from "./auth/AuthModal";
import WaitlistModal from "./WaitlistModal";
import { wearables as wearableData } from "@/utils/grids";
import { track } from "@/utils/analytics";

const WEARABLE_COUNT = Object.keys(wearableData).length;

// ============================================================
// EDIT YOUR PRICING FEATURES HERE
//   label:  the visible bullet text
//   detail: shown on hover (the dotted-underline tooltip)
// ============================================================
const FREE_FEATURES = [
    {
        label: "3 Active Live Camel Clocks",
        detail: "Seamless website embedding and shareable directly links.",
    },
    {
        label: "Unlimited Drafts",
        detail: "Experiment and design as many personal Camel Clocks as you like.",
    },
    {
        label: "Core Customisation",
        detail: `Choose your primary colors and access all ${WEARABLE_COUNT} wearables.`,
    },
    {
        label: "Celebration Animation",
        detail: "Triggers 10 frame animation when your countdown hits zero.",
    },
    {
        label: "Subtle Watermark",
        detail: "A 'Create your CamelClock' link sits under your clock — and you can let visitors tap the camel.",
    },
];

export const PRO_FEATURES = [
    {
        label: "Unlimited Active Camel Clocks",
        detail: "Keep as many live embeds running as you need.",
    },
    {
        label: "No Watermark",
        detail: "Your clocks and embeds drop the 'Create your CamelClock' credit.",
    },
    {
        label: "Background Scenes",
        detail: "Place your camel in a scene instead of on a plain background.",
    },
];

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
            <h2 className="section-title">Pricing</h2>
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
                        <UserPlus className="button-icon" />
                        Create Account
                    </button>
                </div>

                <div className="pricing-card nbtc pricing-pro">
                    <span className="pricing-badge">COMING SOON</span>
                    <FeatureList features={PRO_FEATURES} />
                    <button
                        className="pricing-button"
                        type="button"
                        onClick={() => {
                            track("upgrade_clicked", { source: "pricing" });
                            setShowWaitlist(true);
                        }}
                    >
                        <Bell className="button-icon" />
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
            {showWaitlist && (
                <WaitlistModal
                    highlightFeature="Unlimited Active Camel Clocks"
                    onClose={() => setShowWaitlist(false)}
                />
            )}
        </section>
    );
}
