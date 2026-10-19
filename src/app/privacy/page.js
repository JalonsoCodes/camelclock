import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
    title: "Privacy Policy",
    description: "Privacy Policy for CamelClock",
    alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
    return (
        <>
            <Navbar />
            <main className="legal-page">
                <div className="legal-content nbtc">
                    <h1>Privacy Policy</h1>
                    <p className="legal-updated">Last updated: October 2026</p>

                    <h2>1. What We Collect</h2>
                    <p>When you create an account, we collect your email address and a securely hashed password. We also store the countdown clocks you create, including their titles, target dates, customisation settings, and wearables. If you set a public handle, it is shown alongside your published clocks.</p>

                    <h2>2. Public Clocks</h2>
                    <p>Published clocks are public. Anyone with the share link can view a live clock, and a clock you embed can be seen by anyone who visits that page. Drafts are private to you. Do not put anything in a clock title or message that you would not want a stranger to read.</p>

                    <h2>3. How We Use Your Data</h2>
                    <p>We use your data to provide the CamelClock service: storing your clocks, authenticating your account, and displaying your countdowns. We do not sell your personal data, and we do not use it for advertising or profiling.</p>

                    <h2>4. Analytics</h2>
                    <p>We use a privacy-focused, cookieless analytics tool (Umami Cloud) to understand how the site is used so we can improve it. It does not use cookies and does not store anything on your device. Sessions are counted from a rotating, hashed signature rather than a persistent identifier, your IP address is not retained, and we never send it your email, handle, or the contents of your clocks — only anonymous events such as &ldquo;a clock was created&rdquo; or &ldquo;an embed code was copied&rdquo;. We limit its use to statistics and service improvement. If you send a Do Not Track signal from your browser, we do not track you at all.</p>

                    <h2>5. Cookies</h2>
                    <p>We use session cookies managed by Supabase to keep you signed in. These cookies are essential for the service to function and are not used for tracking or advertising. Our analytics tool sets no cookies.</p>

                    <h2>6. Third-Party Services</h2>
                    <p>We share data with the following providers, who process it on our behalf under data processing agreements:</p>
                    <ul>
                        <li><strong>Supabase</strong> — authentication and database hosting.</li>
                        <li><strong>Netlify</strong> — website hosting and content delivery.</li>
                        <li><strong>Umami Cloud</strong> — cookieless analytics.</li>
                        <li><strong>Plunk</strong> — transactional email (account confirmation, password resets).</li>
                    </ul>

                    <h2>7. Legal Basis and International Transfers</h2>
                    <p>We process your data to perform our contract with you (running your account and clocks), on the basis of our legitimate interests (keeping the service secure and improving it), and — for analytics — under the &ldquo;statistical purposes&rdquo; exception in UK data protection law. Some of our providers store data outside the UK; where they do, transfers are protected by the UK International Data Transfer Addendum or the EU Standard Contractual Clauses.</p>

                    <h2>8. Data Retention</h2>
                    <p>Your account and clock data are retained as long as your account is active. You can delete your clocks at any time from the dashboard. You can delete your entire account (including all clocks and hydrations) at any time from <strong>Settings</strong>.</p>

                    <h2>9. Your Rights</h2>
                    <p>You can access, update, or delete your data at any time through your dashboard. You also have the right to object to our analytics. For any additional requests, contact us at the email below.</p>

                    <h2>10. Contact</h2>
                    <p>For questions about this policy, contact us at: <strong>hello@camelclock.com</strong></p>

                    <Link href="/" className="btn-link"><ArrowLeft className="button-icon" />Back to CamelClock</Link>
                </div>
            </main>
        </>
    );
}
