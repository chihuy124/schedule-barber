import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { BookingDetailClient } from "@/components/BookingDetailClient";
import { getDb } from "@/lib/db/client";
import { getShopSettings, mapBookingWithDetails } from "@/lib/queries";
import { getShopNow } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const db = await getDb();
  const res = await db.execute({
    sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                 br.name as barber_name, br.title as barber_title
          FROM bookings b
          JOIN customers c ON c.id = b.customer_id
          JOIN barbers br ON br.id = b.barber_id
          WHERE UPPER(b.code) = UPPER(?)`,
    args: [code],
  });

  const settings = await getShopSettings();

  if (!res.rows[0]) {
    return (
      <div className="min-h-screen bg-obsidian bg-barber-grid">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-4">
          <h1 className="font-serif text-3xl font-bold text-ivory">
            Không tìm thấy lịch hẹn
          </h1>
          <p className="text-sm text-muted">
            Mã lịch hẹn <strong className="text-gold-light">{code}</strong> không tồn tại hoặc đã bị xóa.
          </p>
          <Link
            href="/book"
            className="inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-obsidian"
          >
            Đặt lịch mới ngay
          </Link>
        </div>
      </div>
    );
  }

  const booking = mapBookingWithDetails(res.rows[0]);

  return (
    <div className="min-h-screen bg-obsidian bg-barber-grid">
      <Navbar />
      <BookingDetailClient
        initialBooking={booking}
        shop={{
          name: settings.name,
          address: settings.address,
          phone: settings.phone,
          payment_qr_mode: settings.payment_qr_mode,
          payment_bank_bin: settings.payment_bank_bin,
          payment_account_no: settings.payment_account_no,
          payment_account_name: settings.payment_account_name,
          payment_qr_url: settings.payment_qr_url,
          payment_note: settings.payment_note,
        }}
        today={getShopNow().date}
        isNewBooking={sp.new === "1"}
      />
    </div>
  );
}
