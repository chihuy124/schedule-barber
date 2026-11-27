import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Keep uploads compact (client compresses phone photos to ~50-90 KB before sending)
const MAX_LOCAL_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_BYTES = 450 * 1024; // 450 KB max for Vercel/Turso inline data URL

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Không tìm thấy tệp ảnh tải lên." },
        { status: 400 }
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WebP." },
        { status: 400 }
      );
    }

    const useInlineStorage =
      Boolean(process.env.VERCEL) ||
      Boolean(process.env.DATABASE_URL?.startsWith("libsql://")) ||
      process.env.STORAGE_MODE === "inline";

    const maxBytes = useInlineStorage ? MAX_INLINE_BYTES : MAX_LOCAL_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: useInlineStorage
            ? "Ảnh sau khi nén vẫn lớn hơn 450KB. Vui lòng chọn ảnh nhẹ hơn."
            : "Ảnh vượt quá dung lượng tối đa 5MB.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // On Vercel Serverless (read-only filesystem) or remote Turso DB, return compact data URL
    if (useInlineStorage) {
      const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: dataUrl }, { status: 201 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `img-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    await fs.writeFile(fullPath, buffer);

    return NextResponse.json({ url: `/uploads/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "Không thể tải ảnh lên." },
      { status: 500 }
    );
  }
}
