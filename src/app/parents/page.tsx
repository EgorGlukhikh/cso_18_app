"use client";

import { useEffect, useState } from "react";

type ParentItem = {
  id: string;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  morningReminderHour: number;
  comment: string | null;
  user: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  studentLinks: Array<{
    id: string;
    student: { id: string; user: { fullName: string } };
    relationship: string | null;
  }>;
};

type StudentOption = { id: string; user: { fullName: string } };

export default function ParentsPage() {
  const [items, setItems] = useState<ParentItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [morningReminderHour, setMorningReminderHour] = useState("8");
  const [newComment, setNewComment] = useState("");

  const [activeParent, setActiveParent] = useState<ParentItem | null>(null);
  const [parentPhone, setParentPhone] = useState("");
  const [parentComment, setParentComment] = useState("");
  const [parentTgEnabled, setParentTgEnabled] = useState(false);
  const [parentReminderHour, setParentReminderHour] = useState("8");
  const [linkStudentId, setLinkStudentId] = useState("");
  const [relationship, setRelationship] = useState("Ребенок");

  async function load() {
    const [parentsRes, studentsRes] = await Promise.all([fetch("/api/parents"), fetch("/api/students")]);

    const parentsPayload = (await parentsRes.json()) as { items?: ParentItem[]; error?: string };
    if (!parentsRes.ok) {
      setError(parentsPayload.error ?? "Ошибка загрузки");
      return;
    }
    setItems(parentsPayload.items ?? []);

    if (studentsRes.ok) {
      const studentsPayload = (await studentsRes.json()) as { items?: StudentOption[] };
      setStudents(studentsPayload.items ?? []);
    }
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
        morningReminderHour: Number(morningReminderHour || "8"),
        comment: newComment || undefined
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
    setNewComment("");
    setAddOpen(false);
    await load();
  }

  async function openParent(parent: ParentItem) {
    const response = await fetch(`/api/parents/${parent.id}`);
    if (!response.ok) return;
    const payload = (await response.json()) as ParentItem;
    setActiveParent(payload);
    setParentPhone(payload.user.phone ?? "");
    setParentComment(payload.comment ?? "");
    setParentTgEnabled(payload.telegramEnabled);
    setParentReminderHour(String(payload.morningReminderHour));
  }

  async function saveParent() {
    if (!activeParent) return;
    const response = await fetch(`/api/parents/${activeParent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: parentPhone,
        comment: parentComment,
        telegramEnabled: parentTgEnabled,
        morningReminderHour: Number(parentReminderHour || "8")
      })
    });

    if (!response.ok) {
      setError("Не удалось сохранить родителя");
      return;
    }

    await load();
    const refreshed = await response.json();
    setActiveParent(refreshed);
  }

  async function addStudentLink() {
    if (!activeParent || !linkStudentId) return;

    const response = await fetch("/api/parent-student-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentProfileId: activeParent.id,
        studentProfileId: linkStudentId,
        relationship,
        receivesMorningReminder: true
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось привязать ребенка");
      return;
    }

    await openParent(activeParent);
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Родители</h1>
        <button type="button" onClick={() => setAddOpen(true)}>Добавить</button>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead><tr><th>ФИО</th><th>Телефон</th><th>Telegram</th><th>Дети</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => void openParent(item)}>
                <td>{item.user.fullName}</td>
                <td>{item.user.phone || "-"}</td>
                <td>{item.telegramEnabled ? "Подключен" : "Не подключен"}</td>
                <td>{item.studentLinks.map((s) => s.student.user.fullName).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {addOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(760px, 95vw)" }}>
            <h2 style={{ marginTop: 0 }}>Добавить родителя</h2>
            <form className="grid cols-2" onSubmit={onSubmit}>
              <label>ФИО<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
              <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Телефон<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label>Час напоминания<input type="number" min={0} max={23} value={morningReminderHour} onChange={(e) => setMorningReminderHour(e.target.value)} /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} />
                Telegram включен
              </label>
              <label style={{ gridColumn: "1 / -1" }}>Комментарий<textarea rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} /></label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Сохранить</button>
                <button type="button" className="secondary" onClick={() => setAddOpen(false)}>Закрыть</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeParent ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(860px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{activeParent.user.fullName}</h2>
              <button className="secondary" onClick={() => setActiveParent(null)}>Закрыть</button>
            </div>

            <div className="grid cols-2">
              <label>Телефон<input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} /></label>
              <label>Час напоминания<input type="number" min={0} max={23} value={parentReminderHour} onChange={(e) => setParentReminderHour(e.target.value)} /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={parentTgEnabled} onChange={(e) => setParentTgEnabled(e.target.checked)} />
                Telegram включен
              </label>
              <label style={{ gridColumn: "1 / -1" }}>Комментарий<textarea rows={3} value={parentComment} onChange={(e) => setParentComment(e.target.value)} /></label>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 8 }}>Статус Telegram: {activeParent.telegramChatId ? "Привязан" : "Не привязан"}</p>
            <button onClick={saveParent}>Сохранить</button>

            <h3 style={{ marginTop: 18 }}>Привязанные дети</h3>
            <div className="grid" style={{ gap: 8 }}>
              {activeParent.studentLinks.map((link) => (
                <div key={link.id} className="card" style={{ margin: 0, padding: 8 }}>
                  {link.student.user.fullName} ({link.relationship || "ребенок"})
                </div>
              ))}
            </div>

            <div className="icon-switch" style={{ marginTop: 8 }}>
              <select value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} style={{ maxWidth: 280 }}>
                <option value="">Выберите ребенка</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.user.fullName}</option>)}
              </select>
              <input value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" onClick={addStudentLink}>Привязать ребенка</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
