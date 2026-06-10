-- ============================================================
--  Daily Task Management System — MySQL Schema
--  Stack: Node.js + Express + MySQL + React
-- ============================================================

CREATE DATABASE IF NOT EXISTS daily_tasks_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE daily_tasks_db;

-- ------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(80)  NOT NULL UNIQUE,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  language      ENUM('ar','en') NOT NULL DEFAULT 'en',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. TASKS
-- ------------------------------------------------------------
CREATE TABLE tasks (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title               VARCHAR(255) NOT NULL,
  title_ar            VARCHAR(255),                         -- Arabic title
  description         TEXT,
  description_ar      TEXT,

  -- Scheduling
  auto_schedule       TINYINT(1) NOT NULL DEFAULT 0,        -- 1 = auto daily at midnight
  scheduled_at        DATETIME,                             -- specific publish date/time
  is_published        TINYINT(1) NOT NULL DEFAULT 0,        -- set by cron or admin

  -- Access control
  requires_previous   TINYINT(1) NOT NULL DEFAULT 0,        -- lock until prev task done

  -- Expiry / reminder
  expires_at          DATETIME DEFAULT NULL,                -- NULL = never expires
  reminder_sent       TINYINT(1) NOT NULL DEFAULT 0,        -- track if reminder was sent

  created_by          INT UNSIGNED NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Index for cron job query (find tasks ready to publish)
CREATE INDEX idx_tasks_scheduled ON tasks (is_published, scheduled_at, auto_schedule);

-- ------------------------------------------------------------
-- 3. QUESTIONS
-- ------------------------------------------------------------
CREATE TABLE questions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id       INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_ar   TEXT,                                       -- Arabic version
  order_index   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_questions_task ON questions (task_id, order_index);

-- ------------------------------------------------------------
-- 4. SUBMISSIONS  (one row per user per task)
-- ------------------------------------------------------------
CREATE TABLE submissions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  task_id      INT UNSIGNED NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_task (user_id, task_id),               -- one submission per user/task
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. ANSWERS
-- ------------------------------------------------------------
CREATE TABLE answers (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id  INT UNSIGNED NOT NULL,
  question_id    INT UNSIGNED NOT NULL,
  answer_text    TEXT NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_submission_question (submission_id, question_id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id)   REFERENCES questions(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. EMAIL LOG  (track sent notifications & reminders)
-- ------------------------------------------------------------
CREATE TABLE email_log (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  task_id    INT UNSIGNED,
  type       ENUM('new_task','reminder') NOT NULL,
  sent_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status     ENUM('sent','failed') NOT NULL DEFAULT 'sent',

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. POSTS  (admin-authored posts shown in user feed)
-- ------------------------------------------------------------
CREATE TABLE posts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NOT NULL,
  image_path  VARCHAR(500) DEFAULT NULL,
  description TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. POST LIKES
-- ------------------------------------------------------------
CREATE TABLE post_likes (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. POST COMMENTS
-- ------------------------------------------------------------
CREATE TABLE post_comments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  comment_text TEXT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. SEED — default admin account
--    password: Admin@1234  (bcrypt hash — change in production!)
-- ------------------------------------------------------------
INSERT INTO users (username, email, password_hash, role) VALUES
(
  'admin',
  'admin@example.com',
  '$2b$12$KIXshM3BYFp5mV6Cf3e4XuWgLbT1GgKq5pQ8Y2z0nJlM9rDvOuS4K',
  'admin'
);
