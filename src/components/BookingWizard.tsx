"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  Calendar,
  User,
  Phone,
  FileText,
  ArrowLeft,
  ArrowRight,
  Scissors,
  Sparkles,
  Loader2,
  Sun,
  Sunset,
  Moon,
  AlertCircle,
} from "lucide-react";
import type { Barber, Service, TimeSlot } from "@/lib/types";
import {
  addDaysToDate,
  formatDateVi,
  formatShortDayVi,
  formatVND,
  isValidVietnamesePhone,
  minutesToTime,
  PHONE_ERROR_MESSAGE,
  sanitizePhoneInput,
  timeToMinutes,
} from "@/lib/utils";

interface Props {
  barbers: Barber[];
  services: Service[];
  initialToday: string;
}

const STORAGE_PHONE_KEY = "ken_barber_phone";
const STORAGE_NAME_KEY = "ken_barber_name";

export function BookingWizard({ barbers, services, initialToday }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasMultipleBarbers = barbers.length > 1;
  const defaultBarberId: number | "any" =
    barbers.length === 1 ? barbers[0].id : "any";

  // Parse initial query params (?services=1,2&barberId=1&note=...)
  const initialServiceIds = useMemo(() => {
    const raw = searchParams.get("services") || searchParams.get("serviceId");
    if (!raw) return [];
    const validIds = new Set(services.map((s) => s.id));
    return raw
      .split(",")
      .map(Number)
      .filter((id) => validIds.has(id));
  }, [searchParams, services]);

  const initialBarber = useMemo<number | "any">(() => {
    const raw = searchParams.get("barberId");
    if (raw && raw !== "any") {
      const id = Number(raw);
      if (barbers.some((b) => b.id === id)) return id;
    }
    return defaultBarberId;
  }, [searchParams, barbers, defaultBarberId]);

  const initialNote = searchParams.get("note") || "";

  // Dynamic step pipeline: skips 'barber' automatically when only 1 active barber
  const steps = useMemo(
    () =>
      hasMultipleBarbers
        ? (["service", "barber", "datetime", "confirm"] as const)
        : (["service", "datetime", "confirm"] as const),
    [hasMultipleBarbers]
  );

  const [stepIdx, setStepIdx] = useState<number>(() =>
    initialServiceIds.length > 0 ? 1 : 0
  );
  const currentStep = steps[stepIdx] ?? "service";

  const [selectedServiceIds, setSelectedServiceIds] =
    useState<number[]>(initialServiceIds);
  const [selectedBarberId, setSelectedBarberId] =
    useState<number | "any">(initialBarber);
  const [selectedDate, setSelectedDate] = useState<string>(initialToday);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isDayOpen, setIsDayOpen] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState(initialNote);
  const [returningCustomerHint, setReturningCustomerHint] = useState<string | null>(
    null
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Restore saved customer identity from localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem(STORAGE_PHONE_KEY);
    const savedName = localStorage.getItem(STORAGE_NAME_KEY);
    if (savedPhone) setCustomerPhone(savedPhone);
    if (savedName) setCustomerName(savedName);
    if (savedPhone && !savedName) {
      fetch(`/api/customers/lookup?phone=${encodeURIComponent(savedPhone)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.found && d.customer?.name) {
            setCustomerName(d.customer.name);
            setReturningCustomerHint(
              `Xin chào anh ${d.customer.name} · Thông tin đã được điền sẵn.`
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds]
  );

  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0),
    [selectedServices]
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices]
  );

  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDaysToDate(initialToday, i)),
    [initialToday]
  );

  // Load real-time availability whenever date/duration/barber changes
  useEffect(() => {
    if (currentStep !== "datetime") return;
    let active = true;
    const load = async () => {
      setLoadingSlots(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          duration: String(totalDuration || 30),
          barberId: String(selectedBarberId),
        });
        const res = await fetch(`/api/availability?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!active) return;
        setIsDayOpen(Boolean(data.isOpen));
        setSlots(data.slots ?? []);
        // Clear selected time if no longer available on this date
        setSelectedTime((prev) =>
          (data.slots ?? []).some((s: TimeSlot) => s.time === prev && s.available)
            ? prev
            : ""
        );
      } catch {
        if (active) setError("Không thể tải khung giờ trống.");
      } finally {
        if (active) setLoadingSlots(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [currentStep, selectedDate, totalDuration, selectedBarberId]);

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePhoneBlur = async () => {
    if (!customerPhone) {
      setPhoneError(null);
      return;
    }
    if (!isValidVietnamesePhone(customerPhone)) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      return;
    }
    setPhoneError(null);
    if (customerName.trim().length > 0) return;
    try {
      const res = await fetch(
        `/api/customers/lookup?phone=${encodeURIComponent(customerPhone)}`
      );
      if (!res.ok) return;
      const d = await res.json();
      if (d?.found && d.customer?.name) {
        setCustomerName(d.customer.name);
        setReturningCustomerHint(
          `Đã nhận diện khách quen: ${d.customer.name} (${d.hair_records?.length || 0} hồ sơ tóc).`
        );
      }
    } catch {
      // ignore
    }
  };

  const canGoNext = () => {
    if (currentStep === "service") return selectedServiceIds.length > 0;
    if (currentStep === "barber") return true;
    if (currentStep === "datetime") return Boolean(selectedTime);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (!canGoNext()) {
      if (currentStep === "service")
        setError("Vui lòng chọn ít nhất 1 dịch vụ.");
      if (currentStep === "datetime")
        setError("Vui lòng chọn một khung giờ trống.");
      return;
    }
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (customerName.trim().length < 2) {
      setError("Vui lòng nhập tên của bạn.");
      return;
    }
    if (!isValidVietnamesePhone(customerPhone)) {
      setPhoneError(PHONE_ERROR_MESSAGE);
      setError(PHONE_ERROR_MESSAGE);
      return;
    }
    setPhoneError(null);

    setSubmitting(true);
    let redirected = false;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          service_ids: selectedServiceIds,
          barber_id: selectedBarberId,
          date: selectedDate,
          start_time: selectedTime,
          note: note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Không thể hoàn tất đặt lịch.");
        if (res.status === 409) {
          // Slot taken -> send user back to datetime step
          const dtIndex = steps.indexOf("datetime");
          if (dtIndex >= 0) setStepIdx(dtIndex);
        }
        return;
      }

      localStorage.setItem(STORAGE_PHONE_KEY, json.booking.customer_phone);
      localStorage.setItem(STORAGE_NAME_KEY, json.booking.customer_name);
      redirected = true;
      router.push(`/booking/${json.booking.code}?new=1`);
    } catch {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      if (!redirected) setSubmitting(false);
    }
  };

  const stepLabels: Record<(typeof steps)[number], string> = {
    service: "Dịch vụ",
    barber: "Chọn thợ",
    datetime: "Ngày & Giờ",
    confirm: "Xác nhận",
  };

  const selectedBarberObj =
    selectedBarberId !== "any"
      ? barbers.find((b) => b.id === selectedBarberId)
      : null;

  const periodGroups = [
    { key: "morning" as const, label: "Buổi sáng", icon: Sun },
    { key: "afternoon" as const, label: "Buổi chiều", icon: Sunset },
    { key: "evening" as const, label: "Buổi tối", icon: Moon },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6">
      {/* Header & Step Progress */}
      <div className="mb-8 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Ken Barbershop · Đặt Lịch Trực Tuyến
            </span>
            <h1 className="mt-1 font-serif text-3xl font-bold text-ivory">
              {currentStep === "service" && "Chọn Dịch Vụ Quý Ông"}
              {currentStep === "barber" && "Chọn Người Giữ Kéo"}
              {currentStep === "datetime" && "Chọn Ngày & Khung Giờ"}
              {currentStep === "confirm" && "Xác Nhận Lịch Hẹn"}
            </h1>
          </div>

          {!hasMultipleBarbers && barbers[0] && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-surface px-3.5 py-1.5 text-xs text-ivory/90 self-start sm:self-auto">
              <Scissors className="h-3.5 w-3.5 text-gold" />
              Thực hiện bởi{" "}
              <strong className="text-gold-light">{barbers[0].name}</strong>
            </div>
          )}
        </div>

        {/* Stepper bar */}
        <div className="flex items-center gap-2">
          {steps.map((st, idx) => {
            const done = idx < stepIdx;
            const active = idx === stepIdx;
            return (
              <button
                key={st}
                type="button"
                disabled={idx > stepIdx}
                onClick={() => idx < stepIdx && setStepIdx(idx)}
                className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  active
                    ? "border-gold bg-gold/15 text-ivory"
                    : done
                    ? "border-gold/30 bg-surface text-gold-light hover:border-gold/60"
                    : "border-border-subtle bg-charcoal/50 text-muted/60 cursor-not-allowed"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-gold text-obsidian"
                      : done
                      ? "bg-gold/25 text-gold-light"
                      : "bg-zinc-800 text-muted"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : idx + 1}
                </span>
                <span className="truncate font-medium">{stepLabels[st]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: SERVICES */}
      {currentStep === "service" && (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Bạn có thể chọn 1 combo hoặc kết hợp nhiều dịch vụ lẻ — hệ thống sẽ tự tính tổng thời lượng.
          </p>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {services.map((svc) => {
              const selected = selectedServiceIds.includes(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                      : "border-border-subtle bg-charcoal/90 hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-base font-semibold text-ivory">
                          {svc.name}
                        </span>
                        {svc.is_popular && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold-light">
                            Hot
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-muted">
                        {svc.description}
                      </p>
                    </div>
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        selected
                          ? "border-gold bg-gold text-obsidian"
                          : "border-zinc-600 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3.5 w-3.5 text-gold/80" />
                      {svc.duration_minutes} phút
                    </span>
                    <span className="font-serif text-lg font-bold text-gold-light">
                      {formatVND(svc.price)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CONDITIONAL STEP: BARBER (auto-shown only when shop has > 1 active barber) */}
      {currentStep === "barber" && (
        <div className="space-y-3.5">
          <button
            type="button"
            onClick={() => setSelectedBarberId("any")}
            className={`flex w-full items-center justify-between rounded-2xl border p-5 text-left transition ${
              selectedBarberId === "any"
                ? "border-gold bg-gold/10"
                : "border-border-subtle bg-charcoal/90 hover:border-gold/40"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-gold">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-semibold text-ivory">
                  Bất kỳ thợ trống sớm nhất
                </h3>
                <p className="text-xs text-muted">
                  Tự động tối ưu nhiều khung giờ trống nhất cho bạn
                </p>
              </div>
            </div>
            {selectedBarberId === "any" && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-obsidian">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
          </button>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {barbers.map((b) => {
              const selected = selectedBarberId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBarberId(b.id)}
                  className={`flex flex-col gap-3 rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-gold bg-gold/10"
                      : "border-border-subtle bg-charcoal/90 hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 bg-obsidian font-serif text-lg font-bold text-gold-light">
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-serif text-base font-semibold text-ivory">
                          {b.name}
                        </div>
                        <div className="text-xs text-gold/90">{b.title}</div>
                      </div>
                    </div>
                    {selected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-obsidian">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{b.specialty}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2 (OR 3): DATE & TIME SLOTS */}
      {currentStep === "datetime" && (
        <div className="space-y-6">
          {/* Date strip */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
              <Calendar className="h-3.5 w-3.5" />
              Chọn ngày (14 ngày tới)
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {dates.map((d) => {
                const info = formatShortDayVi(d, initialToday);
                const active = d === selectedDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`flex min-w-[78px] shrink-0 flex-col items-center rounded-2xl border px-3 py-3 transition ${
                      active
                        ? "border-gold bg-gold text-obsidian shadow-lg shadow-gold/20"
                        : "border-border-subtle bg-charcoal text-ivory hover:border-gold/45"
                    }`}
                  >
                    <span
                      className={`text-[11px] font-medium ${
                        active ? "text-obsidian/80" : "text-muted"
                      }`}
                    >
                      {info.weekday}
                    </span>
                    <span className="mt-0.5 font-serif text-xl font-bold">
                      {info.dayNum}
                    </span>
                    <span
                      className={`text-[10px] ${
                        active ? "text-obsidian/70" : "text-muted/80"
                      }`}
                    >
                      {info.monthNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold">
                <Clock className="h-3.5 w-3.5" />
                Khung giờ trống · {formatDateVi(selectedDate, initialToday)}
              </span>
              <span className="text-xs text-muted">
                Thời lượng gói: <strong className="text-ivory">{totalDuration} phút</strong>
              </span>
            </div>

            {loadingSlots ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-charcoal py-14 text-sm text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-gold" />
                Đang kiểm tra khung giờ trống...
              </div>
            ) : !isDayOpen ? (
              <div className="rounded-2xl border border-border-subtle bg-charcoal p-8 text-center text-sm text-muted">
                Tiệm nghỉ vào ngày này. Vui lòng chọn ngày khác nhé!
              </div>
            ) : slots.filter((s) => s.available).length === 0 ? (
              <div className="rounded-2xl border border-border-subtle bg-charcoal p-8 text-center space-y-2">
                <p className="text-sm font-medium text-ivory">
                  Hết khung giờ trống phù hợp trong ngày {formatDateVi(selectedDate, initialToday)}
                </p>
                <p className="text-xs text-muted">
                  Vui lòng chọn ngày tiếp theo ở thanh lịch phía trên.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {periodGroups.map(({ key, label, icon: Icon }) => {
                  const groupSlots = slots.filter((s) => s.period === key);
                  if (groupSlots.length === 0) return null;
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-border-subtle bg-charcoal/80 p-4"
                    >
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                        <Icon className="h-3.5 w-3.5 text-gold" />
                        {label}
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                        {groupSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!slot.available}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`rounded-xl border py-2.5 text-sm font-semibold transition ${
                                !slot.available
                                  ? "border-white/5 bg-obsidian/40 text-zinc-600 line-through cursor-not-allowed"
                                  : isSelected
                                  ? "border-gold bg-gold text-obsidian shadow-md shadow-gold/25"
                                  : "border-border-subtle bg-surface text-ivory hover:border-gold/60 hover:text-gold-light"
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINAL STEP: CUSTOMER INFO & CONFIRM */}
      {currentStep === "confirm" && (
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-12">
          <div className="space-y-4 md:col-span-7">
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-5 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-ivory">
                Thông tin giữ chỗ
              </h2>

              {returningCustomerHint && (
                <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-xs text-gold-light">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  {returningCustomerHint}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Số điện thoại <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      const next = sanitizePhoneInput(e.target.value);
                      setCustomerPhone(next);
                      if (phoneError && isValidVietnamesePhone(next)) {
                        setPhoneError(null);
                      }
                    }}
                    onBlur={handlePhoneBlur}
                    placeholder="0901234567"
                    className={`w-full rounded-xl border bg-obsidian py-3 pl-10 pr-4 text-sm text-ivory placeholder:text-muted/50 focus:outline-none ${
                      phoneError
                        ? "border-red-500/70 focus:border-red-400"
                        : "border-border-subtle focus:border-gold"
                    }`}
                  />
                </div>
                {phoneError ? (
                  <p className="text-xs text-red-400">{phoneError}</p>
                ) : (
                  <p className="text-[11px] text-muted">
                    Bắt đầu bằng số 0, gồm đúng 10 chữ số · Dùng để lưu Hồ sơ kiểu tóc & đặt lại 1 chạm.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Tên của bạn <span className="text-gold">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Minh"
                    className="w-full rounded-xl border border-border-subtle bg-obsidian py-3 pl-10 pr-4 text-sm text-ivory placeholder:text-muted/50 focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Ghi chú cho thợ (không bắt buộc)
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted" />
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Cắt gọn hai bên, giữ mái dài vừa phải..."
                    className="w-full rounded-xl border border-border-subtle bg-obsidian py-2.5 pl-10 pr-4 text-sm text-ivory placeholder:text-muted/50 focus:border-gold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Booking summary card */}
          <div className="md:col-span-5">
            <div className="card-classic rounded-2xl p-5 space-y-4">
              <div className="border-b border-gold/15 pb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gold">
                  Tóm tắt lịch hẹn
                </span>
                <div className="mt-1 font-serif text-lg font-bold text-ivory">
                  {formatDateVi(selectedDate, initialToday)}
                </div>
                <div className="text-sm font-semibold text-gold-light">
                  {selectedTime} –{" "}
                  {selectedTime
                    ? minutesToTime(timeToMinutes(selectedTime) + totalDuration)
                    : ""}{" "}
                  ({totalDuration} phút)
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Thợ thực hiện</span>
                  <span className="font-medium text-ivory">
                    {selectedBarberObj
                      ? selectedBarberObj.name
                      : "Tự chọn thợ trống"}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-2 space-y-1.5">
                  {selectedServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-2 text-xs"
                    >
                      <span className="text-ivory/90">{s.name}</span>
                      <span className="shrink-0 text-muted">
                        {formatVND(s.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-gold/20 pt-3">
                  <span className="text-xs uppercase tracking-wider text-muted">
                    Thanh toán tại tiệm
                  </span>
                  <span className="font-serif text-xl font-bold text-gold-light">
                    {formatVND(totalPrice)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-obsidian shadow-lg shadow-gold/20 transition hover:bg-gold-light disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang giữ chỗ...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Xác Nhận Đặt Lịch
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-muted">
                Cắt xong mới thanh toán · Đổi hoặc hủy lịch miễn phí bất cứ lúc nào.
              </p>
            </div>
          </div>
        </form>
      )}

      {/* STICKY BOTTOM NAVIGATION BAR */}
      {currentStep !== "confirm" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/20 bg-obsidian/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              {stepIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs font-medium text-ivory hover:border-gold/40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
              )}
              <div>
                <div className="text-xs text-muted">
                  {selectedServices.length > 0
                    ? `${selectedServices.length} dịch vụ · ${totalDuration} phút`
                    : "Chưa chọn dịch vụ"}
                </div>
                <div className="font-serif text-lg font-bold text-gold-light">
                  {formatVND(totalPrice)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-obsidian shadow-lg shadow-gold/20 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              Tiếp tục
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {currentStep === "confirm" && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ivory"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đổi ngày / giờ
          </button>
        </div>
      )}
    </div>
  );
}
