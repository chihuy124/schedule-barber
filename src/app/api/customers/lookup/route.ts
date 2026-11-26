import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import {
  getActiveServices,
  getQuickRebookSlots,
  mapBookingWithDetails,
  mapCustomer,
  mapHairRecord,
} from "@/lib/queries";
import {
  diffDaysBetween,
  getShopNow,
  isValidVietnamesePhone,
  normalizePhone,
  PHONE_ERROR_MESSAGE,
} from "@/lib/utils";
import type { CustomerLookupResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
    const phone = normalizePhone(rawPhone);

    if (!isValidVietnamesePhone(phone)) {
      return NextResponse.json(
        { error: PHONE_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const db = await getDb();
    const custRes = await db.execute({
      sql: "SELECT * FROM customers WHERE phone = ?",
      args: [phone],
    });

    if (custRes.rows.length === 0) {
      const empty: CustomerLookupResponse = {
        found: false,
        upcoming_bookings: [],
        past_bookings: [],
        hair_records: [],
        quick_slots: [],
      };
      return NextResponse.json(empty, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const customer = mapCustomer(custRes.rows[0]);
    const now = getShopNow();

    // Bookings for customer
    const bkRes = await db.execute({
      sql: `SELECT b.*, c.name as customer_name, c.phone as customer_phone,
                   br.name as barber_name, br.title as barber_title
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            JOIN barbers br ON br.id = b.barber_id
            WHERE b.customer_id = ?
            ORDER BY b.date DESC, b.start_time DESC`,
      args: [customer.id],
    });
    const allBookings = bkRes.rows.map(mapBookingWithDetails);

    const upcomingBookings = allBookings
      .filter(
        (b) =>
          ["confirmed", "arrived", "in_progress"].includes(b.status) &&
          (b.date > now.date || (b.date === now.date && b.end_time >= now.time))
      )
      .reverse();

    const pastBookings = allBookings.filter(
      (b) => !upcomingBookings.some((u) => u.id === b.id)
    );

    // Hair Passport records
    const hrRes = await db.execute({
      sql: `SELECT hr.*, br.name as barber_name
            FROM hair_records hr
            LEFT JOIN barbers br ON br.id = hr.barber_id
            WHERE hr.customer_id = ?
            ORDER BY hr.cut_date DESC, hr.id DESC`,
      args: [customer.id],
    });
    const hairRecords = hrRes.rows.map(mapHairRecord);

    // Resolve last barber name & last services for 1-Tap Re-booking
    let lastBarberName: string | null = null;
    if (customer.last_barber_id) {
      const brRes = await db.execute({
        sql: "SELECT name FROM barbers WHERE id = ? AND is_active = 1",
        args: [customer.last_barber_id],
      });
      if (brRes.rows[0]) {
        lastBarberName = String(brRes.rows[0].name);
      }
    }

    const activeServices = await getActiveServices();
    const lastServices = activeServices.filter((s) =>
      customer.last_service_ids.includes(s.id)
    );
    const effectiveServices =
      lastServices.length > 0 ? lastServices : activeServices.slice(0, 1);

    const rebookDuration = effectiveServices.reduce(
      (sum, s) => sum + s.duration_minutes,
      0
    );

    const quickSlots = await getQuickRebookSlots({
      durationMinutes: rebookDuration || 30,
      barberId: lastBarberName && customer.last_barber_id ? customer.last_barber_id : "any",
      limit: 4,
    });

    // Compute days since last completed cut or hair record
    const latestCompletedDate =
      hairRecords[0]?.cut_date ??
      pastBookings.find((b) => b.status === "completed")?.date ??
      null;
    const daysSinceLastCut = latestCompletedDate
      ? Math.max(0, diffDaysBetween(latestCompletedDate, now.date))
      : null;

    const totalVisits = pastBookings.filter(
      (b) => b.status === "completed"
    ).length;

    const response: CustomerLookupResponse = {
      found: true,
      customer: {
        ...customer,
        last_barber_name: lastBarberName,
        last_services: effectiveServices,
        days_since_last_cut: daysSinceLastCut,
        total_visits: Math.max(totalVisits, hairRecords.length),
      },
      upcoming_bookings: upcomingBookings,
      past_bookings: pastBookings,
      hair_records: hairRecords,
      quick_slots: quickSlots,
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/customers/lookup error:", error);
    return NextResponse.json(
      { error: "Không thể tra cứu hồ sơ khách hàng." },
      { status: 500 }
    );
  }
}
