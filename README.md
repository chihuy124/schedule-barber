# Ken Barbershop — Web Đặt Lịch Cắt Tóc Quý Ông

Ứng dụng web đặt lịch cắt tóc phong cách **Dark Classic / Gentleman**, xây dựng bằng **Next.js (App Router) + TypeScript + Tailwind CSS + SQLite (`@libsql/client`)**, tối ưu nhẹ và sẵn sàng deploy lên **Vercel**.

## Tính năng nổi bật (Phase 1)
- **Trạng thái ghế trực tiếp (Live Chair):** Tự cập nhật trạng thái ghế (*Đang trống / Đang cắt / Tạm nghỉ*) theo thời gian thực khi thợ thao tác trong `/admin`.
- **Đặt lại trong 1 chạm (1-Tap Re-booking):** Ghi nhớ khách quen qua SĐT (không cần mật khẩu), gợi ý sẵn combo cũ và các khung giờ trống gần nhất ngay tại trang chủ.
- **Hồ sơ kiểu tóc (Hair Passport):** Tra cứu bằng SĐT (`/passport`) để xem lại ảnh tóc đã cắt, thông số kỹ thuật (`Mid Fade`, `Tông đơ #1.5`, ghi chú xoáy/mái...) và đặt lại đúng kiểu đó trong 1 chạm.
- **1 thợ thông minh, sẵn sàng nhiều thợ:** Khi chỉ có 1 thợ hoạt động (**Ken Nguyễn**), luồng đặt lịch tự ẩn bước chọn thợ. Khi Admin thêm thợ thứ 2, bước chọn thợ tự động bật lên.
- **Bảng điều khiển Chủ tiệm / Thợ (`/admin`):** Điều khiển Live Chair, thêm khách vãng lai (Walk-in), cập nhật trạng thái lịch, chụp/tải ảnh lưu Hồ sơ kiểu tóc, quản lý giờ mở cửa, lịch nghỉ, dịch vụ và đội ngũ thợ.

## Chạy cục bộ (Local)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Database SQLite sẽ tự tạo và seed dữ liệu mẫu tại `data/ken-barbershop.db`.

### Thông tin dùng thử nhanh
- **SĐT khách quen (có sẵn 2 Hồ sơ tóc & 1-Tap Rebook):** `0901234567` (Nguyễn Hoàng Minh)
- **Trang quản trị `/admin` — Mã PIN mặc định:** `1234`

## Deploy lên Vercel
Dự án dùng `@libsql/client`, chạy SQLite file cục bộ khi dev. Khi deploy lên Vercel (serverless), chỉ cần tạo 1 database miễn phí trên **Turso** (hoặc LibSQL) và cấu hình biến môi trường trên Vercel:
- `DATABASE_URL=libsql://...`
- `DATABASE_AUTH_TOKEN=...`
- `ADMIN_PIN=...` (tùy chọn, mặc định `1234`)
- `ADMIN_COOKIE_SECRET=...` (chuỗi bí mật ngẫu nhiên)
