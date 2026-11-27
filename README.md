# Ken Barbershop — Web Đặt Lịch Cắt Tóc Quý Ông

Ứng dụng web đặt lịch cắt tóc phong cách **Dark Classic / Gentleman**, xây dựng bằng **Next.js (App Router) + TypeScript + Tailwind CSS + SQLite/LibSQL (`@libsql/client`)**, tối ưu gọn nhẹ cho gói **Vercel Free (Hobby) + Turso Free**.

## Tính năng nổi bật (Phase 1)
- **Trạng thái ghế trực tiếp (Live Chair):** Tự động chuyển *Đang cắt* khi đến giờ hẹn và tự trả về *Đang trống* khi hết lịch / khách không đến / hủy / hoàn thành.
- **Đặt lại trong 1 chạm (1-Tap Re-booking):** Ghi nhớ khách quen qua SĐT (không cần mật khẩu), gợi ý combo cũ và 4 khung giờ trống gần nhất.
- **Hồ sơ kiểu tóc (Hair Passport):** Tra cứu bằng SĐT (`/passport`) để xem lại ảnh tóc đã cắt, thông số kỹ thuật và đặt cắt lại đúng kiểu đó trong 1 chạm.
- **VietQR động + Dropdown 26 ngân hàng:** Tự động điền sẵn số tiền và nội dung chuyển khoản (mã lịch hẹn) khi khách quét bằng app Ngân hàng, MoMo hoặc ZaloPay.
- **1 thợ thông minh, sẵn sàng nhiều thợ:** Tự ẩn bước Chọn Thợ khi tiệm có 1 thợ, tự bật lên ngay khi Admin thêm thợ thứ 2.
- **Bảng điều khiển Chủ tiệm / Thợ (`/admin`):** Quản lý lịch hẹn, Live Chair, khách vãng lai, lưu Hồ sơ tóc kèm ảnh, giờ mở cửa/nghỉ, dịch vụ, đội ngũ thợ và cài đặt tiệm.

## Chạy cục bộ (Local)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Database SQLite tự tạo và seed dữ liệu mẫu tại `data/ken-barbershop.db`.

### Thông tin dùng thử nhanh
- **SĐT khách quen mẫu (có sẵn 2 Hồ sơ tóc):** `0901234567`
- **Trang quản trị `/admin` — Mã PIN mặc định:** `1234`

---

## Deploy miễn phí lên Vercel + Turso (5 phút)

Dự án đã được tối ưu sẵn cho Vercel Free:
- Ảnh tĩnh đã nén gọn (~438 KB tổng) kèm cache `immutable` 1 năm.
- Ảnh tải lên từ điện thoại tự động nén trên trình duyệt (~50–90 KB WebP) trước khi gửi API và tự lưu inline vào Turso DB khi chạy trên Vercel (không bị lỗi read-only filesystem hay giới hạn payload 4.5 MB).
- Live Chair dừng polling khi tab ẩn, chu kỳ 60 giây + Vercel Edge Cache `s-maxage=30` giúp giảm ~85–90% số lần chạy Serverless Function.

### Bước 1: Tạo database miễn phí trên Turso
1. Đăng ký/đăng nhập tại [turso.tech](https://turso.tech) (gói Free: 5 GB storage, 500 triệu row reads/tháng).
2. Tạo 1 database mới (ví dụ `ken-barbershop`, chọn region gần Việt Nam như `Singapore` / `sin`).
3. Lấy 2 giá trị:
   - **Database URL:** dạng `libsql://ken-barbershop-xxxx.turso.io`
   - **Auth Token:** tạo Read & Write Token.

### Bước 2: Import lên Vercel
1. Vào [vercel.com/new](https://vercel.com/new) → chọn repo `schedule-barber`.
2. Trong mục **Environment Variables**, thêm:
   - `DATABASE_URL` = `libsql://...` *(URL từ Bước 1)*
   - `DATABASE_AUTH_TOKEN` = `...` *(Token từ Bước 1)*
   - `ADMIN_COOKIE_SECRET` = *(1 chuỗi ngẫu nhiên bất kỳ, vd: `ken-barber-secret-2026-xyz`)*
   - *(Tùy chọn)* `ADMIN_PIN` = `1234` *(nếu muốn khóa cứng PIN bằng env; bỏ trống thì đổi PIN trực tiếp trong `/admin` → Cài đặt tiệm)*
3. Bấm **Deploy**. Lần truy cập đầu tiên hệ thống sẽ tự tạo bảng và dữ liệu mẫu trên Turso!
