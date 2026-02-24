import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const links = [
  { href: "/events", title: "Расписание", text: "Календарь и список занятий" },
  { href: "/teacher-calendar", title: "Календарь педагога", text: "Сетка недели и слоты" },
  { href: "/students", title: "Студенты", text: "Карточки учеников и расписание" },
  { href: "/parents", title: "Родители", text: "Связи с детьми и уведомления" },
  { href: "/teachers", title: "Преподаватели", text: "Педагоги и специализации" },
  { href: "/analytics", title: "Аналитика", text: "План, факт и причины отмен" },
  { href: "/knowledge", title: "База знаний", text: "Инструкции по процессам" }
];

export default function HomePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-4 md:pb-6">
          <CardTitle className="text-xl md:text-3xl">CRM центра содействия образованию</CardTitle>
          <CardDescription>Быстрый доступ к основным разделам</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <CardContent className="p-4 md:p-8">
                <div className="space-y-2">
                  <strong className="block text-base md:text-lg">{item.title}</strong>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
