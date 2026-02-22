"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

const MIN_VISIBLE_MS = 1200;
const HOLD_AFTER_READY_MS = 220;
const MAX_VISIBLE_MS = 15000;
const EXIT_ANIMATION_MS = 280;
const DEPLOYMENT_POLL_MS = 45000;

type VersionPayload = {
  version: string;
  release: string;
  deploymentId: string | null;
};

function shouldTrackRequest(input: RequestInfo | URL): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const url = new URL(rawUrl, window.location.origin);
    if (url.origin !== window.location.origin) {
      return false;
    }
    if (!url.pathname.startsWith("/api/")) {
      return false;
    }
    if (url.pathname === "/api/meta/version") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function DashboardRuntime({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshingForUpdate, setRefreshingForUpdate] = useState(false);

  const activeRouteId = useRef(0);
  const routeStartTime = useRef(Date.now());
  const pendingByRoute = useRef<Map<number, number>>(new Map());
  const initialLoadSettled = useRef(false);
  const hideTimer = useRef<number | null>(null);
  const failSafeTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const refreshingForUpdateRef = useRef(false);
  const knownRelease = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (failSafeTimer.current !== null) {
      window.clearTimeout(failSafeTimer.current);
      failSafeTimer.current = null;
    }
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const getCurrentPendingCount = useCallback(() => {
    return pendingByRoute.current.get(activeRouteId.current) ?? 0;
  }, []);

  const showOverlay = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setOverlayExiting(false);
    setOverlayVisible(true);
  }, []);

  const evaluateOverlay = useCallback(() => {
    if (refreshingForUpdateRef.current) {
      return;
    }

    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    const routeId = activeRouteId.current;
    const pending = getCurrentPendingCount();
    setPendingCount(pending);

    if (document.readyState !== "complete" || pending > 0) {
      return;
    }

    const elapsed = Date.now() - routeStartTime.current;
    const delay = Math.max(HOLD_AFTER_READY_MS, MIN_VISIBLE_MS - elapsed);
    hideTimer.current = window.setTimeout(() => {
      const stillPending = pendingByRoute.current.get(routeId) ?? 0;
      if (
        routeId === activeRouteId.current &&
        document.readyState === "complete" &&
        stillPending === 0 &&
        !refreshingForUpdateRef.current
      ) {
        setOverlayExiting(true);
        exitTimer.current = window.setTimeout(() => {
          const finalPending = pendingByRoute.current.get(routeId) ?? 0;
          if (
            routeId === activeRouteId.current &&
            document.readyState === "complete" &&
            finalPending === 0 &&
            !refreshingForUpdateRef.current
          ) {
            setOverlayVisible(false);
            setOverlayExiting(false);
            initialLoadSettled.current = true;
          }
        }, EXIT_ANIMATION_MS);
      }
    }, delay);
  }, [getCurrentPendingCount]);

  useEffect(() => {
    activeRouteId.current += 1;
    routeStartTime.current = Date.now();
    initialLoadSettled.current = false;
    showOverlay();
    setPendingCount(0);
    clearTimers();

    const routeId = activeRouteId.current;
    failSafeTimer.current = window.setTimeout(() => {
      if (routeId === activeRouteId.current && !refreshingForUpdateRef.current) {
        setOverlayVisible(false);
        setOverlayExiting(false);
        initialLoadSettled.current = true;
      }
    }, MAX_VISIBLE_MS);

    evaluateOverlay();
    return () => {
      clearTimers();
    };
  }, [pathname, clearTimers, evaluateOverlay, showOverlay]);

  useEffect(() => {
    const onReadyStateChange = () => {
      evaluateOverlay();
    };
    document.addEventListener("readystatechange", onReadyStateChange);
    return () => {
      document.removeEventListener("readystatechange", onReadyStateChange);
    };
  }, [evaluateOverlay]);

  useEffect(() => {
    const nativeFetch: typeof window.fetch = window.fetch.bind(window);

    window.fetch = (async (...args: Parameters<typeof window.fetch>) => {
      const [input, init] = args;
      if (!shouldTrackRequest(input)) {
        return nativeFetch(input, init);
      }

      const routeId = activeRouteId.current;
      const nextPending = (pendingByRoute.current.get(routeId) ?? 0) + 1;
      pendingByRoute.current.set(routeId, nextPending);
      if (routeId === activeRouteId.current && !refreshingForUpdateRef.current && !initialLoadSettled.current) {
        showOverlay();
        setPendingCount(nextPending);
      }

      try {
        return await nativeFetch(input, init);
      } finally {
        const currentPending = pendingByRoute.current.get(routeId) ?? 0;
        const remaining = Math.max(0, currentPending - 1);
        if (remaining === 0) {
          pendingByRoute.current.delete(routeId);
        } else {
          pendingByRoute.current.set(routeId, remaining);
        }

        if (routeId === activeRouteId.current && !initialLoadSettled.current) {
          evaluateOverlay();
        }
      }
    }) as typeof window.fetch;

    return () => {
      window.fetch = nativeFetch;
    };
  }, [evaluateOverlay, showOverlay]);

  useEffect(() => {
    let active = true;

    const checkForDeploymentUpdate = async () => {
      try {
        const response = await fetch("/api/meta/version", {
          cache: "no-store",
        });
        if (!response.ok || !active) {
          return;
        }
        const payload = (await response.json()) as VersionPayload;
        if (!payload.release) {
          return;
        }

        if (!knownRelease.current) {
          knownRelease.current = payload.release;
          return;
        }

        if (knownRelease.current !== payload.release) {
          refreshingForUpdateRef.current = true;
          setRefreshingForUpdate(true);
          showOverlay();
          setPendingCount(0);
          window.location.reload();
        }
      } catch {
        // Ignore transient network errors and continue polling.
      }
    };

    void checkForDeploymentUpdate();
    const interval = window.setInterval(() => {
      void checkForDeploymentUpdate();
    }, DEPLOYMENT_POLL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      {children}
      {overlayVisible ? (
        <div className={`dashboard-loading-screen${overlayExiting ? " is-exiting" : ""}`} role="status" aria-live="polite">
          <div className="dashboard-loading-panel">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Sentinel logo" width={48} height={48} className="dashboard-loading-logo" priority />
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">Sentinel</p>
                <h2 className="text-xl font-semibold tracking-tight">
                  {refreshingForUpdate ? "New release detected" : "Loading dashboard"}
                </h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {refreshingForUpdate
                ? "Refreshing to the latest deployment..."
                : pendingCount > 0
                  ? `Syncing ${pendingCount} request${pendingCount === 1 ? "" : "s"}...`
                  : "Finalizing workspace..."}
            </p>
            <div className="dashboard-loading-bar mt-4" />
          </div>
        </div>
      ) : null}
    </>
  );
}
