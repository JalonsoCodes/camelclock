import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { faq } from "@/content/faq";

export const metadata = {
    title: faq.metaTitle,
    description: faq.metaDescription,
    alternates: { canonical: "/faq" },
};

const FAQS = faq.items;

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
                <h1>{faq.heading}</h1>
                <p className="legal-updated">
                    {faq.contact(faq.contactEmail).split(faq.contactEmail)[0]}<strong>{faq.contactEmail}</strong>
                </p>

                    {FAQS.map((faq, index) => (
                        <details key={faq.q} className="faq-item" open={index === 0}>
                            <summary>{faq.q}</summary>
                            {faq.a.map((paragraph, i) => (
                                <p key={i}>{paragraph}</p>
                            ))}
                        </details>
                    ))}

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />{faq.back}</Link>
                </div>
            </main>
        </>
    );
}