import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAvailableSlots,
  getShopSettings,
  mapBookingWithDetails,
} from "@/lib/queries";
import { minutesToTime, timeToMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

const patchBookingSchema = z.object({
  status: z
    .enum([
      "confirmed",
      "arrived",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ])
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  barber_id: z.number().int().positive().optional(),
  note: z.string().max(400).optional().nullable(),
  payment_status: z.enum(["unpaid", "paid"]).optional(),
  payment_method: z.enum(["cash", "transfer"]).nullable().optional(),
});

async function findBookingByCodeOrId(codeOrId: string) {
  const db = await getDb();
  const isNumeric = /^\d+$/.test(codeOrId);
  const res = await db.execute({
    sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                 br.name as barber_name, br.title as barber_title
          FROM bookings b
          JOIN customers c ON c.id = b.customer_id
          JOIN barbers br ON br.id = b.barber_id
          WHERE ${isNumeric ? "b.id = ?" : "UPPER(b.code) = UPPER(?)"}`,
    args: [isNumeric ? Number(codeOrId) : codeOrId],
  });
  return res.rows[0] ? mapBookingWithDetails(res.rows[0]) : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const booking = await findBookingByCodeOrId(code);
    if (!booking) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch hẹn này." },
        { status: 404 }
      );
    }

    const settings = await getShopSettings();
    return NextResponse.json({
      booking,
      shop: {
        name: settings.name,
        address: settings.address,
        phone: settings.phone,
      },
    });
  } catch (error) {
    console.error("GET /api/bookings/[code] error:", error);
    return NextResponse.json(
      { error: "Không thể tải chi tiết lịch hẹn." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const existing = await findBookingByCodeOrId(code);
    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy lịch hẹn." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = patchBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu cập nhật không hợp lệ." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const isAdmin = await isAdminAuthenticated();

    // Non-admin can only cancel or reschedule confirmed bookings
    if (!isAdmin) {
      if (data.payment_status !== undefined || data.payment_method !== undefined) {
        return NextResponse.json(
          { error: "Chỉ quản trị viên mới có thể xác nhận thanh toán." },
          { status: 403 }
        );
      }
      if (data.status && data.status !== "cancelled") {
        return NextResponse.json(
          { error: "Bạn chỉ có thể hủy hoặc đổi giờ lịch hẹn." },
          { status: 403 }
        );
      }
      if (existing.status !== "confirmed") {
        return NextResponse.json(
          { error: "Lịch hẹn này không thể thay đổi ở trạng thái hiện tại." },
          { status: 400 }
        );
      }
    }

    const db = await getDb();
    let newDate = existing.date;
    let newStart = existing.start_time;
    let newEnd = existing.end_time;
    let newBarberId = existing.barber_id;
    const newStatus = data.status ?? existing.status;

    const isRescheduling = Boolean(data.date || data.start_time || data.barber_id);
    if (isRescheduling) {
      newDate = data.date ?? existing.date;
      newStart = data.start_time ?? existing.start_time;
      newBarberId = data.barber_id ?? existing.barber_id;
      newEnd = minutesToTime(timeToMinutes(newStart) + existing.total_duration);

      const availability = await getAvailableSlots({
        date: newDate,
        durationMinutes: existing.total_duration,
        barberId: newBarberId,
        excludeBookingId: existing.id,
      });

      const match = availability.slots.find(
        (s) => s.time === newStart && s.available
      );
      if (!match) {
        return NextResponse.json(
          { error: "Khung giờ mới không còn trống. Vui lòng chọn giờ khác." },
          { status: 409 }
        );
      }
    }

    const nextPaymentStatus = data.payment_status ?? existing.payment_status;
    let nextPaymentMethod = existing.payment_method;
    let nextPaidAt = existing.paid_at;
    let nextPaymentRef = existing.payment_ref;

    if (data.payment_status === "paid") {
      nextPaymentMethod = data.payment_method ?? existing.payment_method ?? "cash";
      nextPaidAt = existing.paid_at ?? new Date().toISOString();
      if (!nextPaymentRef) {
        nextPaymentRef = nextPaymentMethod === "cash" ? "MANUAL-CASH" : "MANUAL-TRANSFER";
      }
    } else if (data.payment_status === "unpaid") {
      nextPaymentMethod = null;
      nextPaidAt = null;
      nextPaymentRef = null;
    }

    await db.execute({
      sql: `UPDATE bookings
            SET date = ?, start_time = ?, end_time = ?, barber_id = ?,
                status = ?, note = ?,
                payment_status = ?, payment_method = ?, paid_at = ?, payment_ref = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        newDate,
        newStart,
        newEnd,
        newBarberId,
        newStatus,
        data.note !== undefined ? data.note : existing.note,
        nextPaymentStatus,
        nextPaymentMethod,
        nextPaidAt,
        nextPaymentRef,
        existing.id,
      ],
    });

    // Sync barber live chair status automatically when admin progresses booking
    if (isAdmin && data.status) {
      if (data.status === "in_progress") {
        await db.execute({
          sql: "UPDATE barbers SET current_status = 'busy', estimated_free_at = ? WHERE id = ?",
          args: [newEnd, newBarberId],
        });
      } else if (
        data.status === "completed" ||
        data.status === "cancelled" ||
        data.status === "no_show"
      ) {
        // If barber has no other in_progress booking, set back to available
        const otherInProgress = await db.execute({
          sql: "SELECT end_time FROM bookings WHERE barber_id = ? AND status = 'in_progress' AND id != ? LIMIT 1",
          args: [newBarberId, existing.id],
        });
        if (otherInProgress.rows.length === 0) {
          await db.execute({
            sql: "UPDATE barbers SET current_status = 'available', estimated_free_at = NULL WHERE id = ? AND current_status = 'busy'",
            args: [newBarberId],
          });
        }
      }
    }

    const updated = await findBookingByCodeOrId(String(existing.id));
    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("PATCH /api/bookings/[code] error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật lịch hẹn." },
      { status: 500 }
    );
  }
}
