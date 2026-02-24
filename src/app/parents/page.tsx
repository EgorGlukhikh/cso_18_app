"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";

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
  const [parentTelegramChatId, setParentTelegramChatId] = useState("");
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
    setParentTelegramChatId(payload.telegramChatId ?? "");
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
        telegramChatId: parentTelegramChatId.trim() || null,
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

  async function unlinkParentTelegram() {
    if (!activeParent) return;

    const response = await fetch(`/api/parents/${activeParent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramChatId: null,
        telegramEnabled: false
      })
    });

    if (!response.ok) {
      setError("Не удалось отвязать Telegram");
      return;
    }

    const refreshed = (await response.json()) as ParentItem;
    setActiveParent(refreshed);
    setParentTelegramChatId("");
    setParentTgEnabled(false);
    await load();
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Родители</CardTitle>
            <Button onClick={() => setAddOpen(true)}>Добавить</Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
          <div className="overflow-x-auto">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Телефон</th>
                  <th>Telegram</th>
                  <th>Дети</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="cursor-pointer" onClick={() => void openParent(item)}>
                    <td className="font-medium">{item.user.fullName}</td>
                    <td>{item.user.phone || "-"}</td>
                    <td>{item.telegramEnabled ? "Подключен" : "Не подключен"}</td>
                    <td className="text-sm">{item.studentLinks.map((s) => s.student.user.fullName).join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} className="w-full max-w-2xl">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Добавить родителя</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ФИО</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Телефон</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Час напоминания</label>
                  <Input type="number" min={0} max={23} value={morningReminderHour} onChange={(e) => setMorningReminderHour(e.target.value)} />
                </div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm font-medium">Telegram включен</span>
                </label>
                <div className="col-span-full space-y-2">
                  <label className="text-sm font-medium">Комментарий</label>
                  <textarea rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit">Сохранить</Button>
                <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Закрыть</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Modal>

      <Modal open={!!activeParent} onClose={() => setActiveParent(null)} className="w-full max-w-3xl">
        {activeParent && (
          <Card className="border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{activeParent.user.fullName}</CardTitle>
                <Button variant="secondary" onClick={() => setActiveParent(null)}>Закрыть</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Телефон</label>
                  <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telegram Chat ID</label>
                  <Input
                    value={parentTelegramChatId}
                    onChange={(e) => setParentTelegramChatId(e.target.value)}
                    placeholder="например: 123456789"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Час напоминания</label>
                  <Input type="number" min={0} max={23} value={parentReminderHour} onChange={(e) => setParentReminderHour(e.target.value)} />
                </div>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={parentTgEnabled} onChange={(e) => setParentTgEnabled(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm font-medium">Telegram включен</span>
                </label>
                <div className="col-span-full space-y-2">
                  <label className="text-sm font-medium">Комментарий</label>
                  <textarea rows={3} value={parentComment} onChange={(e) => setParentComment(e.target.value)} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Статус Telegram: {activeParent.telegramChatId ? "Привязан" : "Не привязан"}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={saveParent}>Сохранить</Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={unlinkParentTelegram}
                  disabled={!activeParent.telegramChatId}
                >
                  Отвязать Telegram
                </Button>
              </div>

              <div>
                <h3 className="mb-4 text-lg font-semibold">Привязанные дети</h3>
                <div className="space-y-2">
                  {activeParent.studentLinks.map((link) => (
                    <Card key={link.id} className="p-0">
                      <Link
                        href={`/students?studentId=${link.student.id}`}
                        className="block rounded-2xl p-4 text-sm transition-colors hover:bg-muted/50"
                      >
                        {link.student.user.fullName}{" "}
                        <span className="text-muted-foreground">({link.relationship || "ребенок"})</span>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Select value={linkStudentId} onChange={(e) => setLinkStudentId(e.target.value)} className="min-w-[200px] flex-1">
                  <option value="">Выберите ребенка</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.user.fullName}
                    </option>
                  ))}
                </Select>
                <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Отношение" className="min-w-[150px] flex-1" />
                <Button type="button" onClick={addStudentLink}>Привязать ребенка</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </Modal>
    </div>
  );
}
