"use client";

import { useEffect, useRef } from "react";

type AutoRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
  runImmediately?: boolean;
  onlyWhenVisible?: boolean;
};

export function useAutoRefresh(
  task: () => Promise<void> | void,
  {
    enabled = true,
    intervalMs = 15000,
    runImmediately = false,
    onlyWhenVisible = true,
  }: AutoRefreshOptions = {},
) {
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;
    let inFlight = false;

    const run = async () => {
      if (!isMounted) {
        return;
      }
      if (onlyWhenVisible && document.visibilityState !== "visible") {
        return;
      }
      if (inFlight) {
        return;
      }

      inFlight = true;
      try {
        await taskRef.current();
      } finally {
        inFlight = false;
      }
    };

    if (runImmediately) {
      void run();
    }

    const intervalId = window.setInterval(() => {
      void run();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    if (onlyWhenVisible) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      if (onlyWhenVisible) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, intervalMs, onlyWhenVisible, runImmediately]);
}
