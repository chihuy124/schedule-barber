"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Users,
  Scissors,
  Plus,
  LogOut,
  CheckCircle2,
  Play,
  UserPlus,
  Sparkles,
  Camera,
  X,
  Loader2,
  Trash2,
  Radio,
  Ban,
  Check,
  Upload,
  Store,
  Lock,
  QrCode,
  AlertTriangle,
  Banknote,
  CreditCard,
  Copy,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { buildVietQrUrl, VIETQR_BANKS } from "@/lib/vietqr";
import { compressImageFile } from "@/lib/image-compress";
import type {
  Barber,
  BarberLiveStatus,
  BookingStatus,
  BookingWithDetails,
  LiveChairBarberInfo,
  PaymentMethod,
  PaymentQrMode,
  PaymentStatus,
  Service,
  TimeOff,
  WorkingHour,
} from "@/lib/types";
import {
  addDaysToDate,
  BOOKING_STATUS_META,
  formatDateVi,
  formatPhoneDisplay,
  formatVND,
  getShopNow,
  getWeekdayNameVi,
  HAIR_TECH_TAGS,
  isValidVietnamesePhone,
  minutesToTime,
  PHONE_ERROR_MESSAGE,
  sanitizePhoneInput,
} from "@/lib/utils";

interface Props {
  initialBarbers: Barber[];
  initialServices: Service[];
  initialWorkingHours: WorkingHour[];
  initialTimeOffs: TimeOff[];
  initialSettings: {
    name: string;
    tagline: string;
    address: string;
    phone: string;
    slot_interval_minutes: number;
    payment_qr_mode: PaymentQrMode;
    payment_bank_bin: string | null;
    payment_account_no: string | null;
    payment_account_name: string | null;
    payment_qr_url: string | null;
    payment_note: string | null;
    sepay_api_key: string | null;
  };
  today: string;
  currentTime: string;
}

type AdminTab = "today" | "schedule" | "services" | "barbers" | "settings";

export function AdminDashboardClient({
  initialBarbers,
  initialServices,
  initialWorkingHours,
  initialTimeOffs,
  initialSettings,
  today,
  currentTime,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("today");

  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [workingHours, setWorkingHours] =
    useState<WorkingHour[]>(initialWorkingHours);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>(initialTimeOffs);

  // Today Board state
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [liveChairByBarber, setLiveChairByBarber] = useState<
    Record<number, LiveChairBarberInfo>
  >({});
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Walk-in Modal state
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInPhoneError, setWalkInPhoneError] = useState<string | null>(null);
  const [walkInServiceIds, setWalkInServiceIds] = useState<number[]>(
    initialServices[0] ? [initialServices[0].id] : []
  );
  const [walkInBarberId, setWalkInBarberId] = useState<number>(
    initialBarbers[0]?.id ?? 1
  );
  const [walkInTime, setWalkInTime] = useState(currentTime);
  const [walkInStatus, setWalkInStatus] = useState<
    "in_progress" | "arrived" | "confirmed"
  >("in_progress");
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);

  // Hair Passport Modal state
  const [passportBooking, setPassportBooking] =
    useState<BookingWithDetails | null>(null);
  const [styleName, setStyleName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [techNote, setTechNote] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPassport, setSavingPassport] = useState(false);

  // New Service form
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcDesc, setNewSvcDesc] = useState("");
  const [newSvcDuration, setNewSvcDuration] = useState(30);
  const [newSvcPrice, setNewSvcPrice] = useState(120000);
  const [savingSvc, setSavingSvc] = useState(false);

  // New Barber form
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberTitle, setNewBarberTitle] = useState("Senior Barber");
  const [newBarberSpecialty, setNewBarberSpecialty] = useState(
    "Skin Fade · Textured Crop"
  );
  const [newBarberBio, setNewBarberBio] = useState("");
  const [savingBarber, setSavingBarber] = useState(false);

  // New Time-off form
  const [offDate, setOffDate] = useState(today);
  const [offBarberId, setOffBarberId] = useState<string>("all");

  // Shop Settings state
  const [shopName, setShopName] = useState(initialSettings.name);
  const [shopTagline, setShopTagline] = useState(initialSettings.tagline);
  const [shopAddress, setShopAddress] = useState(initialSettings.address);
  const [shopPhone, setShopPhone] = useState(initialSettings.phone);
  const [shopPhoneError, setShopPhoneError] = useState<string | null>(null);
  const [slotInterval, setSlotInterval] = useState<string>(
    String(initialSettings.slot_interval_minutes)
  );
  const [slotIntervalError, setSlotIntervalError] = useState<string | null>(
    null
  );
  const [paymentQrMode, setPaymentQrMode] = useState<PaymentQrMode>(
    initialSettings.payment_qr_mode
  );
  const [paymentBankBin, setPaymentBankBin] = useState<string>(
    initialSettings.payment_bank_bin ?? ""
  );
  const [paymentAccountNo, setPaymentAccountNo] = useState<string>(
    initialSettings.payment_account_no ?? ""
  );
  const [paymentAccountName, setPaymentAccountName] = useState<string>(
    initialSettings.payment_account_name ?? ""
  );
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(
    initialSettings.payment_qr_url
  );
  const [paymentNote, setPaymentNote] = useState<string>(
    initialSettings.payment_note ?? ""
  );
  const [sepayApiKey, setSepayApiKey] = useState<string>(
    initialSettings.sepay_api_key ?? ""
  );
  const [savingSepay, setSavingSepay] = useState(false);
  const [webhookOrigin, setWebhookOrigin] = useState<string>("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin PIN state
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [savingPin, setSavingPin] = useState(false);
  const [offWholeDay, setOffWholeDay] = useState(true);
  const [offStart, setOffStart] = useState("12:00");
  const [offEnd, setOffEnd] = useState("14:00");
  const [offReason, setOffReason] = useState("Nghỉ đột xuất");
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Confirm Delete / Reset Modal state
  const [confirmAction, setConfirmAction] = useState<
    | { type: "service"; service: Service }
    | { type: "barber"; barber: Barber }
    | { type: "reset_demo"; includeServices: boolean }
    | null
  >(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = useCallback(async (date: string) => {
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/bookings?date=${date}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const json = await res.json();
      setBookings(json.bookings ?? []);
    } finally {
      setLoadingBookings(false);
    }
  }, [router]);

  const refreshLiveChair = useCallback(async () => {
    try {
      const res = await fetch("/api/live-chair", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const map: Record<number, LiveChairBarberInfo> = {};
      for (const b of (json.barbers ?? []) as LiveChairBarberInfo[]) {
        map[b.id] = b;
      }
      setLiveChairByBarber(map);
    } catch {
      // ignore
    }
  }, []);

  const refreshBarbers = useCallback(async () => {
    const [barbersRes] = await Promise.all([
      fetch("/api/admin/barbers", { cache: "no-store" }),
      refreshLiveChair(),
    ]);
    if (barbersRes.ok) {
      const json = await barbersRes.json();
      setBarbers(json.barbers ?? []);
    }
  }, [refreshLiveChair]);

  useEffect(() => {
    setWebhookOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetchBookings(selectedDate);
  }, [selectedDate, fetchBookings]);

  useEffect(() => {
    refreshLiveChair();
    const pollIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshLiveChair();
      }
    };
    const id = setInterval(pollIfVisible, 60000);
    document.addEventListener("visibilitychange", pollIfVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", pollIfVisible);
    };
  }, [refreshLiveChair]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  };

  // Update barber Live Chair status directly
  const handleSetBarberStatus = async (
    barberId: number,
    status: BarberLiveStatus,
    addMinutes?: number
  ) => {
    const nowMinutes = getShopNow().minutes;
    const estimated_free_at =
      status === "busy" && addMinutes
        ? minutesToTime(nowMinutes + addMinutes)
        : status === "busy"
          ? minutesToTime(nowMinutes + 30)
          : null;

    const res = await fetch("/api/admin/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: barberId,
        current_status: status,
        estimated_free_at,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setBarbers((prev) =>
        prev.map((b) => (b.id === barberId ? json.barber : b))
      );
      await refreshLiveChair();
      showToast(
        status === "available"
          ? "Live Chair: Đã chuyển sang ĐANG TRỐNG"
          : status === "busy"
            ? `Live Chair: ĐANG CẮT (dự kiến xong ${estimated_free_at})`
            : "Live Chair: Đã chuyển sang TẠM NGHỈ"
      );
    }
  };

  // Progress booking status
  const handleUpdateBookingStatus = async (
    booking: BookingWithDetails,
    status: BookingStatus
  ) => {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await Promise.all([fetchBookings(selectedDate), refreshBarbers()]);
      const released =
        status === "no_show" || status === "cancelled" || status === "completed";
      showToast(
        released
          ? `${booking.customer_name} → ${
              BOOKING_STATUS_META[status]?.label ?? status
            } (Đã nhả lịch & trống ghế)`
          : `Đã cập nhật ${booking.customer_name} → ${
              BOOKING_STATUS_META[status]?.label ?? status
            }`
      );
    }
  };

  // Manual payment confirmation / undo
  const handleUpdatePayment = async (
    booking: BookingWithDetails,
    paymentStatus: PaymentStatus,
    paymentMethod?: PaymentMethod
  ) => {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_status: paymentStatus,
        payment_method: paymentStatus === "paid" ? paymentMethod ?? "cash" : null,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, ...json.booking } : b
        )
      );
      showToast(
        paymentStatus === "paid"
          ? `Đã xác nhận thanh toán (${
              paymentMethod === "transfer" ? "Chuyển khoản" : "Tiền mặt"
            }) — ${booking.customer_name}`
          : `Đã chuyển về Chưa thanh toán — ${booking.customer_name}`
      );
    }
  };

  const handleSaveSepayKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSepay(true);
    try {
      const parsedInterval = Math.min(
        120,
        Math.max(5, Number(slotInterval) || 30)
      );
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName.trim() || initialSettings.name,
          tagline: shopTagline.trim(),
          address: shopAddress.trim() || initialSettings.address,
          phone: isValidVietnamesePhone(shopPhone)
            ? shopPhone.trim()
            : initialSettings.phone,
          slot_interval_minutes: parsedInterval,
          sepay_api_key: sepayApiKey.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Không thể lưu API Key SePay.");
        return;
      }
      setSepayApiKey(json.settings.sepay_api_key ?? "");
      showToast(
        json.settings.sepay_api_key
          ? "Đã lưu API Key Webhook SePay!"
          : "Đã tắt Webhook SePay."
      );
    } finally {
      setSavingSepay(false);
    }
  };

  // Create Walk-in booking
  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (walkInServiceIds.length === 0) return;
    if (!isValidVietnamesePhone(walkInPhone)) {
      setWalkInPhoneError(PHONE_ERROR_MESSAGE);
      return;
    }
    setWalkInPhoneError(null);
    setWalkInSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: walkInName.trim() || "Khách vãng lai",
          customer_phone: walkInPhone.trim(),
          service_ids: walkInServiceIds,
          barber_id: walkInBarberId,
          date: selectedDate,
          start_time: walkInTime,
          source: "walk_in",
          initial_status: walkInStatus,
          note: "Khách ghé trực tiếp tại tiệm",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Không thể thêm khách vãng lai.");
        return;
      }
      setShowWalkIn(false);
      setWalkInName("");
      setWalkInPhone("");
      await Promise.all([fetchBookings(selectedDate), refreshBarbers()]);
      showToast("Đã thêm khách vãng lai & cập nhật lịch trống.");
    } finally {
      setWalkInSubmitting(false);
    }
  };

  // Open Hair Passport modal for a booking
  const openPassportModal = (bk: BookingWithDetails) => {
    setPassportBooking(bk);
    setStyleName(bk.latest_hair_record?.style_name ?? "");
    setSelectedTags(bk.latest_hair_record?.tags ?? []);
    setTechNote("");
    setPhotoUrls([]);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const optimized = await compressImageFile(file, {
        maxDimension: 900,
        quality: 0.78,
      });
      const fd = new FormData();
      fd.append("file", optimized);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        setPhotoUrls((prev) => [...prev, json.url]);
      } else {
        showToast(json.error || "Tải ảnh thất bại.");
      }
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleSaveHairRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passportBooking || !styleName.trim()) return;
    setSavingPassport(true);
    try {
      const res = await fetch("/api/hair-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: passportBooking.customer_id,
          booking_id: passportBooking.id,
          barber_id: passportBooking.barber_id,
          style_name: styleName.trim(),
          tags: selectedTags,
          technical_note: techNote.trim(),
          photo_urls: photoUrls,
          service_ids: passportBooking.service_ids,
          cut_date: passportBooking.date,
        }),
      });
      if (res.ok) {
        setPassportBooking(null);
        await fetchBookings(selectedDate);
        showToast("Đã lưu Hồ sơ kiểu tóc cho khách!");
      } else {
        const j = await res.json();
        showToast(j.error || "Không thể lưu hồ sơ.");
      }
    } finally {
      setSavingPassport(false);
    }
  };

  // Add Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSvcName.trim()) return;
    setSavingSvc(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSvcName.trim(),
          description: newSvcDesc.trim(),
          duration_minutes: Number(newSvcDuration),
          price: Number(newSvcPrice),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setServices((prev) => [...prev, json.service]);
        setNewSvcName("");
        setNewSvcDesc("");
        showToast("Đã thêm dịch vụ mới.");
      }
    } finally {
      setSavingSvc(false);
    }
  };

  const handleToggleService = async (svc: Service) => {
    const res = await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: svc.id, is_active: !svc.is_active }),
    });
    if (res.ok) {
      const json = await res.json();
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? json.service : s))
      );
      showToast(
        json.service.is_active
          ? `Đã bật dịch vụ "${svc.name}"`
          : `Đã ẩn dịch vụ "${svc.name}"`
      );
    }
  };

  // Add Barber
  const handleAddBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarberName.trim()) return;
    setSavingBarber(true);
    try {
      const res = await fetch("/api/admin/barbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBarberName.trim(),
          title: newBarberTitle.trim() || "Barber Stylist",
          specialty: newBarberSpecialty.trim(),
          bio: newBarberBio.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setBarbers((prev) => [...prev, json.barber]);
        setNewBarberName("");
        setNewBarberBio("");
        showToast(
          `Đã thêm thợ ${json.barber.name}! Trang đặt lịch sẽ tự động hiện bước Chọn Thợ.`
        );
      }
    } finally {
      setSavingBarber(false);
    }
  };

  const handleToggleBarberActive = async (barber: Barber) => {
    const res = await fetch("/api/admin/barbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: barber.id, is_active: !barber.is_active }),
    });
    if (res.ok) {
      const json = await res.json();
      setBarbers((prev) =>
        prev.map((b) => (b.id === barber.id ? json.barber : b))
      );
      showToast("Đã cập nhật trạng thái hoạt động của thợ.");
    }
  };

  // Working Hours & Time-offs
  const handleSaveWorkingHours = async () => {
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ working_hours: workingHours }),
      });
      if (res.ok) {
        const json = await res.json();
        setWorkingHours(json.working_hours);
        showToast("Đã lưu giờ mở cửa tiệm.");
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barber_id: offBarberId === "all" ? null : Number(offBarberId),
          date: offDate,
          start_time: offWholeDay ? null : offStart,
          end_time: offWholeDay ? null : offEnd,
          reason: offReason.trim() || "Nghỉ đột xuất",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setTimeOffs(json.time_offs);
        showToast("Đã khóa khung giờ nghỉ.");
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteTimeOff = async (id: number) => {
    const res = await fetch(`/api/admin/schedule?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const json = await res.json();
      setTimeOffs(json.time_offs);
      showToast("Đã xóa lịch nghỉ.");
    }
  };

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidVietnamesePhone(shopPhone)) {
      setShopPhoneError(PHONE_ERROR_MESSAGE);
      return;
    }
    const parsedInterval = Number(slotInterval);
    if (
      !Number.isInteger(parsedInterval) ||
      parsedInterval < 5 ||
      parsedInterval > 120
    ) {
      setSlotIntervalError("Bước nhảy phải từ 5 đến 120 phút.");
      return;
    }
    setShopPhoneError(null);
    setSlotIntervalError(null);
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName.trim(),
          tagline: shopTagline.trim(),
          address: shopAddress.trim(),
          phone: shopPhone.trim(),
          slot_interval_minutes: parsedInterval,
          payment_qr_mode: paymentQrMode,
          payment_bank_bin: paymentBankBin || null,
          payment_account_no: paymentAccountNo.trim() || null,
          payment_account_name: paymentAccountName.trim() || null,
          payment_qr_url: paymentQrUrl,
          payment_note: paymentNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Không thể lưu cài đặt tiệm.");
        return;
      }
      setShopName(json.settings.name);
      setShopTagline(json.settings.tagline);
      setShopAddress(json.settings.address);
      setShopPhone(json.settings.phone);
      setSlotInterval(String(json.settings.slot_interval_minutes));
      showToast("Đã lưu thông tin tiệm & hotline!");
    } finally {
      setSavingSettings(false);
    }
  };

  const persistQrSettings = async (
    overrides: {
      mode?: PaymentQrMode;
      bankBin?: string;
      accountNo?: string;
      accountName?: string;
      qrUrl?: string | null;
      note?: string;
    },
    successMsg: string
  ) => {
    const nextMode = overrides.mode ?? paymentQrMode;
    const nextBankBin = overrides.bankBin ?? paymentBankBin;
    const nextAccountNo = (overrides.accountNo ?? paymentAccountNo).trim();
    const nextAccountName = (overrides.accountName ?? paymentAccountName).trim();
    const nextQrUrl =
      overrides.qrUrl !== undefined ? overrides.qrUrl : paymentQrUrl;
    const nextNote = overrides.note ?? paymentNote;

    if (nextMode === "vietqr" && (!nextBankBin || !nextAccountNo)) {
      showToast("Vui lòng chọn Ngân hàng và nhập Số tài khoản.");
      return;
    }

    setSavingQr(true);
    try {
      const parsedInterval = Math.min(
        120,
        Math.max(5, Number(slotInterval) || 30)
      );
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName.trim() || initialSettings.name,
          tagline: shopTagline.trim(),
          address: shopAddress.trim() || initialSettings.address,
          phone: isValidVietnamesePhone(shopPhone)
            ? shopPhone.trim()
            : initialSettings.phone,
          slot_interval_minutes: parsedInterval,
          payment_qr_mode: nextMode,
          payment_bank_bin: nextBankBin || null,
          payment_account_no: nextAccountNo || null,
          payment_account_name: nextAccountName || null,
          payment_qr_url: nextQrUrl,
          payment_note: nextNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Không thể lưu cấu hình mã QR.");
        return;
      }
      setPaymentQrMode(json.settings.payment_qr_mode);
      setPaymentBankBin(json.settings.payment_bank_bin ?? "");
      setPaymentAccountNo(json.settings.payment_account_no ?? "");
      setPaymentAccountName(json.settings.payment_account_name ?? "");
      setPaymentQrUrl(json.settings.payment_qr_url);
      setPaymentNote(json.settings.payment_note ?? "");
      showToast(successMsg);
    } finally {
      setSavingQr(false);
    }
  };

  const handleUploadQrImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const optimized = await compressImageFile(file, {
        maxDimension: 720,
        quality: 0.85,
      });
      const fd = new FormData();
      fd.append("file", optimized);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) {
        showToast(json.error || "Tải ảnh QR thất bại.");
        return;
      }
      setPaymentQrUrl(json.url);
      setPaymentQrMode("image");
      await persistQrSettings(
        { mode: "image", qrUrl: json.url },
        "Đã tải lên & lưu ảnh mã QR chuyển khoản!"
      );
    } finally {
      setUploadingQr(false);
      e.target.value = "";
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4,8}$/.test(newPin)) {
      setPinError("Mã PIN mới phải gồm 4 đến 8 chữ số.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Mã PIN xác nhận không khớp.");
      return;
    }
    if (!isValidVietnamesePhone(shopPhone)) {
      setPinError("Vui lòng đảm bảo số Hotline bên cạnh hợp lệ trước khi lưu.");
      return;
    }
    setSavingPin(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName.trim(),
          tagline: shopTagline.trim(),
          address: shopAddress.trim(),
          phone: shopPhone.trim(),
          slot_interval_minutes: Math.min(120, Math.max(5, Number(slotInterval) || 30)),
          new_pin: newPin,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPinError(json.error || "Không thể đổi mã PIN.");
        return;
      }
      setNewPin("");
      setConfirmPin("");
      showToast("Đã cập nhật mã PIN quản trị mới!");
    } finally {
      setSavingPin(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction.type === "service") {
        const res = await fetch(
          `/api/admin/services?id=${confirmAction.service.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const j = await res.json();
          showToast(j.error || "Không thể xóa dịch vụ.");
          return;
        }
        setServices((prev) =>
          prev.filter((s) => s.id !== confirmAction.service.id)
        );
        setWalkInServiceIds((prev) =>
          prev.filter((id) => id !== confirmAction.service.id)
        );
        showToast(`Đã xóa dịch vụ "${confirmAction.service.name}".`);
      } else if (confirmAction.type === "barber") {
        const res = await fetch(
          `/api/admin/barbers?id=${confirmAction.barber.id}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const j = await res.json();
          showToast(j.error || "Không thể xóa thợ.");
          return;
        }
        setBarbers((prev) =>
          prev.filter((b) => b.id !== confirmAction.barber.id)
        );
        await Promise.all([fetchBookings(selectedDate), refreshLiveChair()]);
        showToast(`Đã xóa thợ "${confirmAction.barber.name}".`);
      } else if (confirmAction.type === "reset_demo") {
        const res = await fetch("/api/admin/reset-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includeServices: confirmAction.includeServices,
          }),
        });
        if (!res.ok) {
          const j = await res.json();
          showToast(j.error || "Không thể dọn dữ liệu.");
          return;
        }
        setBookings([]);
        setTimeOffs([]);
        if (confirmAction.includeServices) {
          setServices([]);
          setWalkInServiceIds([]);
        }
        await refreshLiveChair();
        showToast(
          confirmAction.includeServices
            ? "Đã xóa sạch khách, lịch hẹn, hồ sơ tóc & dịch vụ mẫu!"
            : "Đã xóa sạch khách, lịch hẹn & hồ sơ tóc mẫu!"
        );
      }
      setConfirmAction(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Summary metrics for selected date
  const activeBookings = bookings.filter(
    (b) => !["cancelled", "no_show"].includes(b.status)
  );
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const estimatedRevenue = activeBookings.reduce(
    (sum, b) => sum + b.total_price,
    0
  );
  const collectedRevenue = bookings
    .filter((b) => b.payment_status === "paid" && b.status !== "cancelled")
    .reduce((sum, b) => sum + b.total_price, 0);
  const paidCount = bookings.filter(
    (b) => b.payment_status === "paid" && b.status !== "cancelled"
  ).length;
  const activeBarbers = barbers.filter((b) => b.is_active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-gold/40 bg-charcoal px-4 py-3 text-xs font-medium text-ivory shadow-2xl shadow-black/80">
          <CheckCircle2 className="h-4 w-4 text-gold" />
          {toast}
        </div>
      )}

      {/* Top Admin Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
            Ken Barbershop · Bảng Điều Khiển
          </span>
          <h1 className="font-serif text-2xl font-bold text-ivory sm:text-3xl">
            Quản Lý Lịch Hẹn & Ghế Trực Tiếp
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWalkIn(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-obsidian shadow-lg shadow-gold/15 transition hover:bg-gold-light sm:text-sm"
          >
            <UserPlus className="h-4 w-4" />
            Khách vãng lai
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3.5 py-2.5 text-xs font-medium text-muted hover:text-ivory"
          >
            <LogOut className="h-4 w-4" />
            Thoát
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "today" as const, label: "Lịch hôm nay", icon: Calendar },
          { id: "schedule" as const, label: "Giờ mở cửa & Nghỉ", icon: Clock },
          { id: "services" as const, label: "Dịch vụ", icon: Scissors },
          {
            id: "barbers" as const,
            label: `Thợ (${activeBarbers.length})`,
            icon: Users,
          },
          { id: "settings" as const, label: "Cài đặt tiệm", icon: Store },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${tab === id
              ? "border-gold bg-gold/15 text-gold-light"
              : "border-border-subtle bg-charcoal text-muted hover:text-ivory"
              }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: TODAY BOARD */}
      {tab === "today" && (
        <div className="space-y-6">
          {/* Live Chair Quick Switcher */}
          <div className="card-classic rounded-2xl p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                <Radio className="h-4 w-4" />
                Điều Khiển Trạng Thái Ghế Trực Tiếp (Live Chair)
              </h2>
              <span className="text-[11px] text-muted">
                Tự động bật Đang cắt khi đến giờ hẹn · Cập nhật lên trang chủ
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {activeBarbers.map((barber) => {
                const liveInfo = liveChairByBarber[barber.id];
                const effectiveStatus =
                  liveInfo?.current_status ?? barber.current_status;
                const estFree =
                  liveInfo?.estimated_free_at ?? barber.estimated_free_at;
                const autoRange = liveInfo?.auto_busy_range ?? null;

                return (
                <div
                  key={barber.id}
                  className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-obsidian/70 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-base font-semibold text-ivory">
                          {barber.name}
                        </span>
                        {autoRange && (
                          <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                            Tự động theo lịch {autoRange}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {effectiveStatus === "available"
                          ? "Đang hiển thị: Ghế trống"
                          : effectiveStatus === "busy"
                            ? `Đang cắt · Dự kiến trống ${estFree || "sớm"}`
                            : "Đang hiển thị: Tạm nghỉ"}
                      </div>
                    </div>
                    <span
                      className={`h-3 w-3 rounded-full ${effectiveStatus === "available"
                        ? "bg-emerald-live"
                        : effectiveStatus === "busy"
                          ? "bg-amber-live"
                          : "bg-zinc-500"
                        }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSetBarberStatus(barber.id, "available")
                      }
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${effectiveStatus === "available"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : "border-border-subtle bg-surface text-muted hover:text-ivory"
                        }`}
                    >
                      Đang trống
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSetBarberStatus(barber.id, "busy", 30)
                      }
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${effectiveStatus === "busy"
                        ? "border-amber-400 bg-amber-500/20 text-amber-200"
                        : "border-border-subtle bg-surface text-muted hover:text-ivory"
                        }`}
                    >
                      Đang cắt (~30p)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetBarberStatus(barber.id, "off")}
                      className={`rounded-lg border py-2 text-xs font-semibold transition ${effectiveStatus === "off"
                        ? "border-zinc-500 bg-zinc-700/40 text-zinc-200"
                        : "border-border-subtle bg-surface text-muted hover:text-ivory"
                        }`}
                    >
                      Tạm nghỉ
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-4">
              <div className="text-xs text-muted">Lịch hoạt động</div>
              <div className="mt-1 font-serif text-2xl font-bold text-ivory">
                {activeBookings.length}
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-4">
              <div className="text-xs text-muted">Đã hoàn thành</div>
              <div className="mt-1 font-serif text-2xl font-bold text-emerald-300">
                {completedBookings.length}
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-4">
              <div className="text-xs text-muted">Đã thu ({paidCount} đơn)</div>
              <div className="mt-1 font-serif text-2xl font-bold text-emerald-300">
                {formatVND(collectedRevenue)}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                Dự kiến: {formatVND(estimatedRevenue)}
              </div>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-4">
              <div className="text-xs text-muted">Ngày đang xem</div>
              <div className="mt-1 text-sm font-semibold text-ivory">
                {formatDateVi(selectedDate, today)}
              </div>
            </div>
          </div>

          {/* Date Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${selectedDate === today
                  ? "border-gold bg-gold text-obsidian"
                  : "border-border-subtle bg-charcoal text-ivory"
                  }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysToDate(today, 1))}
                className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${selectedDate === addDaysToDate(today, 1)
                  ? "border-gold bg-gold text-obsidian"
                  : "border-border-subtle bg-charcoal text-ivory"
                  }`}
              >
                Ngày mai
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-border-subtle bg-charcoal px-3 py-1.5 text-xs text-ivory focus:border-gold focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => fetchBookings(selectedDate)}
              className="text-xs text-gold-light hover:underline"
            >
              Làm mới danh sách
            </button>
          </div>

          {/* Bookings List */}
          {loadingBookings ? (
            <div className="flex items-center justify-center py-14 text-sm text-muted">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-gold" />
              Đang tải lịch hẹn...
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-charcoal p-10 text-center space-y-3">
              <p className="text-sm text-muted">
                Chưa có lịch hẹn nào cho ngày {formatDateVi(selectedDate, today)}.
              </p>
              <button
                type="button"
                onClick={() => setShowWalkIn(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold-light"
              >
                <Plus className="h-4 w-4" />
                Thêm khách vãng lai
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((bk) => {
                const meta = BOOKING_STATUS_META[bk.status];
                return (
                  <div
                    key={bk.id}
                    className="card-classic rounded-2xl p-4 sm:p-5 space-y-3.5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-3.5">
                        <div className="rounded-xl border border-gold/25 bg-obsidian px-3 py-2 text-center shrink-0">
                          <div className="font-mono text-base font-bold text-gold-light">
                            {bk.start_time}
                          </div>
                          <div className="text-[10px] text-muted">
                            → {bk.end_time}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-serif text-lg font-bold text-ivory">
                              {bk.customer_name}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${meta?.colorClass}`}
                            >
                              {meta?.label}
                            </span>
                            {bk.source === "walk_in" && (
                              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">
                                Vãng lai
                              </span>
                            )}
                            {bk.status !== "cancelled" && bk.status !== "no_show" && (
                              bk.payment_status === "paid" ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Đã thanh toán ·{" "}
                                  {bk.payment_method === "transfer"
                                    ? "Chuyển khoản"
                                    : "Tiền mặt"}
                                  {bk.payment_ref &&
                                    !bk.payment_ref.startsWith("MANUAL-") && (
                                      <span className="ml-0.5 opacity-80">
                                        (Auto)
                                      </span>
                                    )}
                                </span>
                              ) : (
                                <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                                  Chưa thanh toán
                                </span>
                              )
                            )}
                          </div>
                          <div className="text-xs text-muted">
                            SĐT:{" "}
                            <strong className="text-ivory/90">
                              {formatPhoneDisplay(bk.customer_phone)}
                            </strong>{" "}
                            · Mã: <span className="font-mono">{bk.code}</span> ·
                            Thợ: {bk.barber_name}
                          </div>
                          <div className="text-sm text-ivory/90">
                            {bk.service_names.join(" + ")}{" "}
                            <span className="font-semibold text-gold-light">
                              · {formatVND(bk.total_price)}
                            </span>
                          </div>
                          {bk.note && (
                            <p className="text-xs italic text-amber-200/80">
                              Ghi chú: &ldquo;{bk.note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Hair Passport quick action */}
                      <button
                        type="button"
                        onClick={() => openPassportModal(bk)}
                        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold-light transition hover:bg-gold hover:text-obsidian"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Lưu Hồ sơ tóc
                      </button>
                    </div>

                    {/* Customer's latest Hair Passport cheat-sheet for the barber! */}
                    {bk.latest_hair_record && (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-obsidian/65 p-3 text-xs">
                        {bk.latest_hair_record.photo_urls[0] && (
                          <img
                            src={bk.latest_hair_record.photo_urls[0]}
                            alt={bk.latest_hair_record.style_name}
                            className="h-11 w-11 rounded-lg object-cover border border-gold/25"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-gold-light font-semibold">
                            <Sparkles className="h-3.5 w-3.5" />
                            Hồ sơ lần trước ({bk.latest_hair_record.cut_date}):{" "}
                            {bk.latest_hair_record.style_name}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-muted">
                            {bk.latest_hair_record.tags.join(" · ")}
                            {bk.latest_hair_record.technical_note
                              ? ` — ${bk.latest_hair_record.technical_note}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!["completed", "cancelled", "no_show"].includes(bk.status) && (
                      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                        {bk.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBookingStatus(bk, "arrived")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Khách đã đến
                          </button>
                        )}
                        {(bk.status === "confirmed" || bk.status === "arrived") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBookingStatus(bk, "in_progress")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Bắt đầu cắt (Bật Busy)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBookingStatus(bk, "completed")
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Hoàn thành (Trống ghế)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBookingStatus(bk, "no_show")
                          }
                          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Không đến
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateBookingStatus(bk, "cancelled")
                          }
                          className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-ivory"
                        >
                          Hủy
                        </button>
                      </div>
                    )}

                    {/* Manual Payment Confirmation Bar (works both during and after haircut) */}
                    {!["cancelled", "no_show"].includes(bk.status) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5">
                        {bk.payment_status === "paid" ? (
                          <>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Đã thu {formatVND(bk.total_price)} (
                              {bk.payment_method === "transfer"
                                ? "Chuyển khoản"
                                : "Tiền mặt"}
                              )
                              {bk.payment_ref &&
                                !bk.payment_ref.startsWith("MANUAL-") && (
                                  <span className="font-mono text-[11px] text-muted">
                                    · Ref: {bk.payment_ref}
                                  </span>
                                )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePayment(bk, "unpaid")}
                              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 px-2.5 py-1 text-[11px] text-muted hover:text-ivory"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Hoàn tác chưa thu
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-muted">
                              Xác nhận thu tiền ({formatVND(bk.total_price)}):
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdatePayment(bk, "paid", "cash")
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                              >
                                <Banknote className="h-3.5 w-3.5" />
                                Đã nhận tiền mặt
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdatePayment(bk, "paid", "transfer")
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold hover:text-obsidian"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Đã nhận chuyển khoản
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WORKING HOURS & TIME-OFFS */}
      {tab === "schedule" && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="card-classic rounded-2xl p-5 space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-ivory">
                Giờ Mở Cửa Hàng Tuần
              </h2>
              <button
                type="button"
                disabled={savingSchedule}
                onClick={handleSaveWorkingHours}
                className="rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-obsidian hover:bg-gold-light disabled:opacity-50"
              >
                Lưu thay đổi
              </button>
            </div>

            <div className="space-y-2.5">
              {workingHours.map((wh, idx) => (
                <div
                  key={wh.day_of_week}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-obsidian/60 px-3.5 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-[155px]">
                    <ToggleSwitch
                      checked={wh.is_open}
                      ariaLabel={`Mở cửa ${getWeekdayNameVi(wh.day_of_week)}`}
                      onChange={() => {
                        const copy = [...workingHours];
                        copy[idx] = { ...wh, is_open: !wh.is_open };
                        setWorkingHours(copy);
                      }}
                    />
                    <span className={wh.is_open ? "text-ivory" : "text-muted"}>
                      {getWeekdayNameVi(wh.day_of_week)}
                    </span>
                  </div>

                  {wh.is_open ? (
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="time"
                        value={wh.open_time}
                        onChange={(e) => {
                          const copy = [...workingHours];
                          copy[idx] = { ...wh, open_time: e.target.value };
                          setWorkingHours(copy);
                        }}
                        className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-ivory"
                      />
                      <span className="text-muted">đến</span>
                      <input
                        type="time"
                        value={wh.close_time}
                        onChange={(e) => {
                          const copy = [...workingHours];
                          copy[idx] = { ...wh, close_time: e.target.value };
                          setWorkingHours(copy);
                        }}
                        className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-ivory"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">Nghỉ cả ngày</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <form
              onSubmit={handleAddTimeOff}
              className="card-classic rounded-2xl p-5 space-y-3.5"
            >
              <h2 className="font-serif text-xl font-bold text-ivory">
                Khóa Lịch / Nghỉ Đột Xuất
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-muted">Ngày</label>
                  <input
                    type="date"
                    value={offDate}
                    onChange={(e) => setOffDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-xs text-ivory"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Áp dụng cho</label>
                  <select
                    value={offBarberId}
                    onChange={(e) => setOffBarberId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-xs text-ivory"
                  >
                    <option value="all">Toàn bộ tiệm</option>
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        Thợ: {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-obsidian/60 px-3 py-2 text-xs text-ivory/90">
                <span>Nghỉ cả ngày</span>
                <ToggleSwitch
                  checked={offWholeDay}
                  ariaLabel="Nghỉ cả ngày"
                  onChange={() => setOffWholeDay((v) => !v)}
                />
              </div>

              {!offWholeDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted">Từ giờ</label>
                    <input
                      type="time"
                      value={offStart}
                      onChange={(e) => setOffStart(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-xs text-ivory"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Đến giờ</label>
                    <input
                      type="time"
                      value={offEnd}
                      onChange={(e) => setOffEnd(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-xs text-ivory"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted">Lý do</label>
                <input
                  type="text"
                  value={offReason}
                  onChange={(e) => setOffReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-xs text-ivory"
                />
              </div>

              <button
                type="submit"
                disabled={savingSchedule}
                className="w-full rounded-xl bg-gold py-2.5 text-xs font-semibold text-obsidian hover:bg-gold-light"
              >
                Thêm lịch khóa
              </button>
            </form>

            <div className="rounded-2xl border border-border-subtle bg-charcoal p-4 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">
                Lịch nghỉ sắp tới ({timeOffs.length})
              </h3>
              {timeOffs.length === 0 ? (
                <p className="text-xs text-muted">Chưa có lịch nghỉ đột xuất nào.</p>
              ) : (
                timeOffs.map((off) => (
                  <div
                    key={off.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-obsidian/60 px-3 py-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ivory">
                        {off.date}{" "}
                        {off.start_time
                          ? `(${off.start_time}–${off.end_time})`
                          : "(Cả ngày)"}
                      </div>
                      <div className="text-muted">
                        {off.barber_name ? `Thợ: ${off.barber_name}` : "Cả tiệm"} ·{" "}
                        {off.reason}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTimeOff(off.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div >
      )
}

{/* TAB 3: SERVICES */ }
{
  tab === "services" && (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-3 lg:col-span-7">
        {services.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-charcoal p-8 text-center text-sm text-muted">
            Chưa có dịch vụ nào. Hãy thêm dịch vụ thật của tiệm ở khung bên cạnh.
          </div>
        ) : (
          services.map((svc) => (
            <div
              key={svc.id}
              className={`card-classic flex items-center justify-between gap-4 rounded-2xl p-4 transition-opacity ${
                svc.is_active ? "opacity-100" : "opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-semibold text-ivory">
                    {svc.name}
                  </span>
                  {!svc.is_active && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                      Đang ẩn
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {svc.duration_minutes} phút ·{" "}
                  <strong className="text-gold-light">
                    {formatVND(svc.price)}
                  </strong>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={svc.is_active}
                  label={svc.is_active ? "Bật" : "Tắt"}
                  ariaLabel={`Bật tắt dịch vụ ${svc.name}`}
                  onChange={() => handleToggleService(svc)}
                />
                <button
                  type="button"
                  title="Xóa dịch vụ"
                  aria-label={`Xóa dịch vụ ${svc.name}`}
                  onClick={() =>
                    setConfirmAction({ type: "service", service: svc })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleAddService}
        className="card-classic h-fit rounded-2xl p-5 space-y-3.5 lg:col-span-5"
      >
        <h2 className="font-serif text-xl font-bold text-ivory">
          Thêm Dịch Vụ Mới
        </h2>
        <div>
          <label className="text-xs text-muted">Tên dịch vụ / Combo</label>
          <input
            type="text"
            required
            value={newSvcName}
            onChange={(e) => setNewSvcName(e.target.value)}
            placeholder="VD: Gội đầu dưỡng sinh & Massage"
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2.5 text-sm text-ivory"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Mô tả ngắn</label>
          <textarea
            rows={2}
            value={newSvcDesc}
            onChange={(e) => setNewSvcDesc(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted">Thời lượng (phút)</label>
            <input
              type="number"
              min={10}
              step={5}
              value={newSvcDuration}
              onChange={(e) => setNewSvcDuration(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Giá (VNĐ)</label>
            <input
              type="number"
              min={0}
              step={10000}
              value={newSvcPrice}
              onChange={(e) => setNewSvcPrice(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={savingSvc}
          className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-obsidian hover:bg-gold-light"
        >
          Thêm dịch vụ
        </button>
      </form>
    </div>
  )
}

{/* TAB 4: BARBERS (Multi-barber ready!) */ }
{
  tab === "barbers" && (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <div className="rounded-2xl border border-gold/25 bg-gold/10 p-4 text-xs leading-relaxed text-ivory/90">
          <strong className="text-gold-light">Chế độ mở rộng thợ thông minh:</strong>{" "}
          Hiện có <strong>{activeBarbers.length} thợ</strong> đang hoạt động.
          {activeBarbers.length === 1
            ? " Khi chỉ có 1 thợ, trang đặt lịch tự động ẩn bước Chọn Thợ để khách đặt nhanh nhất. Ngay khi bạn thêm thợ thứ 2, bước Chọn Thợ sẽ tự động kích hoạt!"
            : " Đang bật bước Chọn Thợ (kèm tùy chọn Thợ trống sớm nhất) trên trang đặt lịch."}
        </div>

        {barbers.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-charcoal p-8 text-center text-sm text-muted">
            Chưa có thợ nào. Hãy thêm thợ đầu tiên của tiệm ở khung bên cạnh để bắt đầu nhận lịch.
          </div>
        ) : (
          barbers.map((b) => (
            <div
              key={b.id}
              className={`card-classic flex items-start justify-between gap-4 rounded-2xl p-5 transition-opacity ${
                b.is_active ? "opacity-100" : "opacity-60"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-lg font-bold text-gold-light">
                  {b.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-ivory">
                    {b.name}
                  </h3>
                  <p className="text-xs text-gold/90">{b.title}</p>
                  <p className="mt-1 text-xs text-muted">{b.specialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={b.is_active}
                  label={b.is_active ? "Hoạt động" : "Tạm ngưng"}
                  ariaLabel={`Bật tắt thợ ${b.name}`}
                  onChange={() => handleToggleBarberActive(b)}
                />
                <button
                  type="button"
                  title="Xóa thợ"
                  aria-label={`Xóa thợ ${b.name}`}
                  onClick={() =>
                    setConfirmAction({ type: "barber", barber: b })
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-400 hover:border-red-400/60 hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleAddBarber}
        className="card-classic h-fit rounded-2xl p-5 space-y-3.5 lg:col-span-5"
      >
        <h2 className="font-serif text-xl font-bold text-ivory">
          Thêm Thợ Mới
        </h2>
        <div>
          <label className="text-xs text-muted">Tên thợ</label>
          <input
            type="text"
            required
            value={newBarberName}
            onChange={(e) => setNewBarberName(e.target.value)}
            placeholder="VD: Minh Trần"
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2.5 text-sm text-ivory"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Chức danh</label>
          <input
            type="text"
            value={newBarberTitle}
            onChange={(e) => setNewBarberTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2.5 text-sm text-ivory"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Sở trường</label>
          <input
            type="text"
            value={newBarberSpecialty}
            onChange={(e) => setNewBarberSpecialty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2.5 text-sm text-ivory"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Giới thiệu ngắn</label>
          <textarea
            rows={2}
            value={newBarberBio}
            onChange={(e) => setNewBarberBio(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
          />
        </div>
        <button
          type="submit"
          disabled={savingBarber}
          className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-obsidian hover:bg-gold-light"
        >
          Thêm thợ vào tiệm
        </button>
      </form>
    </div>
  )
}

{/* TAB 5: SHOP SETTINGS */}
{tab === "settings" && (
  <div className="grid gap-6 lg:grid-cols-12">
    <form
      onSubmit={handleSaveShopSettings}
      className="card-classic rounded-2xl p-5 sm:p-6 space-y-4 lg:col-span-7"
    >
      <div>
        <h2 className="font-serif text-xl font-bold text-ivory">
          Thông Tin Tiệm & Hotline
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Tự động cập nhật lên Trang chủ, Vé lịch hẹn và link Google Calendar.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">Tên tiệm</label>
        <input
          type="text"
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          placeholder="Ken Barbershop"
          className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">Slogan / Mô tả ngắn</label>
        <input
          type="text"
          value={shopTagline}
          onChange={(e) => setShopTagline(e.target.value)}
          placeholder="Nghệ thuật cắt tóc quý ông..."
          className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">Địa chỉ tiệm</label>
        <input
          type="text"
          required
          value={shopAddress}
          onChange={(e) => setShopAddress(e.target.value)}
          placeholder="128 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh"
          className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">Hotline tiệm</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            required
            value={shopPhone}
            onChange={(e) => {
              const next = sanitizePhoneInput(e.target.value);
              setShopPhone(next);
              if (shopPhoneError && isValidVietnamesePhone(next)) {
                setShopPhoneError(null);
              }
            }}
            onBlur={() => {
              if (shopPhone && !isValidVietnamesePhone(shopPhone)) {
                setShopPhoneError(PHONE_ERROR_MESSAGE);
              }
            }}
            placeholder="0909888666"
            className={`w-full rounded-xl border bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:outline-none ${
              shopPhoneError
                ? "border-red-500/70 focus:border-red-400"
                : "border-border-subtle focus:border-gold"
            }`}
          />
          {shopPhoneError ? (
            <p className="text-[11px] text-red-400">{shopPhoneError}</p>
          ) : (
            <p className="text-[11px] text-muted">
              Hiển thị: {formatPhoneDisplay(shopPhone) || "..."}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">
            Bước nhảy khung giờ đặt lịch
          </label>
          <div
            className={`flex items-center gap-2 rounded-xl border bg-obsidian px-3.5 py-2.5 transition-colors ${
              slotIntervalError
                ? "border-red-500/70 focus-within:border-red-400"
                : "border-border-subtle focus-within:border-gold"
            }`}
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              required
              value={slotInterval}
              onChange={(e) => {
                setSlotInterval(e.target.value.replace(/\D/g, "").slice(0, 3));
                if (slotIntervalError) setSlotIntervalError(null);
              }}
              placeholder="30"
              className="w-full min-w-0 bg-transparent text-sm text-ivory placeholder:text-muted/50 focus:outline-none"
            />
            <span className="shrink-0 text-xs text-muted">phút</span>
          </div>
          {slotIntervalError ? (
            <p className="text-[11px] text-red-400">{slotIntervalError}</p>
          ) : (
            <p className="text-[11px] text-muted">
              {(() => {
                const n = Number(slotInterval);
                if (!Number.isInteger(n) || n < 5 || n > 120) {
                  return "Nhập số nguyên từ 5 đến 120 phút";
                }
                const samples = [0, 1, 2, 3].map((i) =>
                  minutesToTime(9 * 60 + i * n)
                );
                return `VD: ${samples.join(", ")}...`;
              })()}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={savingSettings}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-obsidian hover:bg-gold-light disabled:opacity-50"
      >
        {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
        Lưu cài đặt tiệm
      </button>
    </form>

    <div className="space-y-6 lg:col-span-5">
      {/* Payment QR Card */}
      <div className="card-classic rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
            <QrCode className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-ivory">
              Mã QR Chuyển Khoản
            </h2>
            <p className="text-xs text-muted">
              Hiển thị trực tiếp trên vé lịch hẹn của khách
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border-subtle bg-obsidian/70 p-1">
          {(
            [
              { id: "vietqr" as const, label: "VietQR tự động" },
              { id: "image" as const, label: "Ảnh QR tải lên" },
              { id: "off" as const, label: "Tắt QR" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentQrMode(m.id)}
              className={`rounded-lg py-2 text-[11px] font-semibold transition ${
                paymentQrMode === m.id
                  ? "bg-gold text-obsidian shadow"
                  : "text-muted hover:text-ivory"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Mode 1: Dynamic VietQR (auto-fills amount & transfer memo!) */}
        {paymentQrMode === "vietqr" && (
          <div className="space-y-3">
            <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-200">
              Quét bằng app Ngân hàng, MoMo hoặc ZaloPay sẽ{" "}
              <strong>tự động điền sẵn số tiền &amp; mã lịch hẹn</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Ngân hàng <span className="text-gold">*</span>
              </label>
              <select
                value={paymentBankBin}
                onChange={(e) => setPaymentBankBin(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
              >
                <option value="">-- Chọn ngân hàng --</option>
                {VIETQR_BANKS.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name} ({bank.shortName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Số tài khoản <span className="text-gold">*</span>
              </label>
              <input
                type="text"
                value={paymentAccountNo}
                onChange={(e) =>
                  setPaymentAccountNo(e.target.value.replace(/\s+/g, ""))
                }
                placeholder="VD: 0123456789"
                className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 font-mono text-sm text-ivory focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Tên chủ tài khoản (không dấu)
              </label>
              <input
                type="text"
                value={paymentAccountName}
                onChange={(e) =>
                  setPaymentAccountName(e.target.value.toUpperCase())
                }
                placeholder="VD: NGUYEN VAN KEN"
                className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm uppercase text-ivory focus:border-gold focus:outline-none"
              />
            </div>

            {paymentBankBin && paymentAccountNo.trim().length >= 4 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-gold/20 bg-obsidian/70 p-3.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-light">
                  Xem trước VietQR mẫu (150.000đ · KEN DEMO)
                </span>
                <div className="rounded-xl bg-white p-2 shadow-md">
                  <img
                    src={buildVietQrUrl({
                      bankBin: paymentBankBin,
                      accountNo: paymentAccountNo,
                      accountName: paymentAccountName,
                      amount: 150000,
                      addInfo: "KEN DEMO",
                    })}
                    alt="Xem trước mã VietQR"
                    className="h-44 w-44 object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Static Uploaded QR Image */}
        {paymentQrMode === "image" && (
          <>
            {paymentQrUrl ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/20 bg-obsidian/70 p-4">
                <div className="rounded-xl bg-white p-2.5 shadow-md">
                  <img
                    src={paymentQrUrl}
                    alt="Mã QR chuyển khoản"
                    className="h-44 w-44 object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold-light hover:bg-gold hover:text-obsidian">
                    {uploadingQr ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Đổi ảnh QR
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleUploadQrImage}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={savingQr}
                    onClick={() =>
                      persistQrSettings(
                        { qrUrl: null },
                        "Đã xóa ảnh mã QR."
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-red-500/35 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa QR
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/35 bg-obsidian/60 px-4 py-8 text-center transition hover:border-gold hover:bg-gold/5">
                {uploadingQr ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                ) : (
                  <Upload className="h-6 w-6 text-gold" />
                )}
                <div className="text-xs font-semibold text-ivory">
                  Tải ảnh mã QR ngân hàng / ví điện tử
                </div>
                <div className="text-[11px] text-muted">
                  Hỗ trợ JPG, PNG, WebP (tối đa 5MB)
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUploadQrImage}
                  className="hidden"
                />
              </label>
            )}
          </>
        )}

        {/* Mode 3: Off */}
        {paymentQrMode === "off" && (
          <div className="rounded-xl border border-border-subtle bg-obsidian/50 px-3.5 py-4 text-center text-xs text-muted">
            Khung mã QR chuyển khoản đang được tắt trên vé lịch hẹn của khách.
          </div>
        )}

        {paymentQrMode !== "off" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted">
              Ghi chú chuyển khoản (không bắt buộc)
            </label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="VD: Cọc trước hoặc thanh toán tại tiệm khi cắt xong"
              className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-xs text-ivory focus:border-gold focus:outline-none"
            />
          </div>
        )}

        <button
          type="button"
          disabled={savingQr}
          onClick={() =>
            persistQrSettings({}, "Đã lưu cấu hình mã QR chuyển khoản!")
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-xs font-semibold text-gold-light hover:bg-gold hover:text-obsidian disabled:opacity-40"
        >
          {savingQr && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Lưu cấu hình mã QR
        </button>
      </div>

      {/* Auto Bank Payment Confirmation (SePay Webhook) */}
      <form
        onSubmit={handleSaveSepayKey}
        className="card-classic rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-ivory">
              Tự Động Xác Nhận CK (SePay)
            </h2>
            <p className="text-xs text-muted">
              Ngân hàng báo nhận tiền → tự đánh dấu Đã thanh toán
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted">
            Webhook URL (dán vào SePay)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={
                webhookOrigin
                  ? `${webhookOrigin}/api/webhooks/sepay`
                  : "/api/webhooks/sepay"
              }
              className="w-full min-w-0 rounded-xl border border-border-subtle bg-obsidian px-3 py-2 font-mono text-[11px] text-ivory/90"
            />
            <button
              type="button"
              onClick={() => {
                const url = `${webhookOrigin || ""}/api/webhooks/sepay`;
                navigator.clipboard?.writeText(url);
                setCopiedWebhook(true);
                setTimeout(() => setCopiedWebhook(false), 1800);
              }}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold-light hover:bg-gold hover:text-obsidian"
            >
              {copiedWebhook ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedWebhook ? "Đã copy" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted">
              SePay API Key (Header Authorization: Apikey)
            </label>
            <button
              type="button"
              onClick={() => {
                const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
                let rand = "ken_";
                for (let i = 0; i < 24; i++) {
                  rand += chars[Math.floor(Math.random() * chars.length)];
                }
                setSepayApiKey(rand);
              }}
              className="text-[11px] font-medium text-gold-light hover:underline"
            >
              Tạo key ngẫu nhiên
            </button>
          </div>
          <input
            type="text"
            value={sepayApiKey}
            onChange={(e) => setSepayApiKey(e.target.value)}
            placeholder="Dán API Key trùng với cấu hình trên SePay..."
            className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 font-mono text-xs text-ivory focus:border-gold focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-white/5 bg-obsidian/60 p-3 text-[11px] leading-relaxed text-muted space-y-1">
          <p className="font-semibold text-ivory/90">Cách bật tự động trong 2 phút:</p>
          <p>1. Đăng ký tài khoản miễn phí tại <strong className="text-gold-light">sepay.vn</strong> và liên kết STK ngân hàng.</p>
          <p>2. Tạo Webhook mới → dán <strong>Webhook URL</strong> ở trên, chọn xác thực <strong>API Key</strong> và dán cùng chuỗi Key này.</p>
          <p>3. Khách quét mã VietQR chuyển đủ tiền kèm mã <code className="text-ivory">KEN XXXX</code> → web tự động đổi sang <strong>Đã thanh toán</strong>!</p>
        </div>

        <button
          type="submit"
          disabled={savingSepay}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-40"
        >
          {savingSepay && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Lưu cấu hình SePay
        </button>
      </form>

      {/* Change Admin PIN Card */}
      <form
        onSubmit={handleChangePin}
        className="card-classic h-fit rounded-2xl p-5 sm:p-6 space-y-4"
      >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
          <Lock className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold text-ivory">
            Đổi Mã PIN Quản Trị
          </h2>
          <p className="text-xs text-muted">
            Dùng để đăng nhập vào trang /admin
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">
          Mã PIN mới (4–8 chữ số)
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={newPin}
          onChange={(e) => {
            setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            if (pinError) setPinError(null);
          }}
          placeholder="Nhập mã PIN mới..."
          className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 font-mono text-sm tracking-widest text-ivory focus:border-gold focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">
          Xác nhận mã PIN mới
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={confirmPin}
          onChange={(e) => {
            setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            if (pinError) setPinError(null);
          }}
          placeholder="Nhập lại mã PIN mới..."
          className="w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 font-mono text-sm tracking-widest text-ivory focus:border-gold focus:outline-none"
        />
      </div>

      {pinError && <p className="text-xs text-red-400">{pinError}</p>}

      <button
        type="submit"
        disabled={savingPin || !newPin}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 py-2.5 text-sm font-semibold text-gold-light hover:bg-gold hover:text-obsidian disabled:opacity-40"
      >
        {savingPin && <Loader2 className="h-4 w-4 animate-spin" />}
        Cập nhật mã PIN
      </button>
    </form>

      {/* Clean Demo / Test Data Card */}
      <div className="rounded-2xl border border-red-500/25 bg-charcoal/90 p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-ivory">
              Dọn Dữ Liệu Mẫu / Test
            </h2>
            <p className="text-xs text-muted">
              Làm sạch lịch hẹn &amp; khách mẫu trước khi mở tiệm thật
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() =>
              setConfirmAction({ type: "reset_demo", includeServices: false })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa khách, lịch hẹn &amp; hồ sơ tóc mẫu
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmAction({ type: "reset_demo", includeServices: true })
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-obsidian py-2 text-xs font-medium text-red-300/90 hover:border-red-400/50 hover:bg-red-500/10"
          >
            Xóa luôn cả danh sách dịch vụ mẫu
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* MODAL: CONFIRM DELETE / RESET */}
{confirmAction && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="card-classic w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/15 text-red-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-ivory">
            {confirmAction.type === "service" && "Xác nhận xóa dịch vụ"}
            {confirmAction.type === "barber" && "Xác nhận xóa thợ"}
            {confirmAction.type === "reset_demo" && "Xác nhận dọn sạch dữ liệu"}
          </h3>
          <p className="text-xs leading-relaxed text-muted">
            {confirmAction.type === "service" && (
              <>
                Bạn chắc chắn muốn xóa dịch vụ{" "}
                <strong className="text-ivory">
                  {confirmAction.service.name}
                </strong>
                ? Hành động này không thể hoàn tác.
              </>
            )}
            {confirmAction.type === "barber" && (
              <>
                Bạn chắc chắn muốn xóa thợ{" "}
                <strong className="text-ivory">
                  {confirmAction.barber.name}
                </strong>
                ? Các lịch hẹn gắn với thợ này cũng sẽ bị xóa theo và không thể hoàn tác.
              </>
            )}
            {confirmAction.type === "reset_demo" && (
              <>
                Thao tác này sẽ xóa toàn bộ{" "}
                <strong className="text-ivory">
                  khách hàng, lịch hẹn, hồ sơ tóc, lịch nghỉ đột xuất
                  {confirmAction.includeServices ? " và toàn bộ dịch vụ" : ""}
                </strong>{" "}
                hiện có. Cài đặt tiệm, giờ mở cửa và tài khoản thợ vẫn được giữ nguyên.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          disabled={confirmLoading}
          onClick={() => setConfirmAction(null)}
          className="rounded-xl border border-border-subtle bg-surface px-4 py-2.5 text-xs font-medium text-ivory hover:border-gold/40"
        >
          Hủy bỏ
        </button>
        <button
          type="button"
          disabled={confirmLoading}
          onClick={handleConfirmAction}
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {confirmLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Xác nhận xóa
        </button>
      </div>
    </div>
  </div>
)}

{/* MODAL: ADD WALK-IN CUSTOMER */ }
{
  showWalkIn && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleCreateWalkIn}
        className="card-classic w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-ivory">
            Thêm Khách Vãng Lai (Walk-in)
          </h3>
          <button
            type="button"
            onClick={() => setShowWalkIn(false)}
            className="text-muted hover:text-ivory"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">Tên khách</label>
            <input
              type="text"
              required
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              placeholder="Anh Hùng"
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Số điện thoại</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              value={walkInPhone}
              onChange={(e) => {
                const next = sanitizePhoneInput(e.target.value);
                setWalkInPhone(next);
                if (walkInPhoneError && isValidVietnamesePhone(next)) {
                  setWalkInPhoneError(null);
                }
              }}
              onBlur={() => {
                if (walkInPhone && !isValidVietnamesePhone(walkInPhone)) {
                  setWalkInPhoneError(PHONE_ERROR_MESSAGE);
                }
              }}
              placeholder="0909123456"
              className={`mt-1 w-full rounded-xl border bg-obsidian px-3 py-2 text-sm text-ivory focus:outline-none ${
                walkInPhoneError
                  ? "border-red-500/70 focus:border-red-400"
                  : "border-border-subtle focus:border-gold"
              }`}
            />
            {walkInPhoneError && (
              <p className="mt-1 text-[11px] text-red-400">{walkInPhoneError}</p>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted">Chọn dịch vụ</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {services
              .filter((s) => s.is_active)
              .map((s) => {
                const active = walkInServiceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setWalkInServiceIds((prev) =>
                        prev.includes(s.id)
                          ? prev.filter((x) => x !== s.id)
                          : [...prev, s.id]
                      )
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${active
                      ? "border-gold bg-gold/20 text-gold-light"
                      : "border-border-subtle bg-obsidian text-muted"
                      }`}
                  >
                    {s.name} ({s.duration_minutes}p)
                  </button>
                );
              })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted">Giờ bắt đầu</label>
            <input
              type="time"
              value={walkInTime}
              onChange={(e) => setWalkInTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            />
          </div>
          <div>
            <label className="text-xs text-muted">Trạng thái ngay</label>
            <select
              value={walkInStatus}
              onChange={(e) =>
                setWalkInStatus(
                  e.target.value as "in_progress" | "arrived" | "confirmed"
                )
              }
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            >
              <option value="in_progress">Đang cắt ngay</option>
              <option value="arrived">Đang ngồi chờ</option>
              <option value="confirmed">Đặt giờ sau</option>
            </select>
          </div>
        </div>

        {activeBarbers.length > 1 && (
          <div>
            <label className="text-xs text-muted">Thợ phụ trách</label>
            <select
              value={walkInBarberId}
              onChange={(e) => setWalkInBarberId(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3 py-2 text-sm text-ivory"
            >
              {activeBarbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={walkInSubmitting || walkInServiceIds.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-obsidian hover:bg-gold-light disabled:opacity-50"
        >
          {walkInSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu khách vãng lai
        </button>
      </form>
    </div>
  )
}

{/* MODAL: SAVE HAIR PASSPORT RECORD */ }
{
  passportBooking && (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSaveHairRecord}
        className="card-classic my-auto w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gold">
              Lưu Hồ Sơ Kiểu Tóc (Hair Passport)
            </span>
            <h3 className="font-serif text-xl font-bold text-ivory">
              {passportBooking.customer_name} ·{" "}
              {formatPhoneDisplay(passportBooking.customer_phone)}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setPassportBooking(null)}
            className="text-muted hover:text-ivory"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            Tên kiểu tóc <span className="text-gold">*</span>
          </label>
          <input
            type="text"
            required
            value={styleName}
            onChange={(e) => setStyleName(e.target.value)}
            placeholder="VD: Mid Skin Fade · Textured Crop"
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            Chọn nhanh thông số kỹ thuật
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HAIR_TECH_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${active
                    ? "border-gold bg-gold/20 text-gold-light"
                    : "border-border-subtle bg-obsidian text-muted hover:text-ivory"
                    }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            Ghi chú công thức cho lần cắt sau
          </label>
          <textarea
            rows={3}
            value={techNote}
            onChange={(e) => setTechNote(e.target.value)}
            placeholder="VD: Hai bên fade sát #1.5, đỉnh để 5cm tỉa mỏng tạo texture, chú ý xoáy đỉnh bên phải..."
            className="mt-1 w-full rounded-xl border border-border-subtle bg-obsidian px-3.5 py-2.5 text-sm text-ivory focus:border-gold focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            Ảnh thành phẩm (lưu trực tiếp lên máy)
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {photoUrls.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gold/30">
                <img src={url} alt="Haircut" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setPhotoUrls((prev) => prev.filter((u) => u !== url))
                  }
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/40 bg-obsidian/70 text-[11px] text-gold-light hover:bg-gold/10">
              {uploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Tải ảnh</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadPhoto}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingPassport || !styleName.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-obsidian hover:bg-gold-light disabled:opacity-50"
        >
          {savingPassport ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Scissors className="h-4 w-4" />
          )}
          Lưu vào Hồ sơ kiểu tóc
        </button>
      </form>
    </div>
  )
}
    </div >
  );
}
