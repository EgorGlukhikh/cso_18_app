"use client";

import { useState } from "react";

type Summary = {
  period: { from: string | null; to: string | null };
  eventCounts: { total: number; planned: number; completed: number; canceled: number };
  hours: { planned: number; factual: number; billable: number };
  conversion: { attendanceRate: number };
};

type CancelReason = {
  reasonId: string | null;
  reasonName: string;
  count: number;
};

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const [summaryRes, reasonsRes] = await Promise.all([
      fetch(`/api/reports/summary?${query.toString()}`),
      fetch(`/api/reports/cancel-reasons?${query.toString()}`)
    ]);

    setSummary((await summaryRes.json()) as Summary);
    setReasons(((await reasonsRes.json()) as { items: CancelReason[] }).items ?? []);
    setLoading(false);
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Аналитика</h1>
        <div className="grid cols-2">
          <label>
            Период с
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Период по
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={load} disabled={loading}>
            {loading ? "Загрузка..." : "Построить"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Свод по часам</h2>
        {summary ? (
          <table>
            <tbody>
              <tr>
                <th>Запланировано событий</th>
                <td>{summary.eventCounts.planned}</td>
              </tr>
              <tr>
                <th>Состоялось событий</th>
                <td>{summary.eventCounts.completed}</td>
              </tr>
              <tr>
                <th>Не состоялось событий</th>
                <td>{summary.eventCounts.canceled}</td>
              </tr>
              <tr>
                <th>Часы план</th>
                <td>{summary.hours.planned}</td>
              </tr>
              <tr>
                <th>Часы факт</th>
                <td>{summary.hours.factual}</td>
              </tr>
              <tr>
                <th>Часы к оплате</th>
                <td>{summary.hours.billable}</td>
              </tr>
              <tr>
                <th>Доходимость</th>
                <td>{summary.conversion.attendanceRate}%</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>Выберите период и нажмите &quot;Построить&quot;.</p>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Причины несостоявшихся</h2>
        <table>
          <thead>
            <tr>
              <th>Причина</th>
              <th>Количество</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((item) => (
              <tr key={`${item.reasonId}-${item.reasonName}`}>
                <td>{item.reasonName}</td>
                <td>{item.count}</td>
              </tr>
            ))}
            {!reasons.length && (
              <tr>
                <td colSpan={2}>Нет данных.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
