import "./globals.css";
import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Carrier-Forge",
  description: "AI-powered job matching for candidates and companies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans`}>{children}</body>
    </html>
  );
}
