import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getActiveBarbers,
  getAvailableSlots,
  mapBookingWithDetails,
  mapHairRecord,
} from "@/lib/queries";
import {
  generateBookingCode,
  isValidVietnamesePhone,
  minutesToTime,
  normalizePhone,
  PHONE_ERROR_MESSAGE,
  timeToMinutes,
} from "@/lib/utils";
import type { HairRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const createBookingSchema = z.object({
  customer_name: z.string().trim().min(2, "Vui lòng nhập tên của bạn"),
  customer_phone: z.string().trim().min(1, PHONE_ERROR_MESSAGE),
  service_ids: z.array(z.number().int().positive()).min(1, "Vui lòng chọn ít nhất 1 dịch vụ"),
  barber_id: z.union([z.number().int().positive(), z.literal("any")]).optional().default("any"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Giờ bắt đầu không hợp lệ"),
  note: z.string().max(400).optional().nullable(),
  source: z.enum(["online", "walk_in"]).optional().default("online"),
  initial_status: z
    .enum(["confirmed", "arrived", "in_progress"])
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const barberId = searchParams.get("barberId");
    const search = searchParams.get("search")?.trim();

    const conditions: string[] = [];
    const args: Array<string | number> = [];

    if (date) {
      conditions.push("b.date = ?");
      args.push(date);
    }
    if (status && status !== "all") {
      conditions.push("b.status = ?");
      args.push(status);
    }
    if (barberId && barberId !== "all") {
      conditions.push("b.barber_id = ?");
      args.push(Number(barberId));
    }
    if (search) {
      conditions.push("(c.name LIKE ? OR c.phone LIKE ? OR b.code LIKE ?)");
      const q = `%${search}%`;
      args.push(q, q, q);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await db.execute({
      sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                   br.name as barber_name, br.title as barber_title
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            JOIN barbers br ON br.id = b.barber_id
            ${where}
            ORDER BY b.date ASC, b.start_time ASC`,
      args,
    });

    const bookings = res.rows.map(mapBookingWithDetails);

    // Attach latest hair record for each customer in the result set
    const customerIds = Array.from(new Set(bookings.map((b) => b.customer_id)));
    const latestByCustomer = new Map<number, HairRecord>();

    if (customerIds.length > 0) {
      const placeholders = customerIds.map(() => "?").join(",");
      const hrRes = await db.execute({
        sql: `SELECT hr.*, br.name as barber_name
              FROM hair_records hr
              LEFT JOIN barbers br ON br.id = hr.barber_id
              WHERE hr.customer_id IN (${placeholders})
              ORDER BY hr.cut_date DESC, hr.id DESC`,
        args: customerIds,
      });
      for (const row of hrRes.rows) {
        const rec = mapHairRecord(row);
        if (!latestByCustomer.has(rec.customer_id)) {
          latestByCustomer.set(rec.customer_id, rec);
        }
      }
    }

    const enriched = bookings.map((b) => ({
      ...b,
      latest_hair_record: latestByCustomer.get(b.customer_id) ?? null,
    }));

    return NextResponse.json({ bookings: enriched });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách lịch hẹn." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isAdmin = await isAdminAuthenticated();
    const source = data.source === "walk_in" && isAdmin ? "walk_in" : "online";

    const cleanPhone = normalizePhone(data.customer_phone);
    if (!isValidVietnamesePhone(cleanPhone)) {
      return NextResponse.json(
        { error: PHONE_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Load selected services
    const placeholders = data.service_ids.map(() => "?").join(",");
    const svcRes = await db.execute({
      sql: `SELECT * FROM services WHERE id IN (${placeholders}) AND is_active = 1`,
      args: data.service_ids,
    });

    if (svcRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Dịch vụ bạn chọn không còn hoạt động." },
        { status: 400 }
      );
    }

    const totalDuration = svcRes.rows.reduce(
      (sum, r) => sum + Number(r.duration_minutes),
      0
    );
    const totalPrice = svcRes.rows.reduce((sum, r) => sum + Number(r.price), 0);
    const serviceIds = svcRes.rows.map((r) => Number(r.id));
    const serviceNames = svcRes.rows.map((r) => String(r.name));

    const endTime = minutesToTime(timeToMinutes(data.start_time) + totalDuration);

    // Determine & validate barber availability
    let assignedBarberId: number;

    if (source === "walk_in") {
      const activeBarbers = await getActiveBarbers();
      if (activeBarbers.length === 0) {
        return NextResponse.json(
          { error: "Hiện chưa có thợ nào đang hoạt động." },
          { status: 400 }
        );
      }
      assignedBarberId =
        data.barber_id !== "any" ? data.barber_id : activeBarbers[0].id;
    } else {
      const availability = await getAvailableSlots({
        date: data.date,
        durationMinutes: totalDuration,
        barberId: data.barber_id,
      });

      const matchingSlot = availability.slots.find(
        (s) => s.time === data.start_time && s.available
      );

      if (!matchingSlot || matchingSlot.available_barber_ids.length === 0) {
        return NextResponse.json(
          {
            error:
              "Khung giờ này vừa có khách đặt hoặc không còn trống. Vui lòng chọn giờ khác.",
          },
          { status: 409 }
        );
      }

      assignedBarberId = matchingSlot.available_barber_ids[0];
    }

    // Upsert customer by normalized phone
    const existingCust = await db.execute({
      sql: "SELECT id FROM customers WHERE phone = ?",
      args: [cleanPhone],
    });

    let customerId: number;
    if (existingCust.rows.length > 0) {
      customerId = Number(existingCust.rows[0].id);
      await db.execute({
        sql: `UPDATE customers
              SET name = ?, last_barber_id = ?, last_service_ids = ?, updated_at = datetime('now')
              WHERE id = ?`,
        args: [
          data.customer_name,
          assignedBarberId,
          JSON.stringify(serviceIds),
          customerId,
        ],
      });
    } else {
      const insertCust = await db.execute({
        sql: `INSERT INTO customers (phone, name, last_barber_id, last_service_ids)
              VALUES (?, ?, ?, ?)`,
        args: [
          cleanPhone,
          data.customer_name,
          assignedBarberId,
          JSON.stringify(serviceIds),
        ],
      });
      customerId = Number(insertCust.lastInsertRowid);
    }

    // Generate unique booking code
    let code = generateBookingCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const check = await db.execute({
        sql: "SELECT id FROM bookings WHERE code = ?",
        args: [code],
      });
      if (check.rows.length === 0) break;
      code = generateBookingCode();
    }

    const initialStatus =
      source === "walk_in" && data.initial_status
        ? data.initial_status
        : "confirmed";

    const insertBooking = await db.execute({
      sql: `INSERT INTO bookings (
              code, customer_id, barber_id, date, start_time, end_time,
              total_duration, total_price, service_ids, service_names,
              status, source, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        customerId,
        assignedBarberId,
        data.date,
        data.start_time,
        endTime,
        totalDuration,
        totalPrice,
        JSON.stringify(serviceIds),
        JSON.stringify(serviceNames),
        initialStatus,
        source,
        data.note?.trim() || null,
      ],
    });

    const bookingId = Number(insertBooking.lastInsertRowid);

    // If walk-in starts immediately, mark barber busy on Live Chair
    if (initialStatus === "in_progress") {
      await db.execute({
        sql: "UPDATE barbers SET current_status = 'busy', estimated_free_at = ? WHERE id = ?",
        args: [endTime, assignedBarberId],
      });
    }

    const createdRes = await db.execute({
      sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                   br.name as barber_name, br.title as barber_title
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            JOIN barbers br ON br.id = b.barber_id
            WHERE b.id = ?`,
      args: [bookingId],
    });

    return NextResponse.json(
      { booking: mapBookingWithDetails(createdRes.rows[0]) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { error: "Đã có lỗi xảy ra khi đặt lịch. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
