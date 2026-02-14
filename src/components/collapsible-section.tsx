"use client";

import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  subtitle,
  meta,
  children,
  className = "",
}: CollapsibleSectionProps) {
  return (
    <details className={`collapsible-section ${className}`.trim()}>
      <summary className="collapsible-summary">
        <div>
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          {subtitle ? <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {meta ? (
            <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
              {meta}
            </span>
          ) : null}
          <span className="collapsible-chevron" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </summary>
      <div className="collapsible-content">{children}</div>
    </details>
  );
}
