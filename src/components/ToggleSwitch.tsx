"use client";

import { Loader2 } from "lucide-react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  ariaLabel: string;
  disabled?: boolean;
  loading?: boolean;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
  loading = false,
}: ToggleSwitchProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={isDisabled}
      onClick={onChange}
      className="group inline-flex shrink-0 cursor-pointer items-center gap-2.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label && (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
            checked ? "text-emerald-300" : "text-muted"
          }`}
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin text-gold" />}
          {label}
        </span>
      )}
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-all duration-200 ${
          checked
            ? "border-emerald-400/50 bg-emerald-500/80 shadow-inner shadow-emerald-950/40 group-hover:bg-emerald-400/90 group-hover:shadow-[0_0_12px_rgba(52,211,153,0.35)]"
            : "border-border-subtle bg-zinc-800 group-hover:border-gold/50 group-hover:bg-zinc-700/90"
        } group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-gold/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-obsidian`}
      >
        <span
          className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full shadow-sm transition-all duration-200 ${
            checked
              ? "translate-x-5.5 bg-ivory"
              : "translate-x-1 bg-zinc-400 group-hover:bg-ivory/90"
          }`}
        >
          {loading && !label && (
            <Loader2 className="h-2.5 w-2.5 animate-spin text-obsidian" />
          )}
        </span>
      </span>
    </button>
  );
}
