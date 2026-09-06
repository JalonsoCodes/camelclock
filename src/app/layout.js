import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CamelClock — Countdown & Waitlist",
    template: "%s | CamelClock",
  },
  description:
    "Create beautiful, embeddable countdown clocks with pixel-art camels. Perfect for product launches, sales, and events.",
  openGraph: {
    title: "CamelClock — Countdown & Waitlist",
    description:
      "Create beautiful, embeddable countdown clocks with pixel-art camels.",
    siteName: "CamelClock",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <div className="page-container">
          {children}
        </div>
        <footer className="site-footer">
          <Link href="/faq">FAQ</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </footer>
      </body>
    </html>
  );
}