import Link from "next/link";
import {
  Scissors,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  ArrowRight,
  Star,
  CalendarCheck,
  Award,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { LiveChairBanner } from "@/components/LiveChairBanner";
import { OneTapRebookCard } from "@/components/OneTapRebookCard";
import { LinkSpinner } from "@/components/LinkSpinner";
import {
  getActiveBarbers,
  getActiveServices,
  getLiveChairSummary,
  getShopSettings,
  getWorkingHours,
} from "@/lib/queries";
import { formatPhoneDisplay, formatVND, getWeekdayNameVi } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LOOKBOOK_HIGHLIGHTS = [
  {
    title: "Mid Skin Fade · Textured Crop",
    subtitle: "Gọn gàng sắc nét, dễ vuốt sáp mỗi sáng",
    tags: ["Mid Fade", "Tông đơ #1.5", "Chấn viền sắc"],
    image: "/images/style-mid-fade.jpg",
    note: "Muốn cắt kiểu Mid Skin Fade Textured Crop như Lookbook",
  },
  {
    title: "Classic Executive Side Part 7/3",
    subtitle: "Lịch lãm chuẩn quý ông công sở, giữ nếp tự nhiên",
    tags: ["Side Part 7/3", "Taper Fade", "Để đỉnh dài"],
    image: "/images/style-side-part.jpg",
    note: "Muốn cắt kiểu Classic Executive Side Part 7/3 như Lookbook",
  },
];

export default async function HomePage() {
  const [settings, barbers, services, workingHours, liveChair] =
    await Promise.all([
      getShopSettings(),
      getActiveBarbers(),
      getActiveServices(),
      getWorkingHours(),
      getLiveChairSummary(),
    ]);

  const popularServiceId =
    services.find((s) => s.is_popular)?.id ?? services[0]?.id ?? 1;

  return (
    <div className="min-h-screen bg-obsidian bg-barber-grid">
      <Navbar />
      <LiveChairBanner initialData={liveChair} />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-gold/15">
        <div className="absolute inset-0">
          <img
            src="/images/hero-barbershop.jpg"
            alt="Không gian Ken Barbershop"
            className="h-full w-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/88 to-obsidian/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/40" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-obsidian/70 px-3.5 py-1.5 text-xs font-medium tracking-wider text-gold-light backdrop-blur">
              <Award className="h-3.5 w-3.5 text-gold" />
              EST. KEN BARBERSHOP · DARK CLASSIC GROOMING
            </div>

            <h1 className="font-serif text-4xl font-bold leading-[1.12] tracking-tight text-ivory sm:text-5xl lg:text-6xl">
              Chuẩn Mực Cắt Tóc{" "}
              <span className="text-gold-light">Quý Ông Hiện Đại</span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-ivory/80 sm:text-lg">
              Đặt lịch giữ chỗ trong 30 giây — đến là cắt ngay không phải chờ đợi.
              Lưu giữ trọn vẹn <strong className="text-ivory">Hồ sơ kiểu tóc</strong>{" "}
              để mỗi lần quay lại luôn đúng chuẩn phong độ của bạn.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-obsidian shadow-xl shadow-gold/20 transition hover:bg-gold-light sm:text-base"
              >
                <LinkSpinner
                  className="h-4 w-4"
                  fallback={<CalendarCheck className="h-4 w-4" />}
                />
                Đặt lịch ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/passport"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/35 bg-obsidian/75 px-6 py-3.5 text-sm font-medium text-ivory backdrop-blur transition hover:border-gold hover:text-gold-light sm:text-base"
              >
                <LinkSpinner
                  className="h-4 w-4 text-gold"
                  fallback={<Sparkles className="h-4 w-4 text-gold" />}
                />
                Mở Hồ sơ kiểu tóc
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 text-xs text-muted sm:grid-cols-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-gold" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-gold" />
                <span>
                  Hôm nay: {liveChair.open_time} – {liveChair.close_time}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold" />
                <span>Hotline: {formatPhoneDisplay(settings.phone)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1-TAP RE-BOOKING CARD */}
      <OneTapRebookCard />

      {/* 3 SIGNATURE PILLARS */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card-classic rounded-2xl p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ivory">
              Trạng Thái Ghế Trực Tiếp
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Biết ngay thợ đang trống ghế hay dự kiến xong lúc mấy giờ trước khi ghé tiệm — không còn cảnh ngồi chờ vô ích.
            </p>
          </div>

          <div className="card-classic rounded-2xl p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold border border-gold/30">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ivory">
              Đặt Lại Trong 1 Chạm
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Tự động nhớ combo quen thuộc và thợ ruột của bạn. Quay lại đặt lịch chỉ mất 10 giây, không cần mật khẩu rườm rà.
            </p>
          </div>

          <div className="card-classic rounded-2xl p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ivory">
              Hồ Sơ Kiểu Tóc Cá Nhân
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Lưu ảnh thành phẩm cùng công thức tông đơ, độ dài mái và dáng xoáy tóc — mỗi lần đến cắt đều chuẩn ý như lần đầu.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES MENU */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
              Bảng Giá & Dịch Vụ
            </span>
            <h2 className="mt-1.5 font-serif text-3xl font-bold text-ivory sm:text-4xl">
              Menu Quý Ông
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted">
            Giá niêm yết rõ ràng cùng thời lượng chuẩn xác. Chọn trực tiếp dịch vụ bên dưới để giữ chỗ ngay.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="card-classic rounded-2xl p-8 text-center text-sm text-muted">
            Bảng giá dịch vụ đang được cập nhật. Vui lòng liên hệ hotline{" "}
            <strong className="text-gold-light">
              {formatPhoneDisplay(settings.phone)}
            </strong>{" "}
            để được tư vấn trực tiếp.
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((svc) => (
            <Link
              key={svc.id}
              href={`/book?services=${svc.id}`}
              className="card-classic group flex flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-semibold text-ivory transition group-hover:text-gold-light">
                        {svc.name}
                      </h3>
                      {svc.is_popular && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-light border border-gold/30">
                          <Star className="h-2.5 w-2.5 fill-gold text-gold" />
                          Được chọn nhiều
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-[11px] uppercase tracking-wider text-muted/80">
                      {svc.category}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-serif text-xl font-bold text-gold-light">
                      {formatVND(svc.price)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {svc.duration_minutes} phút
                    </div>
                  </div>
                </div>

                {svc.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {svc.description}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-medium text-gold-light/90">
                <span>Đặt lịch dịch vụ này</span>
                <LinkSpinner
                  className="h-4 w-4 text-gold"
                  fallback={
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  }
                />
              </div>
            </Link>
          ))}
        </div>
        )}
      </section>

      {/* BARBER & LOOKBOOK SECTION */}
      <section className="border-y border-gold/15 bg-charcoal/50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Master Barber(s) */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                  {barbers.length === 1 ? "Người Giữ Kéo Chính" : "Đội Ngũ Thợ"}
                </span>
                <h2 className="mt-1.5 font-serif text-3xl font-bold text-ivory">
                  {barbers.length === 1 ? barbers[0].name : "Nghệ Nhân Tại Ken"}
                </h2>
              </div>

              <div className="space-y-4">
                {barbers.map((barber) => {
                  const liveBarber = liveChair.barbers.find(
                    (lb) => lb.id === barber.id
                  );
                  const liveStatus =
                    liveBarber?.current_status ?? barber.current_status;
                  return (
                  <div
                    key={barber.id}
                    className="card-classic rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-serif text-lg font-bold text-gold-light">
                          {barber.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-semibold text-ivory">
                            {barber.name}
                          </h3>
                          <p className="text-xs text-gold/90">{barber.title}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                          liveStatus === "available"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : liveStatus === "busy"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {liveStatus === "available"
                          ? "Đang trống"
                          : liveStatus === "busy"
                          ? "Đang cắt"
                          : "Tạm nghỉ"}
                      </span>
                    </div>

                    {barber.bio && (
                      <p className="text-sm leading-relaxed text-muted">
                        {barber.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-ivory/80">
                        Sở trường: <strong className="text-gold-light">{barber.specialty}</strong>
                      </span>
                      <Link
                        href={`/book?barberId=${barber.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gold-light hover:underline"
                      >
                        Đặt lịch
                        <LinkSpinner
                          className="h-3.5 w-3.5"
                          fallback={<ArrowRight className="h-3.5 w-3.5" />}
                        />
                      </Link>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Lookbook ("Book this look") */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
                  Signature Lookbook
                </span>
                <h2 className="mt-1.5 font-serif text-3xl font-bold text-ivory">
                  Kiểu Tóc Dấu Ấn
                </h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {LOOKBOOK_HIGHLIGHTS.map((look) => (
                  <div
                    key={look.title}
                    className="card-classic group overflow-hidden rounded-2xl"
                  >
                    <div className="relative aspect-[4/4.3] overflow-hidden bg-obsidian">
                      <img
                        src={look.image}
                        alt={look.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                        {look.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-gold/30 bg-obsidian/80 px-2.5 py-0.5 text-[10px] font-medium text-gold-light backdrop-blur"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <div>
                        <h3 className="font-serif text-base font-semibold text-ivory">
                          {look.title}
                        </h3>
                        <p className="text-xs text-muted">{look.subtitle}</p>
                      </div>
                      <Link
                        href={`/book?services=${popularServiceId}&note=${encodeURIComponent(
                          look.note
                        )}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold/35 bg-gold/10 py-2 text-xs font-semibold text-gold-light transition hover:bg-gold hover:text-obsidian"
                      >
                        <LinkSpinner
                          className="h-3.5 w-3.5"
                          fallback={<Scissors className="h-3.5 w-3.5" />}
                        />
                        Đặt cắt kiểu này
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER & HOURS */}
      <footer className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Scissors className="h-5 w-5 -rotate-45 text-gold" />
              <span className="font-serif text-xl font-bold tracking-wider text-ivory">
                {settings.name.toUpperCase()}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              {settings.tagline}
            </p>
            <div className="space-y-1.5 pt-2 text-sm text-ivory/80">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold" />
                {settings.address}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold" />
                {formatPhoneDisplay(settings.phone)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Giờ Phục Vụ
            </h4>
            <ul className="space-y-1.5 text-sm">
              {workingHours.map((wh) => (
                <li
                  key={wh.day_of_week}
                  className="flex items-center justify-between border-b border-white/5 pb-1 text-muted"
                >
                  <span>{getWeekdayNameVi(wh.day_of_week)}</span>
                  <span className={wh.is_open ? "text-ivory/90" : "text-zinc-500"}>
                    {wh.is_open ? `${wh.open_time} – ${wh.close_time}` : "Nghỉ"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
              Truy Cập Nhanh
            </h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/book" className="text-ivory/85 hover:text-gold-light">
                → Đặt lịch cắt tóc trực tuyến
              </Link>
              <Link href="/passport" className="text-ivory/85 hover:text-gold-light">
                → Tra cứu Hồ sơ kiểu tóc (SĐT)
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-muted/70">
          © {new Date().getFullYear()} {settings.name}. Crafted with Dark Classic elegance.
        </div>
      </footer>
    </div>
  );
}
