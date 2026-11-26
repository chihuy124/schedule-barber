"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, Sparkles, CalendarCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Trang chủ" },
    { href: "/book", label: "Đặt lịch" },
    { href: "/passport", label: "Hồ sơ tóc" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gold/15 bg-obsidian/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-charcoal text-gold transition-colors group-hover:border-gold group-hover:bg-gold/10">
            <Scissors className="h-4 w-4 -rotate-45" />
          </div>
          <div className="leading-tight">
            <span className="block font-serif text-base font-semibold tracking-wider text-ivory sm:text-lg">
              KEN BARBERSHOP
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.22em] text-gold/80 sm:block">
              Gentlemen&apos;s Grooming
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? "text-gold-light"
                    : "text-muted hover:text-ivory"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/passport"
            className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-3 py-2 text-xs font-medium text-ivory/90 transition hover:border-gold/40 hover:text-gold-light md:hidden"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Hồ sơ tóc
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-obsidian shadow-lg shadow-gold/15 transition hover:bg-gold-light sm:px-5 sm:text-sm"
          >
            <CalendarCheck className="h-4 w-4" />
            Đặt lịch
          </Link>
        </div>
      </div>
    </header>
  );
}
