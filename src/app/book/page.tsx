import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { LiveChairBanner } from "@/components/LiveChairBanner";
import { BookingWizard } from "@/components/BookingWizard";
import {
  getActiveBarbers,
  getActiveServices,
  getLiveChairSummary,
} from "@/lib/queries";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const [barbers, services, liveChair] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getLiveChairSummary(),
  ]);

  const today = getShopNow().date;

  return (
    <div className="min-h-screen bg-obsidian bg-barber-grid">
      <Navbar />
      <LiveChairBanner initialData={liveChair} />
      <Suspense
        fallback={
          <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted">
            Đang tải trình đặt lịch...
          </div>
        }
      >
        <BookingWizard
          barbers={barbers}
          services={services}
          initialToday={today}
        />
      </Suspense>
    </div>
  );
}
