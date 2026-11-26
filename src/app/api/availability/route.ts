import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/queries";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getShopNow().date;
    const duration = Number(searchParams.get("duration") || "30");
    const barberIdParam = searchParams.get("barberId");
    const excludeBookingId = searchParams.get("excludeBookingId")
      ? Number(searchParams.get("excludeBookingId"))
      : undefined;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Định dạng ngày không hợp lệ (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const barberId: number | "any" =
      !barberIdParam || barberIdParam === "any"
        ? "any"
        : Number(barberIdParam);

    const result = await getAvailableSlots({
      date,
      durationMinutes: Number.isFinite(duration) && duration > 0 ? duration : 30,
      barberId,
      excludeBookingId,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/availability error:", error);
    return NextResponse.json(
      { error: "Không thể tính khung giờ trống." },
      { status: 500 }
    );
  }
}
