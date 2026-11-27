import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let includeServices = false;
    try {
      const body = await request.json();
      includeServices = Boolean(body?.includeServices);
    } catch {
      // default false
    }

    const db = await getDb();
    await db.execute("DELETE FROM hair_records");
    await db.execute("DELETE FROM bookings");
    await db.execute("DELETE FROM customers");
    await db.execute("DELETE FROM time_offs");
    if (includeServices) {
      await db.execute("DELETE FROM services");
    }

    return NextResponse.json({
      ok: true,
      includeServices,
    });
  } catch (error) {
    console.error("POST /api/admin/reset-demo error:", error);
    return NextResponse.json(
      { error: "Không thể dọn dữ liệu." },
      { status: 500 }
    );
  }
}
