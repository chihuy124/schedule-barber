import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { addDaysToDate, getShopNow } from "@/lib/utils";

const globalForDb = globalThis as unknown as {
  libsqlClient?: Client;
  dbInitialized?: Promise<void>;
};

function getDbUrl(): string {
  const remoteUrl =
    process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  if (remoteUrl) {
    return remoteUrl;
  }
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return `file:${path.join(dataDir, "ken-barbershop.db")}`;
}

export function getDbClient(): Client {
  if (!globalForDb.libsqlClient) {
    const url = getDbUrl();
    globalForDb.libsqlClient = createClient({
      url,
      authToken:
        process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return globalForDb.libsqlClient;
}

async function initSchemaAndSeed(db: Client): Promise<void> {
  await db.executeMultiple(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS shop_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      tagline TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      slot_interval_minutes INTEGER NOT NULL DEFAULT 30,
      admin_pin TEXT NOT NULL DEFAULT '1234',
      payment_qr_mode TEXT NOT NULL DEFAULT 'vietqr',
      payment_bank_bin TEXT,
      payment_account_no TEXT,
      payment_account_name TEXT,
      payment_qr_url TEXT,
      payment_note TEXT,
      sepay_api_key TEXT
    );

    CREATE TABLE IF NOT EXISTS barbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Master Barber',
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      specialty TEXT NOT NULL DEFAULT 'Fade & Classic Cut',
      is_active INTEGER NOT NULL DEFAULT 1,
      current_status TEXT NOT NULL DEFAULT 'available',
      estimated_free_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Cắt & Tạo kiểu',
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      is_popular INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS working_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL UNIQUE,
      is_open INTEGER NOT NULL DEFAULT 1,
      open_time TEXT NOT NULL DEFAULT '08:30',
      close_time TEXT NOT NULL DEFAULT '20:30'
    );

    CREATE TABLE IF NOT EXISTS time_offs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barber_id INTEGER,
      date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      reason TEXT NOT NULL DEFAULT 'Nghỉ đột xuất',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      notes TEXT,
      last_barber_id INTEGER,
      last_service_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (last_barber_id) REFERENCES barbers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      total_duration INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      service_ids TEXT NOT NULL DEFAULT '[]',
      service_names TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'confirmed',
      source TEXT NOT NULL DEFAULT 'online',
      note TEXT,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_method TEXT,
      paid_at TEXT,
      payment_ref TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hair_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      booking_id INTEGER,
      barber_id INTEGER,
      style_name TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      technical_note TEXT NOT NULL DEFAULT '',
      photo_urls TEXT NOT NULL DEFAULT '[]',
      service_ids TEXT NOT NULL DEFAULT '[]',
      cut_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_date_barber ON bookings(date, barber_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
    CREATE INDEX IF NOT EXISTS idx_hair_records_customer ON hair_records(customer_id);
    CREATE INDEX IF NOT EXISTS idx_time_offs_date ON time_offs(date);
  `);

  // Safe idempotent column migrations for existing local SQLite databases
  const settingsColsRes = await db.execute("PRAGMA table_info(shop_settings)");
  const settingsCols = new Set(
    settingsColsRes.rows.map((r) => String(r.name))
  );
  if (!settingsCols.has("payment_qr_url")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_qr_url TEXT");
  }
  if (!settingsCols.has("payment_note")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_note TEXT");
  }
  if (!settingsCols.has("payment_qr_mode")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_qr_mode TEXT NOT NULL DEFAULT 'vietqr'");
  }
  if (!settingsCols.has("payment_bank_bin")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_bank_bin TEXT");
  }
  if (!settingsCols.has("payment_account_no")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_account_no TEXT");
  }
  if (!settingsCols.has("payment_account_name")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN payment_account_name TEXT");
  }
  if (!settingsCols.has("sepay_api_key")) {
    await db.execute("ALTER TABLE shop_settings ADD COLUMN sepay_api_key TEXT");
  }

  const bookingColsRes = await db.execute("PRAGMA table_info(bookings)");
  const bookingCols = new Set(bookingColsRes.rows.map((r) => String(r.name)));
  if (!bookingCols.has("payment_status")) {
    await db.execute(
      "ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'"
    );
  }
  if (!bookingCols.has("payment_method")) {
    await db.execute("ALTER TABLE bookings ADD COLUMN payment_method TEXT");
  }
  if (!bookingCols.has("paid_at")) {
    await db.execute("ALTER TABLE bookings ADD COLUMN paid_at TEXT");
  }
  if (!bookingCols.has("payment_ref")) {
    await db.execute("ALTER TABLE bookings ADD COLUMN payment_ref TEXT");
  }

  const settingsCount = await db.execute("SELECT COUNT(*) as c FROM shop_settings");
  const isFreshDb = Number(settingsCount.rows[0].c) === 0;
  if (isFreshDb) {
    await db.execute({
      sql: `INSERT INTO shop_settings (id, name, tagline, address, phone, slot_interval_minutes, admin_pin)
            VALUES (1, ?, ?, ?, ?, ?, ?)`,
      args: [
        "Ken Barbershop",
        "Nghệ thuật cắt tóc quý ông — Chuẩn mực từng đường kéo",
        "128 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh",
        "0909888666",
        30,
        "1234",
      ],
    });
  }

  const hoursCount = await db.execute("SELECT COUNT(*) as c FROM working_hours");
  if (Number(hoursCount.rows[0].c) === 0) {
    for (let dow = 0; dow <= 6; dow++) {
      const openTime = dow === 1 ? "09:00" : "08:30";
      const closeTime = dow === 0 ? "20:00" : "21:00";
      await db.execute({
        sql: "INSERT INTO working_hours (day_of_week, is_open, open_time, close_time) VALUES (?, 1, ?, ?)",
        args: [dow, openTime, closeTime],
      });
    }
  }

  // Only seed sample barber, services, customers & bookings in local development on a brand-new DB
  // Production starts completely clean so the shop owner enters real data via /admin.
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const barberCount = await db.execute("SELECT COUNT(*) as c FROM barbers");
  if (!isProduction && isFreshDb && Number(barberCount.rows[0].c) === 0) {
    const barberRes = await db.execute({
      sql: `INSERT INTO barbers (name, title, bio, avatar_url, specialty, is_active, current_status, estimated_free_at, sort_order)
            VALUES (?, ?, ?, ?, ?, 1, 'available', NULL, 1)`,
      args: [
        "Ken Nguyễn",
        "Founder · Master Barber",
        "Hơn 8 năm kinh nghiệm chuyên dòng tóc Classic Gentleman, Skin Fade và tạo form chuẩn theo cấu trúc hộp sọ người Việt.",
        null,
        "Skin Fade · Classic Side Part · Beard Grooming",
      ],
    });
    const kenId = Number(barberRes.lastInsertRowid);

    const seedServices = [
      {
        name: "Combo Ken Signature",
        description:
          "Tư vấn dáng tóc, cắt thiết kế chuẩn form, gội đầu thảo mộc thư giãn, massage cổ vai gáy & tạo kiểu bằng sáp cao cấp.",
        category: "Combo Đặc Biệt",
        duration: 45,
        price: 150000,
        popular: 1,
        order: 1,
      },
      {
        name: "Cắt Tóc Thiết Kế Classic",
        description:
          "Cắt kéo & tông đơ tỉ mỉ theo phong cách quý ông, chấn viền sắc nét và xả sạch tóc con.",
        category: "Cắt & Tạo kiểu",
        duration: 30,
        price: 100000,
        popular: 0,
        order: 2,
      },
      {
        name: "Skin Fade & Chấn Viền",
        description:
          "Kỹ thuật chuyển tầng mượt mà bằng dao cạo & shaver chuyên dụng, giữ form gọn gàng lâu dài.",
        category: "Cắt & Tạo kiểu",
        duration: 40,
        price: 130000,
        popular: 1,
        order: 3,
      },
      {
        name: "Cạo Râu Khăn Nóng Quý Ông",
        description:
          "Ủ khăn nóng tinh dầu khuynh diệp, cạo râu chuẩn barbershop cổ điển, dưỡng ẩm làm dịu da sau cạo.",
        category: "Chăm Sóc Râu",
        duration: 20,
        price: 70000,
        popular: 0,
        order: 4,
      },
      {
        name: "Uốn Texture / Side Part Rũ",
        description:
          "Tạo độ phồng tự nhiên, dễ vuốt nếp tại nhà chỉ trong 2 phút. Đã bao gồm cắt tỉa form tóc.",
        category: "Uốn & Nhuộm",
        duration: 90,
        price: 380000,
        popular: 0,
        order: 5,
      },
      {
        name: "Nhuộm Thời Trang / Phủ Bạc",
        description:
          "Màu nhuộm bền đẹp ít hư tổn, phù hợp môi trường công sở hoặc tông khói hiện đại.",
        category: "Uốn & Nhuộm",
        duration: 60,
        price: 280000,
        popular: 0,
        order: 6,
      },
    ];

    const serviceIds: number[] = [];
    for (const s of seedServices) {
      const res = await db.execute({
        sql: `INSERT INTO services (name, description, category, duration_minutes, price, is_popular, is_active, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [
          s.name,
          s.description,
          s.category,
          s.duration,
          s.price,
          s.popular,
          s.order,
        ],
      });
      serviceIds.push(Number(res.lastInsertRowid));
    }

    // Seed realistic demo customers, bookings, and Hair Passports
    const now = getShopNow();
    const today = now.date;
    const daysAgo21 = addDaysToDate(today, -21);
    const daysAgo52 = addDaysToDate(today, -52);
    const tomorrow = addDaysToDate(today, 1);

    // Demo Customer 1: Returning VIP with 2 Hair Passport records (ideal for testing 1-tap rebook & passport)
    const c1Res = await db.execute({
      sql: `INSERT INTO customers (phone, name, notes, last_barber_id, last_service_ids)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        "0901234567",
        "Nguyễn Hoàng Minh",
        "Khách quen, thích gội nước ấm nhẹ, hay cắt 3 tuần/lần.",
        kenId,
        JSON.stringify([serviceIds[0]]),
      ],
    });
    const c1Id = Number(c1Res.lastInsertRowid);

    const b1Res = await db.execute({
      sql: `INSERT INTO bookings (code, customer_id, barber_id, date, start_time, end_time, total_duration, total_price, service_ids, service_names, status, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'online', ?)`,
      args: [
        "KEN-8821",
        c1Id,
        kenId,
        daysAgo21,
        "17:30",
        "18:15",
        45,
        150000,
        JSON.stringify([serviceIds[0]]),
        JSON.stringify(["Combo Ken Signature"]),
        "Cắt gọn hai bên để đi công tác",
      ],
    });
    const b1Id = Number(b1Res.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO hair_records (customer_id, booking_id, barber_id, style_name, tags, technical_note, photo_urls, service_ids, cut_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c1Id,
        b1Id,
        kenId,
        "Mid Skin Fade · Textured Crop",
        JSON.stringify(["Mid Fade", "Tông đơ #1.5", "Tỉa mỏng mái", "Chấn viền sắc"]),
        "Fade trung bình sát trắng 0.5 phần thái dương, giữ độ dày phần đỉnh khoảng 5cm, tỉa tạo kết cấu nhẹ để dễ vuốt sáp khô. Xoáy đỉnh hơi lệch phải, tránh cắt quá ngắn sau gáy.",
        JSON.stringify(["/images/style-mid-fade.jpg"]),
        JSON.stringify([serviceIds[0]]),
        daysAgo21,
      ],
    });

    await db.execute({
      sql: `INSERT INTO hair_records (customer_id, booking_id, barber_id, style_name, tags, technical_note, photo_urls, service_ids, cut_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        c1Id,
        null,
        kenId,
        "Classic Executive Side Part 7/3",
        JSON.stringify(["Side Part", "Taper Fade", "Để đỉnh dài", "Vuốt sáp tự nhiên"]),
        "Chia ngôi 7/3 tự nhiên bên trái, taper gọn gáy và mai bằng tông đơ #2. Phần mái dài qua lông mày 1cm để uốn cong nhẹ khi sấy.",
        JSON.stringify(["/images/style-side-part.jpg"]),
        JSON.stringify([serviceIds[1]]),
        daysAgo52,
      ],
    });

    // Demo Customer 2: Upcoming booking today/tomorrow for Admin Today Board
    const c2Res = await db.execute({
      sql: `INSERT INTO customers (phone, name, notes, last_barber_id, last_service_ids)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        "0912345678",
        "Trần Quốc Bảo",
        "Thích phong cách gọn gàng công sở",
        kenId,
        JSON.stringify([serviceIds[2]]),
      ],
    });
    const c2Id = Number(c2Res.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO bookings (code, customer_id, barber_id, date, start_time, end_time, total_duration, total_price, service_ids, service_names, status, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'online', ?)`,
      args: [
        "KEN-3049",
        c2Id,
        kenId,
        today,
        "15:00",
        "15:40",
        40,
        130000,
        JSON.stringify([serviceIds[2]]),
        JSON.stringify(["Skin Fade & Chấn Viền"]),
        "Chấn viền tự nhiên không quá cao",
      ],
    });

    await db.execute({
      sql: `INSERT INTO bookings (code, customer_id, barber_id, date, start_time, end_time, total_duration, total_price, service_ids, service_names, status, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'online', ?)`,
      args: [
        "KEN-5120",
        c2Id,
        kenId,
        tomorrow,
        "10:00",
        "10:45",
        45,
        150000,
        JSON.stringify([serviceIds[0]]),
        JSON.stringify(["Combo Ken Signature"]),
        null,
      ],
    });

    // Demo Customer 3: Earlier today completed booking
    const c3Res = await db.execute({
      sql: `INSERT INTO customers (phone, name, notes, last_barber_id, last_service_ids)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        "0987654321",
        "Lê Tuấn Anh",
        null,
        kenId,
        JSON.stringify([serviceIds[0], serviceIds[3]]),
      ],
    });
    const c3Id = Number(c3Res.lastInsertRowid);

    await db.execute({
      sql: `INSERT INTO bookings (code, customer_id, barber_id, date, start_time, end_time, total_duration, total_price, service_ids, service_names, status, source, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'walk_in', ?)`,
      args: [
        "KEN-1904",
        c3Id,
        kenId,
        today,
        "10:00",
        "11:05",
        65,
        220000,
        JSON.stringify([serviceIds[0], serviceIds[3]]),
        JSON.stringify(["Combo Ken Signature", "Cạo Râu Khăn Nóng Quý Ông"]),
        "Khách ghé trực tiếp buổi sáng",
      ],
    });
  }
}

export async function getDb(): Promise<Client> {
  const db = getDbClient();
  if (!globalForDb.dbInitialized) {
    globalForDb.dbInitialized = initSchemaAndSeed(db).catch((err) => {
      globalForDb.dbInitialized = undefined;
      throw err;
    });
  }
  await globalForDb.dbInitialized;
  return db;
}
