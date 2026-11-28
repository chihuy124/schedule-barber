import { Loader2, Scissors } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian bg-barber-grid px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-charcoal shadow-xl shadow-black/60">
          <Scissors className="h-5 w-5 -rotate-45 text-gold/80" />
          <Loader2 className="absolute inset-0 h-14 w-14 animate-spin text-gold" />
        </div>
        <p className="text-xs font-medium tracking-wider text-muted">
          Đang tải...
        </p>
      </div>
    </div>
  );
}
