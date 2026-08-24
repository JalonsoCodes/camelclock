import { Press_Start_2P } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--pixelated-font",
});

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className={pixelatedFont.variable} suppressHydrationWarning>
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