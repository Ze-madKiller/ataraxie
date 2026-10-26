import Link from "next/link";
import { HeaderAuth } from "./HeaderAuth";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-accent">
          E-ATARAXIE
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}
