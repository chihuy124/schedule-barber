import { NextResponse } from "next/server";
import { getLiveChairSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getLiveChairSummary();
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/live-chair error:", error);
    return NextResponse.json(
      { error: "Không thể lấy trạng thái ghế trực tiếp." },
      { status: 500 }
    );
  }
}
