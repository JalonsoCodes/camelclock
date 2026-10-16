import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
    title: "Privacy Policy",
    description: "Privacy Policy for CamelClock",
};

export default function PrivacyPage() {
    return (
        <>
            <Navbar />
            <main className="legal-page">
                <div className="legal-content nbtc">
                    <h1>Privacy Policy</h1>
                    <p className="legal-updated">Last updated: August 2026</p>

                    <h2>1. What We Collect</h2>
                    <p>When you create an account, we collect your email address and a securely hashed password. We also store the countdown clocks you create, including their titles, target dates, customisation settings, and wearables.</p>

                    <h2>2. How We Use Your Data</h2>
                    <p>We use your data to provide the CamelClock service: storing your clocks, authenticating your account, and displaying your countdowns. We do not sell or share your personal data with third parties for marketing purposes.</p>

                    <h2>3. Cookies</h2>
                    <p>CamelClock uses session cookies managed by Supabase to keep you signed in. These cookies are essential for the service to function and are not used for tracking or advertising.</p>

                    <h2>4. Third-Party Services</h2>
                    <p>We use Supabase for authentication and database hosting, and our application is hosted on a cloud platform. These services process data on our behalf under strict security standards.</p>

                    <h2>5. Data Retention</h2>
                    <p>Your account and clock data are retained as long as your account is active. You can delete your clocks at any time from the dashboard. You can delete your entire account (including all clocks and hydrations) at any time from <strong>Settings</strong>.</p>

                    <h2>6. Your Rights</h2>
                    <p>You can access, update, or delete your data at any time through your dashboard. For any additional requests, contact us at the email below.</p>

                    <h2>7. Contact</h2>
                    <p>For questions about this policy, contact us at: <strong>hello@camelclock.com</strong></p>

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />Back to CamelClock</Link>
                </div>
            </main>
        </>
    );
}
