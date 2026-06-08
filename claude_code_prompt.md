# ============================================================
#  CLAUDE CODE PROMPT — Daily Task Management System
#  Stack: React + Vite + Tailwind + shadcn/ui  |  Node.js + Express  |  MySQL
# ============================================================
# HOW TO USE:
#   1. Open your project folder in VS Code
#   2. Open terminal → run: claude
#   3. Paste everything below this line
# ============================================================

Build a full-stack Daily Task Management System. Follow every section exactly.

## STACK
- Frontend : React + Vite + Tailwind CSS + shadcn/ui + i18next (AR/EN) + react-router-dom
- Backend  : Node.js + Express + mysql2 + JWT + bcrypt
- Scheduler: node-cron  (runs inside the Express server)
- Email    : Resend (resend.com free tier — 3000 emails/month)
- Excel    : multer + xlsx (npm)
- Env      : .env file with dotenv

---

## MONOREPO STRUCTURE

```
daily-tasks/
├── client/          # React frontend (Vite)
├── server/          # Node.js backend
├── schema.sql       # MySQL schema (provided separately)
├── .env.example
├── package.json     # root — runs both with concurrently
└── README.md
```

---

## DATABASE  (mysql2, use the schema.sql provided)

Tables:
- users          (id, username, email, password_hash, role ENUM admin|user, language ENUM ar|en, created_at)
- tasks          (id, title, title_ar, description, description_ar, auto_schedule BOOL, scheduled_at DATETIME, is_published BOOL DEFAULT 0, requires_previous BOOL DEFAULT 0, expires_at DATETIME NULL, reminder_sent BOOL DEFAULT 0, created_by FK users, created_at)
- questions      (id, task_id FK, question_text, question_ar, order_index, created_at)
- submissions    (id, user_id FK, task_id FK, submitted_at) — UNIQUE(user_id, task_id)
- answers        (id, submission_id FK, question_id FK, answer_text, created_at)
- email_log      (id, user_id FK, task_id FK, type ENUM new_task|reminder, sent_at, status ENUM sent|failed)

---

## BACKEND  /server

### Folder layout
```
server/
├── index.js
├── db.js                  # mysql2 pool connection
├── middleware/
│   ├── auth.js            # verify JWT, attach req.user
│   └── adminOnly.js       # role === 'admin' guard
├── routes/
│   ├── auth.js            # POST /api/auth/register, /api/auth/login
│   ├── tasks.js           # CRUD tasks + upload Excel
│   ├── submissions.js     # POST submit answers, GET user history
│   └── admin.js           # GET submissions with filters
├── utils/
│   ├── mailer.js          # Resend wrapper — sendNewTaskEmail(), sendReminderEmail()
│   └── excelParser.js     # parse uploaded .xlsx → array of question strings
└── cron/
    └── scheduler.js       # node-cron jobs
```

### Auth routes  /api/auth
- POST /register  — { username, email, password, role? }  → hash password, insert user, return JWT
- POST /login     — { email, password } → compare hash, return JWT { id, username, role }

### Task routes  /api/tasks  (all require auth)
- GET  /            → list published tasks (user view) with user's submission status per task
- GET  /:id         → single task with questions (check lock logic server-side)
- POST /            (admin) — create task: { title, title_ar, description, requires_previous, auto_schedule, scheduled_at? }
- POST /upload-questions/:taskId  (admin) — multipart/form-data Excel file → parse rows → insert questions
- PATCH /:id        (admin) — update requires_previous, scheduled_at, auto_schedule, is_published
- DELETE /:id       (admin)

### Submission routes  /api/submissions
- POST /          — { task_id, answers: [{question_id, answer_text}] } → insert submission + answers, send confirmation
- GET  /my        — user's completed submissions with answers (history page)
- GET  /my/:taskId — answers for one completed task

### Admin routes  /api/admin  (adminOnly middleware)
- GET /submissions  — query params: ?user_id=&task_id=&username=&page=&limit=
  Returns paginated list with user info, task info, and all answers

---

## SCHEDULING LOGIC  /server/cron/scheduler.js

Use node-cron. Run two jobs:

### Job 1 — Publish tasks  (runs every minute)
```
SELECT * FROM tasks
WHERE is_published = 0
  AND (
    (auto_schedule = 1 AND DATE(scheduled_at) = CURDATE())
    OR
    (auto_schedule = 0 AND scheduled_at <= NOW())
  )
```
For each unpublished task that is now due:
1. Set is_published = 1
2. Fetch all users with role = 'user'
3. Call sendNewTaskEmail(user, task) for each user
4. Log to email_log table

### Job 2 — Send reminders  (runs every day at 09:00)
```
SELECT DISTINCT u.* FROM users u
WHERE u.role = 'user'
  AND EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.is_published = 1
      AND NOT EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.user_id = u.id AND s.task_id = t.id
      )
  )
```
For each user with uncompleted published tasks:
1. Send one reminder email listing pending task titles
2. Set reminder_sent = 1 (or log in email_log)

---

## EMAIL  /server/utils/mailer.js

Use Resend SDK (@resend/node). Load RESEND_API_KEY from .env.

```js
// sendNewTaskEmail(user, task)
// Subject: "New Task Available: {task.title}"
// Body: HTML email in user's language (AR/EN) notifying a new task is ready with a link

// sendReminderEmail(user, pendingTasks)
// Subject: "Reminder: You have pending tasks"
// Body: list of uncompleted task titles with a link to the app
```

---

## LOCK LOGIC (server-side)

When returning tasks list to a user, compute `locked` field:
```
task.locked = task.requires_previous === 1 
  AND previous task (by created_at order, id < this task id) 
  NOT IN user's submissions
```
Return `locked: true/false` per task. Frontend just reads this flag.

---

## FRONTEND  /client

### i18n
- Use i18next + react-i18next
- Translation files: /client/src/i18n/en.json and ar.json
- RTL: add `dir="rtl"` to <html> when lang = 'ar'
- Language toggle button in navbar (EN | عربي)

### Theme
- Dark/light mode via Tailwind `darkMode: 'class'`
- Toggle stored in localStorage
- Sun/Moon icon button in navbar

### Pages & Routes

```
/                        → redirect to /login
/login                   → Login page
/register                → Register page

/admin/tasks             → Task list (admin) — table of all tasks with edit controls
/admin/upload            → Upload Task page (create task + upload Excel)
/admin/submissions       → Submissions viewer with filters

/user/tasks              → Tasks list (user) — cards with status badges
/user/tasks/:id          → Task detail — questions form
/user/history            → History — completed tasks + answers
```

### Key UI details

**Admin — Upload Task page:**
- Form fields: Task Name (EN), Task Name (AR), Description (EN/AR optional)
- Checkbox: "Auto-schedule (publish at midnight)" — if checked show date picker only; if unchecked show full datetime picker
- Checkbox: "Require completing previous tasks first" (default OFF)
- File upload: drag-and-drop .xlsx — column A = question text (EN), column B = question text AR (optional)
- Preview table showing parsed questions before saving
- Submit button → POST /api/tasks then POST /api/tasks/upload-questions/:id

**Admin — Task List page:**
- Table columns: #, Title, Scheduled At, Auto-schedule, Published, Requires Previous, Questions Count, Actions
- Inline toggle for requires_previous and is_published
- Edit scheduled_at inline

**Admin — Submissions page:**
- Filter bar: search by username input + task dropdown + date range
- Table: Username, Email, Task, Submitted At, expand row → show all Q&A pairs

**User — Tasks List page:**
- Card grid, each card shows:
  - Task title
  - Status badge: ✅ Completed (green) | ⏳ Pending (yellow) | 🔒 Locked (gray)
  - Scheduled/published date
  - Click completed card → opens read-only answers modal
  - Click pending card → navigates to /user/tasks/:id
  - Locked cards are not clickable, show tooltip "Complete previous task first"

**User — Task Detail page:**
- Task title + description
- List of questions each with a <textarea> input
- Validate all fields filled before submit
- POST /api/submissions on submit
- Redirect to /user/tasks with success toast

**User — History page:**
- Accordion list of completed tasks (sorted newest first)
- Expand each → shows question + user's answer pairs

---

## ENV FILE  (.env.example)

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=daily_tasks_db
JWT_SECRET=change_this_secret
RESEND_API_KEY=re_xxxxxxxxxxxx
CLIENT_URL=http://localhost:5173
```

---

## ROOT package.json

```json
{
  "name": "daily-tasks",
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "install:all": "npm install && npm install --prefix client && npm install --prefix server"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

---

## README.md

Include:
1. Prerequisites (Node 18+, MySQL 8+)
2. `npm run install:all`
3. Create DB: `mysql -u root -p < schema.sql`
4. Copy `.env.example` to `.env` and fill values
5. Get free Resend API key from resend.com
6. `npm run dev`
7. Deployment guide: frontend → Netlify (build: `npm run build`, publish: `dist`), backend → Render.com (free), DB → Railway.app (free MySQL)

---

## IMPLEMENTATION ORDER

1. scaffold monorepo folder structure + root package.json
2. server: db.js + index.js + all routes + middleware
3. server: mailer.js + excelParser.js
4. server: cron/scheduler.js
5. client: Vite setup + Tailwind + shadcn/ui + i18next config
6. client: Auth context + protected routes
7. client: all pages in order listed above
8. README.md

Start now. Do not ask for confirmation — build everything.
