import { NextResponse } from "next/server";
import { getLiveChairSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getLiveChairSummary();
    return NextResponse.json(summary, {
      headers: {
        // Share Edge cache across concurrent visitors for 30s to minimize Vercel Function invocations
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("GET /api/live-chair error:", error);
    return NextResponse.json(
      { error: "Không thể lấy trạng thái ghế trực tiếp." },
      { status: 500 }
    );
  }
}
