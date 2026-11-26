import { getDb } from "@/lib/db/client";
import type {
  Barber,
  BarberLiveStatus,
  Booking,
  BookingStatus,
  BookingWithDetails,
  Customer,
  HairRecord,
  LiveChairBarberInfo,
  LiveChairSummary,
  Service,
  ShopSettings,
  TimeOff,
  TimeSlot,
  WorkingHour,
} from "@/lib/types";
import {
  addDaysToDate,
  formatDateVi,
  getDayOfWeekFromDate,
  getShopNow,
  minutesToTime,
  safeJsonParse,
  timeToMinutes,
} from "@/lib/utils";
import type { Row } from "@libsql/client";

export function mapBarber(row: Row): Barber {
  return {
    id: Number(row.id),
    name: String(row.name),
    title: String(row.title),
    bio: String(row.bio ?? ""),
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    specialty: String(row.specialty ?? ""),
    is_active: Number(row.is_active) === 1,
    current_status: String(row.current_status) as BarberLiveStatus,
    estimated_free_at: row.estimated_free_at ? String(row.estimated_free_at) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function mapService(row: Row): Service {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    category: String(row.category ?? "Cắt & Tạo kiểu"),
    duration_minutes: Number(row.duration_minutes),
    price: Number(row.price),
    is_popular: Number(row.is_popular) === 1,
    is_active: Number(row.is_active) === 1,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export function mapCustomer(row: Row): Customer {
  return {
    id: Number(row.id),
    phone: String(row.phone),
    name: String(row.name),
    notes: row.notes ? String(row.notes) : null,
    last_barber_id: row.last_barber_id ? Number(row.last_barber_id) : null,
    last_service_ids: safeJsonParse<number[]>(row.last_service_ids, []),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mapBookingWithDetails(row: Row): BookingWithDetails {
  return {
    id: Number(row.id),
    code: String(row.code),
    customer_id: Number(row.customer_id),
    barber_id: Number(row.barber_id),
    date: String(row.date),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    total_duration: Number(row.total_duration),
    total_price: Number(row.total_price),
    service_ids: safeJsonParse<number[]>(row.service_ids, []),
    service_names: safeJsonParse<string[]>(row.service_names, []),
    status: String(row.status) as BookingStatus,
    source: String(row.source) as "online" | "walk_in",
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    customer_name: String(row.customer_name ?? ""),
    customer_phone: String(row.customer_phone ?? ""),
    barber_name: String(row.barber_name ?? ""),
    barber_title: String(row.barber_title ?? ""),
  };
}

export function mapHairRecord(row: Row): HairRecord {
  return {
    id: Number(row.id),
    customer_id: Number(row.customer_id),
    booking_id: row.booking_id ? Number(row.booking_id) : null,
    barber_id: row.barber_id ? Number(row.barber_id) : null,
    barber_name: row.barber_name ? String(row.barber_name) : undefined,
    style_name: String(row.style_name),
    tags: safeJsonParse<string[]>(row.tags, []),
    technical_note: String(row.technical_note ?? ""),
    photo_urls: safeJsonParse<string[]>(row.photo_urls, []),
    service_ids: safeJsonParse<number[]>(row.service_ids, []),
    cut_date: String(row.cut_date),
    created_at: String(row.created_at),
  };
}

export async function getShopSettings(): Promise<ShopSettings> {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM shop_settings WHERE id = 1");
  const r = res.rows[0];
  const rawMode = r.payment_qr_mode ? String(r.payment_qr_mode) : "vietqr";
  const paymentMode =
    rawMode === "image" || rawMode === "off" ? rawMode : "vietqr";

  return {
    id: Number(r.id),
    name: String(r.name),
    tagline: String(r.tagline),
    address: String(r.address),
    phone: String(r.phone),
    slot_interval_minutes: Number(r.slot_interval_minutes ?? 30),
    admin_pin: String(r.admin_pin ?? "1234"),
    payment_qr_mode: paymentMode,
    payment_bank_bin: r.payment_bank_bin ? String(r.payment_bank_bin) : null,
    payment_account_no: r.payment_account_no
      ? String(r.payment_account_no)
      : null,
    payment_account_name: r.payment_account_name
      ? String(r.payment_account_name)
      : null,
    payment_qr_url: r.payment_qr_url ? String(r.payment_qr_url) : null,
    payment_note: r.payment_note ? String(r.payment_note) : null,
  };
}

export async function getActiveBarbers(): Promise<Barber[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM barbers WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  return res.rows.map(mapBarber);
}

export async function getAllBarbers(): Promise<Barber[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM barbers ORDER BY is_active DESC, sort_order ASC, id ASC"
  );
  return res.rows.map(mapBarber);
}

export async function getActiveServices(): Promise<Service[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
  );
  return res.rows.map(mapService);
}

export async function getAllServices(): Promise<Service[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM services ORDER BY is_active DESC, sort_order ASC, id ASC"
  );
  return res.rows.map(mapService);
}

export async function getWorkingHours(): Promise<WorkingHour[]> {
  const db = await getDb();
  const res = await db.execute(
    "SELECT * FROM working_hours ORDER BY day_of_week ASC"
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    day_of_week: Number(r.day_of_week),
    is_open: Number(r.is_open) === 1,
    open_time: String(r.open_time),
    close_time: String(r.close_time),
  }));
}

export async function getTimeOffs(fromDate?: string): Promise<TimeOff[]> {
  const db = await getDb();
  const res = fromDate
    ? await db.execute({
        sql: `SELECT t.*, b.name as barber_name
              FROM time_offs t
              LEFT JOIN barbers b ON b.id = t.barber_id
              WHERE t.date >= ?
              ORDER BY t.date ASC, t.start_time ASC`,
        args: [fromDate],
      })
    : await db.execute(
        `SELECT t.*, b.name as barber_name
         FROM time_offs t
         LEFT JOIN barbers b ON b.id = t.barber_id
         ORDER BY t.date DESC, t.start_time ASC`
      );
  return res.rows.map((r) => ({
    id: Number(r.id),
    barber_id: r.barber_id ? Number(r.barber_id) : null,
    barber_name: r.barber_name ? String(r.barber_name) : null,
    date: String(r.date),
    start_time: r.start_time ? String(r.start_time) : null,
    end_time: r.end_time ? String(r.end_time) : null,
    reason: String(r.reason ?? ""),
    created_at: String(r.created_at),
  }));
}

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function getAvailableSlots(params: {
  date: string;
  durationMinutes: number;
  barberId?: number | "any";
  excludeBookingId?: number;
}): Promise<{
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  slots: TimeSlot[];
}> {
  const db = await getDb();
  const settings = await getShopSettings();
  const dow = getDayOfWeekFromDate(params.date);

  const whRes = await db.execute({
    sql: "SELECT * FROM working_hours WHERE day_of_week = ?",
    args: [dow],
  });

  if (whRes.rows.length === 0 || Number(whRes.rows[0].is_open) === 0) {
    return { isOpen: false, openTime: "08:30", closeTime: "20:30", slots: [] };
  }

  const openTime = String(whRes.rows[0].open_time);
  const closeTime = String(whRes.rows[0].close_time);
  const openMin = timeToMinutes(openTime);
  const closeMin = timeToMinutes(closeTime);
  const interval = settings.slot_interval_minutes || 30;
  const duration = Math.max(15, params.durationMinutes || 30);

  const activeBarbers = await getActiveBarbers();
  const targetBarbers =
    params.barberId && params.barberId !== "any"
      ? activeBarbers.filter((b) => b.id === params.barberId)
      : activeBarbers;

  if (targetBarbers.length === 0) {
    return { isOpen: true, openTime, closeTime, slots: [] };
  }

  // Fetch blocking bookings on that date (cancelled, no_show, and already completed bookings do not block future slots)
  const bookingsRes = await db.execute({
    sql: `SELECT id, barber_id, start_time, end_time
          FROM bookings
          WHERE date = ? AND status NOT IN ('cancelled', 'no_show', 'completed')`,
    args: [params.date],
  });

  const blockingBookings = bookingsRes.rows
    .filter((r) => !params.excludeBookingId || Number(r.id) !== params.excludeBookingId)
    .map((r) => ({
      barber_id: Number(r.barber_id),
      start: timeToMinutes(String(r.start_time)),
      end: timeToMinutes(String(r.end_time)),
    }));

  // Fetch time offs on that date
  const offRes = await db.execute({
    sql: "SELECT barber_id, start_time, end_time FROM time_offs WHERE date = ?",
    args: [params.date],
  });

  const timeOffs = offRes.rows.map((r) => ({
    barber_id: r.barber_id ? Number(r.barber_id) : null,
    start: r.start_time ? timeToMinutes(String(r.start_time)) : 0,
    end: r.end_time ? timeToMinutes(String(r.end_time)) : 24 * 60,
  }));

  const shopNow = getShopNow();
  const isToday = params.date === shopNow.date;
  const minStartToday = shopNow.minutes + 15; // 15m lead time

  const slots: TimeSlot[] = [];

  for (let start = openMin; start + duration <= closeMin; start += interval) {
    const end = start + duration;
    const isPast = isToday && start < minStartToday;

    const availableBarberIds: number[] = [];

    if (!isPast) {
      for (const barber of targetBarbers) {
        const blockedByOff = timeOffs.some(
          (off) =>
            (off.barber_id === null || off.barber_id === barber.id) &&
            intervalsOverlap(start, end, off.start, off.end)
        );
        if (blockedByOff) continue;

        const blockedByBooking = blockingBookings.some(
          (b) =>
            b.barber_id === barber.id &&
            intervalsOverlap(start, end, b.start, b.end)
        );
        if (blockedByBooking) continue;

        availableBarberIds.push(barber.id);
      }
    }

    const period: TimeSlot["period"] =
      start < 12 * 60 ? "morning" : start < 17 * 60 ? "afternoon" : "evening";

    slots.push({
      time: minutesToTime(start),
      end_time: minutesToTime(end),
      period,
      available: availableBarberIds.length > 0,
      available_barber_ids: availableBarberIds,
    });
  }

  return { isOpen: true, openTime, closeTime, slots };
}

export async function getQuickRebookSlots(params: {
  durationMinutes: number;
  barberId?: number | "any";
  limit?: number;
}): Promise<
  Array<{ date: string; date_label: string; time: string; barber_id: number }>
> {
  const today = getShopNow().date;
  const limit = params.limit ?? 4;
  const results: Array<{
    date: string;
    date_label: string;
    time: string;
    barber_id: number;
  }> = [];

  for (let offset = 0; offset < 7 && results.length < limit; offset++) {
    const date = addDaysToDate(today, offset);
    const { isOpen, slots } = await getAvailableSlots({
      date,
      durationMinutes: params.durationMinutes,
      barberId: params.barberId,
    });
    if (!isOpen) continue;

    for (const slot of slots) {
      if (!slot.available || slot.available_barber_ids.length === 0) continue;
      results.push({
        date,
        date_label: formatDateVi(date, today),
        time: slot.time,
        barber_id: slot.available_barber_ids[0],
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function getLiveChairSummary(): Promise<LiveChairSummary> {
  const db = await getDb();
  const now = getShopNow();
  const activeBarbers = await getActiveBarbers();

  const whRes = await db.execute({
    sql: "SELECT * FROM working_hours WHERE day_of_week = ?",
    args: [now.dayOfWeek],
  });

  const wh = whRes.rows[0];
  const openTime = wh ? String(wh.open_time) : "08:30";
  const closeTime = wh ? String(wh.close_time) : "20:30";
  const isDayOpen = wh ? Number(wh.is_open) === 1 : true;

  // Check time-offs for today (shop-wide + per-barber)
  const todayOffsRes = await db.execute({
    sql: "SELECT barber_id, start_time, end_time FROM time_offs WHERE date = ?",
    args: [now.date],
  });
  const todayOffs = todayOffsRes.rows.map((r) => ({
    barber_id: r.barber_id ? Number(r.barber_id) : null,
    start: r.start_time ? timeToMinutes(String(r.start_time)) : 0,
    end: r.end_time ? timeToMinutes(String(r.end_time)) : 24 * 60,
  }));

  const isShopOffNow = todayOffs.some(
    (off) => off.barber_id === null && now.minutes >= off.start && now.minutes < off.end
  );

  const withinHours =
    isDayOpen &&
    !isShopOffNow &&
    now.minutes >= timeToMinutes(openTime) &&
    now.minutes < timeToMinutes(closeTime);

  // Get today's active/waiting bookings
  const todayBookingsRes = await db.execute({
    sql: `SELECT * FROM bookings
          WHERE date = ? AND status IN ('confirmed', 'arrived', 'in_progress')
          ORDER BY start_time ASC`,
    args: [now.date],
  });
  const todayBookings: Booking[] = todayBookingsRes.rows.map((r) => ({
    id: Number(r.id),
    code: String(r.code),
    customer_id: Number(r.customer_id),
    barber_id: Number(r.barber_id),
    date: String(r.date),
    start_time: String(r.start_time),
    end_time: String(r.end_time),
    total_duration: Number(r.total_duration),
    total_price: Number(r.total_price),
    service_ids: safeJsonParse<number[]>(r.service_ids, []),
    service_names: safeJsonParse<string[]>(r.service_names, []),
    status: String(r.status) as BookingStatus,
    source: String(r.source) as "online" | "walk_in",
    note: r.note ? String(r.note) : null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));

  const barberInfos: LiveChairBarberInfo[] = [];

  for (const b of activeBarbers) {
    const bBookings = todayBookings.filter((bk) => bk.barber_id === b.id);
    const activeInProgress = bBookings.find(
      (bk) =>
        bk.status === "in_progress" &&
        now.minutes < timeToMinutes(bk.end_time)
    );
    const scheduledNow = bBookings.find(
      (bk) =>
        (bk.status === "confirmed" || bk.status === "arrived") &&
        now.minutes >= timeToMinutes(bk.start_time) &&
        now.minutes < timeToMinutes(bk.end_time)
    );
    const isBarberOffNow = todayOffs.some(
      (off) =>
        (off.barber_id === null || off.barber_id === b.id) &&
        now.minutes >= off.start &&
        now.minutes < off.end
    );

    const arrivedCount = bBookings.filter(
      (bk) =>
        bk.status === "arrived" &&
        bk.id !== scheduledNow?.id &&
        now.minutes < timeToMinutes(bk.end_time)
    ).length;

    // Helper: chain consecutive back-to-back bookings to report true next free time
    const resolveChainedFreeTime = (initialEndTime: string): string => {
      let endMin = timeToMinutes(initialEndTime);
      let extended = true;
      while (extended) {
        extended = false;
        for (const bk of bBookings) {
          const bkStart = timeToMinutes(bk.start_time);
          const bkEnd = timeToMinutes(bk.end_time);
          if (bkStart <= endMin && bkEnd > endMin) {
            endMin = bkEnd;
            extended = true;
          }
        }
      }
      return minutesToTime(endMin);
    };

    // Effective live status: manual 'off' / time-off > active in_progress (before end_time) > auto-busy by scheduled slot > manual busy (auto-expires at estimated_free_at)
    let effectiveStatus: BarberLiveStatus = b.current_status;
    let estimatedFree = b.estimated_free_at;
    let autoBusyRange: string | null = null;

    if (b.current_status === "off" || isBarberOffNow) {
      effectiveStatus = "off";
      estimatedFree = null;
    } else if (activeInProgress) {
      effectiveStatus = "busy";
      estimatedFree = resolveChainedFreeTime(activeInProgress.end_time);
    } else if (scheduledNow) {
      effectiveStatus = "busy";
      estimatedFree = resolveChainedFreeTime(scheduledNow.end_time);
      autoBusyRange = `${scheduledNow.start_time}–${scheduledNow.end_time}`;
    } else if (b.current_status === "busy") {
      // No active booking right now -> if estimated_free_at has passed (or is missing), auto-return to available
      if (!b.estimated_free_at || now.minutes >= timeToMinutes(b.estimated_free_at)) {
        effectiveStatus = "available";
        estimatedFree = null;
        await db.execute({
          sql: "UPDATE barbers SET current_status = 'available', estimated_free_at = NULL WHERE id = ? AND current_status = 'busy'",
          args: [b.id],
        });
      }
    }

    const { slots } = await getAvailableSlots({
      date: now.date,
      durationMinutes: 30,
      barberId: b.id,
    });
    const nextSlot = slots.find((s) => s.available)?.time ?? null;

    barberInfos.push({
      id: b.id,
      name: b.name,
      title: b.title,
      current_status: effectiveStatus,
      estimated_free_at: estimatedFree,
      waiting_count: arrivedCount,
      next_slot_today: nextSlot,
      auto_busy_range: autoBusyRange,
    });
  }

  const availableChairs = barberInfos.filter(
    (b) => b.current_status === "available"
  );
  const busyChairs = barberInfos.filter((b) => b.current_status === "busy");
  const totalWaiting = barberInfos.reduce((sum, b) => sum + b.waiting_count, 0);

  const earliestFree =
    busyChairs
      .map((b) => b.estimated_free_at)
      .filter((t): t is string => Boolean(t))
      .sort()[0] ??
    barberInfos
      .map((b) => b.next_slot_today)
      .filter((t): t is string => Boolean(t))
      .sort()[0] ??
    null;

  // Determine overall live messaging (adapts seamlessly for 1 barber vs multi-barber)
  let overallStatus: "available" | "busy" | "closed" = "closed";
  let headline = "";
  let subline = "";

  const anyBarberWorking = availableChairs.length > 0 || busyChairs.length > 0;

  if (!withinHours && !busyChairs.length) {
    overallStatus = "closed";
    headline = "Tiệm đang ngoài giờ phục vụ";
    subline = `Giờ mở cửa hôm nay: ${openTime} – ${closeTime} · Bạn vẫn có thể đặt lịch giữ chỗ trước.`;
  } else if (!anyBarberWorking) {
    overallStatus = "closed";
    headline = "Tiệm đang tạm nghỉ";
    subline = "Vui lòng chọn khung giờ trống ở ngày tiếp theo.";
  } else if (availableChairs.length > 0) {
    overallStatus = "available";
    if (activeBarbers.length === 1) {
      headline = `Ghế ${availableChairs[0].name} đang trống — Sẵn sàng phục vụ`;
      subline =
        totalWaiting > 0
          ? `Có ${totalWaiting} khách đang chờ · Đặt lịch để được ưu tiên đúng giờ.`
          : "Ghé tiệm cắt ngay hoặc đặt lịch giữ chỗ trong 15 giây.";
    } else {
      headline = `${availableChairs.length}/${activeBarbers.length} ghế đang trống — Cắt ngay không cần chờ`;
      subline =
        totalWaiting > 0
          ? `Hiện có ${totalWaiting} khách chờ tại tiệm.`
          : "Chọn thợ quen hoặc đặt khung giờ bạn muốn.";
    }
  } else {
    overallStatus = "busy";
    if (activeBarbers.length === 1) {
      headline = `${busyChairs[0].name} đang phục vụ khách`;
      const estText = earliestFree
        ? `Dự kiến trống ghế lúc ${earliestFree}`
        : "Đang cắt tại ghế";
      const waitText =
        totalWaiting > 0 ? ` · ${totalWaiting} khách đang chờ` : "";
      subline = `${estText}${waitText} · Đặt trước khung giờ kế tiếp để không phải đợi.`;
    } else {
      headline = `Tất cả ${activeBarbers.length} ghế đang phục vụ`;
      subline = earliestFree
        ? `Ghế trống dự kiến sớm nhất lúc ${earliestFree}${
            totalWaiting > 0 ? ` · ${totalWaiting} khách đang chờ` : ""
          }.`
        : "Đặt lịch trước để giữ khung giờ đẹp.";
    }
  }

  return {
    shop_open: withinHours,
    open_time: openTime,
    close_time: closeTime,
    overall_status: overallStatus,
    headline,
    subline,
    waiting_count: totalWaiting,
    active_barber_count: activeBarbers.length,
    available_chair_count: availableChairs.length,
    busy_chair_count: busyChairs.length,
    earliest_free_at: earliestFree,
    barbers: barberInfos,
    updated_at: new Date().toISOString(),
  };
}
