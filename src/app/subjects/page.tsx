"use client";

import { useEffect, useState } from "react";

type SubjectItem = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export default function SubjectsPage() {
  const [items, setItems] = useState<SubjectItem[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("100");

  async function load() {
    const response = await fetch("/api/subjects?includeInactive=1");
    const payload = (await response.json()) as { items?: SubjectItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Ошибка загрузки предметов");
      return;
    }
    setItems(payload.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sortOrder: Number(sortOrder || "100")
      })
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось добавить предмет");
      return;
    }

    setName("");
    setSortOrder("100");
    await load();
  }

  async function updateSubject(item: SubjectItem, patch: Partial<SubjectItem>) {
    const response = await fetch(`/api/subjects/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось обновить предмет");
      return;
    }
    await load();
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Справочник предметов</h1>
        <form className="grid cols-2" onSubmit={createSubject}>
          <label>
            Название предмета
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Порядок
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0} max={1000} />
          </label>
          <div>
            <button type="submit">Добавить предмет</button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Порядок</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    value={item.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, name: value } : s)));
                    }}
                    onBlur={() => void updateSubject(item, { name: item.name })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.sortOrder}
                    onChange={(e) => {
                      const value = Number(e.target.value || "0");
                      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, sortOrder: value } : s)));
                    }}
                    onBlur={() => void updateSubject(item, { sortOrder: item.sortOrder })}
                    min={0}
                    max={1000}
                  />
                </td>
                <td>
                  <button type="button" className="secondary" onClick={() => void updateSubject(item, { isActive: !item.isActive })}>
                    {item.isActive ? "Активен" : "Отключен"}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={3}>Предметы еще не добавлены</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
