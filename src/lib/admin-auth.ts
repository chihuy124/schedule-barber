import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getShopSettings } from "@/lib/queries";

const COOKIE_NAME = "ken_barber_admin";
const SECRET = process.env.ADMIN_COOKIE_SECRET || "ken-barbershop-local-secret-v1";

function signToken(pin: string): string {
  return crypto.createHmac("sha256", SECRET).update(`admin:${pin}`).digest("hex");
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const envPin = process.env.ADMIN_PIN;
  if (envPin) {
    return pin.trim() === envPin.trim();
  }
  const settings = await getShopSettings();
  return pin.trim() === settings.admin_pin.trim();
}

export async function setAdminSessionCookie(pin: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signToken(pin.trim()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const settings = await getShopSettings();
  const expectedPin = process.env.ADMIN_PIN || settings.admin_pin;
  const expected = signToken(expectedPin.trim());
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
