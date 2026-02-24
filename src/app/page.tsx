import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  { href: "/events", icon: "🗓️", title: "Расписание", text: "Календарь и список занятий" },
  { href: "/students", icon: "🎓", title: "Студенты", text: "Карточки учеников" },
  { href: "/parents", icon: "👨‍👩‍👧", title: "Родители", text: "Связи и напоминания" },
  { href: "/teachers", icon: "👩‍🏫", title: "Преподаватели", text: "Педагоги и кураторы" },
  { href: "/analytics", icon: "📊", title: "Аналитика", text: "План/факт и причины" },
  { href: "/knowledge", icon: "📚", title: "База знаний", text: "Инструкции для сотрудников" }
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CRM центра содействия образованию</CardTitle>
          <CardDescription>Быстрый доступ к разделам системы</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-all hover:shadow-xl hover:scale-[1.02] cursor-pointer group">
              <CardContent className="pt-8">
                <div className="flex flex-col items-center text-center gap-3">
                  <span className="text-5xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  <strong className="text-lg font-bold">{item.title}</strong>
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
