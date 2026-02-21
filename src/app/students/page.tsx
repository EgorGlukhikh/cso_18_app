"use client";

import { useEffect, useMemo, useState } from "react";

type ParentLink = {
  id: string;
  relationship: string | null;
  receivesMorningReminder: boolean;
  parent: { id: string; user: { fullName: string } };
};

type StudentItem = {
  id: string;
  grade: string | null;
  problemSubjects: string[];
  diagnosticsSummary: string | null;
  requestText: string | null;
  comment: string | null;
  iopDocxFileName: string | null;
  user: {
    id: string;
    fullName: string;
    phone: string | null;
  };
  parentLinks: ParentLink[];
};

type ParentOption = { id: string; user: { fullName: string } };
type TeacherOption = { id: string; user: { id: string; fullName: string } };
type SubjectItem = { id: string; name: string; isActive: boolean };

type ScheduleItem = {
  id: string;
  title: string;
  plannedStartAt: string;
  plannedEndAt: string;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  category: "individual" | "group" | "administrative";
};

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

function colorByCategory(category: ScheduleItem["category"]) {
  if (category === "individual") return { bg: "#e9f2ff", border: "#2d7dff" };
  if (category === "group") return { bg: "#eaf9f0", border: "#20a35a" };
  return { bg: "#fff4e6", border: "#f29f3f" };
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentsPage() {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjectsCatalog, setSubjectsCatalog] = useState<string[]>([]);
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [problemSubjects, setProblemSubjects] = useState("");
  const [requestText, setRequestText] = useState("");

  const [activeStudent, setActiveStudent] = useState<StudentItem | null>(null);
  const [comment, setComment] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [linkParentId, setLinkParentId] = useState("");
  const [linkRelationship, setLinkRelationship] = useState("Родитель");

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [from, setFrom] = useState(toDayString(startOfMonth(new Date())));
  const [to, setTo] = useState(toDayString(endOfMonth(new Date())));
  const [statusFilter, setStatusFilter] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventSubject, setEventSubject] = useState("");
  const [eventType, setEventType] = useState<"INDIVIDUAL_LESSON" | "GROUP_LESSON">("INDIVIDUAL_LESSON");
  const [eventDate, setEventDate] = useState(toDayString(new Date()));
  const [eventTime, setEventTime] = useState("10:00");
  const [eventDurationHours, setEventDurationHours] = useState("1");
  const [eventTeacherId, setEventTeacherId] = useState("");

  const [iopName, setIopName] = useState<string | null>(null);
  const [iopData, setIopData] = useState<string | null>(null);

  async function load() {
    const [studentsRes, parentsRes, teachersRes, subjectsRes, meRes] = await Promise.all([
      fetch("/api/students"),
      fetch("/api/parents"),
      fetch("/api/teachers"),
      fetch("/api/subjects"),
      fetch("/api/auth/me")
    ]);

    const studentsPayload = (await studentsRes.json()) as { items?: StudentItem[]; error?: string };
    if (!studentsRes.ok) {
      setError(studentsPayload.error ?? "Ошибка загрузки");
      return;
    }
    setItems(studentsPayload.items ?? []);

    if (parentsRes.ok) {
      const parentsPayload = (await parentsRes.json()) as { items?: ParentOption[] };
      setParents(parentsPayload.items ?? []);
    }

    if (teachersRes.ok) {
      const teachersPayload = (await teachersRes.json()) as { items?: TeacherOption[] };
      setTeachers(teachersPayload.items ?? []);
      if (teachersPayload.items?.[0]) setEventTeacherId(teachersPayload.items[0].user.id);
    }

    if (subjectsRes.ok) {
      const subjectsPayload = (await subjectsRes.json()) as { items?: SubjectItem[] };
      const names = (subjectsPayload.items ?? []).filter((item) => item.isActive).map((item) => item.name);
      setSubjectsCatalog(names);
      if (names[0]) setEventSubject((current) => current || names[0]);
    }

    if (meRes.ok) {
      const mePayload = (await meRes.json()) as { user?: { id: string } };
      if (mePayload.user?.id) setCreatedByUserId(mePayload.user.id);
    }
  }

  async function loadSchedule(studentId: string) {
    const response = await fetch(`/api/students/${studentId}/schedule?from=${from}&to=${to}`);
    if (!response.ok) {
      setSchedule([]);
      return;
    }
    const payload = (await response.json()) as { items: ScheduleItem[] };
    setSchedule(payload.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (activeStudent) {
      void loadSchedule(activeStudent.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudent, from, to]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone: phone || undefined,
        grade: grade || undefined,
        diagnosticsSummary: "Добавлен вручную",
        problemSubjects: problemSubjects.split(",").map((item) => item.trim()).filter(Boolean),
        requestText
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать студента");
      return;
    }

    setFullName("");
    setPhone("");
    setGrade("");
    setProblemSubjects("");
    setRequestText("");
    setAddOpen(false);
    await load();
  }

  async function openStudent(item: StudentItem) {
    const res = await fetch(`/api/students/${item.id}`);
    if (!res.ok) return;
    const full = (await res.json()) as StudentItem;
    setActiveStudent(full);
    setComment(full.comment ?? "");
    setStudentPhone(full.user.phone ?? "");
    setIopName(full.iopDocxFileName ?? null);
    setIopData(null);
    await loadSchedule(item.id);
  }

  async function saveStudent() {
    if (!activeStudent) return;

    const response = await fetch(`/api/students/${activeStudent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: studentPhone,
        comment,
        iopDocxFileName: iopName ?? undefined,
        iopDocxBase64: iopData ?? undefined
      })
    });

    if (!response.ok) {
      setError("Не удалось сохранить карточку студента");
      return;
    }

    await load();
    const refreshed = await response.json();
    setActiveStudent(refreshed);
  }

  async function attachIop(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Можно загрузить только DOCX");
      return;
    }
    const data = await fileToBase64(file);
    setIopName(file.name);
    setIopData(data);
  }

  async function addParentLink() {
    if (!activeStudent || !linkParentId) return;

    const response = await fetch("/api/parent-student-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentProfileId: linkParentId,
        studentProfileId: activeStudent.id,
        relationship: linkRelationship,
        receivesMorningReminder: true
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось привязать родителя");
      return;
    }

    await openStudent(activeStudent);
  }

  async function createEventForStudent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeStudent || !createdByUserId) return;

    const [hours, minutes] = eventTime.split(":").map(Number);
    const start = new Date(`${eventDate}T00:00:00`);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start.getTime() + Number(eventDurationHours) * 60 * 60000);

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: eventTitle,
        subject: eventSubject,
        activityType: eventType,
        plannedStartAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
        createdByUserId,
        participants: [
          { userId: activeStudent.user.id, participantRole: "STUDENT" },
          { userId: eventTeacherId, participantRole: "TEACHER" }
        ]
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать занятие");
      return;
    }

    setEventTitle("");
    setEventSubject("");
    await loadSchedule(activeStudent.id);
  }

  const visibleSchedule = useMemo(() => {
    if (!statusFilter) return schedule;
    return schedule.filter((item) => item.status === statusFilter);
  }, [schedule, statusFilter]);

  const calendarDays = useMemo(() => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);
    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));
    return days;
  }, [from, to]);

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Студенты</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setAddOpen(true)}>Добавить</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead><tr><th>ФИО</th><th>Телефон</th><th>Класс</th><th>Родители</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ cursor: "pointer" }} onClick={() => void openStudent(item)}>
                <td>{item.user.fullName}</td>
                <td>{item.user.phone || "-"}</td>
                <td>{item.grade ?? "-"}</td>
                <td>{item.parentLinks.map((p) => p.parent.user.fullName).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {addOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(760px, 95vw)" }}>
            <h2 style={{ marginTop: 0 }}>Добавить студента</h2>
            <form className="grid cols-2" onSubmit={onSubmit}>
              <label>ФИО<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
              <label>Телефон<input value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label>Класс<input value={grade} onChange={(e) => setGrade(e.target.value)} /></label>
              <label>Проблемные предметы<input value={problemSubjects} onChange={(e) => setProblemSubjects(e.target.value)} /></label>
              <label style={{ gridColumn: "1 / -1" }}>Запрос<input value={requestText} onChange={(e) => setRequestText(e.target.value)} /></label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit">Сохранить</button>
                <button type="button" className="secondary" onClick={() => setAddOpen(false)}>Закрыть</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {activeStudent ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", zIndex: 70 }}>
          <div className="card" style={{ width: "min(1120px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{activeStudent.user.fullName}</h2>
              <button className="secondary" onClick={() => setActiveStudent(null)}>Закрыть</button>
            </div>

            <div className="grid cols-2">
              <label>Телефон<input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></label>
              <label>Комментарий<textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
              <label style={{ gridColumn: "1 / -1" }}>
                ИОП (DOCX)
                <input type="file" accept=".docx" onChange={(e) => void attachIop(e.target.files?.[0] ?? null)} />
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{iopName ? `Файл: ${iopName}` : "Файл не загружен"}</span>
              </label>
            </div>
            <div style={{ marginTop: 8 }}><button onClick={saveStudent}>Сохранить карточку</button></div>

            <h3 style={{ marginTop: 18 }}>Связка с родителями</h3>
            <div className="grid" style={{ gap: 8 }}>
              {activeStudent.parentLinks.map((link) => (
                <div key={link.id} className="card" style={{ margin: 0, padding: 8 }}>
                  {link.parent.user.fullName} ({link.relationship || "родитель"})
                </div>
              ))}
            </div>
            <div className="icon-switch" style={{ marginTop: 8 }}>
              <select value={linkParentId} onChange={(e) => setLinkParentId(e.target.value)} style={{ maxWidth: 300 }}>
                <option value="">Выберите родителя</option>
                {parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.user.fullName}</option>)}
              </select>
              <input value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)} style={{ maxWidth: 220 }} />
              <button type="button" onClick={addParentLink}>Привязать</button>
            </div>

            <h3 style={{ marginTop: 18 }}>Расписание студента</h3>
            <div className="icon-switch" style={{ marginBottom: 8 }}>
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
                {calendarDays.map((day) => {
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

            <h3 style={{ marginTop: 18 }}>Добавить занятие студенту</h3>
            <form className="grid cols-2" onSubmit={createEventForStudent}>
              <label>Название<input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required /></label>
              <label>
                Предмет
                <select value={eventSubject} onChange={(e) => setEventSubject(e.target.value)} required>
                  {subjectsCatalog.length ? (
                    subjectsCatalog.map((subject) => <option key={subject} value={subject}>{subject}</option>)
                  ) : (
                    <option value="">Нет предметов в справочнике</option>
                  )}
                </select>
              </label>
              <label>
                Тип
                <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)}>
                  <option value="INDIVIDUAL_LESSON">Индивидуальное</option>
                  <option value="GROUP_LESSON">Групповое</option>
                </select>
              </label>
              <label>Преподаватель
                <select value={eventTeacherId} onChange={(e) => setEventTeacherId(e.target.value)}>
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.user.id}>{teacher.user.fullName}</option>)}
                </select>
              </label>
              <label>Дата<input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></label>
              <label>Время<input type="time" step={1800} value={eventTime} onChange={(e) => setEventTime(e.target.value)} required /></label>
              <label>
                Длительность (часы)
                <select value={eventDurationHours} onChange={(e) => setEventDurationHours(e.target.value)}>
                  <option value="1">1 час</option>
                  <option value="2">2 часа</option>
                  <option value="3">3 часа</option>
                  <option value="4">4 часа</option>
                </select>
              </label>
              <div><button type="submit">Создать занятие</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
