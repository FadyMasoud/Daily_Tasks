-- ============================================================
--  Migration: add `active` flag to users (admin approval gate)
--  Run once against the existing database.
-- ============================================================
USE daily_tasks_db;

-- 1. Add the column (new registrations default to inactive / pending)
ALTER TABLE users
  ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 0 AFTER language;

-- 2. Keep all EXISTING users (including admins) able to log in
UPDATE users SET active = 1;

-- Optional: make sure every admin is always active
UPDATE users SET active = 1 WHERE role = 'admin';
