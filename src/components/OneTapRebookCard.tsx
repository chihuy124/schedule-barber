"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  CheckCircle2,
  Phone,
  ArrowRight,
  RotateCcw,
  Loader2,
  UserCheck,
} from "lucide-react";
import type { CustomerLookupResponse } from "@/lib/types";
import {
  formatPhoneDisplay,
  formatVND,
  isValidVietnamesePhone,
  PHONE_ERROR_MESSAGE,
  sanitizePhoneInput,
} from "@/lib/utils";

const STORAGE_PHONE_KEY = "ken_barber_phone";

export function OneTapRebookCard() {
  const router = useRouter();
  const [phoneInput, setPhoneInput] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [lookup, setLookup] = useState<CustomerLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomer = async (phone: string, persist = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/customers/lookup?phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Số điện thoại chưa đúng.");
        setLookup(null);
        return;
      }
      setLookup(data);
      setSelectedSlotIdx(0);
      if (data.found && persist) {
        localStorage.setItem(STORAGE_PHONE_KEY, data.customer.phone);
        setSavedPhone(data.customer.phone);
      } else if (!data.found) {
        setError("Chưa thấy lịch sử cắt với SĐT này. Bạn có thể đặt lịch mới ngay bên dưới!");
      }
    } catch {
      setError("Không thể kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_PHONE_KEY);
    if (stored) {
      setSavedPhone(stored);
      fetchCustomer(stored, false);
    }
  }, []);

  const handleInstantRebook = async () => {
    if (!lookup?.found || !lookup.customer) return;
    const slot = lookup.quick_slots[selectedSlotIdx];
    const services = lookup.customer.last_services ?? [];
    if (!slot || services.length === 0) {
      router.push("/book");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: lookup.customer.name,
          customer_phone: lookup.customer.phone,
          service_ids: services.map((s) => s.id),
          barber_id: slot.barber_id,
          date: slot.date,
          start_time: slot.time,
          note: "Đặt lại 1 chạm theo combo quen thuộc",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Khung giờ vừa hết, vui lòng chọn giờ khác.");
        await fetchCustomer(lookup.customer.phone, false);
        return;
      }
      router.push(`/booking/${json.booking.code}?new=1`);
    } catch {
      setError("Có lỗi xảy ra khi đặt lịch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgetPhone = () => {
    localStorage.removeItem(STORAGE_PHONE_KEY);
    setSavedPhone(null);
    setLookup(null);
    setPhoneInput("");
    setError(null);
  };

  // Recognized returning customer view — 1-Tap Re-booking!
  if (lookup?.found && lookup.customer) {
    const c = lookup.customer;
    const services = c.last_services ?? [];
    const totalPrice = services.reduce((s, x) => s + x.price, 0);
    const totalMins = services.reduce((s, x) => s + x.duration_minutes, 0);
    const chosenSlot = lookup.quick_slots[selectedSlotIdx];
    const latestHair = lookup.hair_records[0];

    return (
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-br from-surface via-charcoal to-obsidian p-5 shadow-2xl shadow-black/50 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-gold-light">
                  <Zap className="h-3 w-3" />
                  Đặt lại trong 1 chạm
                </span>
                {c.days_since_last_cut !== null && c.days_since_last_cut !== undefined && (
                  <span className="text-xs text-muted">
                    {c.days_since_last_cut === 0
                      ? "Vừa cắt hôm nay"
                      : `${c.days_since_last_cut} ngày kể từ lần cắt trước`}
                  </span>
                )}
              </div>

              <h2 className="font-serif text-xl font-semibold text-ivory sm:text-2xl">
                Chào mừng trở lại, <span className="text-gold-light">{c.name}</span>
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ivory/85">
                <span>
                  Combo quen:{" "}
                  <strong className="text-ivory">
                    {services.map((s) => s.name).join(" + ")}
                  </strong>
                </span>
                <span className="text-gold-light font-semibold">
                  {formatVND(totalPrice)} · {totalMins} phút
                </span>
                {c.last_barber_name && (
                  <span className="text-muted">Thợ: {c.last_barber_name}</span>
                )}
              </div>

              {latestHair && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-obsidian/60 px-3 py-1.5 text-xs text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span>
                    Hồ sơ tóc gần nhất:{" "}
                    <strong className="text-ivory">{latestHair.style_name}</strong>
                  </span>
                  <Link
                    href="/passport"
                    className="ml-1 font-medium text-gold-light underline-offset-2 hover:underline"
                  >
                    Xem hồ sơ
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[360px]">
              {lookup.quick_slots.length > 0 ? (
                <>
                  <div className="text-xs font-medium text-muted">
                    Chọn nhanh 1 khung giờ trống gần nhất:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {lookup.quick_slots.slice(0, 4).map((slot, idx) => {
                      const active = idx === selectedSlotIdx;
                      return (
                        <button
                          key={`${slot.date}-${slot.time}`}
                          type="button"
                          onClick={() => setSelectedSlotIdx(idx)}
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                            active
                              ? "border-gold bg-gold/15 text-ivory"
                              : "border-border-subtle bg-obsidian/70 text-muted hover:border-gold/40 hover:text-ivory"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-sm text-ivory">
                              {slot.time}
                            </div>
                            <div className="text-[11px] text-muted">
                              {slot.date_label}
                            </div>
                          </div>
                          {active && (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submitting || !chosenSlot}
                      onClick={handleInstantRebook}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-obsidian shadow-lg shadow-gold/15 transition hover:bg-gold-light disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Đặt ngay {chosenSlot?.time} · {chosenSlot?.date_label.split(",")[0]}
                    </button>
                    <Link
                      href={`/book?services=${services.map((s) => s.id).join(",")}`}
                      className="rounded-xl border border-border-subtle bg-surface px-3.5 py-3 text-xs font-medium text-ivory/90 transition hover:border-gold/40"
                    >
                      Chọn giờ khác
                    </Link>
                  </div>
                </>
              ) : (
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-obsidian hover:bg-gold-light"
                >
                  Chọn khung giờ đặt lịch
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>SĐT: {formatPhoneDisplay(c.phone)}</span>
                <button
                  type="button"
                  onClick={handleForgetPhone}
                  className="inline-flex items-center gap-1 text-muted hover:text-ivory"
                >
                  <RotateCcw className="h-3 w-3" />
                  Đổi SĐT khác
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default prompt for returning customers who haven't entered their phone on this device yet
  return (
    <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
      <div className="rounded-2xl border border-gold/20 bg-charcoal/90 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ivory sm:text-base">
                Đã từng cắt tại Ken Barbershop?
              </h2>
              <p className="text-xs text-muted sm:text-sm">
                Nhập SĐT để mở <strong className="text-ivory/90">Hồ sơ kiểu tóc</strong> &{" "}
                <strong className="text-gold-light">Đặt lại trong 1 chạm</strong>.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isValidVietnamesePhone(phoneInput)) {
                setError(PHONE_ERROR_MESSAGE);
                return;
              }
              fetchCustomer(phoneInput);
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(sanitizePhoneInput(e.target.value));
                  if (error) setError(null);
                }}
                placeholder="Nhập SĐT (vd: 0901234567)"
                className={`w-full rounded-xl border bg-obsidian py-2.5 pl-9 pr-3 text-sm text-ivory placeholder:text-muted/60 focus:outline-none sm:w-56 ${
                  error
                    ? "border-red-500/70 focus:border-red-400"
                    : "border-border-subtle focus:border-gold"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !phoneInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold/90 px-4 py-2.5 text-sm font-semibold text-obsidian transition hover:bg-gold-light disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Tìm hồ sơ
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 text-xs">
          {error ? (
            <span className="text-amber-300">{error}</span>
          ) : (
            <span className="text-muted">
              Không cần tạo mật khẩu — lưu tự động trên thiết bị cho lần sau.
            </span>
          )}
          {process.env.NODE_ENV !== "production" && !savedPhone && (
            <button
              type="button"
              onClick={() => {
                setPhoneInput("0901234567");
                fetchCustomer("0901234567");
              }}
              className="inline-flex items-center gap-1 text-gold-light/90 hover:text-gold-light hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              Dùng thử SĐT khách quen: 0901234567
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
