import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-ATARAXIE — Révision des QCM",
  description: "Révisez les QCM des examens passés, module par module, avec la correction tirée des cours.",
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
