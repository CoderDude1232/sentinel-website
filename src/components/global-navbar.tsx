import Image from "next/image";
import Link from "next/link";

export function GlobalNavbar() {
  return (
    <header className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8 sm:pt-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Sentinel logo"
            width={40}
            height={40}
            className="brand-logo"
            priority
          />
          <Link href="/" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            sentinel
          </Link>
        </div>

        <nav className="flex items-center gap-4 text-base">
          <Link href="/app" className="nav-quiet-link">
            Workspace
          </Link>
          <Link href="/login" className="nav-quiet-link">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
