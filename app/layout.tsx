import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "./globals.css";

import { HubShell } from "@/components/hub-shell";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/hub-constants";

const headlineFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-headline",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_TAGLINE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headlineFont.variable} ${bodyFont.variable}`}>
        <HubShell>{children}</HubShell>
      </body>
    </html>
  );
}
