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
  if (status === "PLANNED") return "Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ";
  if (status === "COMPLETED") return "РЎРѕСЃС‚РѕСЏР»РѕСЃСЊ";
  return "РќРµ СЃРѕСЃС‚РѕСЏР»РѕСЃСЊ";
}

function eventReason(event: EventItem) {
  if (event.status !== "CANCELED") return "-";
  return event.cancelReason?.name || event.cancelComment || "РџСЂРёС‡РёРЅР° РЅРµ СѓРєР°Р·Р°РЅР°";
}

function payableHours(event: EventItem) {
  if (event.status !== "COMPLETED") return 0;
  return Math.max(0, event.billableHours);
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
      setError(payload.error ?? "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р°РЅР°Р»РёС‚РёРєСѓ");
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
    const billableHours = events.reduce((sum, item) => sum + payableHours(item), 0);
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
      row.billableHours += payableHours(item);
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
    if (metricModal === "planned_count") return "РЎРїРёСЃРѕРє Р·Р°РїР»Р°РЅРёСЂРѕРІР°РЅРЅС‹С… Р·Р°РЅСЏС‚РёР№";
    if (metricModal === "completed_count") return "РЎРїРёСЃРѕРє СЃРѕСЃС‚РѕСЏРІС€РёС…СЃСЏ Р·Р°РЅСЏС‚РёР№";
    if (metricModal === "canceled_count") return "РЎРїРёСЃРѕРє РЅРµСЃРѕСЃС‚РѕСЏРІС€РёС…СЃСЏ Р·Р°РЅСЏС‚РёР№";
    if (metricModal === "planned_hours") return "РЎРѕР±С‹С‚РёСЏ РІ СЂР°СЃС‡РµС‚Рµ С‡Р°СЃРѕРІ РїР»Р°РЅ";
    if (metricModal === "factual_hours") return "РЎРѕР±С‹С‚РёСЏ РІ СЂР°СЃС‡РµС‚Рµ С‡Р°СЃРѕРІ С„Р°РєС‚";
    if (metricModal === "billable_hours") return "РЎРѕР±С‹С‚РёСЏ РІ СЂР°СЃС‡РµС‚Рµ С‡Р°СЃРѕРІ Рє РѕРїР»Р°С‚Рµ";
    if (metricModal === "attendance_rate") return "РЎРѕР±С‹С‚РёСЏ РІ СЂР°СЃС‡РµС‚Рµ РґРѕС…РѕРґРёРјРѕСЃС‚Рё";
    return "";
  }, [metricModal]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>РђРЅР°Р»РёС‚РёРєР°</CardTitle>
          <CardDescription>РЎРІРѕРґ РїРѕ Р·Р°РЅСЏС‚РёСЏРј, С‡Р°СЃР°Рј Рё РїСЂРёС‡РёРЅР°Рј РѕС‚РјРµРЅ СЃ РґРµС‚Р°Р»РёР·Р°С†РёРµР№ РїРѕ РєР°Р¶РґРѕРјСѓ РїРѕРєР°Р·Р°С‚РµР»СЋ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="from" className="text-sm font-medium text-muted-foreground">
                РџРµСЂРёРѕРґ СЃ
              </label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="to" className="text-sm font-medium text-muted-foreground">
                РџРµСЂРёРѕРґ РїРѕ
              </label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="teacher" className="text-sm font-medium text-muted-foreground">
                РџСЂРµРїРѕРґР°РІР°С‚РµР»СЊ
              </label>
              <select
                id="teacher"
                value={teacherUserId}
                onChange={(e) => setTeacherUserId(e.target.value)}
              >
                <option value="">Р’СЃРµ РїСЂРµРїРѕРґР°РІР°С‚РµР»Рё</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.user.id}>
                    {item.user.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <Button onClick={load} disabled={loading}>
                {loading ? "Р—Р°РіСЂСѓР·РєР°..." : "РџРѕСЃС‚СЂРѕРёС‚СЊ"}
              </Button>
            </div>
          </div>
          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>РЎРІРѕРґ РїРѕ С‡Р°СЃР°Рј</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-modern">
              <tbody>
                <tr>
                  <th className="font-semibold">Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ СЃРѕР±С‹С‚РёР№</th>
                  <td className="text-right font-bold">
                    <button type="button" className="text-primary hover:underline" onClick={() => setMetricModal("planned_count")}>
                      {summary.planned.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">РЎРѕСЃС‚РѕСЏР»РѕСЃСЊ СЃРѕР±С‹С‚РёР№</th>
                  <td className="text-right font-bold text-green-600">
                    <button type="button" className="text-green-600 hover:underline" onClick={() => setMetricModal("completed_count")}>
                      {summary.completed.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">РќРµ СЃРѕСЃС‚РѕСЏР»РѕСЃСЊ СЃРѕР±С‹С‚РёР№</th>
                  <td className="text-right font-bold text-red-600">
                    <button type="button" className="text-red-600 hover:underline" onClick={() => setMetricModal("canceled_count")}>
                      {summary.canceled.length}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Р§Р°СЃС‹ РїР»Р°РЅ</th>
                  <td className="text-right font-bold">
                    <button type="button" className="hover:underline" onClick={() => setMetricModal("planned_hours")}>
                      {summary.plannedHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Р§Р°СЃС‹ С„Р°РєС‚</th>
                  <td className="text-right font-bold">
                    <button type="button" className="hover:underline" onClick={() => setMetricModal("factual_hours")}>
                      {summary.factualHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Р§Р°СЃС‹ Рє РѕРїР»Р°С‚Рµ</th>
                  <td className="text-right font-bold text-primary">
                    <button type="button" className="text-primary hover:underline" onClick={() => setMetricModal("billable_hours")}>
                      {summary.billableHours}
                    </button>
                  </td>
                </tr>
                <tr>
                  <th className="font-semibold">Р”РѕС…РѕРґРёРјРѕСЃС‚СЊ</th>
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
          <CardTitle>Р”РёР°РіСЂР°РјРјР° РїРѕ РґРЅСЏРј</CardTitle>
          <CardDescription>РџР»Р°РЅРѕРІС‹Рµ С‡Р°СЃС‹, С‡Р°СЃС‹ Рє РѕРїР»Р°С‚Рµ Рё С‡РёСЃР»Рѕ РѕС‚РјРµРЅ РїРѕ РєР°Р¶РґРѕРјСѓ РґРЅСЋ</CardDescription>
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
                      {row.canceledCount ? `РћС‚РјРµРЅ: ${row.canceledCount}` : "-"}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-blue-500" />Р§Р°СЃС‹ РїР»Р°РЅ</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-4 rounded bg-emerald-500" />Р§Р°СЃС‹ Рє РѕРїР»Р°С‚Рµ</span>
              </div>
            </div>
          ) : (
            <p className="empty-state">РќРµС‚ РґР°РЅРЅС‹С… Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>РџСЂРёС‡РёРЅС‹ РЅРµСЃРѕСЃС‚РѕСЏРІС€РёС…СЃСЏ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>РџСЂРёС‡РёРЅР°</th>
                  <th className="text-right">РљРѕР»РёС‡РµСЃС‚РІРѕ</th>
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
                      РќРµС‚ РґР°РЅРЅС‹С….
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
                Р—Р°РєСЂС‹С‚СЊ
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Р”Р°С‚Р°</th>
                    <th>РЎРѕР±С‹С‚РёРµ</th>
                    <th>РџСЂРµРїРѕРґР°РІР°С‚РµР»Рё</th>
                    <th>РЎС‚СѓРґРµРЅС‚С‹</th>
                    <th>РЎС‚Р°С‚СѓСЃ</th>
                    <th>РџСЂРёС‡РёРЅР°</th>
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
                        РќРµС‚ РґР°РЅРЅС‹С….
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
                  Р—Р°РєСЂС‹С‚СЊ
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>РЎС‚Р°С‚СѓСЃ:</strong> {statusLabel(activeEvent.status)}</p>
              <p><strong>Р”Р°С‚Р°:</strong> {new Date(activeEvent.plannedStartAt).toLocaleString("ru-RU")}</p>
              <p><strong>РџСЂРµРґРјРµС‚:</strong> {activeEvent.subject || "-"}</p>
              <p><strong>Р§Р°СЃС‹ РїР»Р°РЅ:</strong> {activeEvent.plannedHours}</p>
              <p><strong>Р§Р°СЃС‹ Рє РѕРїР»Р°С‚Рµ:</strong> {payableHours(activeEvent)}</p>
              <p><strong>РџСЂРµРїРѕРґР°РІР°С‚РµР»Рё:</strong> {getTeacherNames(activeEvent) || "-"}</p>
              <p><strong>РЎС‚СѓРґРµРЅС‚С‹:</strong> {getStudentNames(activeEvent) || "-"}</p>
              <p><strong>РџСЂРёС‡РёРЅР° РѕС‚РјРµРЅС‹:</strong> {eventReason(activeEvent)}</p>
            </CardContent>
          </Card>
        ) : null}
      </Modal>
    </div>
  );
}

