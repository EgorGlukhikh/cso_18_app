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
        <header className="app-header">
          <div className="container app-header-inner">
            <strong>Центр содействия образованию</strong>
            <Link href="/">Главная</Link>
            <Link href="/events">Календарь</Link>
            <Link href="/analytics">Аналитика</Link>
            <Link href="/teachers">Преподаватели</Link>
            <Link href="/students">Студенты</Link>
            <Link href="/parents">Родители</Link>
            <Link href="/knowledge">База знаний</Link>
            <Link href="/logout">Выйти</Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
