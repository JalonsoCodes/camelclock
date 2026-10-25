import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import { legal } from "@/content/faq";

export const metadata = {
    title: legal.privacy.title,
    description: legal.privacy.metaDescription,
    alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
    return (
        <>
            <Navbar />
            <main className="legal-page">
                <div className="legal-content nbtc">
                    <h1>{legal.privacy.title}</h1>
                    <p className="legal-updated">{legal.privacy.updated}</p>

                    {legal.privacy.sections.map((section) => (
                        <div key={section.title}>
                            <h2>{section.title}</h2>
                            {section.body?.map((line, i) => (
                                <p key={i}>{typeof line === "function" ? line(section.email || legal.privacy.sections[legal.privacy.sections.length - 1].email || "hello@camelclock.com") : line}</p>
                            ))}
                            {section.list && (
                                <ul>
                                    {section.list.map((item) => (
                                        <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />{legal.privacy.back}</Link>
                </div>
            </main>
        </>
    );
}
