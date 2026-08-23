import { Press_Start_2P } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--pixelated-font",
});

export const metadata = {
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