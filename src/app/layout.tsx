import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `QCM d'examen corrigés — Médecine Fès | ${SITE_NAME}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", locale: "fr_FR", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions (themes, translators) often add attributes to <html> before React loads.
    <html lang="fr" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <AuthHashRedirect />
        <SiteHeader />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
