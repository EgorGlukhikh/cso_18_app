"use client";

import { useEffect, useState } from "react";

type ParentItem = {
  id: string;
  telegramEnabled: boolean;
  morningReminderHour: number;
  user: {
    fullName: string;
    email: string;
    phone: string | null;
  };
};

export default function ParentsPage() {
  const [items, setItems] = useState<ParentItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [morningReminderHour, setMorningReminderHour] = useState("8");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/parents");
    const payload = (await response.json()) as { items?: ParentItem[]; error?: string };
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

    const response = await fetch("/api/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone: phone || undefined,
        telegramEnabled,
        morningReminderHour: Number(morningReminderHour || "8")
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать родителя");
      return;
    }

    setFullName("");
    setEmail("");
    setPhone("");
    setTelegramEnabled(false);
    setMorningReminderHour("8");
    await load();
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Родители</h1>
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
            Час утреннего напоминания (0-23)
            <input
              type="number"
              min={0}
              max={23}
              value={morningReminderHour}
              onChange={(e) => setMorningReminderHour(e.target.value)}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={(e) => setTelegramEnabled(e.target.checked)}
            />
            Telegram-уведомления включены
          </label>
          <div>
            <button type="submit">Добавить родителя</button>
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
              <th>Telegram</th>
              <th>Час напоминания</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.user.fullName}</td>
                <td>{item.user.email}</td>
                <td>{item.telegramEnabled ? "Вкл" : "Выкл"}</td>
                <td>{item.morningReminderHour}:00</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={4}>Пока нет родителей</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
