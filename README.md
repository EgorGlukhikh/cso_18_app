# Центр содействия образованию (CRM / ERP)

Рабочий прототип CRM для образовательного центра: расписание, карточки участников, статусы занятий, учет часов и аналитика отмен.

## Что реализовано сейчас
- Главная с календарем и списком событий.
- Режимы отображения: `День / Неделя / Месяц`.
- Фильтры: по типу активности, статусу и периоду (`текущий месяц / текущая неделя / день / свой период`).
- Карточки разделов:
  - `Преподаватели`
  - `Студенты`
  - `Родители`
- Попап карточки события с просмотром и редактированием.
- Раздел `База знаний` с инструкциями для сотрудников.
- Темная и светлая темы интерфейса.

## Ключевые бизнес-правила
- 1 урок считается как 1 час для учета.
- К оплате идут фактические часы по статусу `COMPLETED`.
- Для статуса `CANCELED` обязательна причина отмены.
- Для статуса `COMPLETED` обязателен мини-отчет преподавателя (`completionComment`).
- Для ребенка можно привязать до 2 родителей, с выбором, кому отправлять напоминания.

## Технологии
- Next.js 16 (App Router, TypeScript)
- Prisma ORM
- PostgreSQL
- Zod
- ESLint

## Основные пути
- `src/app` - страницы и API.
- `src/app/events/page.tsx` - календарь/список и попап события.
- `src/app/knowledge/page.tsx` - база знаний.
- `src/lib/validation.ts` - бизнес-валидации.
- `prisma/schema.prisma` - схема БД.
- `prisma/migrations` - миграции.

## Быстрый запуск локально
1. Установить зависимости:
```bash
npm install
```
2. Создать `.env` на основе примера:
```bash
copy .env.example .env
```
3. Указать `DATABASE_URL` в `.env`.
4. Применить миграции и сгенерировать Prisma client:
```bash
npm run prisma:deploy
npm run prisma:generate
```
5. Заполнить справочники/демо:
```bash
npm run prisma:seed-reasons
npm run prisma:seed-family
```
6. Запустить:
```bash
npm run dev
```

## Важные API
- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:id`
- `POST /api/events/:id/status`
- `GET /api/reports/summary`
- `GET /api/reports/cancel-reasons`
- `GET /api/students`
- `GET /api/teachers`
- `GET /api/parents`

## Примеры изменения статуса

### Состоялось (обязателен мини-отчет)
```http
POST /api/events/:id/status
Content-Type: application/json

{
  "status": "COMPLETED",
  "completionComment": "Повторили дроби, решили 6 задач, домашнее задание выдано."
}
```

### Не состоялось (обязательна причина)
```http
POST /api/events/:id/status
Content-Type: application/json

{
  "status": "CANCELED",
  "cancelReasonId": "<reason_id>",
  "cancelComment": "Болезнь ученика"
}
```

## Деплой на Railway
- Подключить репозиторий к сервису Railway.
- Подключить PostgreSQL в том же проекте.
- Убедиться, что у сервиса есть переменная `DATABASE_URL`.
- Стартовая команда уже учитывает миграции:
  - `prisma migrate deploy && next start`
- После деплоя при необходимости выполнить сиды через CLI:
```bash
railway run npm run prisma:seed-reasons
railway run npm run prisma:seed-family
```

## Roadmap
- Вход через Google OAuth.
- Telegram-напоминания родителям по утрам.
- Системные задачи преподавателю по подтверждению проведенного занятия.
- Файлы в карточке студента (DOCX и другие документы).
