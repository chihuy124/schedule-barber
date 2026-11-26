import { Navbar } from "@/components/Navbar";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getAllBarbers,
  getAllServices,
  getShopSettings,
  getTimeOffs,
  getWorkingHours,
} from "@/lib/queries";
import { getShopNow, normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return (
      <div className="min-h-screen bg-obsidian bg-barber-grid">
        <Navbar />
        <AdminLoginForm />
      </div>
    );
  }

  const now = getShopNow();
  const [barbers, services, workingHours, timeOffs, settings] =
    await Promise.all([
      getAllBarbers(),
      getAllServices(),
      getWorkingHours(),
      getTimeOffs(now.date),
      getShopSettings(),
    ]);

  return (
    <div className="min-h-screen bg-obsidian bg-barber-grid">
      <Navbar />
      <AdminDashboardClient
        initialBarbers={barbers}
        initialServices={services}
        initialWorkingHours={workingHours}
        initialTimeOffs={timeOffs}
        initialSettings={{
          name: settings.name,
          tagline: settings.tagline,
          address: settings.address,
          phone: normalizePhone(settings.phone),
          slot_interval_minutes: settings.slot_interval_minutes || 30,
          payment_qr_mode: settings.payment_qr_mode,
          payment_bank_bin: settings.payment_bank_bin,
          payment_account_no: settings.payment_account_no,
          payment_account_name: settings.payment_account_name,
          payment_qr_url: settings.payment_qr_url,
          payment_note: settings.payment_note,
        }}
        today={now.date}
        currentTime={now.time}
      />
    </div>
  );
}
