import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { mapHairRecord } from "@/lib/queries";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

const createHairRecordSchema = z.object({
  customer_id: z.number().int().positive(),
  booking_id: z.number().int().positive().optional().nullable(),
  barber_id: z.number().int().positive().optional().nullable(),
  style_name: z.string().trim().min(2, "Vui lòng nhập tên kiểu tóc"),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  technical_note: z.string().trim().max(1000).optional().default(""),
  photo_urls: z.array(z.string().trim().min(1)).optional().default([]),
  service_ids: z.array(z.number().int().positive()).optional().default([]),
  cut_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createHairRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const db = await getDb();
    const cutDate = d.cut_date || getShopNow().date;

    const res = await db.execute({
      sql: `INSERT INTO hair_records (
              customer_id, booking_id, barber_id, style_name, tags,
              technical_note, photo_urls, service_ids, cut_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        d.customer_id,
        d.booking_id ?? null,
        d.barber_id ?? null,
        d.style_name,
        JSON.stringify(d.tags),
        d.technical_note,
        JSON.stringify(d.photo_urls),
        JSON.stringify(d.service_ids),
        cutDate,
      ],
    });

    const id = Number(res.lastInsertRowid);
    const created = await db.execute({
      sql: `SELECT hr.*, br.name as barber_name
            FROM hair_records hr
            LEFT JOIN barbers br ON br.id = hr.barber_id
            WHERE hr.id = ?`,
      args: [id],
    });

    return NextResponse.json(
      { record: mapHairRecord(created.rows[0]) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/hair-records error:", error);
    return NextResponse.json(
      { error: "Không thể lưu hồ sơ kiểu tóc." },
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
      return NextResponse.json({ error: "Thiếu ID hồ sơ." }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({ sql: "DELETE FROM hair_records WHERE id = ?", args: [id] });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/hair-records error:", error);
    return NextResponse.json(
      { error: "Không thể xóa hồ sơ kiểu tóc." },
      { status: 500 }
    );
  }
}
