"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DEVTOOLS_THRESHOLD = 160;
const CHECK_INTERVAL_MS = 1200;

function isDevtoolsLikelyOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > DEVTOOLS_THRESHOLD || heightGap > DEVTOOLS_THRESHOLD;
}

function shouldEnableGuard(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  const explicit = process.env.NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED?.toLowerCase();
  if (!explicit) {
    return true;
  }
  return explicit === "1" || explicit === "true" || explicit === "yes" || explicit === "on";
}

export function DevtoolsGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldEnableGuard()) {
      return;
    }
    if (pathname === "/access-denied") {
      return;
    }

    let redirected = false;

    const redirectDenied = () => {
      if (redirected) {
        return;
      }
      redirected = true;
      window.location.replace("/access-denied?reason=devtools");
    };

    const runCheck = () => {
      if (isDevtoolsLikelyOpen()) {
        redirectDenied();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const opensDevtools =
        key === "F12" ||
        (event.ctrlKey && event.shiftKey && (key === "I" || key === "J" || key === "C")) ||
        (event.metaKey && event.altKey && key === "I");
      if (opensDevtools) {
        redirectDenied();
      }
    };

    runCheck();
    const intervalId = window.setInterval(runCheck, CHECK_INTERVAL_MS);
    window.addEventListener("resize", runCheck);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", runCheck);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pathname]);

  return null;
}
