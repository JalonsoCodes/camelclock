import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
    title: "FAQ",
    description: "Frequently asked questions about CamelClock, countdowns, timezones, embedding and more.",
    alternates: { canonical: "/faq" },
};

const FAQS = [
    {
        q: "How do times and timezones work with CamelClock?",
        a: [
            "When you create a clock you pick a month, day and time in your own local timezone. CamelClock stores that as a single, precise instant, so the clock ends at the exact same real-world moment everywhere.",
            "Each viewer's countdown (and the editable time in the builder) is shown in their own local timezone. A clock set for \u201C9 AM\u201D in New York will finish at the same real-world moment for a visitor in London — their wall-clock just shows a different hour for that instant.",
        ],
    },
    {
        q: "How do I embed my CamelClock on my website?",
        a: [
            "Open your live clock and press SHARE, then choose EMBED ON SITE — pick the theme, card style and size there, then copy the embed code into your site's HTML. The clock is responsive and will fit its container. TRANSPARENT lets your own page show through behind the clock.",
        ],
    },
    {
        q: "Can I embed a CamelClock in Notion?",
        a: [
            "Yes. Open your live clock and press the Notion icon next to the clock (or open SHARE and choose \u201CEMBED IN NOTION\u201D), pick your look, then copy the embed URL.",
            "In Notion, type /embed and press Enter, paste the URL, then drag a corner of the block to size it. The frame picks up Notion's own page colour, so it sits flush on light and dark pages. The countdown is live inside Notion while the clock stays published.",
        ],
    },
    {
        q: "What's the difference between a draft and a live clock? Are there limits?",
        a: [
            "A draft is private — only you can see it while you design. Publishing makes it live, publicly visible and shareable.",
            "The free plan allows up to 3 live clocks at once (drafts are unlimited). Going live past the limit opens the Pro waitlist, which removes the cap.",
        ],
    },
    {
        q: "Can I hydrate clocks and get notified when they end?",
        a: [
            "Yes. Any live clock shows a HYDRATE button, so you can add it to your dashboard — and the hydrate icon on the camel lets your own viewers join in one click.",
        ],
    },
    {
        q: "How do I change a clock's design or colours after saving?",
        a: [
            "Open the clock and press EDIT (you'll need to be signed in as the owner). The builder opens with all your saved settings, and changes save back to the same clock without affecting its publish status.",
        ],
    },
    {
        q: "How do I delete a clock or my account?",
        a: [
            "Open a clock from your dashboard and use the delete option on its card to remove it. To delete your whole account, go to Settings and choose \u201CDelete account\u201D — this permanently removes your clocks, hydrations and profile.",
        ],
    },
    {
        q: "Is CamelClock free?",
        a: [
            "CamelClock is free for personal use, including building unlimited drafts, keeping up to 3 live clocks, and interactive visitor hydrations. Pro — with unlimited live clocks, the full wearables closet and more — is coming soon; join the waitlist to get early access.",
        ],
    },
];

export default function FaqPage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a.join(" ") },
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
            />
            <Navbar />
            <main className="legal-page">
                <div className="legal-content nbtc">
                    <h1>Frequently Asked Questions</h1>
                    <p className="legal-updated">
                        Need something else? Contact us at <strong>hello@camelclock.com</strong>
                    </p>

                    {FAQS.map((faq, index) => (
                        <details key={faq.q} className="faq-item" open={index === 0}>
                            <summary>{faq.q}</summary>
                            {faq.a.map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                            ))}
                        </details>
                    ))}

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />Back to CamelClock</Link>
                </div>
            </main>
        </>
    );
}