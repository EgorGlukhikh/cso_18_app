"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ScheduleItem = {
  id: string;
  title: string;
  plannedStartAt: string;
  plannedEndAt: string;
  category: "individual" | "group" | "administrative";
  status: "PLANNED" | "COMPLETED" | "CANCELED";
};

type TeacherItem = {
  id: string;
  subjects: string[];
  canBeCurator: boolean;
  hourlyRateCents: number | null;
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
};

type ViewMode = "calendar" | "list";

type StudentOption = { id: string; user: { id: string; fullName: string } };
type SubjectItem = { id: string; name: string; isActive: boolean };

function colorByCategory(category: ScheduleItem["category"]) {
  if (category === "individual") return { bg: "#e9f2ff", border: "#2d7dff" };
  if (category === "group") return { bg: "#eaf9f0", border: "#20a35a" };
  return { bg: "#fff4e6", border: "#f29f3f" };
}

function toDayString(value: Date) {
  return value.toLocaleDateString("sv-SE");
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function endOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default function TeachersPage() {
  const [items, setItems] = useState<TeacherItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [subjectsCatalog, setSubjectsCatalog] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [newCurator, setNewCurator] = useState(false);

  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);
  const [editSubjects, setEditSubjects] = useState<string[]>([]);
  const [editCurator, setEditCurator] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [from, setFrom] = useState(toDayString(startOfMonth(new Date())));
  const [to, setTo] = useState(toDayString(endOfMonth(new Date())));
  const [statusFilter, setStatusFilter] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

  const [createTitle, setCreateTitle] = useState("");
  const [createSubject, setCreateSubject] = useState("");
  const [createType, setCreateType] = useState<"INDIVIDUAL_LESSON" | "GROUP_LESSON" | "TEACHERS_GENERAL_MEETING">("INDIVIDUAL_LESSON");
  const [createDate, setCreateDate] = useState(toDayString(new Date()));
  const [createTime, setCreateTime] = useState("10:00");
  const [createDurationHours, setCreateDurationHours] = useState("1");
  const [createStudentIds, setCreateStudentIds] = useState<string[]>([]);
  const [createdByUserId, setCreatedByUserId] = useState("");

  async function load() {
    const [teachersRes, studentsRes, subjectsRes, meRes] = await Promise.all([
      fetch("/api/teachers"),
      fetch("/api/students"),
      fetch("/api/subjects"),
      fetch("/api/auth/me")
    ]);

    const teachersPayload = (await teachersRes.json()) as { items?: TeacherItem[]; error?: string };
    if (!teachersRes.ok) {
      setError(teachersPayload.error ?? "Ошибка загрузки");
      return;
    }
    setItems(teachersPayload.items ?? []);

    if (studentsRes.ok) {
      const studentsPayload = (await studentsRes.json()) as { items?: StudentOption[] };
      setStudents(studentsPayload.items ?? []);
    }

    if (subjectsRes.ok) {
      const subjectsPayload = (await subjectsRes.json()) as { items?: SubjectItem[] };
      const names = (subjectsPayload.items ?? []).filter((s) => s.isActive).map((s) => s.name);
      setSubjectsCatalog(names);
      if (!createSubject && names[0]) setCreateSubject(names[0]);
    }

    if (meRes.ok) {
      const mePayload = (await meRes.json()) as { user?: { id: string } };
      if (mePayload.user?.id) setCreatedByUserId(mePayload.user.id);
    }
  }

  async function loadSchedule(teacherId: string) {
    const response = await fetch(`/api/teachers/${teacherId}/schedule?from=${from}&to=${to}`);
    if (!response.ok) {
      setSchedule([]);
      return;
    }
    const payload = (await response.json()) as { items: ScheduleItem[] };
    setSchedule(payload.items ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTeacher) {
      void loadSchedule(activeTeacher.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeacher, from, to]);

  useEffect(() => {
    if (!createSubject && subjectsCatalog[0]) {
      setCreateSubject(subjectsCatalog[0]);
    }
  }, [subjectsCatalog, createSubject]);

  function toggleSubject(list: string[], value: string, setter: (items: string[]) => void) {
    if (list.includes(value)) setter(list.filter((v) => v !== value));
    else setter([...list, value]);
  }

  async function openTeacher(teacher: TeacherItem) {
    setActiveTeacher(teacher);
    setEditSubjects(teacher.subjects ?? []);
    setEditCurator(Boolean(teacher.canBeCurator));
    const preferred = teacher.subjects.find((s) => subjectsCatalog.includes(s)) ?? subjectsCatalog[0] ?? "";
    setCreateSubject(preferred);
  }

  async function saveTeacher() {
    if (!activeTeacher) return;
    const response = await fetch(`/api/teachers/${activeTeacher.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjects: editSubjects,
        canBeCurator: editCurator
      })
    });
    if (!response.ok) {
      setError("Не удалось обновить преподавателя");
      return;
    }
    await load();
    await loadSchedule(activeTeacher.id);
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
        subjects: newSubjects,
        canBeCurator: newCurator
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
    setNewSubjects([]);
    setNewCurator(false);
    await load();
  }

  async function createEventForTeacher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTeacher || !createdByUserId) return;

    const [hours, minutes] = createTime.split(":").map(Number);
    const start = new Date(`${createDate}T00:00:00`);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + Number(createDurationHours) * 60 * 60000);

    const participants = [{ userId: activeTeacher.user.id, participantRole: "TEACHER" }];
    for (const sid of createStudentIds) {
      participants.push({ userId: sid, participantRole: "STUDENT" });
    }

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: createTitle,
        subject: createSubject,
        activityType: createType,
        plannedStartAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
        createdByUserId,
        participants
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать занятие");
      return;
    }

    setCreateTitle("");
    setCreateSubject("");
    setCreateType("INDIVIDUAL_LESSON");
    setCreateStudentIds([]);
    await loadSchedule(activeTeacher.id);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.user.fullName.toLowerCase().includes(q));
  }, [items, search]);

  const visibleSchedule = useMemo(() => {
    if (!statusFilter) return schedule;
    return schedule.filter((item) => item.status === statusFilter);
  }, [schedule, statusFilter]);

  const monthDays = useMemo(() => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [from, to]);

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Преподаватели</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ maxWidth: 380 }} placeholder="Поиск по ФИО" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" onClick={() => setAddOpen(true)}>Добавить</button>
          <Link href="/subjects" className="secondary" style={{ display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: 10 }}>
            Справочник предметов
          </Link>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead>
            <tr><th>ФИО</th><th>Специализации</th><th>Куратор</th></tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => void openTeacher(item)} style={{ cursor: "pointer" }}>
                <td>{item.user.fullName}</td>
                <td>{item.subjects.join(", ") || "-"}</td>
                <td>{item.canBeCurator ? "Да" : "Нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {addOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(760px, 95vw)" }}>
            <h2 style={{ marginTop: 0 }}>Добавить преподавателя</h2>
            <form className="grid cols-2" onSubmit={createTeacher}>
              <label>ФИО<input value={newName} onChange={(e) => setNewName(e.target.value)} required /></label>
              <label>Email<input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></label>
              <label>Телефон<input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} /></label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={newCurator} onChange={(e) => setNewCurator(e.target.checked)} />
                Готов к кураторству
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Специализации</strong>
                <div className="icon-switch" style={{ marginTop: 8 }}>
                  {subjectsCatalog.map((subject) => (
                    <button key={subject} type="button" className={newSubjects.includes(subject) ? "" : "secondary"} onClick={() => toggleSubject(newSubjects, subject, setNewSubjects)}>
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
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
          <div className="card" style={{ width: "min(1080px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{activeTeacher.user.fullName}</h2>
              <button className="secondary" onClick={() => setActiveTeacher(null)}>Закрыть</button>
            </div>

            <div className="grid cols-2">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={editCurator} onChange={(e) => setEditCurator(e.target.checked)} />
                Готов к кураторству
              </label>
              <div />
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Специализации</strong>
                <div className="icon-switch" style={{ marginTop: 8 }}>
                  {subjectsCatalog.map((subject) => (
                    <button key={subject} type="button" className={editSubjects.includes(subject) ? "" : "secondary"} onClick={() => toggleSubject(editSubjects, subject, setEditSubjects)}>
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><button onClick={saveTeacher}>Сохранить изменения</button></div>

            <h3 style={{ marginTop: 18 }}>Расписание преподавателя</h3>
            <div className="icon-switch" style={{ marginBottom: 10 }}>
              <button type="button" className={viewMode === "calendar" ? "" : "secondary"} onClick={() => setViewMode("calendar")}>🗓️</button>
              <button type="button" className={viewMode === "list" ? "" : "secondary"} onClick={() => setViewMode("list")}>📋</button>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 170 }} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 170 }} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
                <option value="">Все статусы</option>
                <option value="PLANNED">Запланировано</option>
                <option value="COMPLETED">Состоялось</option>
                <option value="CANCELED">Не состоялось</option>
              </select>
            </div>

            {viewMode === "calendar" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 8 }}>
                {monthDays.map((day) => {
                  const key = toDayString(day);
                  const dayItems = visibleSchedule.filter((item) => toDayString(new Date(item.plannedStartAt)) === key);
                  return (
                    <div key={key} className="card" style={{ margin: 0, padding: 8, minHeight: 120 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{day.getDate()}</div>
                      {dayItems.slice(0, 3).map((item) => {
                        const c = colorByCategory(item.category);
                        return <div key={item.id} style={{ border: `1px solid ${c.border}`, background: c.bg, borderRadius: 6, padding: "4px 6px", marginBottom: 4, fontSize: 12 }}>{item.title}</div>;
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid">
                {visibleSchedule.map((item) => {
                  const c = colorByCategory(item.category);
                  return <div key={item.id} style={{ border: `1px solid ${c.border}`, background: c.bg, borderRadius: 8, padding: "8px 10px" }}>{new Date(item.plannedStartAt).toLocaleString("ru-RU")} - {item.title}</div>;
                })}
              </div>
            )}

            <h3 style={{ marginTop: 18 }}>Быстро добавить занятие этому преподавателю</h3>
            <form className="grid cols-2" onSubmit={createEventForTeacher}>
              <label>Название<input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} required /></label>
              <label>
                Предмет
                <select value={createSubject} onChange={(e) => setCreateSubject(e.target.value)} required>
                  {(activeTeacher?.subjects?.length ? activeTeacher.subjects : subjectsCatalog).length ? (
                    (activeTeacher?.subjects?.length ? activeTeacher.subjects : subjectsCatalog).map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))
                  ) : (
                    <option value="">Нет предметов в справочнике</option>
                  )}
                </select>
              </label>
              <label>
                Тип
                <select value={createType} onChange={(e) => setCreateType(e.target.value as typeof createType)}>
                  <option value="INDIVIDUAL_LESSON">Индивидуальное</option>
                  <option value="GROUP_LESSON">Групповое</option>
                  <option value="TEACHERS_GENERAL_MEETING">Административное</option>
                </select>
              </label>
              <label>Дата<input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} required /></label>
              <label>Время<input type="time" step={1800} value={createTime} onChange={(e) => setCreateTime(e.target.value)} required /></label>
              <label>
                Длительность (часы)
                <select value={createDurationHours} onChange={(e) => setCreateDurationHours(e.target.value)}>
                  <option value="1">1 час</option>
                  <option value="2">2 часа</option>
                  <option value="3">3 часа</option>
                  <option value="4">4 часа</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Студенты
                <select multiple value={createStudentIds} onChange={(e) => setCreateStudentIds(Array.from(e.target.selectedOptions).map((o) => o.value))}>
                  {students.map((student) => <option key={student.id} value={student.user.id}>{student.user.fullName}</option>)}
                </select>
              </label>
              <div><button type="submit">Создать событие</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
