import { Heart, Link2, Palette, PartyPopper, PenTool, Timer } from "lucide-react";

const FEATURES = [
    {
        icon: Timer,
        title: "Countdowns That Pop",
        detail: "Pixel-art camel countdowns for promos, launches, and events — all the way down to the second.",
    },
    {
        icon: Link2,
        title: "Embed Anywhere",
        detail: "Drop a CamelClock into any website with a single embed link, or share a direct page.",
    },
    {
        icon: Palette,
        title: "Total Customisation",
        detail: "Pick your colours, add wearables, and fine-tune every detail with a live preview.",
    },
    {
        icon: PartyPopper,
        title: "Celebration Mode",
        detail: "A 10-frame pixel animation fires the moment your countdown hits zero.",
    },
    {
        icon: PenTool,
        title: "Unlimited Drafts",
        detail: "Design as many clocks as you like before going live — every idea deserves its own draft.",
    },
    {
        icon: Heart,
        title: "Follow & Grow",
        detail: "The follow icon on your camel turns viewers into followers and subscribers.",
    },
];

export default function Features() {
    return (
        <section id="features">
            <h2>Why CamelClock</h2>
            <p className="section-subtitle">
                Fun, focused countdowns that turn a link into an event.
            </p>
            <div className="features-grid">
                {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                        <div className="feature-card nbtc" key={feature.title}>
                            <span className="feature-icon">
                                <Icon aria-hidden="true" />
                            </span>
                            <h3>{feature.title}</h3>
                            <p>{feature.detail}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
