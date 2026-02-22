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
  links: Array<{
    href: string;
    label: string;
    hint: string;
    marker: string;
    moduleKey: keyof ModulePreferences | null;
  }>;
}> = [
  {
    title: "Workspace",
    links: [
      { href: "/app", label: "Overview", hint: "Live command center", marker: "OV", moduleKey: null },
      { href: "/app/onboarding", label: "Onboarding", hint: "Finish initial setup", marker: "ON", moduleKey: null },
      { href: "/app/integrations", label: "Integrations", hint: "ER:LC and Discord links", marker: "IN", moduleKey: null },
      { href: "/app/settings", label: "Settings", hint: "Workspace defaults", marker: "ST", moduleKey: null },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/app/moderation", label: "Moderation", hint: "Cases and quick actions", marker: "MO", moduleKey: "enableModeration" },
      { href: "/app/activity", label: "Activity", hint: "Staff analytics", marker: "AC", moduleKey: "enableActivity" },
      { href: "/app/infractions", label: "Infractions", hint: "Punishment records", marker: "IF", moduleKey: "enableInfractions" },
      { href: "/app/sessions", label: "Sessions", hint: "Session planning", marker: "SE", moduleKey: "enableSessions" },
      { href: "/app/departments", label: "Departments", hint: "Org structure", marker: "DP", moduleKey: "enableDepartments" },
      { href: "/app/alerts", label: "Alerts", hint: "Discord + in-app alerts", marker: "AL", moduleKey: "enableAlerts" },
      { href: "/app/team", label: "Teams", hint: "Team members", marker: "TM", moduleKey: "enableTeams" },
    ],
  },
  {
    title: "Governance",
    links: [
      { href: "/app/rbac", label: "RBAC", hint: "Permission control", marker: "RB", moduleKey: "enableRbac" },
      { href: "/app/workflows", label: "Workflows", hint: "Approval paths", marker: "WF", moduleKey: "enableWorkflows" },
      { href: "/app/appeals", label: "Appeals", hint: "Appeal lifecycle", marker: "AP", moduleKey: "enableAppeals" },
      { href: "/app/profiles", label: "Profiles", hint: "Staff profiles", marker: "PR", moduleKey: "enableProfiles" },
      { href: "/app/logs", label: "Audit Logs", hint: "Historical actions", marker: "LG", moduleKey: "enableLogs" },
    ],
  },
  {
    title: "Automation",
    links: [
      { href: "/app/automation", label: "Automation", hint: "Rules and triggers", marker: "AU", moduleKey: "enableAutomation" },
      { href: "/app/realtime", label: "Realtime", hint: "Live streams", marker: "RT", moduleKey: "enableRealtime" },
      { href: "/app/commands", label: "Commands", hint: "Command relay", marker: "CM", moduleKey: "enableCommands" },
      { href: "/app/backups", label: "Backups", hint: "Snapshot backups", marker: "BK", moduleKey: "enableBackups" },
      { href: "/app/api-keys", label: "API Keys", hint: "Key management", marker: "AK", moduleKey: "enableApiKeys" },
      { href: "/app/observability", label: "Observability", hint: "System health", marker: "OB", moduleKey: "enableObservability" },
      { href: "/app/billing", label: "Billing", hint: "Future billing", marker: "BL", moduleKey: "enableBilling" },
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
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const response = await fetch("/api/panels/onboarding", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        preferences?: ModulePreferences;
        onboardingComplete?: boolean;
      };
      if (active) {
        if (payload.preferences) {
          setPreferences(payload.preferences);
        }
        setOnboardingComplete(Boolean(payload.onboardingComplete));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visibleSections = useMemo(
    () => {
      if (!onboardingComplete) {
        return [
          {
            title: "Setup",
            links: [{ href: "/app/onboarding", label: "Onboarding", hint: "Complete initial setup", marker: "ON", moduleKey: null }],
          },
        ];
      }

      return (
      navSections
        .map((section) => ({
          ...section,
          links: section.links
            .filter((link) => link.href !== "/app/onboarding")
            .filter((link) => (link.moduleKey ? preferences[link.moduleKey] : true)),
        }))
        .filter((section) => section.links.length > 0)
      );
    },
    [preferences, onboardingComplete],
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
                  <span className="dashboard-nav-link-row">
                    <span className="dashboard-nav-badge" aria-hidden>{link.marker}</span>
                    <span className="dashboard-nav-link-text">
                      <span className="dashboard-nav-link-title">{link.label}</span>
                      <span className="dashboard-nav-link-hint">{link.hint}</span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
