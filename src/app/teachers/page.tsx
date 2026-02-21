"use client";

import { useEffect, useMemo, useState } from "react";

type ScheduleItem = {
  id: string;
  title: string;
  plannedStartAt: string;
  plannedEndAt: string;
  category: "individual" | "group" | "administrative";
};

type TeacherItem = {
  id: string;
  subjects: string[];
  canBeCurator: boolean;
  hourlyRateCents: number | null;
  user: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
};

const SUBJECTS = [
  "Английский язык",
  "Русский язык",
  "Математика",
  "Клубная деятельность",
  "Психология",
  "История",
  "Биология"
];

function colorByCategory(category: ScheduleItem["category"]) {
  if (category === "individual") return { bg: "#e9f2ff", border: "#2d7dff" };
  if (category === "group") return { bg: "#eaf9f0", border: "#20a35a" };
  return { bg: "#fff4e6", border: "#f29f3f" };
}

export default function TeachersPage() {
  const [items, setItems] = useState<TeacherItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSubject, setNewSubject] = useState(SUBJECTS[0]);
  const [newCurator, setNewCurator] = useState("no");

  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);
  const [editSubject, setEditSubject] = useState(SUBJECTS[0]);
  const [editCurator, setEditCurator] = useState("no");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

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

  async function openTeacher(teacher: TeacherItem) {
    setActiveTeacher(teacher);
    setEditSubject(teacher.subjects[0] ?? SUBJECTS[0]);
    setEditCurator(teacher.canBeCurator ? "yes" : "no");

    const response = await fetch(`/api/teachers/${teacher.id}/schedule`);
    if (response.ok) {
      const payload = (await response.json()) as { items: ScheduleItem[] };
      setSchedule(payload.items ?? []);
    } else {
      setSchedule([]);
    }
  }

  async function saveTeacher() {
    if (!activeTeacher) return;
    const response = await fetch(`/api/teachers/${activeTeacher.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjects: [editSubject],
        canBeCurator: editCurator === "yes"
      })
    });
    if (!response.ok) {
      setError("Не удалось обновить преподавателя");
      return;
    }
    await load();
    setActiveTeacher(null);
  }

  async function createTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: newName,
        email: newEmail,
        phone: newPhone || undefined,
        subjects: [newSubject],
        canBeCurator: newCurator === "yes"
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать преподавателя");
      return;
    }

    setAddOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewSubject(SUBJECTS[0]);
    setNewCurator("no");
    await load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.user.fullName.toLowerCase().includes(q));
  }, [items, search]);

  const groupedSchedule = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of schedule) {
      const key = new Date(item.plannedStartAt).toLocaleDateString("ru-RU", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(item);
    }
    return Array.from(map.entries());
  }, [schedule]);

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Преподаватели</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ maxWidth: 380 }}
            placeholder="Поиск по ФИО"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={() => setAddOpen(true)}>
            Добавить
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Предмет</th>
              <th>Куратор</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => void openTeacher(item)} style={{ cursor: "pointer" }}>
                <td>{item.user.fullName}</td>
                <td>{item.subjects.join(", ") || "-"}</td>
                <td>{item.canBeCurator ? "Да" : "Нет"}</td>
              </tr>
            ))}
            {!filtered.length ? (
              <tr>
                <td colSpan={3}>Нет преподавателей</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {addOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(640px, 95vw)" }}>
            <h2 style={{ marginTop: 0 }}>Добавить преподавателя</h2>
            <form className="grid cols-2" onSubmit={createTeacher}>
              <label>ФИО<input value={newName} onChange={(e) => setNewName(e.target.value)} required /></label>
              <label>Email<input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></label>
              <label>Телефон<input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></label>
              <label>
                Предмет
                <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Кураторство
                <select value={newCurator} onChange={(e) => setNewCurator(e.target.value)}>
                  <option value="yes">Да</option>
                  <option value="no">Нет</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                <button type="submit">Сохранить</button>
                <button type="button" className="secondary" onClick={() => setAddOpen(false)}>Закрыть</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeTeacher ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(860px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{activeTeacher.user.fullName}</h2>
              <button className="secondary" onClick={() => setActiveTeacher(null)}>Закрыть</button>
            </div>

            <div className="grid cols-2">
              <label>
                Предмет
                <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Кураторство
                <select value={editCurator} onChange={(e) => setEditCurator(e.target.value)}>
                  <option value="yes">Да</option>
                  <option value="no">Нет</option>
                </select>
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={saveTeacher}>Сохранить изменения</button>
            </div>

            <h3 style={{ marginTop: 18 }}>График занятости</h3>
            {groupedSchedule.length ? (
              <div className="grid">
                {groupedSchedule.map(([day, dayItems]) => (
                  <div key={day} className="card" style={{ margin: 0, padding: 10 }}>
                    <strong>{day}</strong>
                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                      {dayItems.map((item) => {
                        const c = colorByCategory(item.category);
                        return (
                          <div key={item.id} style={{ border: `1px solid ${c.border}`, background: c.bg, borderRadius: 8, padding: "6px 8px" }}>
                            {new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} {item.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>На выбранный период занятий нет.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
