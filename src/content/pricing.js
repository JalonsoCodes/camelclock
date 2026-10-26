/* Pricing, the Pro waitlist, and the feature lists they share. Edit the strings
   here to change what the pricing section and waitlist modal say.

   `id` is load-bearing: WaitlistModal uses it to pick each feature's icon, so
   keep the ids stable even when the labels change. */

export const pricing = {
    sectionTitle: "Pricing",
    sectionSubtitle:
        "Free to get started today. Paid plans are coming soon — join the waitlist for early access.",
    freeHeading: "Free",
    freePrice: "£0",
    createAccountLabel: "Create Account",
    proBadge: "COMING SOON",
    joinWaitlistLabel: "Join Waitlist",
};

export const FREE_FEATURES = [
    {
        id: "live-clocks",
        label: "3 Active Live CamelClocks",
        detail: "Seamless website embedding and shareable links.",
    },
    {
        id: "drafts",
        label: "Unlimited Drafts",
        detail: "Experiment and design as many personal CamelClocks as you like.",
    },
    {
        id: "customisation",
        label: "Core Customisation",
        detail: "Choose your primary colors and access all {wearableCount} wearables.",
    },
    {
        id: "celebration",
        label: "Celebration Animation",
        detail: "Triggers 10 frame animation when your countdown hits zero.",
    },
    {
        id: "watermark",
        label: "Subtle Watermark",
        detail: "A 'Create your CamelClock' link sits under your clock — and you can let visitors tap the camel.",
    },
];

export const PRO_FEATURES = [
    {
        id: "unlimited-clocks",
        label: "Unlimited Active Camel Clocks",
        detail: "Keep as many live embeds running as you need.",
    },
    {
        id: "no-watermark",
        label: "No Watermark",
        detail: "Your clocks and embeds drop the 'Create your CamelClock' credit.",
    },
    {
        id: "scenes",
        label: "Background Scenes",
        detail: "Place your camel in a scene instead of on a plain background.",
    },
];

export const waitlist = {
    heading: "CAMELCLOCK PRO IS COMING",
    subline: "Be first in line for early access to CamelClock Pro.",
    emailLabel: "EMAIL",
    joinLabel: "JOIN WAITLIST",
    joiningLabel: "JOINING...",
    closeLabel: "CLOSE",
    joinedBody: "You're on the list! We'll email you when CamelClock Pro launches.",
    genericError: "Something went wrong. Please try again.",
};
