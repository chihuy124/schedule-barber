const SHOP_TZ = "Asia/Ho_Chi_Minh";

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export const PHONE_ERROR_MESSAGE =
  "Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số.";

export function sanitizePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s.-]/g, "");
}

export function formatPhoneDisplay(phone: string): string {
  const clean = normalizePhone(phone);
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return clean;
}

export function isValidVietnamesePhone(phone: string): boolean {
  const clean = normalizePhone(phone);
  return /^0\d{9}$/.test(clean);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getShopNow(): {
  date: string;
  time: string;
  minutes: number;
  dayOfWeek: number;
} {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");

  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  const dayOfWeek = getDayOfWeekFromDate(date);

  return {
    date,
    time,
    minutes: timeToMinutes(time),
    dayOfWeek,
  };
}

export function getDayOfWeekFromDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Use UTC noon to avoid local DST/timezone shifts
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export function addDaysToDate(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays, 12, 0, 0));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function diffDaysBetween(fromDate: string, toDate: string): number {
  const [y1, m1, d1] = fromDate.split("-").map(Number);
  const [y2, m2, d2] = toDate.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

const WEEKDAY_SHORT_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_FULL_VI = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export function formatDateVi(dateStr: string, todayStr?: string): string {
  const today = todayStr ?? getShopNow().date;
  const diff = diffDaysBetween(today, dateStr);
  const [, m, d] = dateStr.split("-");
  if (diff === 0) return `Hôm nay, ${d}/${m}`;
  if (diff === 1) return `Ngày mai, ${d}/${m}`;
  const dow = getDayOfWeekFromDate(dateStr);
  return `${WEEKDAY_FULL_VI[dow]}, ${d}/${m}`;
}

export function formatShortDayVi(dateStr: string, todayStr?: string): {
  weekday: string;
  dayNum: string;
  monthNum: string;
  isToday: boolean;
} {
  const today = todayStr ?? getShopNow().date;
  const diff = diffDaysBetween(today, dateStr);
  const [, m, d] = dateStr.split("-");
  const dow = getDayOfWeekFromDate(dateStr);
  return {
    weekday: diff === 0 ? "Hôm nay" : diff === 1 ? "Ngày mai" : WEEKDAY_SHORT_VI[dow],
    dayNum: d,
    monthNum: `Th${Number(m)}`,
    isToday: diff === 0,
  };
}

export function getWeekdayNameVi(dayOfWeek: number): string {
  return WEEKDAY_FULL_VI[dayOfWeek] ?? "";
}

export function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KEN-${suffix}`;
}

export function buildGoogleCalendarUrl(params: {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  details: string;
}): string {
  const cleanDate = params.date.replace(/-/g, "");
  const start = `${cleanDate}T${params.startTime.replace(":", "")}00`;
  const end = `${cleanDate}T${params.endTime.replace(":", "")}00`;
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates: `${start}/${end}`,
    ctz: SHOP_TZ,
    location: params.location,
    details: params.details,
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const BOOKING_STATUS_META: Record<
  string,
  { label: string; colorClass: string }
> = {
  confirmed: {
    label: "Đã đặt lịch",
    colorClass: "bg-gold/15 text-gold-light border-gold/30",
  },
  arrived: {
    label: "Đã đến tiệm",
    colorClass: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  },
  in_progress: {
    label: "Đang cắt",
    colorClass: "bg-amber-500/15 text-amber-300 border-amber-400/35",
  },
  completed: {
    label: "Hoàn thành",
    colorClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  },
  cancelled: {
    label: "Đã hủy",
    colorClass: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40",
  },
  no_show: {
    label: "Không đến",
    colorClass: "bg-red-500/15 text-red-300 border-red-400/30",
  },
};

export const HAIR_TECH_TAGS = [
  "Mid Fade",
  "Low Fade",
  "Skin Fade",
  "Taper Fade",
  "Side Part",
  "Textured Crop",
  "Mullet",
  "Undercut",
  "Tông đơ #1",
  "Tông đơ #1.5",
  "Tông đơ #2",
  "Chấn viền sắc",
  "Tỉa mỏng mái",
  "Để đỉnh dài",
  "Vuốt sáp tự nhiên",
];
