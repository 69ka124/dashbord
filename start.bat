@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ========================================
echo  Учёт работ — локальный запуск
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [Ошибка] Node.js не найден. Установите LTS с https://nodejs.org
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [Ошибка] Запустите этот файл из папки проекта dashbord.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Создаю .env из .env.example ...
  copy /Y ".env.example" ".env" >nul
  echo Готово. При необходимости отредактируйте OWNER_EMAIL в .env
  echo.
)

if not exist "node_modules\" (
  echo Устанавливаю зависимости (npm install)...
  call npm install
  if errorlevel 1 (
    echo [Ошибка] npm install не удался.
    pause
    exit /b 1
  )
)

echo Готовлю базу данных (SQLite)...
call npx prisma generate
if errorlevel 1 (
  echo [Ошибка] prisma generate не удался.
  pause
  exit /b 1
)

call npx prisma db push
if errorlevel 1 (
  echo [Ошибка] prisma db push не удался.
  pause
  exit /b 1
)

echo.
echo Запускаю http://localhost:3000
echo Вход: email из OWNER_EMAIL в файле .env
echo Остановка: Ctrl+C
echo.
call npm run dev

pause
