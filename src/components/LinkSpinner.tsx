"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

interface LinkSpinnerProps {
  fallback?: ReactNode;
  className?: string;
}

/**
 * Renders a spinning Loader2 right inside a Next.js <Link> the instant it is
 * clicked and while the destination route is loading; otherwise renders `fallback`.
 */
export function LinkSpinner({
  fallback = null,
  className = "h-4 w-4",
}: LinkSpinnerProps) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <Loader2 className={`${className} shrink-0 animate-spin`} />;
  }
  return <>{fallback}</>;
}
