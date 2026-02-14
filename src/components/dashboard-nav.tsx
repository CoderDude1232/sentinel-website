"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const appLinks = [
  { href: "/app", label: "Overview", moduleKey: null },
  { href: "/app/onboarding", label: "Onboarding", moduleKey: null },
  { href: "/app/moderation", label: "Moderation", moduleKey: "enableModeration" },
  { href: "/app/activity", label: "Activity", moduleKey: "enableActivity" },
  { href: "/app/infractions", label: "Infractions", moduleKey: "enableInfractions" },
  { href: "/app/sessions", label: "Sessions", moduleKey: "enableSessions" },
  { href: "/app/departments", label: "Departments", moduleKey: "enableDepartments" },
  { href: "/app/alerts", label: "Alerts", moduleKey: "enableAlerts" },
  { href: "/app/team", label: "Team", moduleKey: null },
  { href: "/app/integrations", label: "Integrations", moduleKey: null },
  { href: "/app/settings", label: "Settings", moduleKey: null },
];

type ModulePreferences = {
  enableModeration: boolean;
  enableActivity: boolean;
  enableInfractions: boolean;
  enableSessions: boolean;
  enableDepartments: boolean;
  enableAlerts: boolean;
};

export function DashboardNav() {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<ModulePreferences>({
    enableModeration: true,
    enableActivity: true,
    enableInfractions: true,
    enableSessions: true,
    enableDepartments: true,
    enableAlerts: true,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch("/api/panels/settings", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        modulePreferences?: ModulePreferences;
      };
      if (active && payload.modulePreferences) {
        setPreferences(payload.modulePreferences);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visibleLinks = useMemo(
    () =>
      appLinks.filter((link) =>
        link.moduleKey ? preferences[link.moduleKey as keyof ModulePreferences] : true,
      ),
    [preferences],
  );

  return (
    <nav className="mt-3 flex flex-col gap-1.5 text-sm">
      {visibleLinks.map((link) => {
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
