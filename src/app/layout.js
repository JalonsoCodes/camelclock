import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--pixelated-font",
});

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
        {children}
      </body>
    </html>
  );
}