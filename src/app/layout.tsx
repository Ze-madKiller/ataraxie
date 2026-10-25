import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ataraxie — Révision des QCM",
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
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-accent">
              Ataraxie
            </Link>
            <span className="text-sm text-muted">QCM des examens passés</span>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
