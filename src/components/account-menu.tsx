"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/session";

type AccountMenuProps = {
  user: SessionUser;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = useMemo(() => getInitials(user.displayName), [user.displayName]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      setOpen(false);
      setSigningOut(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1.5 text-sm"
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={`${user.displayName} avatar`}
            width={28}
            height={28}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] text-xs font-semibold">
            {initials}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm text-[var(--ink-strong)] sm:inline">
          {user.displayName}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--line)] bg-[rgba(12,12,16,0.96)] p-2 shadow-2xl backdrop-blur">
          <div className="border-b border-[var(--line)] px-2 py-2">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-[var(--ink-soft)]">@{user.username}</p>
          </div>
          <div className="pt-1 text-sm">
            <Link
              href="/app"
              className="block rounded-md px-2 py-1.5 text-[var(--ink-soft)] hover:bg-[rgba(216,29,56,0.16)] hover:text-[var(--ink-strong)]"
            >
              Dashboard
            </Link>
            <Link
              href="/app/settings"
              className="block rounded-md px-2 py-1.5 text-[var(--ink-soft)] hover:bg-[rgba(216,29,56,0.16)] hover:text-[var(--ink-strong)]"
            >
              Account Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-1 block w-full rounded-md px-2 py-1.5 text-left text-[var(--ink-soft)] hover:bg-[rgba(216,29,56,0.16)] hover:text-[var(--ink-strong)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
