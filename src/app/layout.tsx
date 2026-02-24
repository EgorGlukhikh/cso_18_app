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
          <div className="container-custom">
            <div className="flex items-center gap-3 flex-wrap">
              <strong className="text-lg font-bold mr-2">
                ЦСО
              </strong>
              <nav className="flex items-center gap-1 flex-wrap flex-1">
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/"
                >
                  Главная
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/events"
                >
                  Календарь
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/analytics"
                >
                  Аналитика
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/subjects"
                >
                  Предметы
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/teachers"
                >
                  Преподаватели
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/students"
                >
                  Студенты
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/parents"
                >
                  Родители
                </Link>
                <Link
                  className="px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  href="/knowledge"
                >
                  База знаний
                </Link>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link
                  className="px-4 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  href="/logout"
                >
                  Выйти
                </Link>
              </div>
            </div>
          </div>
        </header>
        <main className="container-custom">{children}</main>
      </body>
    </html>
  );
}
