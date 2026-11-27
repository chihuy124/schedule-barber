import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getShopSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface SePayWebhookPayload {
  id?: number | string;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  code?: string | null;
  content?: string | null;
  transferType?: string;
  description?: string | null;
  transferAmount?: number | string;
  referenceCode?: string | null;
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extracts a Ken Barbershop booking code (KEN-XXXX) from bank transfer text.
 * Matches: "KEN SNYB", "KEN-SNYB", "KENSNYB", "KEN_SNYB" (case-insensitive).
 */
function extractBookingCode(texts: Array<string | null | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.toUpperCase().match(/\bKEN[\s\-_]?([A-Z0-9]{4})\b/);
    if (match?.[1]) {
      return `KEN-${match[1]}`;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const settings = await getShopSettings();
    const expectedKey = (
      process.env.SEPAY_WEBHOOK_SECRET ||
      settings.sepay_api_key ||
      ""
    ).trim();

    if (!expectedKey) {
      return NextResponse.json(
        { success: false, message: "SePay webhook API key is not configured." },
        { status: 503 }
      );
    }

    // SePay sends: Authorization: Apikey <YOUR_API_KEY>
    const authHeader = request.headers.get("authorization") || "";
    const providedKey = authHeader.startsWith("Apikey ")
      ? authHeader.slice(7).trim()
      : authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!providedKey || !timingSafeMatch(providedKey, expectedKey)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = (await request.json()) as SePayWebhookPayload;

    // Only process incoming money transfers
    if (payload.transferType !== "in") {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Not an incoming transfer",
      });
    }

    const amount = Number(payload.transferAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Invalid transfer amount",
      });
    }

    const bookingCode = extractBookingCode([
      payload.code,
      payload.content,
      payload.description,
    ]);

    if (!bookingCode) {
      return NextResponse.json({
        success: true,
        matched: false,
        reason: "No KEN booking code found in transfer content",
      });
    }

    const db = await getDb();
    const res = await db.execute({
      sql: "SELECT id, code, total_price, status, payment_status FROM bookings WHERE UPPER(code) = UPPER(?)",
      args: [bookingCode],
    });

    const booking = res.rows[0];
    if (!booking) {
      return NextResponse.json({
        success: true,
        matched: false,
        booking_code: bookingCode,
        reason: "Booking not found",
      });
    }

    if (String(booking.payment_status) === "paid") {
      return NextResponse.json({
        success: true,
        matched: true,
        booking_code: bookingCode,
        message: "Already marked as paid",
      });
    }

    const requiredAmount = Number(booking.total_price);
    if (amount < requiredAmount) {
      return NextResponse.json({
        success: true,
        matched: false,
        booking_code: bookingCode,
        reason: `Transfer amount (${amount}) is less than booking total (${requiredAmount})`,
      });
    }

    const paymentRef =
      payload.referenceCode?.trim() ||
      (payload.id !== undefined ? `SEPAY-${payload.id}` : "SEPAY");

    await db.execute({
      sql: `UPDATE bookings
            SET payment_status = 'paid',
                payment_method = 'transfer',
                paid_at = datetime('now'),
                payment_ref = ?,
                updated_at = datetime('now')
            WHERE id = ?`,
      args: [paymentRef, Number(booking.id)],
    });

    return NextResponse.json({
      success: true,
      matched: true,
      booking_code: bookingCode,
      payment_ref: paymentRef,
      amount,
    });
  } catch (error) {
    console.error("POST /api/webhooks/sepay error:", error);
    return NextResponse.json(
      { success: false, message: "Webhook processing error" },
      { status: 500 }
    );
  }
}
