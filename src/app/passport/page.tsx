import { Navbar } from "@/components/Navbar";
import { HairPassportClient } from "@/components/HairPassportClient";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function PassportPage() {
  return (
    <div className="min-h-screen bg-obsidian bg-barber-grid">
      <Navbar />
      <HairPassportClient today={getShopNow().date} />
    </div>
  );
}
