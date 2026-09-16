# Продакшн-сервер (Ember)

| Параметр | Значение |
|----------|----------|
| **Хост** | Ember, Selectel VDS `bf19db1f-c0f4-4715-8a67-d9958e08fcc3` |
| **IPv4** | `135.106.209.129` |
| **SSH** | `root@135.106.209.129` |
| **Каталог** | `/opt/dashbord/` |
| **Сервис** | `dashbord` (systemd) |
| **Порт** | **5001** (отдельно от Mentally `:5000` и Sport `:8000`) |
| **URL** | https://135.106.209.129.sslip.io |
| **БД** | SQLite `/opt/dashbord/data/prod.db` |

Старый Kassandra `111.88.125.98` и `https://111.88.125.98.sslip.io` не использовать.

## Соседние проекты (не трогать)

| Проект | Путь | Порт / вход |
|--------|------|-------------|
| Mentally | `/opt/mentally/` | 5000 |
| Sport Control | `/opt/sport/` | 8000 + nginx `sport-control.ru` |
| Trading bot | `/opt/trading/` | — |

## Вход

- На проде `OPEN_ACCESS=false` — вход по email.
- Владелец: `OWNER_EMAIL` из `/opt/dashbord/.env`.
- Коллеги: email добавляется на `/access`.
- Google OAuth опционален.
- `AUTH_URL` в `/opt/dashbord/.env` = `https://135.106.209.129.sslip.io`

## Деплой с Windows

```powershell
powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1
```

## Логи

```bash
ssh root@135.106.209.129
journalctl -u dashbord -f
systemctl restart dashbord
```
