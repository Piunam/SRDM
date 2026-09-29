import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ScrollIndicator } from "@/components/site/ScrollIndicator";
import { siteConfig } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${siteConfig.name} · Speech enhancement at the edge`,
  description:
    "AI / DSP hybrid noise suppression on a microcontroller, built for gunfire, rotors, engines and sirens. Working prototype, demo build.",
};

export const viewport: Viewport = {
  themeColor: "#060B12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden bg-abyss text-white antialiased`}>
        <SiteHeader />
        <SmoothScroll>{children}</SmoothScroll>
        <ScrollIndicator />
      </body>
    </html>
  );
}
