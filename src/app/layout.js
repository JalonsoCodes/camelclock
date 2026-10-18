import Link from "next/link";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CamelClock — Embeddable Pixel Camel Countdown Timer",
    template: "%s | CamelClock",
  },
  description:
    "An interactive, stylish way to count down any big day: a pixel camel clock you customise, then share or embed on your site or Notion page — and let your crowd tap along.",
  openGraph: {
    title: "CamelClock — Embeddable Pixel Camel Countdown Timer",
    description:
      "An interactive, stylish pixel camel countdown you can customise, share and embed — and let your crowd tap along.",
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
        {/* Plain inline script in <head>, not next/script: beforeInteractive inline scripts
            are moved to <head> on the server but render a body <script> on the client, so React
            creates it fresh during hydration and React 19.3 warns. A head script is identical on
            both sides, adopted on hydration, and still runs before paint to set the theme. */}
        <script
          id="theme-init"
          suppressHydrationWarning
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
          <Link href="/faq">FAQ</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </footer>
      </body>
    </html>
  );
}