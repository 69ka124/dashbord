# Учёт работ и денег

Личный дашборд: доход, расход, продакшн, закупки, отпуска, контрагенты. Вход и доступ — **по email**.

## Локальный запуск (Windows)

1. Установите [Node.js LTS](https://nodejs.org) (если ещё нет).
2. Дважды щёлкните **`start.bat`** в корне проекта.
3. Откройте http://localhost:3000/login
4. Войдите email из `OWNER_EMAIL` в файле `.env` (по умолчанию `owner@example.com`).

Скрипт сам создаст `.env`, поставит зависимости и поднимет SQLite-базу.

## Доступ

| Кто | Как |
|-----|-----|
| Владелец | Email из `OWNER_EMAIL` в `.env` |
| Коллеги | Владелец добавляет их email на `/access` |
| Вход | `/login` → ввести выданный email (пароль не нужен) |

`OPEN_ACCESS=true` отключает вход (только демо). На проде держите `false`.

Опционально: синхронизация с Google Таблицей на `/access` (нужны `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`).

## Очистка данных

```bash
npm run db:clear
```

## Деплой на VPS

Нужны: Ubuntu/Debian, Node.js 20+, SSH.

1. Скопируйте проект в `/opt/dashbord` (или `git clone`).
2. Создайте `.env` из `.env.example` — задайте `OWNER_EMAIL`, `AUTH_URL`, `AUTH_SECRET`, `OPEN_ACCESS=false`.
3. На сервере:

```bash
mkdir -p /opt/dashbord/data
cd /opt/dashbord
npm ci && npx prisma db push && npm run build
bash deploy/setup_server.sh
```

С Windows:  
`powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -HostName root@YOUR_IP -PublicUrl https://YOUR_DOMAIN`

После деплоя: ссылка на сайт + email коллеги в `/access`.

## Облако (Vercel + Neon)

1. БД на [neon.tech](https://neon.tech); в `prisma/schema.prisma` смените `provider` на `postgresql`.
2. Подключите репозиторий к [vercel.com](https://vercel.com), задайте env.
3. Поделитесь URL и выдайте доступ по email.

## Страницы

| Путь | Назначение |
|------|------------|
| `/` | Дашборд |
| `/income`, `/expenses` | Доходы и расходы |
| `/works` | Продакшн |
| `/purchases`, `/vacations` | Закупки и отпуска |
| `/counterparties` | Контрагенты |
| `/history` | История изменений |
| `/access` | Email-доступ и Google-синк (владелец) |
| `/login` | Вход |

## Переменные

Скопируйте `.env.example` → `.env`. Обязательные: `DATABASE_URL`, `AUTH_SECRET`, `OWNER_EMAIL`, `AUTH_URL`.
