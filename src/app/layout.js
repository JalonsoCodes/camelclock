import Link from "next/link";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CamelClocks — Countdown & Waitlist",
    template: "%s | CamelClocks",
  },
  description:
    "Create beautiful, embeddable countdown clocks with pixel-art camels. Perfect for product launches, sales, and events.",
  openGraph: {
    title: "CamelClocks — Countdown & Waitlist",
    description:
      "Create beautiful, embeddable countdown clocks with pixel-art camels.",
    siteName: "CamelClocks",
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
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="page-container">
          {children}
        </div>
        <footer className="site-footer">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </footer>
      </body>
    </html>
  );
}