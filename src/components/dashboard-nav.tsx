"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CreditCard,
  FileWarning,
  Flag,
  GitBranch,
  Key,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Link2,
  Radio,
  Scale,
  ScrollText,
  Settings2,
  Shield,
  TerminalSquare,
  UserRound,
  Users,
} from "lucide-react";

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
    icon: LucideIcon;
    moduleKey: keyof ModulePreferences | null;
  }>;
}> = [
  {
    title: "Workspace",
    links: [
      { href: "/app", label: "Overview", hint: "Live command center", icon: LayoutDashboard, moduleKey: null },
      { href: "/app/onboarding", label: "Onboarding", hint: "Finish initial setup", icon: Flag, moduleKey: null },
      { href: "/app/integrations", label: "Integrations", hint: "ER:LC and Discord links", icon: Link2, moduleKey: null },
      { href: "/app/settings", label: "Settings", hint: "Workspace defaults", icon: Settings2, moduleKey: null },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "/app/moderation", label: "Moderation", hint: "Cases and quick actions", icon: Shield, moduleKey: "enableModeration" },
      { href: "/app/activity", label: "Activity", hint: "Staff analytics", icon: Activity, moduleKey: "enableActivity" },
      { href: "/app/infractions", label: "Infractions", hint: "Punishment records", icon: FileWarning, moduleKey: "enableInfractions" },
      { href: "/app/sessions", label: "Sessions", hint: "Session planning", icon: CalendarDays, moduleKey: "enableSessions" },
      { href: "/app/departments", label: "Departments", hint: "Org structure", icon: Building2, moduleKey: "enableDepartments" },
      { href: "/app/alerts", label: "Alerts", hint: "Discord + in-app alerts", icon: Bell, moduleKey: "enableAlerts" },
      { href: "/app/team", label: "Teams", hint: "Team members", icon: Users, moduleKey: "enableTeams" },
    ],
  },
  {
    title: "Governance",
    links: [
      { href: "/app/rbac", label: "RBAC", hint: "Permission control", icon: KeyRound, moduleKey: "enableRbac" },
      { href: "/app/workflows", label: "Workflows", hint: "Approval paths", icon: GitBranch, moduleKey: "enableWorkflows" },
      { href: "/app/appeals", label: "Appeals", hint: "Appeal lifecycle", icon: Scale, moduleKey: "enableAppeals" },
      { href: "/app/profiles", label: "Profiles", hint: "Staff profiles", icon: UserRound, moduleKey: "enableProfiles" },
      { href: "/app/logs", label: "Audit Logs", hint: "Historical actions", icon: ScrollText, moduleKey: "enableLogs" },
    ],
  },
  {
    title: "Automation",
    links: [
      { href: "/app/automation", label: "Automation", hint: "Rules and triggers", icon: Bot, moduleKey: "enableAutomation" },
      { href: "/app/realtime", label: "Realtime", hint: "Live streams", icon: Radio, moduleKey: "enableRealtime" },
      { href: "/app/commands", label: "Commands", hint: "Command relay", icon: TerminalSquare, moduleKey: "enableCommands" },
      { href: "/app/backups", label: "Backups", hint: "Snapshot backups", icon: Archive, moduleKey: "enableBackups" },
      { href: "/app/api-keys", label: "API Keys", hint: "Key management", icon: Key, moduleKey: "enableApiKeys" },
      { href: "/app/observability", label: "Observability", hint: "System health", icon: LineChart, moduleKey: "enableObservability" },
      { href: "/app/billing", label: "Billing", hint: "Future billing", icon: CreditCard, moduleKey: "enableBilling" },
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
            links: [{ href: "/app/onboarding", label: "Onboarding", hint: "Complete initial setup", icon: Flag, moduleKey: null }],
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
              const Icon = link.icon;
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
                    <span className="dashboard-nav-icon" aria-hidden>
                      <Icon size={14} strokeWidth={2} />
                    </span>
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
