"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const START_VALUE = 8;
const MAX_ACTIVE_VALUE = 92;

function isNavigableAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }
  if (anchor.target && anchor.target !== "_self") {
    return null;
  }
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }
  return anchor;
}

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const visibleRef = useRef(false);
  const progressTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const guardTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (guardTimerRef.current !== null) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    if (!visibleRef.current) {
      return;
    }
    visibleRef.current = false;
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (guardTimerRef.current !== null) {
      window.clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
    setProgress(100);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
      hideTimerRef.current = null;
    }, 220);
  }, []);

  const start = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    visibleRef.current = true;
    setVisible(true);
    setProgress((prev) => Math.max(prev, START_VALUE));

    if (progressTimerRef.current === null) {
      progressTimerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= MAX_ACTIVE_VALUE) {
            return prev;
          }
          if (prev < 35) {
            return Math.min(MAX_ACTIVE_VALUE, prev + 12);
          }
          if (prev < 65) {
            return Math.min(MAX_ACTIVE_VALUE, prev + 7);
          }
          return Math.min(MAX_ACTIVE_VALUE, prev + 3);
        });
      }, 180);
    }

    if (guardTimerRef.current !== null) {
      window.clearTimeout(guardTimerRef.current);
    }
    guardTimerRef.current = window.setTimeout(() => {
      finish();
    }, 12000);
  }, [finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = isNavigableAnchor(event.target);
      if (!anchor) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }
      if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
        return;
      }
      start();
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  useEffect(() => {
    finish();
  }, [finish, routeKey]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0.5">
      <span
        className="block h-full origin-left rounded-r-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuel transition-[transform,opacity] duration-200 ease-out"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: visible ? 1 : 0
        }}
      />
    </div>
  );
}
