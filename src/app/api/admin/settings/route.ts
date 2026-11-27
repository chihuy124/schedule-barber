import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  isAdminAuthenticated,
  setAdminSessionCookie,
} from "@/lib/admin-auth";
import { getShopSettings } from "@/lib/queries";
import {
  isValidVietnamesePhone,
  normalizePhone,
  PHONE_ERROR_MESSAGE,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const patchSettingsSchema = z.object({
  name: z.string().trim().min(2, "Tên tiệm tối thiểu 2 ký tự").max(100),
  tagline: z.string().trim().max(200).optional().default(""),
  address: z.string().trim().min(4, "Vui lòng nhập địa chỉ tiệm").max(250),
  phone: z.string().trim().min(1, PHONE_ERROR_MESSAGE),
  slot_interval_minutes: z
    .number()
    .int("Bước nhảy phải là số nguyên.")
    .min(5, "Bước nhảy tối thiểu 5 phút.")
    .max(120, "Bước nhảy tối đa 120 phút."),
  payment_qr_mode: z.enum(["vietqr", "image", "off"]).optional(),
  payment_bank_bin: z.string().trim().max(20).nullable().optional(),
  payment_account_no: z.string().trim().max(40).nullable().optional(),
  payment_account_name: z.string().trim().max(120).nullable().optional(),
  payment_qr_url: z.string().trim().max(650000).nullable().optional(),
  payment_note: z.string().trim().max(250).nullable().optional(),
  sepay_api_key: z.string().trim().max(200).nullable().optional(),
  new_pin: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, "Mã PIN mới phải gồm 4 đến 8 chữ số.")
    .optional(),
});

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const s = await getShopSettings();
  return NextResponse.json({
    settings: {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      address: s.address,
      phone: normalizePhone(s.phone),
      slot_interval_minutes: s.slot_interval_minutes,
      payment_qr_mode: s.payment_qr_mode,
      payment_bank_bin: s.payment_bank_bin,
      payment_account_no: s.payment_account_no,
      payment_account_name: s.payment_account_name,
      payment_qr_url: s.payment_qr_url,
      payment_note: s.payment_note,
      sepay_api_key: s.sepay_api_key,
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const cleanPhone = normalizePhone(d.phone);
    if (!isValidVietnamesePhone(cleanPhone)) {
      return NextResponse.json(
        { error: PHONE_ERROR_MESSAGE },
        { status: 400 }
      );
    }

    const db = await getDb();
    const current = await getShopSettings();
    const nextPin = d.new_pin ? d.new_pin : current.admin_pin;
    const nextQrMode = d.payment_qr_mode ?? current.payment_qr_mode;
    const nextBankBin =
      d.payment_bank_bin !== undefined
        ? d.payment_bank_bin || null
        : current.payment_bank_bin;
    const nextAccountNo =
      d.payment_account_no !== undefined
        ? d.payment_account_no?.replace(/\s+/g, "") || null
        : current.payment_account_no;
    const nextAccountName =
      d.payment_account_name !== undefined
        ? d.payment_account_name?.toUpperCase() || null
        : current.payment_account_name;
    const nextQrUrl =
      d.payment_qr_url !== undefined
        ? d.payment_qr_url || null
        : current.payment_qr_url;
    const nextPaymentNote =
      d.payment_note !== undefined
        ? d.payment_note || null
        : current.payment_note;
    const nextSepayKey =
      d.sepay_api_key !== undefined
        ? d.sepay_api_key || null
        : current.sepay_api_key;

    await db.execute({
      sql: `UPDATE shop_settings
            SET name = ?, tagline = ?, address = ?, phone = ?,
                slot_interval_minutes = ?, admin_pin = ?,
                payment_qr_mode = ?, payment_bank_bin = ?,
                payment_account_no = ?, payment_account_name = ?,
                payment_qr_url = ?, payment_note = ?, sepay_api_key = ?
            WHERE id = 1`,
      args: [
        d.name,
        d.tagline,
        d.address,
        cleanPhone,
        d.slot_interval_minutes,
        nextPin,
        nextQrMode,
        nextBankBin,
        nextAccountNo,
        nextAccountName,
        nextQrUrl,
        nextPaymentNote,
        nextSepayKey,
      ],
    });

    // Keep current admin session valid immediately after PIN change
    if (d.new_pin && !process.env.ADMIN_PIN) {
      await setAdminSessionCookie(d.new_pin);
    }

    const updated = await getShopSettings();
    return NextResponse.json({
      settings: {
        id: updated.id,
        name: updated.name,
        tagline: updated.tagline,
        address: updated.address,
        phone: normalizePhone(updated.phone),
        slot_interval_minutes: updated.slot_interval_minutes,
        payment_qr_mode: updated.payment_qr_mode,
        payment_bank_bin: updated.payment_bank_bin,
        payment_account_no: updated.payment_account_no,
        payment_account_name: updated.payment_account_name,
        payment_qr_url: updated.payment_qr_url,
        payment_note: updated.payment_note,
        sepay_api_key: updated.sepay_api_key,
      },
      pin_updated: Boolean(d.new_pin),
    });
  } catch (error) {
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { error: "Không thể lưu cài đặt tiệm." },
      { status: 500 }
    );
  }
}
