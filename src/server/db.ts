import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production (Render), use the mounted persistent volume at /data.
// In development, fall back to the local ./data directory.
const isProduction = process.env.NODE_ENV === 'production';
const dataDir = isProduction
  ? (process.env.DATA_DIR || '/data')
  : path.join(__dirname, '..', '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'dayone.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      clerk_id TEXT UNIQUE DEFAULT NULL,
      email TEXT UNIQUE NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT DEFAULT '',
      email_verified INTEGER DEFAULT 0,
      google_id TEXT UNIQUE DEFAULT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      goal TEXT DEFAULT '',
      estimated_time TEXT DEFAULT '',
      revision_topics TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- User progress tracking
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      streak_count INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      current_level INTEGER DEFAULT 1,
      daily_completion_pct REAL DEFAULT 0,
      overall_completion_pct REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Modules (learning roadmap sections)
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL,
      icon TEXT DEFAULT 'flag',
      status TEXT DEFAULT 'locked' CHECK(status IN ('locked', 'active', 'completed')),
      tools TEXT DEFAULT '[]',
      duration TEXT DEFAULT ''
    );

    -- Days (tasks within modules)
    CREATE TABLE IF NOT EXISTS days (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      task_name TEXT DEFAULT '',
      stack TEXT DEFAULT '',
      expected_outcome TEXT DEFAULT '',
      video_url TEXT DEFAULT ''
    );

    -- User day progress (per-user per-day tracking)
    CREATE TABLE IF NOT EXISTS user_day_progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_id TEXT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'locked' CHECK(status IN ('locked', 'active', 'completed')),
      progress_pct REAL DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (user_id, day_id)
    );

    -- Resources
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('tools', 'courses', 'books')),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      author TEXT DEFAULT '',
      url TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      progress_pct REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      explanation TEXT DEFAULT ''
    );

    -- Tips & advice
    CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('smart_tip', 'mistake')),
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      icon TEXT DEFAULT 'lightbulb'
    );

    -- Badges
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sub_text TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT 'verified',
      color TEXT DEFAULT 'text-primary',
      requirement TEXT DEFAULT ''
    );

    -- User badges (awarded badges per user)
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
      awarded_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, badge_id)
    );

    -- Streak log (one entry per day the user completed work)
    CREATE TABLE IF NOT EXISTS streak_log (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );

    -- Learning memory (added)
    CREATE TABLE IF NOT EXISTS learning_memory (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      concepts_mastered TEXT DEFAULT '[]',
      weak_concepts TEXT DEFAULT '[]',
      preferred_learning_style TEXT DEFAULT 'visual',
      avg_study_duration REAL DEFAULT 0,
      pace TEXT DEFAULT 'steady',
      quiz_history TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Mentor Alerts (added)
    CREATE TABLE IF NOT EXISTS mentor_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('info', 'warning', 'encouragement')),
      is_dismissed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Daily planner items (added)
    CREATE TABLE IF NOT EXISTS planner_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      date TEXT NOT NULL
    );

    -- AI Chat Messages (added)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- User Projects (added)
    CREATE TABLE IF NOT EXISTS user_projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_id TEXT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT DEFAULT 'intermediate',
      requirements TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'submitted', 'reviewed')),
      submission_url TEXT DEFAULT '',
      evaluation TEXT DEFAULT '',
      score INTEGER DEFAULT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Quizzes & Assignments (added)
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_id TEXT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
      questions TEXT DEFAULT '[]',
      score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 0,
      answers TEXT DEFAULT '[]',
      feedback TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Mock Interviews (added)
    CREATE TABLE IF NOT EXISTS mock_interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_name TEXT NOT NULL,
      current_question_index INTEGER DEFAULT 0,
      questions TEXT DEFAULT '[]',
      answers TEXT DEFAULT '[]',
      feedback TEXT DEFAULT '',
      score INTEGER DEFAULT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Community Posts & Replies (added)
    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      channel TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      replies TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- User Notifications (added)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Parent Messages (added)
    CREATE TABLE IF NOT EXISTS parent_messages (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_name TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Engagement Foundation (added)
    CREATE TABLE IF NOT EXISTS user_xp (
      user_id TEXT PRIMARY KEY,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      missions_json TEXT NOT NULL,
      completed_count INTEGER DEFAULT 0,
      total_count INTEGER DEFAULT 4,
      xp_reward INTEGER DEFAULT 150,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS resume_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      version_name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      template TEXT DEFAULT 'ats-professional',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Roadmap Jobs (added for async generation)
    CREATE TABLE IF NOT EXISTS roadmap_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      goal TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
      roadmap_id TEXT,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_streak_log_user_date ON streak_log(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_user_day_progress ON user_day_progress(user_id);
    CREATE INDEX IF NOT EXISTS idx_mentor_alerts_user ON mentor_alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_planner_items_user ON planner_items(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_roadmap_jobs_user ON roadmap_jobs(user_id);
  `);

  // Migration: Add tools column to modules if missing
  try {
    const tableInfo = db.prepare("PRAGMA table_info(modules)").all() as any[];
    if (!tableInfo.some(col => col.name === 'tools')) {
      db.exec("ALTER TABLE modules ADD COLUMN tools TEXT DEFAULT '[]'");
    }
    if (!tableInfo.some(col => col.name === 'duration')) {
      db.exec("ALTER TABLE modules ADD COLUMN duration TEXT DEFAULT ''");
    }

    const daysTableInfo = db.prepare("PRAGMA table_info(days)").all() as any[];
    if (!daysTableInfo.some(col => col.name === 'video_url')) {
      db.exec("ALTER TABLE days ADD COLUMN video_url TEXT DEFAULT ''");
    }

    const resourcesTableInfo = db.prepare("PRAGMA table_info(resources)").all() as any[];
    if (!resourcesTableInfo.some(col => col.name === 'explanation')) {
      db.exec("ALTER TABLE resources ADD COLUMN explanation TEXT DEFAULT ''");
    }

    const userTableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const migrationCols = [
      { name: 'google_id', type: 'TEXT DEFAULT NULL' },
      { name: 'role', type: 'TEXT DEFAULT \'user\' CHECK(role IN (\'user\', \'admin\'))' },
      { name: 'goal', type: 'TEXT DEFAULT \'\'' },
      { name: 'estimated_time', type: 'TEXT DEFAULT \'\'' },
      { name: 'revision_topics', type: 'TEXT DEFAULT \'[]\'' },
      { name: 'motivation_quote', type: 'TEXT DEFAULT \'\'' },
    ];

    for (const col of migrationCols) {
      if (!userTableInfo.some(c => c.name === col.name)) {
        try {
          db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
          console.error(`Migration error (users.${col.name}):`, e);
        }
      }
    }

    // Migration: Add clerk_id column
    if (!userTableInfo.some(c => c.name === 'clerk_id')) {
      try {
        db.exec("ALTER TABLE users ADD COLUMN clerk_id TEXT DEFAULT NULL");
        db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL");
        console.log('✅ Migration: added clerk_id to users');
      } catch (e) {
        console.error('Migration error (users.clerk_id):', e);
      }
    }

    // Create index for google_id separately
    try {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL");
    } catch (e) {
      // Index might already exist or table might be locked
    }

    try {
      db.exec("DROP TABLE IF EXISTS login_attempts;");
      db.exec("DROP TABLE IF EXISTS email_verifications;");
      db.exec("DROP TABLE IF EXISTS password_resets;");
    } catch (e) {
      console.error("Migration error (dropping tables):", e);
    }
  } catch (err) {
    console.error("Migration error (general):", err);
  }
}

export default db;
