import type { Metadata } from "next";
import { Barlow_Condensed, Sora } from "next/font/google";
import "./globals.css";

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Sora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Crosby IQ | NHL Projections",
  description: "Modern NHL projections and matchup intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
