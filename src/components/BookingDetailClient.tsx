"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  RefreshCw,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  QrCode,
} from "lucide-react";
import type { BookingWithDetails, PaymentQrMode, TimeSlot } from "@/lib/types";
import { buildVietQrUrl, findBankByBin } from "@/lib/vietqr";
import {
  addDaysToDate,
  BOOKING_STATUS_META,
  buildGoogleCalendarUrl,
  formatDateVi,
  formatPhoneDisplay,
  formatShortDayVi,
  formatVND,
} from "@/lib/utils";

interface Props {
  initialBooking: BookingWithDetails;
  shop: {
    name: string;
    address: string;
    phone: string;
    payment_qr_mode: PaymentQrMode;
    payment_bank_bin: string | null;
    payment_account_no: string | null;
    payment_account_name: string | null;
    payment_qr_url: string | null;
    payment_note: string | null;
  };
  today: string;
  isNewBooking: boolean;
}

export function BookingDetailClient({
  initialBooking,
  shop,
  today,
  isNewBooking,
}: Props) {
  const [booking, setBooking] = useState<BookingWithDetails>(initialBooking);
  const [copied, setCopied] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState(initialBooking.date);
  const [newTime, setNewTime] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDaysToDate(today, i)),
    [today]
  );

  useEffect(() => {
    if (!showReschedule) return;
    let active = true;
    const load = async () => {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          date: newDate,
          duration: String(booking.total_duration),
          barberId: String(booking.barber_id),
          excludeBookingId: String(booking.id),
        });
        const res = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (active) {
          setSlots(json.slots ?? []);
          setNewTime("");
        }
      } finally {
        if (active) setLoadingSlots(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [showReschedule, newDate, booking.total_duration, booking.barber_id, booking.id]);

  const statusMeta = BOOKING_STATUS_META[booking.status] ?? {
    label: booking.status,
    colorClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
  };

  const canModify = booking.status === "confirmed";

  const gcalUrl = buildGoogleCalendarUrl({
    title: `Cắt tóc tại ${shop.name} (${booking.service_names.join(", ")})`,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    location: shop.address,
    details: `Mã lịch hẹn: ${booking.code}\nThợ: ${booking.barber_name}\nTổng tiền dự kiến: ${formatVND(
      booking.total_price
    )}\nHotline: ${shop.phone}`,
  });

  const transferMemo = booking.code.replace(/-/g, " ");
  const bankInfo = findBankByBin(shop.payment_bank_bin);
  const isDynamicVietQr =
    shop.payment_qr_mode === "vietqr" &&
    Boolean(shop.payment_bank_bin && shop.payment_account_no);

  const resolvedQrUrl = isDynamicVietQr
    ? buildVietQrUrl({
        bankBin: shop.payment_bank_bin!,
        accountNo: shop.payment_account_no!,
        accountName: shop.payment_account_name,
        amount: booking.total_price,
        addInfo: transferMemo,
      })
    : shop.payment_qr_mode === "image" && shop.payment_qr_url
    ? shop.payment_qr_url
    : null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(transferMemo);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyAccount = () => {
    if (!shop.payment_account_no) return;
    navigator.clipboard?.writeText(shop.payment_account_no);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 1800);
  };

  const handleCancel = async () => {
    if (!window.confirm("Bạn chắc chắn muốn hủy lịch hẹn này?")) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${booking.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", text: json.error || "Không thể hủy lịch." });
        return;
      }
      setBooking(json.booking);
      setShowReschedule(false);
      setFeedback({ type: "success", text: "Đã hủy lịch hẹn thành công." });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!newTime) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/bookings/${booking.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, start_time: newTime }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: json.error || "Không thể đổi giờ hẹn.",
        });
        return;
      }
      setBooking(json.booking);
      setShowReschedule(false);
      setFeedback({
        type: "success",
        text: `Đã đổi lịch hẹn sang ${json.booking.start_time} · ${formatDateVi(
          json.booking.date,
          today
        )}.`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      {isNewBooking && booking.status === "confirmed" && (
        <div className="mb-6 flex flex-col items-center text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-ivory">
            Giữ Chỗ Thành Công!
          </h1>
          <p className="text-sm text-muted">
            Cảm ơn anh <strong className="text-ivory">{booking.customer_name}</strong>.{" "}
            {shop.name} đã sẵn sàng đón tiếp anh đúng giờ.
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/35 bg-red-500/10 text-red-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Luxury Ticket Card */}
      <div className="overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-surface to-charcoal shadow-2xl shadow-black/60">
        {/* Top ticket strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-gold/25 bg-obsidian/60 px-6 py-4">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.25em] text-muted">
              Mã Lịch Hẹn
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="mt-0.5 inline-flex items-center gap-2 font-mono text-2xl font-bold tracking-wider text-gold-light hover:text-gold"
            >
              {booking.code}
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-muted" />
              )}
            </button>
          </div>

          <span
            className={`rounded-full border px-3.5 py-1 text-xs font-semibold ${statusMeta.colorClass}`}
          >
            {statusMeta.label}
          </span>
        </div>

        {/* Main details */}
        <div className="space-y-5 p-6">
          <div className="grid gap-4 rounded-2xl border border-white/5 bg-obsidian/55 p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-gold" />
              <div>
                <div className="text-xs text-muted">Ngày hẹn</div>
                <div className="font-serif text-base font-semibold text-ivory">
                  {formatDateVi(booking.date, today)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-gold" />
              <div>
                <div className="text-xs text-muted">Khung giờ</div>
                <div className="font-serif text-base font-semibold text-gold-light">
                  {booking.start_time} – {booking.end_time}{" "}
                  <span className="font-sans text-xs font-normal text-muted">
                    ({booking.total_duration} phút)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-muted">Khách hàng</span>
              <span className="font-medium text-ivory">
                {booking.customer_name} · {formatPhoneDisplay(booking.customer_phone)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-muted">Thợ thực hiện</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-ivory">
                <Scissors className="h-3.5 w-3.5 text-gold" />
                {booking.barber_name}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2.5">
              <span className="text-muted shrink-0">Dịch vụ</span>
              <span className="text-right font-medium text-ivory">
                {booking.service_names.join(" + ")}
              </span>
            </div>
            {booking.note && (
              <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2.5">
                <span className="text-muted shrink-0">Ghi chú</span>
                <span className="text-right text-ivory/85">{booking.note}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs uppercase tracking-wider text-muted">
                Tổng tiền (thanh toán tại tiệm)
              </span>
              <span className="font-serif text-2xl font-bold text-gold-light">
                {formatVND(booking.total_price)}
              </span>
            </div>
          </div>

          {/* Shop Info */}
          <div className="rounded-2xl border border-gold/15 bg-gold/5 p-4 text-xs text-ivory/80 space-y-1.5">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-gold" />
              <span>{shop.address}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-gold" />
              <span>Hotline hỗ trợ: {formatPhoneDisplay(shop.phone)}</span>
            </p>
          </div>

          {/* Bank Transfer QR Code (VietQR dynamic or uploaded static image) */}
          {resolvedQrUrl && booking.status !== "cancelled" && (
            <div className="rounded-2xl border border-gold/25 bg-obsidian/70 p-4 sm:p-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <a
                  href={resolvedQrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Bấm để xem ảnh QR cỡ lớn"
                  className="shrink-0 rounded-2xl bg-white p-2.5 shadow-lg transition hover:scale-[1.02]"
                >
                  <img
                    src={resolvedQrUrl}
                    alt={`Mã QR chuyển khoản ${shop.name}`}
                    className="h-44 w-44 object-contain sm:h-48 sm:w-48"
                  />
                </a>
                <div className="flex-1 space-y-2.5 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gold-light">
                      <QrCode className="h-4 w-4 text-gold" />
                      Quét mã QR chuyển khoản
                    </span>
                    {isDynamicVietQr && (
                      <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Tự điền sẵn tiền &amp; nội dung
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-muted">
                    {shop.payment_note ||
                      (isDynamicVietQr
                        ? "Quét bằng app Ngân hàng, MoMo hoặc ZaloPay — số tiền và nội dung sẽ tự động điền sẵn."
                        : "Quét mã bằng ứng dụng ngân hàng để thanh toán nhanh hoặc cọc giữ chỗ.")}
                  </p>

                  <div className="space-y-1.5 rounded-xl border border-white/5 bg-charcoal/80 px-3 py-2.5 text-xs">
                    {isDynamicVietQr && bankInfo && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Ngân hàng:</span>
                        <strong className="text-ivory">
                          {bankInfo.name} ({bankInfo.shortName})
                        </strong>
                      </div>
                    )}
                    {isDynamicVietQr && shop.payment_account_no && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Số tài khoản:</span>
                        <button
                          type="button"
                          onClick={handleCopyAccount}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-ivory hover:text-gold-light"
                        >
                          {shop.payment_account_no}
                          {copiedAccount ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted" />
                          )}
                        </button>
                      </div>
                    )}
                    {isDynamicVietQr && shop.payment_account_name && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Chủ TK:</span>
                        <span className="font-medium text-ivory/90">
                          {shop.payment_account_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-1.5">
                      <span className="text-muted">Số tiền:</span>
                      <strong className="text-gold-light">
                        {formatVND(booking.total_price)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted">Nội dung CK:</span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1 font-mono font-semibold text-ivory hover:text-gold-light"
                      >
                        {transferMemo}
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid gap-2.5">
            {false && booking.status !== "cancelled" && (
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-gold-light"
              >
                <Calendar className="h-4 w-4" />
                Thêm vào Google Calendar
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <Link
              href="/passport"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-obsidian transition hover:bg-gold-light"
            >
              <Sparkles className="h-4 w-4" />
              Xem Hồ sơ kiểu tóc
            </Link>
          </div>

          {canModify && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setShowReschedule((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-light hover:underline"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {showReschedule ? "Đóng đổi lịch" : "Đổi ngày / giờ hẹn"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300"
              >
                <XCircle className="h-3.5 w-3.5" />
                Hủy lịch hẹn
              </button>
            </div>
          )}

          {/* Inline Reschedule Panel */}
          {showReschedule && canModify && (
            <div className="space-y-4 rounded-2xl border border-gold/25 bg-obsidian/80 p-4">
              <h3 className="text-sm font-semibold text-ivory">
                Chọn ngày & khung giờ mới
              </h3>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((d) => {
                  const info = formatShortDayVi(d, today);
                  const active = d === newDate;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setNewDate(d)}
                      className={`min-w-[66px] shrink-0 rounded-xl border px-2.5 py-2 text-center text-xs transition ${
                        active
                          ? "border-gold bg-gold text-obsidian font-semibold"
                          : "border-border-subtle bg-surface text-ivory"
                      }`}
                    >
                      <div className="text-[10px] opacity-80">{info.weekday}</div>
                      <div className="font-serif text-base font-bold">
                        {info.dayNum}
                      </div>
                    </button>
                  );
                })}
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-gold" />
                  Đang tải khung giờ...
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots
                    .filter((s) => s.available)
                    .map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setNewTime(s.time)}
                        className={`rounded-lg border py-2 text-xs font-semibold transition ${
                          newTime === s.time
                            ? "border-gold bg-gold text-obsidian"
                            : "border-border-subtle bg-surface text-ivory hover:border-gold/50"
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                </div>
              )}

              <button
                type="button"
                disabled={!newTime || saving}
                onClick={handleConfirmReschedule}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-semibold text-obsidian disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận đổi sang {newTime || "..."}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-muted hover:text-gold-light">
          ← Quay về trang chủ {shop.name}
        </Link>
      </div>
    </div>
  );
}
