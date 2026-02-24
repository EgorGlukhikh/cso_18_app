"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type EventItem = {
  id: string;
  title: string;
  subject: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  plannedStartAt: string;
  plannedEndAt: string;
  plannedHours: number;
  billableHours: number;
  cancelComment: string | null;
  cancelReason: { id: string; name: string } | null;
  participants: Array<{
    participantRole: "STUDENT" | "TEACHER" | "CURATOR" | "PSYCHOLOGIST" | "PARENT";
    user: { id: string; fullName: string };
  }>;
};

type TeacherOption = {
  id: string;
  user: {
    id: string;
    fullName: string;
  };
};

type MetricKey =
  | "planned_count"
  | "completed_count"
  | "canceled_count"
  | "planned_hours"
  | "factual_hours"
  | "billable_hours"
  | "attendance_rate";

function getTeacherNames(event: EventItem) {
  return event.participants
    .filter((p) => p.participantRole === "TEACHER")
    .map((p) => p.user.fullName)
    .join(", ");
}

function getStudentNames(event: EventItem) {
  return event.participants
    .filter((p) => p.participantRole === "STUDENT")
    .map((p) => p.user.fullName)
    .join(", ");
}

function statusLabel(status: EventItem["status"]) {
  if (status === "PLANNED") return "Запланировано";
  if (status === "COMPLETED") return "Состоялось";
  return "Не состоялось";
}

function eventReason(event: EventItem) {
  if (event.status !== "CANCELED") return "-";
  return event.cancelReason?.name || event.cancelComment || "Причина не указана";
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [teacherUserId, setTeacherUserId] = useState("");
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [metricModal, setMetricModal] = useState<MetricKey | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    async function loadTeachers() {
      const response = await fetch("/api/teachers");
      if (!response.ok) return;
      const payload = (await response.json()) as { items?: TeacherOption[] };
      setTeachers(payload.items ?? []);
    }
    void loadTeachers();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (teacherUserId) query.set("teacherUserId", teacherUserId);

    const [eventsRes, teachersRes] = await Promise.all([
      fetch(`/api/events?${query.toString()}`),
      fetch("/api/teachers")
    ]);

    if (!eventsRes.ok) {
      const payload = (await eventsRes.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Не удалось загрузить аналитику");
      setLoading(false);
      return;
    }

    const eventsPayload = (await eventsRes.json()) as { items?: EventItem[] };
    const teachersPayload = teachersRes.ok
      ? ((await teachersRes.json()) as { items?: TeacherOption[] })
      : { items: [] };

    setEvents(eventsPayload.items ?? []);
    setTeachers(teachersPayload.items ?? []);
    setLoading(false);
  }

  const summary = useMemo(() => {
    const completed = events.filter((item) => item.status === "COMPLETED");
    const canceled = events.filter((item) => item.status === "CANCELED");
    const planned = events.filter((item) => item.status === "PLANNED");

    const plannedHours = events.reduce((sum, item) => sum + item.plannedHours, 0);
    const factualHours = completed.reduce((sum, item) => sum + item.plannedHours, 0);
    const billableHours = completed.reduce((sum, item) => sum + item.billableHours, 0);
    const attendanceRate = events.length ? Number(((completed.length / events.length) * 100).toFixed(2)) : 0;

    return {
      planned,
      completed,
      canceled,
      plannedHours,
      factualHours,
      billableHours,
      attendanceRate
    };
  }, [events]);

  const cancelReasons = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of summary.canceled) {
      const key = eventReason(item);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([reasonName, count]) => ({ reasonName, count }))
      .sort((a, b) => b.count - a.count);
  }, [summary.canceled]);

  const dailyChart = useMemo(() => {
    const byDay = new Map<
      string,
      { day: string; plannedHours: number; billableHours: number; canceledCount: number; totalCount: number }
    >();

    for (const item of events) {
      const day = item.plannedStartAt.slice(0, 10);
      if (!byDay.has(day)) {
        byDay.set(day, { day, plannedHours: 0, billableHours: 0, canceledCount: 0, totalCount: 0 });
      }
      const row = byDay.get(day)!;
      row.totalCount += 1;
      row.plannedHours += item.plannedHours;
      row.billableHours += item.billableHours;
      if (item.status === "CANCELED") row.canceledCount += 1;
    }

    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [events]);

  const maxDailyHours = useMemo(
    () => Math.max(1, ...dailyChart.map((item) => item.plannedHours)),
    [dailyChart]
  );

  const metricEvents = useMemo(() => {
    if (!metricModal) return [];
    if (metricModal === "planned_count") return summary.planned;
    if (metricModal === "completed_count") return summary.completed;
    if (metricModal === "canceled_count") return summary.canceled;
    if (metricModal === "planned_hours") return events;
    if (metricModal === "factual_hours") return summary.completed;
    if (metricModal === "billable_hours") return summary.completed;
    return events;
  }, [metricModal, summary, events]);

  const metricTitle = useMemo(() => {
    if (metricModal === "planned_count") return "Список запланированных занятий";
    if (metricModal === "completed_count") return "Список состоявшихся занятий";
    if (metricModal === "canceled_count") return "Список несостоявшихся занятий";
    if (metricModal === "planned_hours") return "События в расчете часов план";
    if (metricModal === "factual_hours") return "События в расчете часов факт";
    if (metricModal === "billable_hours") return "События в расчете часов к оплате";
    if (metricModal === "attendance_rate") return "События в расчете доходимости";
    return "";
  }, [metricModal]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Аналитика</CardTitle>
          <CardDescription>Свод по занятиям, часам и причинам отмен с детализацией по каждому показателю</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="from" className="text-sm font-medium text-muted-foreground">
                Период с
              </label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="to" className="text-sm font-medium text-muted-foreground">
                Период по
              </label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="teacher" className="text-sm font-medium text-muted-foreground">
                Преподаватель
              </label>
              <select
                id="teacher"
                value={teacherUserId}
                onChange={(e) => setTeacherUserId(e.target.value)}
              >
                <option value="">Все преподаватели</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.user.id}>
                    {item.user.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <Button onClick={load} disabled={loading}>
                {loading ? "Загрузка..." : "Построить"}
              </Button>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Свод по часам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-modern">
              <tbody>
                <tr>
                  <th className="font-semibold">Запланировано событий</th>
                  <td className="text-right font-bold">
                    <button type="button" className="text-primary hover:underline" onClick={() => setMetricModal("planned_count")}>
                      {summary.planned.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Состоялось событий</th>
                  <td className="text-right font-bold text-green-600">
                    <button type="button" className="text-green-600 hover:underline" onClick={() => setMetricModal("completed_count")}>
                      {summary.completed.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Не состоялось событий</th>
                  <td className="text-right font-bold text-red-600">
                    <button type="button" className="text-red-600 hover:underline" onClick={() => setMetricModal("canceled_count")}>
                      {summary.canceled.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Часы план</th>
                  <td className="text-right font-bold">
                    <button type="button" className="hover:underline" onClick={() => setMetricModal("planned_hours")}>
                      {summary.plannedHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Часы факт</th>
                  <td className="text-right font-bold">
                    <button type="button" className="hover:underline" onClick={() => setMetricModal("factual_hours")}>
                      {summary.factualHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Часы к оплате</th>
                  <td className="text-right font-bold text-primary">
                    <button type="button" className="text-primary hover:underline" onClick={() => setMetricModal("billable_hours")}>
                      {summary.billableHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Доходимость</th>
                  <td className="text-right font-bold text-primary">
                    <button type="button" className="text-primary hover:underline" onClick={() => setMetricModal("attendance_rate")}>
                      {summary.attendanceRate}%
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Диаграмма по дням</CardTitle>
          <CardDescription>Плановые часы, часы к оплате и число отмен по каждому дню</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyChart.length ? (
            <div className="space-y-3">
              {dailyChart.map((row) => {
                const plannedWidth = (row.plannedHours / maxDailyHours) * 100;
                const billableWidth = (row.billableHours / maxDailyHours) * 100;
                return (
                  <div key={row.day} className="grid grid-cols-[130px_1fr_70px] items-center gap-3">
                    <div className="text-sm font-medium">
                      {new Date(`${row.day}T00:00:00`).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </div>
                    <div>
                      <div className="h-2 rounded bg-muted">
                        <div className="h-2 rounded bg-blue-500" style={{ width: `${plannedWidth}%` }} />
                      </div>
                      <div className="mt-1 h-2 rounded bg-muted">
                        <div className="h-2 rounded bg-emerald-500" style={{ width: `${billableWidth}%` }} />
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {row.canceledCount ? `Отмен: ${row.canceledCount}` : "-"}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-blue-500" />Часы план</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-emerald-500" />Часы к оплате</span>
              </div>
            </div>
          ) : (
            <p className="empty-state">Нет данных за выбранный период.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Причины несостоявшихся</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Причина</th>
                  <th className="text-right">Количество</th>
                </tr>
              </thead>
              <tbody>
                {cancelReasons.map((item) => (
                  <tr key={item.reasonName}>
                    <td className="font-medium">{item.reasonName}</td>
                    <td className="text-right font-semibold">{item.count}</td>
                  </tr>
                ))}
                {!cancelReasons.length ? (
                  <tr>
                    <td colSpan={2} className="empty-state">
                      Нет данных.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={!!metricModal} onClose={() => setMetricModal(null)} className="w-full max-w-6xl">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{metricTitle}</CardTitle>
              <Button type="button" variant="secondary" onClick={() => setMetricModal(null)}>
                Закрыть
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Событие</th>
                    <th>Преподаватели</th>
                    <th>Студенты</th>
                    <th>Статус</th>
                    <th>Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {metricEvents.map((item) => (
                    <tr key={item.id} className="cursor-pointer" onClick={() => setActiveEvent(item)}>
                      <td className="whitespace-nowrap">
                        {new Date(item.plannedStartAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="font-medium">{item.title}</td>
                      <td>{getTeacherNames(item) || "-"}</td>
                      <td>{getStudentNames(item) || "-"}</td>
                      <td>{statusLabel(item.status)}</td>
                      <td>{eventReason(item)}</td>
                    </tr>
                  ))}
                  {!metricEvents.length ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        Нет данных.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Modal>

      <Modal open={!!activeEvent} onClose={() => setActiveEvent(null)} className="w-full max-w-2xl">
        {activeEvent ? (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{activeEvent.title}</CardTitle>
                <Button type="button" variant="secondary" onClick={() => setActiveEvent(null)}>
                  Закрыть
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Статус:</strong> {statusLabel(activeEvent.status)}</p>
              <p><strong>Дата:</strong> {new Date(activeEvent.plannedStartAt).toLocaleString("ru-RU")}</p>
              <p><strong>Предмет:</strong> {activeEvent.subject || "-"}</p>
              <p><strong>Часы план:</strong> {activeEvent.plannedHours}</p>
              <p><strong>Часы к оплате:</strong> {activeEvent.billableHours}</p>
              <p><strong>Преподаватели:</strong> {getTeacherNames(activeEvent) || "-"}</p>
              <p><strong>Студенты:</strong> {getStudentNames(activeEvent) || "-"}</p>
              <p><strong>Причина отмены:</strong> {eventReason(activeEvent)}</p>
            </CardContent>
          </Card>
        ) : null}
      </Modal>
    </div>
  );
}
