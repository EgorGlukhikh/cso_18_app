"use client";

import { useMemo, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  activityType: string;
  status: string;
  plannedStartAt: string;
  plannedEndAt: string;
  billableHours: number;
};

export default function EventsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (status) query.set("status", status);
    return query.toString();
  }, [from, to, status]);

  async function loadEvents() {
    setLoading(true);
    const response = await fetch(`/api/events${params ? `?${params}` : ""}`);
    const payload = (await response.json()) as { items?: EventItem[] };
    setData(payload.items ?? []);
    setLoading(false);
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>События</h1>
        <p>Табличный вид с фильтрами. Календарный вид будет добавлен следующим шагом.</p>
        <div className="grid cols-2">
          <label>
            Дата с
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Дата по
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Все</option>
              <option value="PLANNED">Запланировано</option>
              <option value="COMPLETED">Состоялось</option>
              <option value="CANCELED">Не состоялось</option>
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={loadEvents} disabled={loading}>
              {loading ? "Загрузка..." : "Применить фильтры"}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Название</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Часы к оплате</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.plannedStartAt).toLocaleString("ru-RU")}</td>
                <td>{item.title}</td>
                <td>{item.activityType}</td>
                <td>{item.status}</td>
                <td>{item.billableHours}</td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={5}>Нет данных. Примените фильтры или создайте события через API.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

