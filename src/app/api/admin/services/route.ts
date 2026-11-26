import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllServices, mapService } from "@/lib/queries";

export const dynamic = "force-dynamic";

const createServiceSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên dịch vụ"),
  description: z.string().trim().max(400).optional().default(""),
  category: z.string().trim().min(1).optional().default("Cắt & Tạo kiểu"),
  duration_minutes: z.number().int().min(10).max(240),
  price: z.number().int().min(0),
  is_popular: z.boolean().optional().default(false),
});

const patchServiceSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(400).optional(),
  category: z.string().trim().min(1).optional(),
  duration_minutes: z.number().int().min(10).max(240).optional(),
  price: z.number().int().min(0).optional(),
  is_popular: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const services = await getAllServices();
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const countRes = await db.execute("SELECT COUNT(*) as c FROM services");
    const sortOrder = Number(countRes.rows[0].c) + 1;
    const d = parsed.data;

    const res = await db.execute({
      sql: `INSERT INTO services (name, description, category, duration_minutes, price, is_popular, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        d.name,
        d.description,
        d.category,
        d.duration_minutes,
        d.price,
        d.is_popular ? 1 : 0,
        sortOrder,
      ],
    });

    const created = await db.execute({
      sql: "SELECT * FROM services WHERE id = ?",
      args: [Number(res.lastInsertRowid)],
    });
    return NextResponse.json(
      { service: mapService(created.rows[0]) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/services error:", error);
    return NextResponse.json(
      { error: "Không thể thêm dịch vụ." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = patchServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu cập nhật dịch vụ không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const d = parsed.data;
    const existingRes = await db.execute({
      sql: "SELECT * FROM services WHERE id = ?",
      args: [d.id],
    });
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy dịch vụ." }, { status: 404 });
    }
    const cur = mapService(existingRes.rows[0]);

    await db.execute({
      sql: `UPDATE services
            SET name = ?, description = ?, category = ?, duration_minutes = ?,
                price = ?, is_popular = ?, is_active = ?
            WHERE id = ?`,
      args: [
        d.name ?? cur.name,
        d.description ?? cur.description,
        d.category ?? cur.category,
        d.duration_minutes ?? cur.duration_minutes,
        d.price ?? cur.price,
        d.is_popular !== undefined ? (d.is_popular ? 1 : 0) : cur.is_popular ? 1 : 0,
        d.is_active !== undefined ? (d.is_active ? 1 : 0) : cur.is_active ? 1 : 0,
        d.id,
      ],
    });

    const updated = await db.execute({
      sql: "SELECT * FROM services WHERE id = ?",
      args: [d.id],
    });
    return NextResponse.json({ service: mapService(updated.rows[0]) });
  } catch (error) {
    console.error("PATCH /api/admin/services error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật dịch vụ." },
      { status: 500 }
    );
  }
}
