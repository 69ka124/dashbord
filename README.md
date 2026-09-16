# Учёт работ и денег

Личный дашборд: доход, расход, обязательства, оплаты, типы работ, контрагенты. Вход и доступ — **по email**.

## Локальный запуск (Windows)

1. Установите [Node.js LTS](https://nodejs.org) (если ещё нет).
2. Дважды щёлкните **`start.bat`** в корне проекта.
3. Откройте http://localhost:3000/login
4. Войдите email из `OWNER_EMAIL` в файле `.env` (по умолчанию `owner@example.com`).

Скрипт сам создаст `.env`, поставит зависимости и поднимет SQLite-базу.

### Вручную

```bash
npm install
npx prisma db push
npm run dev
```

## Доступ

| Кто | Как |
|-----|-----|
| Владелец | Email из `OWNER_EMAIL` в `.env` |
| Коллеги | Владелец добавляет их email на странице `/access` (просмотр или редактирование) |
| Вход | `/login` → ввести выданный email (пароль не нужен) |

Опционально: Google OAuth (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`) — только для email из списка доступа.

`OPEN_ACCESS=true` отключает проверку входа (только для демо; на проде держите `false`).

## Очистка данных

```bash
npm run db:clear
```

Демо-наполнение (необязательно):

```bash
npm run db:seed
```

## Стек

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (локально и на VPS)
- Auth.js: вход по email (+ опционально Google)

## Деплой на свой сервер (VPS)

Нужны: Ubuntu/Debian, Node.js 20+, доступ по SSH.

1. Скопируйте проект на сервер, например в `/opt/dashbord`.
2. Создайте `.env` (см. `.env.example`):

```env
DATABASE_URL="file:/opt/dashbord/data/prod.db"
AUTH_SECRET="длинная-случайная-строка"
AUTH_TRUST_HOST=true
AUTH_URL="https://ваш-домен-или-ip"
OWNER_EMAIL="you@company.com"
OPEN_ACCESS="false"
```

3. На сервере:

```bash
mkdir -p /opt/dashbord/data
cd /opt/dashbord
npm ci
npx prisma generate
npx prisma db push
npm run build
```

4. Запуск через systemd — шаблоны в `deploy/`:

```bash
bash deploy/setup_server.sh
# HTTPS (опционально): bash deploy/setup_https.sh
```

С Windows можно выкатить обновление: `powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1` (см. `deploy/SERVER_STATE.md`).

После деплоя отправьте коллеге **ссылку на сайт** и добавьте его email в `/access`.

## Облако (Vercel + Neon)

1. БД на [neon.tech](https://neon.tech), в `prisma/schema.prisma` смените `provider` на `postgresql`.
2. Подключите репозиторий к [vercel.com](https://vercel.com), задайте env: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `OWNER_EMAIL`, `OPEN_ACCESS=false`.
3. Поделитесь URL вида `https://….vercel.app` и выдайте доступ по email на `/access`.

## Страницы

| Путь | Назначение |
|------|------------|
| `/` | Дашборд |
| `/works`, `/payments`, `/income`, `/expenses` | Операции |
| `/work-types`, `/counterparties` | Справочники |
| `/access` | Email-доступ и Google-синк (только владелец) |
| `/login` | Вход по email |

## Переменные окружения

Скопируйте `.env.example` → `.env`. Обязательные: `DATABASE_URL`, `AUTH_SECRET`, `OWNER_EMAIL`, `AUTH_URL`.
