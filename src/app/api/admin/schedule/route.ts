import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getTimeOffs, getWorkingHours } from "@/lib/queries";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

const updateHoursSchema = z.object({
  working_hours: z.array(
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      is_open: z.boolean(),
      open_time: z.string().regex(/^\d{2}:\d{2}$/),
      close_time: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ),
});

const createTimeOffSchema = z.object({
  barber_id: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reason: z.string().trim().max(200).optional().default("Nghỉ đột xuất"),
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [working_hours, time_offs] = await Promise.all([
    getWorkingHours(),
    getTimeOffs(getShopNow().date),
  ]);
  return NextResponse.json({ working_hours, time_offs });
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = updateHoursSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu giờ mở cửa không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    for (const wh of parsed.data.working_hours) {
      await db.execute({
        sql: `UPDATE working_hours
              SET is_open = ?, open_time = ?, close_time = ?
              WHERE day_of_week = ?`,
        args: [wh.is_open ? 1 : 0, wh.open_time, wh.close_time, wh.day_of_week],
      });
    }

    const updated = await getWorkingHours();
    return NextResponse.json({ working_hours: updated });
  } catch (error) {
    console.error("PATCH /api/admin/schedule error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật giờ làm việc." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createTimeOffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Thông tin lịch nghỉ không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const d = parsed.data;
    await db.execute({
      sql: `INSERT INTO time_offs (barber_id, date, start_time, end_time, reason)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        d.barber_id ?? null,
        d.date,
        d.start_time ?? null,
        d.end_time ?? null,
        d.reason,
      ],
    });

    const time_offs = await getTimeOffs(getShopNow().date);
    return NextResponse.json({ time_offs }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/schedule error:", error);
    return NextResponse.json(
      { error: "Không thể thêm lịch nghỉ." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID." }, { status: 400 });
    }
    const db = await getDb();
    await db.execute({ sql: "DELETE FROM time_offs WHERE id = ?", args: [id] });
    const time_offs = await getTimeOffs(getShopNow().date);
    return NextResponse.json({ time_offs });
  } catch (error) {
    console.error("DELETE /api/admin/schedule error:", error);
    return NextResponse.json(
      { error: "Không thể xóa lịch nghỉ." },
      { status: 500 }
    );
  }
}
