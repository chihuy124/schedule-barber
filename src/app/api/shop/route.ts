import { NextResponse } from "next/server";
import {
  getActiveBarbers,
  getActiveServices,
  getLiveChairSummary,
  getShopSettings,
  getWorkingHours,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, barbers, services, workingHours, liveChair] =
      await Promise.all([
        getShopSettings(),
        getActiveBarbers(),
        getActiveServices(),
        getWorkingHours(),
        getLiveChairSummary(),
      ]);

    // Never expose admin_pin in public shop endpoint
    const publicSettings = {
      id: settings.id,
      name: settings.name,
      tagline: settings.tagline,
      address: settings.address,
      phone: settings.phone,
      slot_interval_minutes: settings.slot_interval_minutes,
    };

    return NextResponse.json(
      {
        settings: publicSettings,
        barbers,
        services,
        workingHours,
        liveChair,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/shop error:", error);
    return NextResponse.json(
      { error: "Không thể tải thông tin tiệm." },
      { status: 500 }
    );
  }
}
