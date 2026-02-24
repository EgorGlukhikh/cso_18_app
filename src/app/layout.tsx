import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Центр содействия образованию",
  description: "CRM и расписание центра содействия образованию"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <body>
        <header className="sticky top-0 z-50 border-b-2 border-border bg-card/80 backdrop-blur-xl">
          <div className="container-custom !py-4 md:!py-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="text-2xl font-black tracking-tight">
                ЦСО
              </Link>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link
                  className="rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 md:px-4"
                  href="/logout"
                >
                  Выйти
                </Link>
              </div>
            </div>

            <nav className="mt-3 hidden flex-wrap items-center gap-1 md:flex">
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/">Главная</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/events">Календарь</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/teacher-calendar">Календарь педагога</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/analytics">Аналитика</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/subjects">Предметы</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/teachers">Преподаватели</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/students">Студенты</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/parents">Родители</Link>
              <Link className="rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted" href="/knowledge">База знаний</Link>
            </nav>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/">Главная</Link>
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/events">Календарь</Link>
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/teacher-calendar">Педагог</Link>
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/analytics">Аналитика</Link>
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/students">Студенты</Link>
              <Link className="shrink-0 rounded-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold" href="/parents">Родители</Link>
            </nav>
          </div>
        </header>
        <main className="container-custom">{children}</main>
      </body>
    </html>
  );
}
