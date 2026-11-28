import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ken Barbershop — Đặt Lịch Cắt Tóc Quý Ông",
  description:
    "Đặt lịch cắt tóc trực tuyến tại Ken Barbershop trong 30 giây. Xem trạng thái ghế trực tiếp, đặt lại 1 chạm và lưu giữ Hồ sơ kiểu tóc cá nhân.",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} dark`}>
      <body className="bg-obsidian text-ivory font-sans antialiased selection:bg-gold/30 selection:text-gold-light">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
