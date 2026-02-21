"use client";

import { useEffect, useMemo, useState } from "react";

type TeacherItem = {
  id: string;
  subjects: string[];
  canBeCurator: boolean;
  hourlyRateCents: number | null;
  user: {
    fullName: string;
    email: string;
    phone: string | null;
  };
};

export default function TeachersPage() {
  const [items, setItems] = useState<TeacherItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subjects, setSubjects] = useState("");
  const [canBeCurator, setCanBeCurator] = useState(false);
  const [hourRate, setHourRate] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/teachers");
    const payload = (await response.json()) as { items?: TeacherItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Ошибка загрузки");
      return;
    }
    setItems(payload.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone: phone || undefined,
        subjects: subjects
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        canBeCurator,
        hourlyRateCents: hourRate ? Math.round(Number(hourRate) * 100) : undefined
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать преподавателя");
      return;
    }

    setFullName("");
    setEmail("");
    setPhone("");
    setSubjects("");
    setCanBeCurator(false);
    setHourRate("");
    await load();
  }

  const total = useMemo(() => items.length, [items]);

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Преподаватели</h1>
        <p>Всего преподавателей: {total}</p>
        <form className="grid cols-2" onSubmit={onSubmit}>
          <label>
            ФИО
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Телефон
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Ставка в час (руб)
            <input value={hourRate} onChange={(e) => setHourRate(e.target.value)} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Предметы (через запятую)
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={canBeCurator}
              onChange={(e) => setCanBeCurator(e.target.checked)}
            />
            Может быть куратором
          </label>
          <div>
            <button type="submit">Добавить преподавателя</button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Предметы</th>
              <th>Куратор</th>
              <th>Ставка</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.user.fullName}</td>
                <td>{item.user.email}</td>
                <td>{item.subjects.join(", ") || "-"}</td>
                <td>{item.canBeCurator ? "Да" : "Нет"}</td>
                <td>{item.hourlyRateCents ? `${(item.hourlyRateCents / 100).toFixed(2)} ₽` : "-"}</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={5}>Пока нет преподавателей</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
