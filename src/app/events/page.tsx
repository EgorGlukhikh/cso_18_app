"use client";

import { useEffect, useMemo, useState } from "react";

type ActivityType =
  | "LEISURE_GROUP"
  | "INDIVIDUAL_LESSON"
  | "GROUP_LESSON"
  | "OFFSITE_EVENT"
  | "PEDAGOGICAL_CONSILIUM"
  | "TEACHERS_GENERAL_MEETING"
  | "PSYCHOLOGIST_SESSION";

type ParticipantRole = "STUDENT" | "TEACHER" | "CURATOR" | "PSYCHOLOGIST" | "PARENT";
type ViewMode = "calendar" | "list";
type CalendarScope = "day" | "week" | "month";
type CategoryFilter = "individual" | "group" | "administrative";

type EventItem = {
  id: string;
  title: string;
  subject: string | null;
  activityType: ActivityType;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  plannedStartAt: string;
  plannedEndAt: string;
  participants: Array<{
    id: string;
    participantRole: ParticipantRole;
    user: { id: string; fullName: string; role: string };
  }>;
};

type UserItem = {
  id: string;
  user: { id: string; fullName: string; email: string };
};

type CalendarCard = {
  event: EventItem;
  start: Date;
  end: Date;
  column: 0 | 1;
  width: number;
  top: number;
  height: number;
};

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 21;
const PIXELS_PER_MINUTE = 1.2;

function toDayString(value: Date) {
  return value.toLocaleDateString("sv-SE");
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeekMonday(base: Date) {
  const date = new Date(base);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(base: Date) {
  const date = new Date(base);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfMonth(base: Date) {
  const date = startOfMonth(base);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getScopeRange(anchor: string, scope: CalendarScope) {
  const base = new Date(`${anchor}T00:00:00`);
  if (scope === "day") {
    return { from: toDayString(base), to: toDayString(base) };
  }
  if (scope === "week") {
    const monday = startOfWeekMonday(base);
    const sunday = addDays(monday, 6);
    return { from: toDayString(monday), to: toDayString(sunday) };
  }
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);
  return { from: toDayString(monthStart), to: toDayString(monthEnd) };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function getCategory(type: ActivityType): CategoryFilter {
  if (type === "INDIVIDUAL_LESSON") return "individual";
  if (type === "GROUP_LESSON" || type === "LEISURE_GROUP") return "group";
  return "administrative";
}

function statusLabel(status: EventItem["status"]) {
  if (status === "PLANNED") return "Запланировано";
  if (status === "COMPLETED") return "Состоялось";
  return "Не состоялось";
}

function typeLabel(type: ActivityType) {
  const map: Record<ActivityType, string> = {
    INDIVIDUAL_LESSON: "Индивидуальное",
    GROUP_LESSON: "Групповое",
    LEISURE_GROUP: "Досуговое групповое",
    OFFSITE_EVENT: "Выездное",
    PEDAGOGICAL_CONSILIUM: "Консилиум",
    TEACHERS_GENERAL_MEETING: "Встреча педагогов",
    PSYCHOLOGIST_SESSION: "Психолог"
  };
  return map[type];
}

function buildDayLayout(events: EventItem[]) {
  const dayEvents = [...events]
    .map((event) => ({ event, start: new Date(event.plannedStartAt), end: new Date(event.plannedEndAt) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const cards: Array<CalendarCard> = [];
  const active: Array<{ end: number; column: 0 | 1 }> = [];

  for (const item of dayEvents) {
    const startTs = item.start.getTime();
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].end <= startTs) active.splice(i, 1);
    }

    const usedCols = new Set(active.map((entry) => entry.column));
    const column: 0 | 1 = usedCols.has(0) ? 1 : 0;
    active.push({ end: item.end.getTime(), column });

    const concurrent = dayEvents.filter((other) => overlaps(item.start, item.end, other.start, other.end)).length;
    const width = concurrent > 1 ? 50 : 100;

    const startMinutes = item.start.getHours() * 60 + item.start.getMinutes();
    const endMinutes = item.end.getHours() * 60 + item.end.getMinutes();
    const minMinutes = SLOT_START_HOUR * 60;
    const maxMinutes = SLOT_END_HOUR * 60;

    const topMinutes = Math.max(startMinutes, minMinutes) - minMinutes;
    const visibleEnd = Math.min(endMinutes, maxMinutes);
    const duration = Math.max(30, visibleEnd - Math.max(startMinutes, minMinutes));

    cards.push({
      event: item.event,
      start: item.start,
      end: item.end,
      column,
      width,
      top: topMinutes * PIXELS_PER_MINUTE,
      height: duration * PIXELS_PER_MINUTE
    });
  }

  return cards;
}

export default function EventsPage() {
  const [selectedDate, setSelectedDate] = useState(toDayString(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [scope, setScope] = useState<CalendarScope>("month");
  const [status, setStatus] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<CategoryFilter>>(
    new Set(["individual", "group", "administrative"])
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("INDIVIDUAL_LESSON");
  const [startTime, setStartTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");

  const weekDays = useMemo(() => {
    const monday = startOfWeekMonday(new Date(`${selectedDate}T00:00:00`));
    return Array.from({ length: 7 }, (_, idx) => addDays(monday, idx));
  }, [selectedDate]);

  const monthGridDays = useMemo(() => {
    const anchor = new Date(`${selectedDate}T00:00:00`);
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeekMonday(monthStart);
    const gridEnd = addDays(startOfWeekMonday(monthEnd), 6);

    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [selectedDate]);

  async function loadUsers() {
    const [teachersRes, studentsRes, meRes] = await Promise.all([
      fetch("/api/teachers"),
      fetch("/api/students"),
      fetch("/api/auth/me")
    ]);

    if (teachersRes.ok) {
      const payload = (await teachersRes.json()) as { items: UserItem[] };
      setTeachers(payload.items ?? []);
      if (payload.items?.[0]) setTeacherId(payload.items[0].user.id);
    }

    if (studentsRes.ok) {
      const payload = (await studentsRes.json()) as { items: UserItem[] };
      setStudents(payload.items ?? []);
      if (payload.items?.[0]) setStudentId(payload.items[0].user.id);
    }

    if (meRes.ok) {
      const payload = (await meRes.json()) as { user?: { id: string } };
      if (payload.user?.id) setCreatedByUserId(payload.user.id);
    }
  }

  async function loadEvents() {
    setLoading(true);
    setError("");

    const { from, to } = getScopeRange(selectedDate, scope);
    const query = new URLSearchParams({ from, to });
    if (status) query.set("status", status);

    const response = await fetch(`/api/events?${query.toString()}`);
    const payload = (await response.json()) as { items?: EventItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Ошибка загрузки событий");
      setLoading(false);
      return;
    }

    setEvents(payload.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, status, scope]);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!createdByUserId) {
      setError("Не удалось определить текущего пользователя");
      return;
    }

    const [h, m] = startTime.split(":").map(Number);
    const start = new Date(`${selectedDate}T00:00:00`);
    start.setHours(h || 0, m || 0, 0, 0);
    const end = new Date(start.getTime() + Number(durationMinutes || "45") * 60000);

    const participants = [
      teacherId ? { userId: teacherId, participantRole: "TEACHER" as ParticipantRole } : null,
      studentId ? { userId: studentId, participantRole: "STUDENT" as ParticipantRole } : null
    ].filter(Boolean);

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subject,
        activityType,
        plannedStartAt: start.toISOString(),
        plannedEndAt: end.toISOString(),
        createdByUserId,
        participants
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать событие");
      return;
    }

    setTitle("");
    setSubject("");
    await loadEvents();
  }

  function toggleCategory(filter: CategoryFilter) {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  const filteredEvents = useMemo(
    () =>
      events.filter((item) => {
        const category = getCategory(item.activityType);
        return categoryFilters.has(category);
      }),
    [events, categoryFilters]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of filteredEvents) {
      const day = toDayString(new Date(event.plannedStartAt));
      if (!map.has(day)) map.set(day, []);
      map.get(day)?.push(event);
    }

    for (const [day, items] of map.entries()) {
      items.sort((a, b) => new Date(a.plannedStartAt).getTime() - new Date(b.plannedStartAt).getTime());
      map.set(day, items);
    }

    return map;
  }, [filteredEvents]);

  const listDays = useMemo(() => {
    const anchor = new Date(`${selectedDate}T00:00:00`);
    if (scope === "day") return [anchor];
    if (scope === "week") return weekDays;

    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const days: Date[] = [];
    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [scope, selectedDate, weekDays]);

  const dayEvents = useMemo(
    () => (eventsByDay.get(selectedDate) ?? []).filter((item) => toDayString(new Date(item.plannedStartAt)) === selectedDate),
    [eventsByDay, selectedDate]
  );

  const cards = useMemo(() => buildDayLayout(dayEvents), [dayEvents]);
  const calendarHeight = (SLOT_END_HOUR - SLOT_START_HOUR) * 60 * PIXELS_PER_MINUTE;

  const monthLabel = useMemo(() => {
    const d = new Date(`${selectedDate}T00:00:00`);
    return d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  }, [selectedDate]);

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Расписание</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className={viewMode === "calendar" ? "" : "secondary"} onClick={() => setViewMode("calendar")}>
            Календарь
          </button>
          <button type="button" className={viewMode === "list" ? "" : "secondary"} onClick={() => setViewMode("list")}>
            Список
          </button>

          <button type="button" className={scope === "day" ? "" : "secondary"} onClick={() => setScope("day")}>
            День
          </button>
          <button type="button" className={scope === "week" ? "" : "secondary"} onClick={() => setScope("week")}>
            Неделя
          </button>
          <button type="button" className={scope === "month" ? "" : "secondary"} onClick={() => setScope("month")}>
            Месяц
          </button>

          <button type="button" className={categoryFilters.has("individual") ? "" : "secondary"} onClick={() => toggleCategory("individual")}>
            Индивидуальные
          </button>
          <button type="button" className={categoryFilters.has("group") ? "" : "secondary"} onClick={() => toggleCategory("group")}>
            Групповые
          </button>
          <button type="button" className={categoryFilters.has("administrative") ? "" : "secondary"} onClick={() => toggleCategory("administrative")}>
            Административные
          </button>

          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Все статусы</option>
            <option value="PLANNED">Запланировано</option>
            <option value="COMPLETED">Состоялось</option>
            <option value="CANCELED">Не состоялось</option>
          </select>

          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ maxWidth: 180 }} />
        </div>
        {loading ? <p>Загрузка...</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Создать занятие на выбранную дату</h2>
        <form className="grid cols-2" onSubmit={createEvent}>
          <label>
            Название
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Предмет
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label>
            Тип занятия
            <select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)}>
              <option value="INDIVIDUAL_LESSON">Индивидуальное</option>
              <option value="GROUP_LESSON">Групповое</option>
            </select>
          </label>
          <label>
            Время начала
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            Длительность (мин)
            <input type="number" min={30} max={180} step={15} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
          </label>
          <label>
            Преподаватель
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Не выбран</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.user.id}>{item.user.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            Ученик
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Не выбран</option>
              {students.map((item) => (
                <option key={item.id} value={item.user.id}>{item.user.fullName}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="submit">Создать</button>
          </div>
        </form>
      </section>

      {viewMode === "calendar" && scope === "day" ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Календарь дня</h2>
          <div style={{ position: "relative", height: calendarHeight, border: "1px solid var(--border)", borderRadius: 12 }}>
            {Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR + 1 }).map((_, idx) => {
              const hour = SLOT_START_HOUR + idx;
              const top = idx * 60 * PIXELS_PER_MINUTE;
              return (
                <div key={hour} style={{ position: "absolute", top, left: 0, right: 0, borderTop: "1px solid var(--border)" }}>
                  <span style={{ position: "absolute", left: 8, top: -10, fontSize: 11, color: "var(--muted)" }}>{String(hour).padStart(2, "0")}:00</span>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 70, right: 10, top: 0, bottom: 0 }}>
              {cards.map((card) => (
                <article
                  key={card.event.id}
                  style={{
                    position: "absolute",
                    top: card.top,
                    left: `${card.column * 50}%`,
                    width: `calc(${card.width}% - 8px)`,
                    height: card.height,
                    borderRadius: 10,
                    border: "1px solid var(--accent)",
                    background: "color-mix(in srgb, var(--accent) 18%, var(--surface))",
                    padding: "6px 8px",
                    overflow: "hidden"
                  }}
                >
                  <strong style={{ display: "block", fontSize: 13 }}>{card.event.title}</strong>
                  <span style={{ fontSize: 12, display: "block" }}>{card.event.subject || "Без предмета"}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", display: "block" }}>
                    {card.start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - {card.end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {viewMode === "calendar" && scope === "month" ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Календарь месяца: {monthLabel}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((name) => (
              <strong key={name} style={{ textAlign: "center", color: "var(--muted)" }}>{name}</strong>
            ))}
            {monthGridDays.map((day) => {
              const key = toDayString(day);
              const items = eventsByDay.get(key) ?? [];
              const isActive = key === selectedDate;
              const inCurrentMonth = day.getMonth() === new Date(`${selectedDate}T00:00:00`).getMonth();
              return (
                <button
                  key={key}
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedDate(key)}
                  style={{
                    textAlign: "left",
                    minHeight: 110,
                    padding: 8,
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                    opacity: inCurrentMonth ? 1 : 0.6
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{day.getDate()}</div>
                  {items.slice(0, 3).map((item) => (
                    <div key={item.id} style={{ fontSize: 11, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} {item.title}
                    </div>
                  ))}
                  {items.length > 3 ? <div style={{ fontSize: 11, color: "var(--muted)" }}>+ еще {items.length - 3}</div> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "calendar" && scope === "week" ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Календарь недели</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
            {weekDays.map((day) => {
              const key = toDayString(day);
              const items = eventsByDay.get(key) ?? [];
              return (
                <article key={key} className="card" style={{ margin: 0, padding: 10 }}>
                  <h3 style={{ marginTop: 0, fontSize: 14 }}>
                    {day.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" })}
                  </h3>
                  {items.slice(0, 6).map((item) => (
                    <div key={item.id} style={{ fontSize: 12, marginBottom: 6 }}>
                      {new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} {item.title}
                    </div>
                  ))}
                  {!items.length ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Нет событий</div> : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "list" ? (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>
            Список по дням ({scope === "day" ? "день" : scope === "week" ? "неделя" : "месяц"})
          </h2>
          <div className="grid">
            {listDays.map((dayDate) => {
              const day = toDayString(dayDate);
              const items = eventsByDay.get(day) ?? [];
              return (
                <article key={day} className="card" style={{ margin: 0 }}>
                  <h3 style={{ marginTop: 0 }}>
                    {dayDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>
                  {items.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Время</th>
                          <th>Событие</th>
                          <th>Тип</th>
                          <th>Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const start = new Date(item.plannedStartAt);
                          const end = new Date(item.plannedEndAt);
                          return (
                            <tr key={item.id}>
                              <td>{start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - {end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</td>
                              <td><strong>{item.title}</strong><div style={{ color: "var(--muted)", fontSize: 12 }}>{item.subject || "Без предмета"}</div></td>
                              <td>{typeLabel(item.activityType)}</td>
                              <td>{statusLabel(item.status)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ marginBottom: 0, color: "var(--muted)" }}>На этот день событий нет.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
