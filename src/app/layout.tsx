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
  title: "BP Education Center",
  description: "Scheduling and hours accounting"
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
            <strong>Education Center ERP</strong>
            <Link href="/">Главная</Link>
            <Link href="/events">События</Link>
            <Link href="/analytics">Аналитика</Link>
            <Link href="/teachers">Преподаватели</Link>
            <Link href="/students">Студенты</Link>
            <Link href="/parents">Родители</Link>
            <Link href="/logout">Выйти</Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
