# CSO 18 App

Стартовый продакшен-ориентированный шаблон для образовательных центров: расписание, учет посещаемости, расчет часов и уведомления родителям.

Репозиторий можно использовать как базу для похожих проектов: репетиторские центры, частные школы, языковые школы, психологические и развивающие центры.

## Что уже реализовано
- Планирование событий со статусами: `PLANNED`, `COMPLETED`, `CANCELED`
- Обязательная причина для несостоявшегося занятия
- Расчет часов: план / факт / к оплате
- Связи ребенок-родители с ограничением: максимум 2 родителя на ребенка
- Флаг получения напоминаний для каждой связи (`receivesMorningReminder`)
- Базовые API аналитики (сводка и причины отмен)
- Seed-данные с реальным семейным кейсом

## Бизнес-правила (MVP)
- 1 урок = 1 оплачиваемый час
- В оплату попадают только события со статусом `COMPLETED`
- Для `CANCELED` обязательно указание причины
- Утренние напоминания формируются только для детей, где у родителя включен `receivesMorningReminder`

## Технологии
- Next.js 16 (App Router, TypeScript)
- Prisma ORM
- PostgreSQL
- Zod для валидации API
- ESLint

## Структура проекта
- `src/app` — UI-страницы и API-роуты
- `src/lib` — общие модули (`db`, валидация, расчет часов)
- `prisma/schema.prisma` — модель БД
- `prisma/seed-cancel-reasons.mjs` — сид причин несостоявшихся
- `prisma/seed-family.mjs` — сид семейных данных

## Быстрый старт
1. Установить зависимости:
```bash
npm install
```
2. Создать `.env`:
```bash
cp .env.example .env
```
3. Сгенерировать Prisma Client и выполнить миграции:
```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```
4. Заполнить справочники и демо-данные:
```bash
npm run prisma:seed-reasons
npm run prisma:seed-family
```
5. Запустить приложение:
```bash
npm run dev
```

## Переменные окружения
Создайте `.env` на основе `.env.example`.

Обязательно:
- `DATABASE_URL` — строка подключения к PostgreSQL

## Скрипты
- `npm run dev` — запуск в разработке
- `npm run build` — production build
- `npm run start` — запуск production (с применением миграций)
- `npm run lint` — проверка линтером
- `npm run prisma:generate` — генерация Prisma Client
- `npm run prisma:migrate -- --name <name>` — создание/применение миграции
- `npm run prisma:deploy` — применение миграций в проде
- `npm run prisma:seed-reasons` — сид причин отмен
- `npm run prisma:seed-family` — сид родителей/учеников

## Реализованные API
- `GET /api/events`
- `POST /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `POST /api/events/:id/status`
- `GET /api/reports/summary`
- `GET /api/reports/cancel-reasons`
- `GET /api/parent-student-links?studentProfileId=...`
- `POST /api/parent-student-links`
- `PATCH /api/parent-student-links`
- `GET /api/parents/:parentProfileId/morning-reminder`

## Пример: создать событие
```http
POST /api/events
Content-Type: application/json

{
  "title": "Индивидуальный урок математики",
  "activityType": "INDIVIDUAL_LESSON",
  "plannedStartAt": "2026-02-22T08:00:00.000Z",
  "plannedEndAt": "2026-02-22T08:45:00.000Z",
  "createdByUserId": "<admin_user_id>",
  "participants": [
    { "userId": "<teacher_user_id>", "participantRole": "TEACHER" },
    { "userId": "<student_user_id>", "participantRole": "STUDENT" }
  ]
}
```

## Пример: отметить как несостоявшееся
```http
POST /api/events/:id/status
Content-Type: application/json

{
  "status": "CANCELED",
  "cancelReasonId": "<reason_id>",
  "cancelComment": "Ребенок заболел"
}
```

## Как адаптировать под другой центр
1. Заменить seed-скрипты на свои данные.
2. Подключить Google OAuth/Auth.js и ролевые ограничения.
3. Добавить полноценный модуль ставок и выплат.
4. Подключить Telegram-бота с ежедневной отправкой напоминаний.
5. Расширить аналитику (pivot/grid, экспорт).

## Деплой (Railway)
- Используйте managed PostgreSQL
- Храните секреты в Railway Variables
- Применяйте миграции при старте (`prisma migrate deploy`)
- Не храните бизнес-данные в локальной файловой системе контейнера
- Настройте бэкапы БД и мониторинг

## Текущий статус
Собран рабочий MVP-фундамент. Следующий этап: аутентификация, админка пользователей, модуль выплат, отправка Telegram-напоминаний.
