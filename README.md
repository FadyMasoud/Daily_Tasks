# Daily Task Management System

A full-stack task management app with Arabic/English support, email notifications, and Excel question uploads.

## Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + i18next (AR/EN)
- **Backend**: Node.js + Express + MySQL + JWT + bcrypt
- **Email**: Resend (resend.com)
- **Scheduler**: node-cron

## Prerequisites
- Node.js 18+
- MySQL 8+

## Setup

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Create database
```bash
mysql -u root -p < schema.sql
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `DB_PASS` — your MySQL root password
- `JWT_SECRET` — a strong random string
- `RESEND_API_KEY` — from [resend.com](https://resend.com) (free: 3000 emails/month)

### 4. Get Resend API key
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Paste it into `.env` as `RESEND_API_KEY`

### 5. Run development servers
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Default Admin Account
- **Email**: admin@example.com
- **Password**: Admin@1234

## Deployment (Vercel + Aiven MySQL)

The React build is served as static files and the Express API runs as one serverless
function (`api/index.js` → `server/app.js`). Scheduled jobs run through Vercel Cron
(`vercel.json`) instead of node-cron.

### 1. Database — Aiven MySQL
1. Create a free MySQL service at [aiven.io](https://aiven.io).
2. From the service **Overview** page, copy host, port, user (`avnadmin`), password, and download `ca.pem`.
3. Put the Aiven values in your local `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`,
   `DB_NAME=daily_tasks_db`, `DB_SSL=true`, `DB_SSL_CA`), then load the schema:
   ```bash
   node server/scripts/init-db.js
   ```
   `schema.sql` already contains every table — don't run the `migrate_*.sql` files on a fresh database.
4. Create the admin: `node server/scripts/create-admin.js <username> <email> <password>`.

### 2. App — Vercel
1. Push the repo to GitHub and **Import** it at [vercel.com/new](https://vercel.com/new). Leave the root directory as `./`; `vercel.json` sets the build.
2. **Storage → Create → Blob** and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`).
3. **Settings → Environment Variables**:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` | from Aiven |
   | `DB_NAME` | `daily_tasks_db` |
   | `DB_SSL` | `true` |
   | `DB_SSL_CA` | contents of `ca.pem` |
   | `JWT_SECRET` | long random string |
   | `CRON_SECRET` | another long random string |
   | `RESEND_API_KEY` / `MAIL_FROM` | from Resend (optional) |
   | `CLIENT_URL` | `https://<your-project>.vercel.app` |

4. Redeploy so the variables take effect. Check `https://<your-project>.vercel.app/api/health`.

### Scheduled jobs on the Hobby plan
Vercel Hobby runs each cron **once a day** (times are UTC): publishing at 00:00 and reminders
at 06:00. Tasks with an exact publish time therefore go live at the next daily run. For
minute-level publishing, call the endpoint from a free external scheduler (e.g. cron-job.org)
every few minutes:
```
GET https://<your-project>.vercel.app/api/cron/publish
Authorization: Bearer <CRON_SECRET>
```

### Limits
- Post images are capped at 4 MB (Vercel rejects request bodies over 4.5 MB).
- Images uploaded before the move to Blob (stored under `server/uploads`) are not migrated.
