"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Scissors, Loader2, ArrowLeft } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Mã PIN không đúng.");
        return;
      }
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="card-classic w-full max-w-md rounded-3xl p-7 shadow-2xl shadow-black/60">
        <div className="mb-6 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold">
            <Scissors className="h-5 w-5 -rotate-45" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ivory">
            Quản Trị Ken Barbershop
          </h1>
          <p className="text-xs text-muted">
            Nhập mã PIN chủ tiệm / thợ để mở Bảng điều khiển hôm nay.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">Mã PIN</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/80" />
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN..."
                autoFocus
                className="w-full rounded-xl border border-border-subtle bg-obsidian py-3 pl-10 pr-4 text-center font-mono text-lg tracking-[0.4em] text-ivory placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-muted/50 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-center text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-obsidian transition hover:bg-gold-light disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Đăng nhập quản trị
          </button>

          {process.env.NODE_ENV !== "production" && (
            <div className="rounded-xl border border-gold/15 bg-gold/5 px-3.5 py-2.5 text-center text-xs text-muted">
              Môi trường local demo — Mã PIN mặc định:{" "}
              <button
                type="button"
                onClick={() => setPin("1234")}
                className="font-mono font-bold text-gold-light hover:underline"
              >
                1234
              </button>
            </div>
          )}
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ivory"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay về trang khách hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
