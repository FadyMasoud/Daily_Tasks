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

## Deployment

### Frontend → Netlify
- Build command: `npm run build`
- Publish directory: `client/dist`
- Environment variables: set `VITE_API_URL` to your backend URL

### Backend → Render.com
- Root directory: `server`
- Build command: `npm install`
- Start command: `node index.js`
- Add all `.env` variables in Render dashboard

### Database → Railway.app
- Create a MySQL service
- Copy the connection string into your backend env vars
