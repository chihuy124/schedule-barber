import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian bg-barber-grid px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-gold/25 bg-charcoal p-2 shadow-xl shadow-black/60">
          <img
            src="/images/ken-logo.png"
            alt="Ken Barbershop"
            className="h-11 w-11 object-contain"
          />
          <Loader2 className="absolute inset-0 h-16 w-16 animate-spin text-gold" />
        </div>
        <p className="text-xs font-medium tracking-wider text-muted">
          Đang tải...
        </p>
      </div>
    </div>
  );
}
