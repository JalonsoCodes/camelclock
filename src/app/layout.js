import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pixelatedFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--pixelated-font",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={pixelatedFont.variable}>
        {children}
      </body>
    </html>
  );
}