"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio, Clock, Users, ArrowRight } from "lucide-react";
import type { LiveChairSummary } from "@/lib/types";

interface Props {
  initialData: LiveChairSummary;
}

export function LiveChairBanner({ initialData }: Props) {
  const [data, setData] = useState<LiveChairSummary>(initialData);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/live-chair");
        if (!res.ok) return;
        const json = (await res.json()) as LiveChairSummary;
        if (active) setData(json);
      } catch {
        // silent retry on next tick
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };

    // Poll every 60s only while tab is visible (saves ~80% Vercel requests)
    const id = setInterval(poll, 60000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const isAvailable = data.overall_status === "available";
  const isBusy = data.overall_status === "busy";

  const dotColor = isAvailable
    ? "bg-emerald-live"
    : isBusy
    ? "bg-amber-live"
    : "bg-zinc-500";

  const badgeBg = isAvailable
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : isBusy
    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
    : "border-zinc-700 bg-zinc-800/70 text-zinc-400";

  const statusTag = isAvailable
    ? "GHẾ ĐANG TRỐNG"
    : isBusy
    ? "ĐANG PHỤC VỤ"
    : "NGOÀI GIỜ";

  return (
    <div className="border-b border-gold/15 bg-charcoal/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="mt-0.5 flex items-center gap-2 sm:mt-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {(isAvailable || isBusy) && (
                <span
                  className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dotColor}`}
                />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}
              />
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider ${badgeBg}`}
            >
              <Radio className="h-3 w-3" />
              {statusTag}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-ivory">{data.headline}</p>
            <p className="text-xs text-muted">{data.subline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          {data.waiting_count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs text-ivory/90">
              <Users className="h-3.5 w-3.5 text-gold" />
              {data.waiting_count} khách chờ
            </span>
          )}
          {data.earliest_free_at && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs text-ivory/90">
              <Clock className="h-3.5 w-3.5 text-gold" />
              Slot gần nhất: <strong className="text-gold-light">{data.earliest_free_at}</strong>
            </span>
          )}
          <Link
            href="/book"
            className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light transition hover:bg-gold hover:text-obsidian"
          >
            Giữ chỗ ngay
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Multi-barber live breakdown (appears automatically when shop has > 1 active barber) */}
      {data.barbers.length > 1 && (
        <div className="border-t border-white/5 bg-obsidian/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Trạng thái từng ghế:
            </span>
            {data.barbers.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-0.5 text-xs text-ivory/90"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    b.current_status === "available"
                      ? "bg-emerald-live"
                      : b.current_status === "busy"
                      ? "bg-amber-live"
                      : "bg-zinc-500"
                  }`}
                />
                {b.name}
                <span className="text-muted">
                  {b.current_status === "available"
                    ? "Trống"
                    : b.current_status === "busy"
                    ? b.estimated_free_at
                      ? `Xong ~${b.estimated_free_at}`
                      : "Đang cắt"
                    : "Nghỉ"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
