"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const appLinks = [
  { href: "/app", label: "Overview" },
  { href: "/app/onboarding", label: "Onboarding" },
  { href: "/app/moderation", label: "Moderation" },
  { href: "/app/activity", label: "Activity" },
  { href: "/app/infractions", label: "Infractions" },
  { href: "/app/sessions", label: "Sessions" },
  { href: "/app/departments", label: "Departments" },
  { href: "/app/alerts", label: "Alerts" },
  { href: "/app/team", label: "Team" },
  { href: "/app/integrations", label: "Integrations" },
  { href: "/app/settings", label: "Settings" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex flex-col gap-1.5 text-sm">
      {appLinks.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/app" && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`dashboard-nav-link${isActive ? " active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
