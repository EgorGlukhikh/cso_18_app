"use client";

import { useEffect, useState } from "react";

type StudentItem = {
  id: string;
  grade: string | null;
  problemSubjects: string[];
  user: {
    fullName: string;
    email: string;
  };
};

export default function StudentsPage() {
  const [items, setItems] = useState<StudentItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("");
  const [problemSubjects, setProblemSubjects] = useState("");
  const [requestText, setRequestText] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/students");
    const payload = (await response.json()) as { items?: StudentItem[]; error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Ошибка загрузки");
      return;
    }
    setItems(payload.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        grade: grade || undefined,
        diagnosticsSummary: "Добавлен вручную",
        problemSubjects: problemSubjects
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        requestText
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Не удалось создать студента");
      return;
    }

    setFullName("");
    setEmail("");
    setGrade("");
    setProblemSubjects("");
    setRequestText("");
    await load();
  }

  return (
    <div className="grid">
      <section className="card">
        <h1 style={{ marginTop: 0 }}>Студенты</h1>
        <form className="grid cols-2" onSubmit={onSubmit}>
          <label>
            ФИО
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Email
            <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Класс
            <input value={grade} onChange={(e) => setGrade(e.target.value)} />
          </label>
          <label>
            Проблемные предметы (через запятую)
            <input value={problemSubjects} onChange={(e) => setProblemSubjects(e.target.value)} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Запрос
            <input value={requestText} onChange={(e) => setRequestText(e.target.value)} />
          </label>
          <div>
            <button type="submit">Добавить студента</button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Класс</th>
              <th>Проблемные предметы</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.user.fullName}</td>
                <td>{item.user.email}</td>
                <td>{item.grade ?? "-"}</td>
                <td>{item.problemSubjects.join(", ") || "-"}</td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={4}>Пока нет студентов</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
