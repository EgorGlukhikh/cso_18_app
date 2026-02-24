"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Справочник предметов</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={createSubject}>
            <label className="space-y-2">
              <span className="text-sm font-medium">Название предмета</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium">Порядок</span>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} min={0} max={1000} />
            </label>
            <div>
              <Button type="submit">Добавить предмет</Button>
            </div>
          </form>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-modern">
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
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, name: value } : s)));
                        }}
                        onBlur={() => void updateSubject(item, { name: item.name })}
                      />
                    </td>
                    <td>
                      <Input
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
                      <Button type="button" variant="secondary" onClick={() => void updateSubject(item, { isActive: !item.isActive })}>
                        {item.isActive ? "Активен" : "Отключен"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={3} className="empty-state">
                      Предметы еще не добавлены
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
