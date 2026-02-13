import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function GlobalNavbar() {
  return (
    <header className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8 sm:pt-7">
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.08)] pb-5">
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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-quiet-link hidden sm:inline-block"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/app" className="button-secondary px-4 py-2 text-base">
            Workspace
          </Link>
          <Link href="/login" className="button-primary px-4 py-2 text-base">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
