# Knight Task Tracker (MVP)

MVP Telegram Mini App для задач, XP и RPG-прогресса рыцаря.

## Что уже реализовано

- Backend: Express + SQLite + API key auth.
- Frontend: Vite + React + TypeScript + временный тёмный RPG UI для тестов в Telegram.
- Рабочий `App.tsx`, связанный с backend API.

## Структура

```text
.
├─ backend/
│  ├─ .env.example
│  ├─ package.json
│  └─ server.js
└─ frontend/
   ├─ index.html
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   └─ src/
      ├─ App.tsx
      ├─ index.css
      ├─ main.tsx
      ├─ lib/
      │  └─ api.ts
      └─ components/
         ├─ Avatar.tsx
         ├─ FocusMode.tsx
         └─ TaskList.tsx
```

## API (backend)

Обязательные endpoint'ы для AI-агентов:

- `POST /api/tasks`
- `GET /api/tasks`
- `GET /api/stats`

Дополнительно:

- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/focus/complete`
- `GET /api/dev/bootstrap` (получить тестовый api key для dev)

## Быстрая настройка в Telegram Mini App

> Ниже именно то, что нужно сделать, чтобы открыть приложение прямо в Telegram, а не только локально.

1. Запустите backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

2. Запустите frontend:

```bash
cd frontend
npm install
npm run dev -- --host
```

3. Поднимите публичный HTTPS URL для frontend (например, через ngrok):

```bash
ngrok http 5173
```

4. В Telegram откройте **@BotFather**:
   - `/mybots` → выберите вашего бота.
   - **Bot Settings** → **Menu Button** → укажите URL вида `https://<your-id>.ngrok-free.app`.

5. Откройте чат с ботом и нажмите кнопку меню — откроется Mini App.

6. В Mini App на экране подключения:
   - `Base URL` укажите backend URL (например, `https://<backend-ngrok>.ngrok-free.app`),
   - `API Key` возьмите из `GET /api/dev/bootstrap`.

## Безопасность API ключа

Сейчас UI сделан для тестирования в Telegram Apps, поэтому ключ вводится вручную в приложении.
Для production:

- не показывайте API key пользователю в чистом виде,
- выдавайте короткоживущий токен через backend после валидации `initData` Telegram,
- добавьте ротацию ключей и аудит запросов.

## Что дальше

1. Подключить в backend валидацию Telegram `initData` и автологин.
2. Добавить endpoint ротации API ключа в настройках.
3. Перенести временные стили на Tailwind-тему (fantasy UI).
4. Добавить анимацию Level Up и хранение активной задачи на backend.
