import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  isAdminAuthenticated,
  setAdminSessionCookie,
  verifyAdminPin,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pin = typeof body?.pin === "string" ? body.pin : "";

    const valid = await verifyAdminPin(pin);
    if (!valid) {
      return NextResponse.json(
        { error: "Mã PIN quản trị không chính xác." },
        { status: 401 }
      );
    }

    await setAdminSessionCookie(pin);
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json(
      { error: "Không thể xác thực." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  await clearAdminSessionCookie();
  return NextResponse.json({ authenticated: false });
}
