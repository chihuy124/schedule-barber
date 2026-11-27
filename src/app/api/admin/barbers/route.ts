import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllBarbers, mapBarber } from "@/lib/queries";

export const dynamic = "force-dynamic";

const createBarberSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên thợ"),
  title: z.string().trim().min(2).optional().default("Barber Stylist"),
  bio: z.string().trim().max(400).optional().default(""),
  specialty: z.string().trim().max(150).optional().default("Fade & Classic Cut"),
});

const patchBarberSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(2).optional(),
  title: z.string().trim().min(2).optional(),
  bio: z.string().trim().max(400).optional(),
  specialty: z.string().trim().max(150).optional(),
  is_active: z.boolean().optional(),
  current_status: z.enum(["available", "busy", "off"]).optional(),
  estimated_free_at: z.string().nullable().optional(),
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const barbers = await getAllBarbers();
  return NextResponse.json({ barbers });
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = createBarberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const countRes = await db.execute("SELECT COUNT(*) as c FROM barbers");
    const sortOrder = Number(countRes.rows[0].c) + 1;

    const res = await db.execute({
      sql: `INSERT INTO barbers (name, title, bio, specialty, is_active, current_status, sort_order)
            VALUES (?, ?, ?, ?, 1, 'available', ?)`,
      args: [
        parsed.data.name,
        parsed.data.title,
        parsed.data.bio,
        parsed.data.specialty,
        sortOrder,
      ],
    });

    const created = await db.execute({
      sql: "SELECT * FROM barbers WHERE id = ?",
      args: [Number(res.lastInsertRowid)],
    });

    return NextResponse.json(
      { barber: mapBarber(created.rows[0]) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/barbers error:", error);
    return NextResponse.json(
      { error: "Không thể thêm thợ mới." },
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
    const parsed = patchBarberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu cập nhật thợ không hợp lệ." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const d = parsed.data;
    const existingRes = await db.execute({
      sql: "SELECT * FROM barbers WHERE id = ?",
      args: [d.id],
    });
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy thợ." }, { status: 404 });
    }
    const cur = mapBarber(existingRes.rows[0]);

    const nextStatus = d.current_status ?? cur.current_status;
    const nextEstFree =
      d.estimated_free_at !== undefined
        ? d.estimated_free_at
        : nextStatus === "busy"
        ? cur.estimated_free_at
        : null;

    await db.execute({
      sql: `UPDATE barbers
            SET name = ?, title = ?, bio = ?, specialty = ?, is_active = ?,
                current_status = ?, estimated_free_at = ?
            WHERE id = ?`,
      args: [
        d.name ?? cur.name,
        d.title ?? cur.title,
        d.bio ?? cur.bio,
        d.specialty ?? cur.specialty,
        d.is_active !== undefined ? (d.is_active ? 1 : 0) : cur.is_active ? 1 : 0,
        nextStatus,
        nextEstFree,
        d.id,
      ],
    });

    const updated = await db.execute({
      sql: "SELECT * FROM barbers WHERE id = ?",
      args: [d.id],
    });
    return NextResponse.json({ barber: mapBarber(updated.rows[0]) });
  } catch (error) {
    console.error("PATCH /api/admin/barbers error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin thợ." },
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
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID thợ không hợp lệ." }, { status: 400 });
    }

    const db = await getDb();
    await db.execute({ sql: "DELETE FROM barbers WHERE id = ?", args: [id] });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("DELETE /api/admin/barbers error:", error);
    return NextResponse.json(
      { error: "Không thể xóa thợ." },
      { status: 500 }
    );
  }
}
