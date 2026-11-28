"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const activeAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoading = () => {
    setNavigating(false);
    setShowPill(false);
    if (pillTimerRef.current) {
      clearTimeout(pillTimerRef.current);
      pillTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (activeAnchorRef.current) {
      activeAnchorRef.current.removeAttribute("data-nav-loading");
      activeAnchorRef.current = null;
    }
  };

  // Route finished changing -> hide loader
  useEffect(() => {
    clearLoading();
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
        return;
      }

      let dest: URL;
      try {
        dest = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (dest.origin !== window.location.origin) return;

      const currentPathWithSearch = window.location.pathname + window.location.search;
      const nextPathWithSearch = dest.pathname + dest.search;
      if (currentPathWithSearch === nextPathWithSearch) return;

      // Clear any previous loading anchor
      if (activeAnchorRef.current && activeAnchorRef.current !== anchor) {
        activeAnchorRef.current.removeAttribute("data-nav-loading");
      }

      anchor.setAttribute("data-nav-loading", "true");
      activeAnchorRef.current = anchor;
      setNavigating(true);

      if (pillTimerRef.current) clearTimeout(pillTimerRef.current);
      pillTimerRef.current = setTimeout(() => {
        setShowPill(true);
      }, 150);

      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = setTimeout(() => {
        clearLoading();
      }, 12000);
    };

    const handlePopState = () => {
      clearLoading();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearLoading();
    };
  }, []);

  if (!navigating) return null;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-gold/15"
      >
        <div className="nav-progress-bar h-full w-1/2 bg-gradient-to-r from-transparent via-gold-light to-gold shadow-[0_0_12px_rgba(200,162,83,0.9)]" />
      </div>

      {showPill && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/40 bg-charcoal/95 px-4 py-2 text-xs font-medium text-ivory shadow-2xl shadow-black/80 backdrop-blur-md"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
          Đang tải...
        </div>
      )}
    </>
  );
}
