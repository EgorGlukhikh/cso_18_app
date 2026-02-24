"use client";

import { useEffect, useMemo, useState } from "react";

type ViewMode = "calendar" | "list";
type CalendarMode = "lessons" | "slots";

type ActivityType =
  | "LEISURE_GROUP"
  | "INDIVIDUAL_LESSON"
  | "GROUP_LESSON"
  | "OFFSITE_EVENT"
  | "PEDAGOGICAL_CONSILIUM"
  | "TEACHERS_GENERAL_MEETING"
  | "PSYCHOLOGIST_SESSION";

type EventItem = {
  id: string;
  title: string;
  subject: string | null;
  activityType: ActivityType;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  plannedStartAt: string;
  plannedEndAt: string;
};

type TeacherItem = {
  id: string;
  user: {
    id: string;
    fullName: string;
  };
};

type CalendarCard = {
  event: EventItem;
  column: 0 | 1;
  width: number;
  top: number;
  height: number;
};

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 21;
const SLOT_STEP_MINUTES = 30;
const PIXELS_PER_MINUTE = 1.1;
const SLOTS_STORAGE_KEY = "teacher-calendar-slots-v1";

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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function colorForType(type: ActivityType) {
  if (type === "INDIVIDUAL_LESSON") return { className: "event-chip event-chip--individual" };
  if (type === "GROUP_LESSON" || type === "LEISURE_GROUP") return { className: "event-chip event-chip--group" };
  return { className: "event-chip event-chip--administrative" };
}

function buildDayLayout(events: EventItem[]) {
  const dayEvents = [...events]
    .map((event) => ({ event, start: new Date(event.plannedStartAt), end: new Date(event.plannedEndAt) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const cards: CalendarCard[] = [];
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
    const duration = Math.max(SLOT_STEP_MINUTES, visibleEnd - Math.max(startMinutes, minMinutes));

    cards.push({
      event: item.event,
      column,
      width,
      top: topMinutes * PIXELS_PER_MINUTE,
      height: duration * PIXELS_PER_MINUTE
    });
  }

  return cards;
}

function toTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function slotLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const start = h * 60 + m;
  const end = start + SLOT_STEP_MINUTES;
  return `${toTimeString(start)}-${toTimeString(end)}`;
}

function parseSlotKey(key: string) {
  const [day, time] = key.split("|");
  return { day, time };
}

function getTeacherSlotsFromStorage(teacherUserId: string) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SLOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed[teacherUserId] ?? [];
  } catch {
    return [];
  }
}

function saveTeacherSlotsToStorage(teacherUserId: string, slots: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SLOTS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    parsed[teacherUserId] = slots;
    window.localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // demo-only storage; ignore write errors
  }
}

export default function TeacherCalendarPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [teacherUserId, setTeacherUserId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [mode, setMode] = useState<CalendarMode>("lessons");
  const [anchorDay, setAnchorDay] = useState(toDayString(new Date()));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const todayKey = useMemo(() => toDayString(new Date()), []);

  const weekStart = useMemo(() => startOfWeekMonday(new Date(`${anchorDay}T00:00:00`)), [anchorDay]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const rangeFrom = useMemo(() => toDayString(weekStart), [weekStart]);
  const rangeTo = useMemo(() => toDayString(addDays(weekStart, 6)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of events) {
      const key = toDayString(new Date(event.plannedStartAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(event);
    }
    for (const [key, items] of map.entries()) {
      items.sort((a, b) => new Date(a.plannedStartAt).getTime() - new Date(b.plannedStartAt).getTime());
      map.set(key, items);
    }
    return map;
  }, [events]);

  const weekCardsByDay = useMemo(() => {
    const map = new Map<string, CalendarCard[]>();
    for (const day of weekDays) {
      const key = toDayString(day);
      map.set(key, buildDayLayout(eventsByDay.get(key) ?? []));
    }
    return map;
  }, [weekDays, eventsByDay]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of slots) {
      const parsed = parseSlotKey(key);
      if (!map.has(parsed.day)) map.set(parsed.day, []);
      map.get(parsed.day)?.push(parsed.time);
    }
    for (const [day, values] of map.entries()) {
      values.sort();
      map.set(day, values);
    }
    return map;
  }, [slots]);

  useEffect(() => {
    async function loadTeachers() {
      const response = await fetch("/api/teachers");
      const payload = (await response.json()) as { items?: TeacherItem[]; error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить преподавателей");
        return;
      }
      const items = payload.items ?? [];
      setTeachers(items);
      if (items[0]) setTeacherUserId((current) => current || items[0].user.id);
    }
    void loadTeachers();
  }, []);

  useEffect(() => {
    if (!teacherUserId) {
      setSlots([]);
      return;
    }
    setSlots(getTeacherSlotsFromStorage(teacherUserId));
  }, [teacherUserId]);

  useEffect(() => {
    if (!teacherUserId) return;
    saveTeacherSlotsToStorage(teacherUserId, slots);
  }, [teacherUserId, slots]);

  useEffect(() => {
    async function loadEvents() {
      if (!teacherUserId) {
        setEvents([]);
        return;
      }
      setLoading(true);
      setError("");
      const query = new URLSearchParams({
        from: rangeFrom,
        to: rangeTo,
        teacherUserId
      });
      const response = await fetch(`/api/events?${query.toString()}`);
      const payload = (await response.json()) as { items?: EventItem[]; error?: string };
      if (!response.ok) {
        setEvents([]);
        setError(payload.error ?? "Не удалось загрузить занятия");
        setLoading(false);
        return;
      }
      setEvents(payload.items ?? []);
      setLoading(false);
    }
    void loadEvents();
  }, [teacherUserId, rangeFrom, rangeTo]);

  const calendarHeight = (SLOT_END_HOUR - SLOT_START_HOUR) * 60 * PIXELS_PER_MINUTE;

  function moveWeek(days: number) {
    const next = addDays(weekStart, days);
    setAnchorDay(toDayString(next));
  }

  function toggleSlot(day: string, time: string) {
    const key = `${day}|${time}`;
    setSlots((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  }

  function slotTimeFromOffset(y: number) {
    const minutesFromStart = Math.max(0, Math.floor(y / PIXELS_PER_MINUTE));
    const snapped = Math.floor(minutesFromStart / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    const maxStart = (SLOT_END_HOUR - SLOT_START_HOUR) * 60 - SLOT_STEP_MINUTES;
    const normalized = Math.min(Math.max(0, snapped), maxStart);
    const total = SLOT_START_HOUR * 60 + normalized;
    return toTimeString(total);
  }

  function hasLessonAt(day: string, time: string) {
    const items = eventsByDay.get(day) ?? [];
    const [h, m] = time.split(":").map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + SLOT_STEP_MINUTES;
    return items.some((item) => {
      const start = new Date(item.plannedStartAt);
      const end = new Date(item.plannedEndAt);
      const eventStart = start.getHours() * 60 + start.getMinutes();
      const eventEnd = end.getHours() * 60 + end.getMinutes();
      return slotStart < eventEnd && eventStart < slotEnd;
    });
  }

  function onWeekCellClick(e: React.MouseEvent<HTMLDivElement>, day: string) {
    if (mode !== "slots") return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - bounds.top;
    const time = slotTimeFromOffset(y);
    if (hasLessonAt(day, time)) return;
    toggleSlot(day, time);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Календарь педагога</h1>

        <div className="icon-switch" style={{ marginBottom: 10 }}>
          <select
            value={teacherUserId}
            onChange={(e) => setTeacherUserId(e.target.value)}
            style={{ maxWidth: 340 }}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.user.id}>
                {teacher.user.fullName}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={() => moveWeek(-7)}>
            ← Пред. неделя
          </button>
          <button type="button" className="secondary" onClick={() => moveWeek(7)}>
            След. неделя →
          </button>
          <span className="text-sm text-muted-foreground">
            {new Date(`${rangeFrom}T00:00:00`).toLocaleDateString("ru-RU")} -{" "}
            {new Date(`${rangeTo}T00:00:00`).toLocaleDateString("ru-RU")}
          </span>
        </div>

        <div className="icon-switch" style={{ marginBottom: 10 }}>
          <button type="button" className={mode === "lessons" ? "" : "secondary"} onClick={() => setMode("lessons")}>
            Мои занятия
          </button>
          <button type="button" className={mode === "slots" ? "" : "secondary"} onClick={() => setMode("slots")}>
            Мои слоты
          </button>
          <button type="button" className={viewMode === "calendar" ? "" : "secondary"} onClick={() => setViewMode("calendar")}>
            🗓️ Календарь
          </button>
          <button type="button" className={viewMode === "list" ? "" : "secondary"} onClick={() => setViewMode("list")}>
            📋 Список
          </button>
        </div>

        {mode === "slots" ? (
          <p className="text-sm text-muted-foreground" style={{ marginTop: 0 }}>
            Режим слотов: клик по свободной ячейке добавляет/снимает доступный 30-минутный слот.
          </p>
        ) : null}
        {loading ? <p>Загрузка...</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      {viewMode === "calendar" ? (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1040 }}>
              <div style={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(120px, 1fr))", gap: 0 }}>
                <div />
                {weekDays.map((day) => {
                  const key = toDayString(day);
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className="secondary"
                      style={{
                        marginBottom: 8,
                        textAlign: "center",
                        borderColor: isToday ? "hsl(var(--primary))" : undefined,
                        boxShadow: isToday ? "0 0 0 2px hsl(var(--primary) / 0.2)" : undefined
                      }}
                    >
                      {day.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" })}
                    </div>
                  );
                })}

                <div
                  style={{
                    position: "relative",
                    height: calendarHeight,
                    borderTop: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: "1px solid var(--border)",
                    background: "hsl(var(--background))"
                  }}
                >
                  {Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR + 1 }).map((_, idx) => {
                    const hour = SLOT_START_HOUR + idx;
                    const top = idx * 60 * PIXELS_PER_MINUTE;
                    return (
                      <div key={hour} style={{ position: "absolute", top, left: 0, right: 0, borderTop: "1px solid var(--border)", pointerEvents: "none" }}>
                        <span style={{ position: "absolute", left: 6, top: -9, fontSize: 11, color: "var(--muted)" }}>
                          {String(hour).padStart(2, "0")}:00
                        </span>
                      </div>
                    );
                  })}
                </div>

                {weekDays.map((day) => {
                  const key = toDayString(day);
                  const isToday = key === todayKey;
                  const cards = weekCardsByDay.get(key) ?? [];
                  const daySlots = slotsByDay.get(key) ?? [];

                  return (
                    <div
                      key={key}
                      onClick={(e) => onWeekCellClick(e, key)}
                      style={{
                        position: "relative",
                        height: calendarHeight,
                        borderTop: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        borderRight: "1px solid var(--border)",
                        background: "hsl(var(--card))",
                        cursor: mode === "slots" ? "pointer" : "default",
                        boxShadow: isToday ? "inset 0 0 0 2px hsl(var(--primary) / 0.25)" : undefined
                      }}
                    >
                      {Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR + 1 }).map((_, idx) => {
                        const top = idx * 60 * PIXELS_PER_MINUTE;
                        return (
                          <div key={`${key}-${idx}`} style={{ position: "absolute", top, left: 0, right: 0, borderTop: "1px solid var(--border)", pointerEvents: "none" }} />
                        );
                      })}

                      {mode === "slots"
                        ? daySlots.map((time) => {
                            const [h, m] = time.split(":").map(Number);
                            const top = (h * 60 + m - SLOT_START_HOUR * 60) * PIXELS_PER_MINUTE;
                            return (
                              <div
                                key={`${key}-${time}`}
                                style={{
                                  position: "absolute",
                                  top,
                                  left: 2,
                                  right: 2,
                                  height: SLOT_STEP_MINUTES * PIXELS_PER_MINUTE,
                                  borderRadius: 8,
                                  background: "hsl(var(--primary) / 0.28)",
                                  border: "1px solid hsl(var(--primary) / 0.45)",
                                  zIndex: 1
                                }}
                              />
                            );
                          })
                        : null}

                      {cards.map((card) => {
                        const c = colorForType(card.event.activityType);
                        return (
                          <article
                            key={card.event.id}
                            className={c.className}
                            style={{
                              position: "absolute",
                              top: card.top,
                              left: `${card.column * 50}%`,
                              width: `calc(${card.width}% - 8px)`,
                              height: card.height,
                              borderRadius: 10,
                              padding: "6px 8px",
                              overflow: "hidden",
                              zIndex: 2,
                              opacity: mode === "slots" ? 0.45 : 1
                            }}
                            title={card.event.title}
                          >
                            <strong style={{ display: "block", fontSize: 11 }}>{card.event.title}</strong>
                            <span style={{ fontSize: 10, display: "block", opacity: 0.9 }}>
                              {new Date(card.event.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </article>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <h2 style={{ marginTop: 0 }}>{mode === "lessons" ? "Мои занятия (список)" : "Мои слоты (список)"}</h2>
          <div className="space-y-6">
            {weekDays.map((day) => {
              const key = toDayString(day);
              const dayEvents = eventsByDay.get(key) ?? [];
              const daySlots = slotsByDay.get(key) ?? [];
              return (
                <article key={key} className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg" style={{ margin: 0 }}>
                  <h3 style={{ marginTop: 0 }}>
                    {day.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>

                  {mode === "lessons" ? (
                    dayEvents.length ? (
                      <table className="table-modern">
                        <thead>
                          <tr>
                            <th>Время</th>
                            <th>Событие</th>
                            <th>Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayEvents.map((item) => (
                            <tr key={item.id}>
                              <td>
                                {new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}-
                                {new Date(item.plannedEndAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td>{item.title}</td>
                              <td>{item.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-muted-foreground">Занятий нет.</p>
                    )
                  ) : daySlots.length ? (
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((time) => (
                        <span key={`${key}-${time}`} className="event-chip event-chip--individual">
                          {slotLabel(time)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Свободные слоты не отмечены.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

