"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Search,
  Sparkles,
  Scissors,
  Calendar,
  Clock,
  ArrowRight,
  Zap,
  Loader2,
  Award,
  Camera,
} from "lucide-react";
import type { CustomerLookupResponse } from "@/lib/types";
import {
  BOOKING_STATUS_META,
  formatDateVi,
  formatPhoneDisplay,
  formatVND,
  isValidVietnamesePhone,
  PHONE_ERROR_MESSAGE,
  sanitizePhoneInput,
} from "@/lib/utils";

const STORAGE_PHONE_KEY = "ken_barber_phone";

export function HairPassportClient({ today }: { today: string }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [data, setData] = useState<CustomerLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runLookup = async (phone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/lookup?phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Số điện thoại không hợp lệ.");
        setData(null);
        return;
      }
      setData(json);
      if (json.found && json.customer?.phone) {
        localStorage.setItem(STORAGE_PHONE_KEY, json.customer.phone);
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_PHONE_KEY);
    if (saved) {
      setPhoneInput(saved);
      runLookup(saved);
    }
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
          <Sparkles className="h-3.5 w-3.5" />
          Hair Passport · Ken Barbershop
        </span>
        <h1 className="font-serif text-3xl font-bold text-ivory sm:text-4xl">
          Hồ Sơ Kiểu Tóc Cá Nhân
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted">
          Tra cứu bằng số điện thoại để xem lại ảnh kiểu tóc đã cắt, công thức kỹ thuật của thợ và đặt lại đúng kiểu bạn ưng ý chỉ trong 1 chạm.
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValidVietnamesePhone(phoneInput)) {
            setError(PHONE_ERROR_MESSAGE);
            return;
          }
          runLookup(phoneInput);
        }}
        className="mx-auto mb-8 max-w-xl"
      >
        <div className="flex flex-col gap-2.5 rounded-2xl border border-gold/25 bg-charcoal p-2 sm:flex-row">
          <div className="relative flex-1">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold/80" />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(sanitizePhoneInput(e.target.value));
                if (error) setError(null);
              }}
              placeholder="Nhập số điện thoại của bạn (vd: 0901234567)"
              className={`w-full rounded-xl bg-obsidian py-3 pl-10 pr-4 text-sm text-ivory placeholder:text-muted/60 focus:outline-none focus:ring-1 ${
                error ? "ring-1 ring-red-500/70 focus:ring-red-400" : "focus:ring-gold"
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phoneInput.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-obsidian transition hover:bg-gold-light disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Mở hồ sơ
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            <span className="text-muted">Tra cứu nhanh chỉ bằng SĐT.</span>
          )}
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => {
                setPhoneInput("0901234567");
                runLookup("0901234567");
              }}
              className="text-gold-light/90 hover:text-gold-light hover:underline"
            >
              Xem hồ sơ mẫu (0901 234 567) →
            </button>
          )}
        </div>
      </form>

      {/* Not Found */}
      {data && !data.found && (
        <div className="mx-auto max-w-xl rounded-2xl border border-border-subtle bg-charcoal p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
            <Scissors className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-xl font-semibold text-ivory">
            Chưa có hồ sơ với số điện thoại này
          </h2>
          <p className="text-sm text-muted">
            Sau lần cắt đầu tiên tại Ken Barbershop, thợ sẽ lưu ảnh thành phẩm cùng thông số kiểu tóc vào Hồ sơ riêng của bạn tại đây.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian hover:bg-gold-light"
          >
            Đặt lịch trải nghiệm ngay
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Found Customer Passport */}
      {data?.found && data.customer && (
        <div className="space-y-8">
          {/* VIP Identity Banner */}
          <div className="card-classic flex flex-col justify-between gap-5 rounded-3xl p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 font-serif text-2xl font-bold text-gold-light">
                {data.customer.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold text-ivory">
                    {data.customer.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-gold-light">
                    <Award className="h-3 w-3" />
                    Thành viên Ken
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  SĐT: {formatPhoneDisplay(data.customer.phone)} ·{" "}
                  {data.customer.total_visits ?? 0} lần phục vụ
                  {data.customer.days_since_last_cut !== null &&
                    data.customer.days_since_last_cut !== undefined && (
                      <> · Cắt gần nhất {data.customer.days_since_last_cut} ngày trước</>
                    )}
                </p>
              </div>
            </div>

            <Link
              href={`/book?services=${(data.customer.last_services ?? [])
                .map((s) => s.id)
                .join(",")}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-obsidian shadow-lg shadow-gold/15 transition hover:bg-gold-light"
            >
              <Zap className="h-4 w-4" />
              Đặt lại combo quen
            </Link>
          </div>

          {/* Upcoming Bookings */}
          {data.upcoming_bookings.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                <Calendar className="h-4 w-4" />
                Lịch hẹn sắp tới ({data.upcoming_bookings.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.upcoming_bookings.map((bk) => {
                  const meta = BOOKING_STATUS_META[bk.status];
                  return (
                    <Link
                      key={bk.id}
                      href={`/booking/${bk.code}`}
                      className="card-classic flex items-center justify-between gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-gold-light">
                            {bk.code}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta?.colorClass}`}
                          >
                            {meta?.label}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-ivory">
                          {formatDateVi(bk.date, today)} · {bk.start_time}
                        </div>
                        <div className="text-xs text-muted">
                          {bk.service_names.join(" + ")} · {formatVND(bk.total_price)}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gold" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Hair Passport Timeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                <Camera className="h-4 w-4" />
                Bộ Sưu Tập Kiểu Tóc Đã Cắt ({data.hair_records.length})
              </h3>
            </div>

            {data.hair_records.length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-charcoal p-8 text-center text-sm text-muted">
                Chưa có bản ghi ảnh & thông số tóc. Lần cắt tới hãy nhắc thợ lưu vào Hồ sơ tóc nhé!
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {data.hair_records.map((rec) => {
                  const bookUrl = `/book?${new URLSearchParams({
                    services:
                      rec.service_ids.length > 0
                        ? rec.service_ids.join(",")
                        : (data.customer?.last_services ?? [])
                            .map((s) => s.id)
                            .join(","),
                    note: `Cắt lại theo Hồ sơ tóc: ${rec.style_name} (${rec.tags.join(
                      ", "
                    )})`,
                  }).toString()}`;

                  return (
                    <article
                      key={rec.id}
                      className="card-classic flex flex-col overflow-hidden rounded-2xl"
                    >
                      {rec.photo_urls.length > 0 && (
                        <div className="relative aspect-[4/3.6] overflow-hidden bg-obsidian">
                          <img
                            src={rec.photo_urls[0]}
                            alt={rec.style_name}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
                          <div className="absolute left-3 top-3 rounded-full border border-gold/30 bg-obsidian/80 px-3 py-1 text-[11px] font-medium text-ivory backdrop-blur">
                            {formatDateVi(rec.cut_date, today)}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-serif text-xl font-bold text-ivory">
                                {rec.style_name}
                              </h4>
                              {rec.photo_urls.length === 0 && (
                                <span className="text-xs text-muted">
                                  {rec.cut_date}
                                </span>
                              )}
                            </div>
                            {rec.barber_name && (
                              <p className="mt-0.5 text-xs text-gold/90">
                                Thực hiện bởi {rec.barber_name}
                              </p>
                            )}
                          </div>

                          {rec.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {rec.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-gold-light"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {rec.technical_note && (
                            <div className="rounded-xl border border-white/5 bg-obsidian/70 p-3.5 text-xs leading-relaxed text-ivory/85">
                              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-gold">
                                Công thức kỹ thuật của thợ
                              </span>
                              {rec.technical_note}
                            </div>
                          )}
                        </div>

                        <Link
                          href={bookUrl}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-xs font-semibold text-gold-light transition hover:bg-gold hover:text-obsidian"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Đặt cắt lại đúng kiểu này
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Past Booking History */}
          {data.past_bookings.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                <Clock className="h-4 w-4" />
                Lịch sử đặt lịch gần đây
              </h3>
              <div className="divide-y divide-white/5 rounded-2xl border border-border-subtle bg-charcoal">
                {data.past_bookings.slice(0, 6).map((bk) => {
                  const meta = BOOKING_STATUS_META[bk.status];
                  return (
                    <Link
                      key={bk.id}
                      href={`/booking/${bk.code}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs transition hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-muted">{bk.code}</span>
                        <span className="font-medium text-ivory">
                          {bk.date} · {bk.start_time}
                        </span>
                        <span className="text-muted">
                          {bk.service_names.join(" + ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gold-light">
                          {formatVND(bk.total_price)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${meta?.colorClass}`}
                        >
                          {meta?.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
