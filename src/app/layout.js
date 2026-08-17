import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--pixelated-font",
});

export const metadata = {
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
      <body className={pixelatedFont.variable}>
        <div className="page-container">
          {children}
        </div>
      </body>
    </html>
  );
}