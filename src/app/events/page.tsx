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
type ScopeMode = "day" | "week" | "month";
type DateFilter = "current_month" | "current_week" | "day" | "custom";
type CategoryFilter = "individual" | "group" | "administrative";

type EventItem = {
  id: string;
  title: string;
  subject: string | null;
  activityType: ActivityType;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  plannedStartAt: string;
  plannedEndAt: string;
  completionComment: string | null;
  participants: Array<{
    id: string;
    participantRole: ParticipantRole;
    user: { id: string; fullName: string; role: string };
  }>;
};

type UserItem = { id: string; user: { id: string; fullName: string } };
type SubjectItem = { id: string; name: string; isActive: boolean };

type CalendarCard = {
  event: EventItem;
  column: 0 | 1;
  width: number;
  top: number;
  height: number;
};

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 21;
const PIXELS_PER_MINUTE = 1.1;

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

function colorForType(type: ActivityType) {
  const category = getCategory(type);
  if (category === "individual") return { className: "event-chip event-chip--individual" };
  if (category === "group") return { className: "event-chip event-chip--group" };
  return { className: "event-chip event-chip--administrative" };
}

function studentSurname(event: EventItem) {
  const student = event.participants.find((p) => p.participantRole === "STUDENT")?.user.fullName?.trim();
  if (!student) return "Без ученика";
  return student.split(/\s+/)[0] || "Без ученика";
}

function eventShortLabel(event: EventItem) {
  const subject = (event.subject ?? "").trim() || typeLabel(event.activityType);
  return `${studentSurname(event)} / ${subject}`;
}

function toDateTimeLocalString(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    const duration = Math.max(30, visibleEnd - Math.max(startMinutes, minMinutes));

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

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function isAdministrativeType(type: ActivityType) {
  return type === "TEACHERS_GENERAL_MEETING";
}

export default function EventsPage() {
  const today = useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [scope, setScope] = useState<ScopeMode>("month");
  const [dateFilter, setDateFilter] = useState<DateFilter>("current_month");
  const [dayFilterDate, setDayFilterDate] = useState(toDayString(today));
  const [customFrom, setCustomFrom] = useState(toDayString(today));
  const [customTo, setCustomTo] = useState(toDayString(today));
  const [status, setStatus] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<Set<CategoryFilter>>(
    new Set(["individual", "group", "administrative"])
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [teachers, setTeachers] = useState<UserItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [subjectsCatalog, setSubjectsCatalog] = useState<string[]>([]);
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(toDayString(today));
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("INDIVIDUAL_LESSON");
  const [startTime, setStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState("1");
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);

  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState<EventItem["status"]>("PLANNED");
  const [editCompletionComment, setEditCompletionComment] = useState("");

  const range = useMemo(() => {
    const now = new Date();
    if (dateFilter === "current_month") {
      return { from: toDayString(startOfMonth(now)), to: toDayString(endOfMonth(now)) };
    }
    if (dateFilter === "current_week") {
      const monday = startOfWeekMonday(now);
      const sunday = addDays(monday, 6);
      return { from: toDayString(monday), to: toDayString(sunday) };
    }
    if (dateFilter === "day") {
      return { from: dayFilterDate, to: dayFilterDate };
    }
    return { from: customFrom, to: customTo };
  }, [dateFilter, dayFilterDate, customFrom, customTo]);

  async function loadUsers() {
    const [teachersRes, studentsRes, subjectsRes, meRes] = await Promise.all([
      fetch("/api/teachers"),
      fetch("/api/students"),
      fetch("/api/subjects"),
      fetch("/api/auth/me")
    ]);

    if (teachersRes.ok) {
      const payload = (await teachersRes.json()) as { items: UserItem[] };
      setTeachers(payload.items ?? []);
      if (payload.items?.[0]) setTeacherIds([payload.items[0].user.id]);
    }

    if (studentsRes.ok) {
      const payload = (await studentsRes.json()) as { items: UserItem[] };
      setStudents(payload.items ?? []);
      if (payload.items?.[0]) setStudentIds([payload.items[0].user.id]);
    }

    if (subjectsRes.ok) {
      const payload = (await subjectsRes.json()) as { items: SubjectItem[] };
      const names = (payload.items ?? []).filter((item) => item.isActive).map((item) => item.name);
      setSubjectsCatalog(names);
      if (names[0]) {
        setSubject((current) => current || names[0]);
        setEditSubject((current) => current || names[0]);
      }
    }

    if (meRes.ok) {
      const payload = (await meRes.json()) as { user?: { id: string } };
      if (payload.user?.id) setCreatedByUserId(payload.user.id);
    }
  }

  async function loadEvents() {
    setLoading(true);
    setError("");

    const query = new URLSearchParams({ from: range.from, to: range.to });
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
  }, [range, status]);

  useEffect(() => {
    if (activityType === "GROUP_LESSON") {
      return;
    }

    if (isAdministrativeType(activityType)) {
      setStudentIds([]);
      if (!teacherIds.length && teachers[0]) {
        setTeacherIds([teachers[0].user.id]);
      }
      return;
    }

    setTeacherIds((prev) => (prev.length ? [prev[0]] : []));
    setStudentIds((prev) => (prev.length ? [prev[0]] : []));
  }, [activityType, teacherIds.length, teachers]);

  function toggleCategory(filter: CategoryFilter) {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  function openCreateModal(day: string, time = "10:00") {
    setCreateDate(day);
    setStartTime(time);
    setCreateOpen(true);
  }

  function resetCreateForm() {
    setTitle("");
    setSubject("");
    setActivityType("INDIVIDUAL_LESSON");
    setDurationHours("1");
    setCreateOpen(false);
  }

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!createdByUserId) {
      setError("Не удалось определить текущего пользователя");
      return;
    }

    const [h, m] = startTime.split(":").map(Number);
    const start = new Date(`${createDate}T00:00:00`);
    start.setHours(h || 0, m || 0, 0, 0);
    const end = new Date(start.getTime() + Number(durationHours || "1") * 60 * 60000);

    const selectedTeacherIds = activityType === "GROUP_LESSON" || isAdministrativeType(activityType)
      ? teacherIds
      : teacherIds.slice(0, 1);
    const selectedStudentIds = activityType === "GROUP_LESSON"
      ? studentIds
      : isAdministrativeType(activityType)
        ? []
        : studentIds.slice(0, 1);

    const participants = [
      ...selectedTeacherIds.map((id) => ({ userId: id, participantRole: "TEACHER" as ParticipantRole })),
      ...selectedStudentIds.map((id) => ({ userId: id, participantRole: "STUDENT" as ParticipantRole }))
    ];

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

    resetCreateForm();
    await loadEvents();
  }

  const filteredEvents = useMemo(
    () => events.filter((item) => categoryFilters.has(getCategory(item.activityType))),
    [events, categoryFilters]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of filteredEvents) {
      const key = toDayString(new Date(event.plannedStartAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(event);
    }

    for (const [key, items] of map.entries()) {
      items.sort((a, b) => new Date(a.plannedStartAt).getTime() - new Date(b.plannedStartAt).getTime());
      map.set(key, items);
    }

    return map;
  }, [filteredEvents]);

  const rangeDays = useMemo(() => {
    const start = new Date(`${range.from}T00:00:00`);
    const end = new Date(`${range.to}T00:00:00`);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [range]);

  const dayKey = useMemo(() => {
    if (dateFilter === "day") return dayFilterDate;
    return toDayString(new Date());
  }, [dateFilter, dayFilterDate]);
  const todayKey = useMemo(() => toDayString(new Date()), []);

  const dayEvents = useMemo(() => eventsByDay.get(dayKey) ?? [], [eventsByDay, dayKey]);
  const dayCards = useMemo(() => buildDayLayout(dayEvents), [dayEvents]);

  const weekDays = useMemo(() => {
    const base = new Date(`${dayKey}T00:00:00`);
    const monday = startOfWeekMonday(base);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [dayKey]);

  const weekCardsByDay = useMemo(() => {
    const map = new Map<string, CalendarCard[]>();
    for (const day of weekDays) {
      const key = toDayString(day);
      map.set(key, buildDayLayout(eventsByDay.get(key) ?? []));
    }
    return map;
  }, [weekDays, eventsByDay]);

  const monthGridDays = useMemo(() => {
    const base = new Date(`${dayKey}T00:00:00`);
    const monthStart = startOfMonth(base);
    const monthEnd = endOfMonth(base);
    const gridStart = startOfWeekMonday(monthStart);
    const gridEnd = addDays(startOfWeekMonday(monthEnd), 6);
    const days: Date[] = [];
    for (let d = new Date(gridStart); d <= gridEnd; d = addDays(d, 1)) {
      days.push(new Date(d));
    }
    return days;
  }, [dayKey]);

  function openEvent(item: EventItem) {
    setActiveEvent(item);
    setEditMode(false);
    setEditTitle(item.title);
    setEditSubject(item.subject ?? "");
    setEditStart(toDateTimeLocalString(new Date(item.plannedStartAt)));
    setEditEnd(toDateTimeLocalString(new Date(item.plannedEndAt)));
    setEditStatus(item.status);
    setEditCompletionComment(item.completionComment ?? "");
  }

  async function saveEventChanges() {
    if (!activeEvent) return;
    const normalizedCurrentComment = (activeEvent.completionComment ?? "").trim();
    const normalizedNextComment = editCompletionComment.trim();
    const statusChanged = editStatus !== activeEvent.status;
    const completionCommentChanged =
      editStatus === "COMPLETED" && normalizedNextComment !== normalizedCurrentComment;
    const shouldSendStatus = statusChanged || completionCommentChanged;

    if (shouldSendStatus && editStatus === "COMPLETED" && !normalizedNextComment) {
      setError("Для статуса 'Состоялось' заполните мини-отчет преподавателя");
      return;
    }

    if (shouldSendStatus && editStatus === "CANCELED" && activeEvent.status !== "CANCELED") {
      setError("Для статуса 'Не состоялось' требуется причина отмены");
      return;
    }

    const patchBody: Record<string, string> = {};
    if (editTitle !== activeEvent.title) {
      patchBody.title = editTitle;
    }
    if (editSubject !== (activeEvent.subject ?? "")) {
      patchBody.subject = editSubject;
    }
    const currentStartIso = new Date(activeEvent.plannedStartAt).toISOString();
    const currentEndIso = new Date(activeEvent.plannedEndAt).toISOString();
    const nextStartIso = new Date(editStart).toISOString();
    const nextEndIso = new Date(editEnd).toISOString();
    if (nextStartIso !== currentStartIso || nextEndIso !== currentEndIso) {
      patchBody.plannedStartAt = nextStartIso;
      patchBody.plannedEndAt = nextEndIso;
    }

    const shouldSendPatch = Object.keys(patchBody).length > 0;
    if (shouldSendPatch) {
      const patchRes = await fetch(`/api/events/${activeEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody)
      });

      if (!patchRes.ok) {
        const payload = (await patchRes.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Не удалось сохранить изменения события");
        return;
      }
    }

    if (shouldSendStatus) {
      const statusRes = await fetch(`/api/events/${activeEvent.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          completionComment: editStatus === "COMPLETED" ? normalizedNextComment : undefined
        })
      });

      if (!statusRes.ok) {
        const payload = (await statusRes.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Статус не обновлен");
        return;
      }
    }

    await loadEvents();
    setActiveEvent(null);
  }

  async function copyEventLink() {
    if (!activeEvent) return;
    const url = `${window.location.origin}/events?eventId=${activeEvent.id}`;
    await navigator.clipboard.writeText(url);
  }

  function snapTimeFromOffset(y: number) {
    const minutesFromStart = Math.max(0, Math.floor(y / PIXELS_PER_MINUTE));
    const hour = Math.min(SLOT_END_HOUR - 1, SLOT_START_HOUR + Math.floor(minutesFromStart / 60));
    const minute = Math.floor((minutesFromStart % 60) / 30) * 30;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function onDayCalendarClick(e: React.MouseEvent<HTMLDivElement>) {
    const bounds = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - bounds.top;
    openCreateModal(dayKey, snapTimeFromOffset(y));
  }

  function onWeekDayCalendarClick(e: React.MouseEvent<HTMLDivElement>, day: string) {
    const bounds = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - bounds.top;
    openCreateModal(day, snapTimeFromOffset(y));
  }

  const calendarHeight = (SLOT_END_HOUR - SLOT_START_HOUR) * 60 * PIXELS_PER_MINUTE;
  const hourlyGuideBorder = "1px solid hsl(var(--foreground) / 0.16)";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
        <h1 style={{ marginTop: 0, marginBottom: 10 }}>Расписание</h1>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div className="icon-switch">
            <button type="button" className={scope === "day" ? "" : "secondary"} onClick={() => setScope("day")}>День</button>
            <button type="button" className={scope === "week" ? "" : "secondary"} onClick={() => setScope("week")}>Неделя</button>
            <button type="button" className={scope === "month" ? "" : "secondary"} onClick={() => setScope("month")}>Месяц</button>
          </div>

          <div className="icon-switch">
            <button type="button" className={viewMode === "calendar" ? "" : "secondary"} onClick={() => setViewMode("calendar")} title="Календарь">🗓️</button>
            <button type="button" className={viewMode === "list" ? "" : "secondary"} onClick={() => setViewMode("list")} title="Список">📋</button>
          </div>
        </div>

        <div className="icon-switch" style={{ marginBottom: 10 }}>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} style={{ maxWidth: 220 }}>
            <option value="current_month">Текущий месяц</option>
            <option value="current_week">Текущая неделя</option>
            <option value="day">День</option>
            <option value="custom">Свой период</option>
          </select>
          {dateFilter === "day" ? <input type="date" value={dayFilterDate} onChange={(e) => setDayFilterDate(e.target.value)} style={{ maxWidth: 180 }} /> : null}
          {dateFilter === "custom" ? (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ maxWidth: 180 }} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ maxWidth: 180 }} />
            </>
          ) : null}
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Все статусы</option>
            <option value="PLANNED">Запланировано</option>
            <option value="COMPLETED">Состоялось</option>
            <option value="CANCELED">Не состоялось</option>
          </select>
          <button type="button" onClick={() => openCreateModal(dayKey)}>Создать занятие</button>
        </div>

        <div className="icon-switch">
          <button type="button" className={categoryFilters.has("individual") ? "" : "secondary"} onClick={() => toggleCategory("individual")}>🔵 Индивидуальные</button>
          <button type="button" className={categoryFilters.has("group") ? "" : "secondary"} onClick={() => toggleCategory("group")}>🟢 Групповые</button>
          <button type="button" className={categoryFilters.has("administrative") ? "" : "secondary"} onClick={() => toggleCategory("administrative")}>🟠 Административные</button>
        </div>

        {loading ? <p>Загрузка...</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      {viewMode === "calendar" && scope === "day" ? (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <h2 style={{ marginTop: 0 }}>Календарь дня</h2>
          <div
            style={{
              position: "relative",
              height: calendarHeight,
              border: dayKey === todayKey ? "2px solid hsl(var(--primary))" : "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: dayKey === todayKey ? "0 0 0 2px hsl(var(--primary) / 0.2)" : undefined
            }}
            onClick={onDayCalendarClick}
          >
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
              {dayCards.map((card) => {
                const c = colorForType(card.event.activityType);
                return (
                  <article
                    key={card.event.id}
                    className={c.className}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEvent(card.event);
                    }}
                    style={{
                      position: "absolute",
                      top: card.top,
                      left: `${card.column * 50}%`,
                      width: `calc(${card.width}% - 8px)`,
                      height: card.height,
                      borderRadius: 10,
                      padding: "6px 8px",
                      overflow: "hidden",
                      cursor: "pointer"
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 12 }}>{eventShortLabel(card.event)}</strong>
                    <span style={{ fontSize: 11, display: "block", opacity: 0.9 }}>
                      {new Date(card.event.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {viewMode === "calendar" && scope === "week" ? (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <h2 style={{ marginTop: 0 }}>Календарь недели</h2>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1040 }}>
              <div style={{ display: "grid", gridTemplateColumns: "72px repeat(7, minmax(120px, 1fr))", gap: 0 }}>
                <div />
                {weekDays.map((day) => {
                  const key = toDayString(day);
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="secondary"
                      onClick={() => openCreateModal(key)}
                      style={{
                        marginBottom: 8,
                        borderColor: isToday ? "hsl(var(--primary))" : undefined,
                        boxShadow: isToday ? "0 0 0 2px hsl(var(--primary) / 0.2)" : undefined
                      }}
                    >
                      {day.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" })}
                    </button>
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
                      <div key={hour} style={{ position: "absolute", top, left: 0, right: 0, borderTop: hourlyGuideBorder, pointerEvents: "none" }}>
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
                  return (
                    <div
                      key={key}
                      onClick={(e) => onWeekDayCalendarClick(e, key)}
                      style={{
                        position: "relative",
                        height: calendarHeight,
                        borderTop: "1px solid var(--border)",
                        borderBottom: "1px solid var(--border)",
                        borderRight: "1px solid var(--border)",
                        background: "hsl(var(--card))",
                        cursor: "pointer",
                        boxShadow: isToday ? "inset 0 0 0 2px hsl(var(--primary) / 0.25)" : undefined
                      }}
                    >
                      {Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR + 1 }).map((_, idx) => {
                        const top = idx * 60 * PIXELS_PER_MINUTE;
                        return (
                          <div key={`${key}-${idx}`} style={{ position: "absolute", top, left: 0, right: 0, borderTop: hourlyGuideBorder, pointerEvents: "none" }} />
                        );
                      })}

                      {cards.map((card) => {
                        const c = colorForType(card.event.activityType);
                        return (
                          <article
                            key={card.event.id}
                            className={c.className}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEvent(card.event);
                            }}
                            style={{
                              position: "absolute",
                              top: card.top,
                              left: `${card.column * 50}%`,
                              width: `calc(${card.width}% - 8px)`,
                              height: card.height,
                              borderRadius: 10,
                              padding: "6px 8px",
                              overflow: "hidden",
                              cursor: "pointer",
                              zIndex: 2
                            }}
                            title={card.event.title}
                          >
                            <strong style={{ display: "block", fontSize: 11 }}>{eventShortLabel(card.event)}</strong>
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
      ) : null}

      {viewMode === "calendar" && scope === "month" ? (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <h2 style={{ marginTop: 0 }}>Календарь месяца</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <strong key={d} style={{ textAlign: "center", color: "var(--muted)" }}>{d}</strong>)}
            {monthGridDays.map((day) => {
              const key = toDayString(day);
              const isToday = key === todayKey;
              const items = eventsByDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  className="calendar-month-cell rounded-2xl border-2 border-border bg-card p-8 shadow-lg"
                  style={{
                    margin: 0,
                    padding: 8,
                    minHeight: 140,
                    borderColor: isToday ? "hsl(var(--primary))" : undefined,
                    boxShadow: isToday ? "0 0 0 2px hsl(var(--primary) / 0.25)" : undefined
                  }}
                >
                  <button type="button" className="secondary" onClick={() => openCreateModal(key)} style={{ width: "100%", marginBottom: 6 }}>
                    {day.getDate()}
                  </button>
                  {items.slice(0, 3).map((item) => {
                    const c = colorForType(item.activityType);
                    return (
                      <button key={item.id} className={c.className} onClick={() => openEvent(item)} style={{ width: "100%", marginBottom: 4, textAlign: "left", fontSize: 11 }}>
                        {new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} {eventShortLabel(item)}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {viewMode === "list" ? (
        <section className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg">
          <h2 style={{ marginTop: 0 }}>Список по дням</h2>
          <div className="space-y-6">
            {rangeDays.map((dayDate) => {
              const day = toDayString(dayDate);
              const items = eventsByDay.get(day) ?? [];
              return (
                <article key={day} className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg" style={{ margin: 0 }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ marginTop: 0 }}>{dayDate.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</h3>
                    <button type="button" className="secondary" onClick={() => openCreateModal(day)}>Добавить</button>
                  </div>
                  {items.length ? (
                    <table className="table-modern">
                      <thead><tr><th>Время</th><th>Событие</th><th>Тип</th><th>Статус</th></tr></thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} onClick={() => openEvent(item)} style={{ cursor: "pointer" }}>
                            <td>{new Date(item.plannedStartAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>{item.title}</td>
                            <td>{typeLabel(item.activityType)}</td>
                            <td>{statusLabel(item.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p style={{ color: "var(--muted)", marginBottom: 0 }}>На этот день событий нет.</p>}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {createOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg" style={{ width: "min(760px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>Создать занятие</h2>
              <button className="secondary" onClick={() => setCreateOpen(false)}>Закрыть</button>
            </div>
            <form className="grid cols-2" onSubmit={createEvent}>
              <label>Дата<input type="date" value={createDate} onChange={(e) => setCreateDate(e.target.value)} required /></label>
              <label>Название<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
              <label>
                Предмет
                <select value={subject} onChange={(e) => setSubject(e.target.value)} required>
                  {subjectsCatalog.length ? (
                    subjectsCatalog.map((item) => <option key={item} value={item}>{item}</option>)
                  ) : (
                    <option value="">Нет предметов в справочнике</option>
                  )}
                </select>
              </label>
              <label>
                Тип занятия
                <select value={activityType} onChange={(e) => setActivityType(e.target.value as ActivityType)}>
                  <option value="INDIVIDUAL_LESSON">Индивидуальное</option>
                  <option value="GROUP_LESSON">Групповое</option>
                  <option value="TEACHERS_GENERAL_MEETING">Административное</option>
                </select>
              </label>
              <label>Время начала<input type="time" step={1800} value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></label>
              <label>
                Длительность (часы)
                <select value={durationHours} onChange={(e) => setDurationHours(e.target.value)}>
                  <option value="1">1 час</option>
                  <option value="2">2 часа</option>
                  <option value="3">3 часа</option>
                  <option value="4">4 часа</option>
                </select>
              </label>
              <label>
                {isAdministrativeType(activityType) ? "Участники (админы / педагоги)" : "Преподаватель"}
                {activityType === "GROUP_LESSON" || isAdministrativeType(activityType) ? (
                  <div
                    style={{
                      border: "2px solid var(--input)",
                      borderRadius: 12,
                      padding: 10,
                      maxHeight: 180,
                      overflowY: "auto"
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                      Выбрано: {teacherIds.length}
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {teachers.map((item) => {
                        const checked = teacherIds.includes(item.user.id);
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: "pointer",
                              border: checked ? "2px solid hsl(var(--primary))" : "2px solid hsl(var(--border))",
                              background: checked ? "hsl(var(--primary) / 0.08)" : "transparent",
                              borderRadius: 10,
                              padding: "8px 10px"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setTeacherIds((prev) => toggleId(prev, item.user.id))}
                              style={{ width: 18, height: 18 }}
                            />
                            <span>{item.user.fullName}</span>
                            {checked ? (
                              <span style={{ marginLeft: "auto", fontSize: 12, color: "hsl(var(--primary))", fontWeight: 600 }}>
                                Выбран
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <select
                    value={teacherIds[0] ?? ""}
                    onChange={(e) => setTeacherIds(e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">Не выбран</option>
                    {teachers.map((item) => <option key={item.id} value={item.user.id}>{item.user.fullName}</option>)}
                  </select>
                )}
              </label>
              {!isAdministrativeType(activityType) ? (
                <label>
                  Ученик
                  {activityType === "GROUP_LESSON" ? (
                    <div
                      style={{
                        border: "2px solid var(--input)",
                        borderRadius: 12,
                        padding: 10,
                        maxHeight: 180,
                        overflowY: "auto"
                      }}
                    >
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                        Выбрано: {studentIds.length}
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {students.map((item) => {
                          const checked = studentIds.includes(item.user.id);
                          return (
                            <label
                              key={item.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: "pointer",
                                border: checked ? "2px solid hsl(var(--primary))" : "2px solid hsl(var(--border))",
                                background: checked ? "hsl(var(--primary) / 0.08)" : "transparent",
                                borderRadius: 10,
                                padding: "8px 10px"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setStudentIds((prev) => toggleId(prev, item.user.id))}
                                style={{ width: 18, height: 18 }}
                              />
                              <span>{item.user.fullName}</span>
                              {checked ? (
                                <span style={{ marginLeft: "auto", fontSize: 12, color: "hsl(var(--primary))", fontWeight: 600 }}>
                                  Выбран
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={studentIds[0] ?? ""}
                      onChange={(e) => setStudentIds(e.target.value ? [e.target.value] : [])}
                    >
                      <option value="">Не выбран</option>
                      {students.map((item) => <option key={item.id} value={item.user.id}>{item.user.fullName}</option>)}
                    </select>
                  )}
                </label>
              ) : null}
              <div style={{ display: "flex", alignItems: "end" }}><button type="submit">Создать</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {activeEvent ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div className="rounded-2xl border-2 border-border bg-card p-8 shadow-lg" style={{ width: "min(760px, 96vw)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{activeEvent.title}</h2>
              <button className="secondary" onClick={() => setActiveEvent(null)}>Закрыть</button>
            </div>

            <p><strong>Статус:</strong> {statusLabel(activeEvent.status)}</p>
            <p><strong>Тип:</strong> {typeLabel(activeEvent.activityType)}</p>
            <p><strong>Предмет:</strong> {activeEvent.subject || "-"}</p>
            <p><strong>Мини-отчет преподавателя:</strong> {activeEvent.completionComment || "-"}</p>
            <p><strong>Дата и время:</strong> {new Date(activeEvent.plannedStartAt).toLocaleString("ru-RU")} - {new Date(activeEvent.plannedEndAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
            <p><strong>Студенты:</strong> {activeEvent.participants.filter((p) => p.participantRole === "STUDENT").map((p) => p.user.fullName).join(", ") || "-"}</p>
            <p><strong>Ответственный / педагог:</strong> {activeEvent.participants.filter((p) => p.participantRole === "TEACHER" || p.participantRole === "CURATOR").map((p) => p.user.fullName).join(", ") || "-"}</p>

            <div className="icon-switch" style={{ marginTop: 8, marginBottom: 8 }}>
              <button onClick={() => setEditMode((v) => !v)}>{editMode ? "Скрыть редактирование" : "Редактировать"}</button>
              <button className="secondary" onClick={copyEventLink}>Поделиться ссылкой</button>
            </div>

            {editMode ? (
              <div className="grid cols-2">
                <label>Название<input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></label>
                <label>
                  Предмет
                  <select value={editSubject} onChange={(e) => setEditSubject(e.target.value)}>
                    {subjectsCatalog.length ? (
                      [...new Set([editSubject, ...subjectsCatalog].filter(Boolean))].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))
                    ) : (
                      <option value="">Нет предметов в справочнике</option>
                    )}
                  </select>
                </label>
                <label>Начало<input type="datetime-local" step={1800} value={editStart} onChange={(e) => setEditStart(e.target.value)} /></label>
                <label>Конец<input type="datetime-local" step={1800} value={editEnd} onChange={(e) => setEditEnd(e.target.value)} /></label>
                <label>
                  Статус
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as EventItem["status"])}>
                    <option value="PLANNED">Запланировано</option>
                    <option value="COMPLETED">Состоялось</option>
                    <option value="CANCELED">Не состоялось</option>
                  </select>
                </label>
                {editStatus === "COMPLETED" ? (
                  <label style={{ gridColumn: "1 / -1" }}>
                    Мини-отчет преподавателя (что проходили)
                    <textarea value={editCompletionComment} onChange={(e) => setEditCompletionComment(e.target.value)} rows={4} required />
                  </label>
                ) : null}
                <div style={{ display: "flex", alignItems: "end" }}><button onClick={saveEventChanges}>Сохранить</button></div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
