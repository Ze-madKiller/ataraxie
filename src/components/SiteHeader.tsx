import Link from "next/link";
import { HeaderAuth } from "./HeaderAuth";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="E-ATARAXIE, accueil" className="rounded-md">
          <Logo compact />
        </Link>
        <nav aria-label="Navigation principale" className="flex items-center gap-1 whitespace-nowrap">
          <HeaderAuth />
        </nav>
      </div>
    </header>
  );
}
