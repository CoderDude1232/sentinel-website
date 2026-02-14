"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ModulePreferences = {
  enableModeration: boolean;
  enableActivity: boolean;
  enableInfractions: boolean;
  enableSessions: boolean;
  enableDepartments: boolean;
  enableAlerts: boolean;
  enableRbac: boolean;
  enableTeams: boolean;
  enableWorkflows: boolean;
  enableAppeals: boolean;
  enableAutomation: boolean;
  enableProfiles: boolean;
  enableLogs: boolean;
  enableRealtime: boolean;
  enableCommands: boolean;
  enableBackups: boolean;
  enableApiKeys: boolean;
  enableObservability: boolean;
  enableBilling: boolean;
};

const navSections: Array<{
  title: string;
  links: Array<{ href: string; label: string; moduleKey: keyof ModulePreferences | null }>;
}> = [
  {
    title: "Core",
    links: [
      { href: "/app", label: "Overview", moduleKey: null },
      { href: "/app/onboarding", label: "Onboarding", moduleKey: null },
      { href: "/app/integrations", label: "Integrations", moduleKey: null },
      { href: "/app/settings", label: "Settings", moduleKey: null },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/app/moderation", label: "Moderation", moduleKey: "enableModeration" },
      { href: "/app/activity", label: "Activity", moduleKey: "enableActivity" },
      { href: "/app/infractions", label: "Infractions", moduleKey: "enableInfractions" },
      { href: "/app/sessions", label: "Sessions", moduleKey: "enableSessions" },
      { href: "/app/departments", label: "Departments", moduleKey: "enableDepartments" },
      { href: "/app/alerts", label: "Alerts", moduleKey: "enableAlerts" },
      { href: "/app/team", label: "Teams", moduleKey: "enableTeams" },
    ],
  },
  {
    title: "Governance",
    links: [
      { href: "/app/rbac", label: "RBAC", moduleKey: "enableRbac" },
      { href: "/app/workflows", label: "Workflows", moduleKey: "enableWorkflows" },
      { href: "/app/appeals", label: "Appeals", moduleKey: "enableAppeals" },
      { href: "/app/profiles", label: "Profiles", moduleKey: "enableProfiles" },
      { href: "/app/logs", label: "Logs", moduleKey: "enableLogs" },
    ],
  },
  {
    title: "Automation",
    links: [
      { href: "/app/automation", label: "Automation", moduleKey: "enableAutomation" },
      { href: "/app/realtime", label: "Realtime", moduleKey: "enableRealtime" },
      { href: "/app/commands", label: "Commands", moduleKey: "enableCommands" },
      { href: "/app/backups", label: "Backups", moduleKey: "enableBackups" },
      { href: "/app/api-keys", label: "API Keys", moduleKey: "enableApiKeys" },
      { href: "/app/observability", label: "Observability", moduleKey: "enableObservability" },
      { href: "/app/billing", label: "Billing", moduleKey: "enableBilling" },
    ],
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<ModulePreferences>({
    enableModeration: true,
    enableActivity: true,
    enableInfractions: true,
    enableSessions: true,
    enableDepartments: true,
    enableAlerts: true,
    enableRbac: true,
    enableTeams: true,
    enableWorkflows: true,
    enableAppeals: true,
    enableAutomation: true,
    enableProfiles: true,
    enableLogs: true,
    enableRealtime: true,
    enableCommands: true,
    enableBackups: true,
    enableApiKeys: true,
    enableObservability: true,
    enableBilling: false,
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

  const visibleSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          links: section.links.filter((link) =>
            link.moduleKey ? preferences[link.moduleKey] : true,
          ),
        }))
        .filter((section) => section.links.length > 0),
    [preferences],
  );

  return (
    <nav className="mt-3 flex flex-col gap-3 text-sm">
      {visibleSections.map((section) => (
        <div key={section.title}>
          <p className="px-1 text-[10px] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            {section.title}
          </p>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {section.links.map((link) => {
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
          </div>
        </div>
      ))}
    </nav>
  );
}
