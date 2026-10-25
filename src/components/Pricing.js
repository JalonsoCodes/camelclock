"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserPlus } from "lucide-react";
import AuthModal from "./auth/AuthModal";
import WaitlistModal from "./WaitlistModal";
import { wearables as wearableData } from "@/utils/grids";
import { track } from "@/utils/analytics";
import { FREE_FEATURES, PRO_FEATURES, pricing } from "@/content/pricing";

const WEARABLE_COUNT = Object.keys(wearableData).length;

function FeatureList({ features }) {
    return (
        <ul>
            {features.map((feature) => (
                <li key={feature.id}>
                    <span className="feature-term" tabIndex={0}>
                        {feature.label}
                        <span className="feature-tooltip" role="tooltip">
                            {feature.detail.replace("{wearableCount}", WEARABLE_COUNT)}
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
            <h2 className="section-title">{pricing.sectionTitle}</h2>
            <p className="section-subtitle">{pricing.sectionSubtitle}</p>
            <div className="pricing-grid">
                <div className="pricing-card nbtc pricing-free">
                    <h3>{pricing.freeHeading}</h3>
                    <p className="pricing-price">{pricing.freePrice}</p>
                    <FeatureList features={FREE_FEATURES} />
                    <button
                        className="pricing-button"
                        type="button"
                        onClick={() => setAuthOpen(true)}
                    >
                        <UserPlus className="button-icon" />
                        {pricing.createAccountLabel}
                    </button>
                </div>

                <div className="pricing-card nbtc pricing-pro">
                    <span className="pricing-badge">{pricing.proBadge}</span>
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
                        {pricing.joinWaitlistLabel}
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
                    onClose={() => setShowWaitlist(false)}
                />
            )}
        </section>
    );
}
