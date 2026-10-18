import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
    title: "Terms of Service",
    description: "Terms of Service for CamelClock",
    alternates: { canonical: "/terms" },
};

export default function TermsPage() {
    return (
        <>
            <Navbar />
            <main className="legal-page">
                <div className="legal-content nbtc">
                    <h1>Terms of Service</h1>
                    <p className="legal-updated">Last updated: August 2026</p>

                    <h2>1. Acceptance of Terms</h2>
                    <p>By creating an account or using CamelClock, you agree to these Terms of Service. If you do not agree, please do not use the service.</p>

                    <h2>2. Account Responsibility</h2>
                    <p>You are responsible for maintaining the security of your account credentials.</p>

                    <h2>3. Your Content</h2>
                    <p>You retain full ownership of the clocks and content you create. By using CamelClock, you grant us a limited licence to display your published clocks to visitors via the share link and embed features.</p>

                    <h2>4. Acceptable Use</h2>
                    <p>You may not use CamelClock to create content that is illegal, hateful, harassing, or that infringes on the rights of others. We reserve the right to remove content that violates these terms.</p>

                    <h2>5. Service Availability</h2>
                    <p>We aim to keep CamelClock running reliably, but we do not guarantee uninterrupted access. We may modify or discontinue features with reasonable notice.</p>

                    <h2>6. Limitation of Liability</h2>
                    <p>CamelClock is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any damages arising from your use of the service.</p>

                    <h2>7. Termination</h2>
                    <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time from the Settings page.</p>

                    <h2>8. Changes to These Terms</h2>
                    <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>

                    <h2>9. Contact</h2>
                    <p>For questions about these terms, contact us at: <strong>hello@camelclock.com</strong></p>

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />Back to CamelClock</Link>
                </div>
            </main>
        </>
    );
}
