import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="ru">
      <body>
        <header style={{ borderBottom: "1px solid #dce3ea", background: "#fff" }}>
          <div className="container" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <strong>Education Center ERP</strong>
            <Link href="/">Главная</Link>
            <Link href="/events">События</Link>
            <Link href="/analytics">Аналитика</Link>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

