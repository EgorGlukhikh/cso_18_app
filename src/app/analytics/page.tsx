"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Summary = {
  period: { from: string | null; to: string | null };
  eventCounts: { total: number; planned: number; completed: number; canceled: number };
  hours: { planned: number; factual: number; billable: number };
  conversion: { attendanceRate: number };
};

type CancelReason = {
  reasonId: string | null;
  reasonName: string;
  count: number;
};

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const [summaryRes, reasonsRes] = await Promise.all([
      fetch(`/api/reports/summary?${query.toString()}`),
      fetch(`/api/reports/cancel-reasons?${query.toString()}`)
    ]);

    setSummary((await summaryRes.json()) as Summary);
    setReasons(((await reasonsRes.json()) as { items: CancelReason[] }).items ?? []);
    setLoading(false);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Аналитика</CardTitle>
          <CardDescription>Сводные отчеты по событиям, часам и причинам отмен</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="from" className="text-sm font-medium text-muted-foreground">
                Период с
              </label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="to" className="text-sm font-medium text-muted-foreground">
                Период по
              </label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button onClick={load} disabled={loading}>
                {loading ? "Загрузка..." : "Построить"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Свод по часам</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="overflow-x-auto">
              <table className="table-modern">
                <tbody>
                  <tr>
                    <th className="font-semibold">Запланировано событий</th>
                    <td className="text-right font-bold">{summary.eventCounts.planned}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Состоялось событий</th>
                    <td className="text-right font-bold text-green-600">{summary.eventCounts.completed}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Не состоялось событий</th>
                    <td className="text-right font-bold text-red-600">{summary.eventCounts.canceled}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Часы план</th>
                    <td className="text-right font-bold">{summary.hours.planned}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Часы факт</th>
                    <td className="text-right font-bold">{summary.hours.factual}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Часы к оплате</th>
                    <td className="text-right font-bold text-primary">{summary.hours.billable}</td>
                  </tr>
                  <tr>
                    <th className="font-semibold">Доходимость</th>
                    <td className="text-right font-bold text-primary">{summary.conversion.attendanceRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">Выберите период и нажмите «Построить».</p>
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
                {reasons.map((item) => (
                  <tr key={`${item.reasonId}-${item.reasonName}`}>
                    <td className="font-medium">{item.reasonName}</td>
                    <td className="text-right font-semibold">{item.count}</td>
                  </tr>
                ))}
                {!reasons.length && (
                  <tr>
                    <td colSpan={2} className="empty-state">
                      Нет данных.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
