import Link from "next/link";

const links = [
  { href: "/events", icon: "🗓️", title: "Расписание", text: "Календарь и список занятий" },
  { href: "/students", icon: "🎓", title: "Студенты", text: "Карточки учеников" },
  { href: "/parents", icon: "👨‍👩‍👧", title: "Родители", text: "Связи и напоминания" },
  { href: "/teachers", icon: "👩‍🏫", title: "Преподаватели", text: "Педагоги и кураторы" },
  { href: "/analytics", icon: "📊", title: "Аналитика", text: "План/факт и причины" },
  { href: "/knowledge", icon: "📚", title: "База знаний", text: "Инструкции для сотрудников" }
];

export default function HomePage() {
  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>CRM центра содействия образованию</h1>
        <p>Быстрый доступ к разделам через иконки.</p>
      </section>

      <section className="quick-links">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="quick-link">
            <span className="icon">{item.icon}</span>
            <strong>{item.title}</strong>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>{item.text}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
