import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || './data.db';
const DEFAULT_USER_ID = Number(process.env.DEFAULT_USER_ID || 1);

const db = new sqlite3.Database(DB_PATH);

const XP_BY_DIFFICULTY = {
  easy: 10,
  medium: 25,
  hard: 50
};

const STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  DONE: 'done'
};

const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const armorStageFromLevel = (level) => {
  if (level >= 16) return 'legend';
  if (level >= 6) return 'warrior';
  return 'novice';
};

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const buildStatsResponse = (user) => {
  const level = levelFromXp(user.xp);
  return {
    userId: user.id,
    xp: user.xp,
    level,
    armorStage: armorStageFromLevel(level),
    apiKey: user.api_key
  };
};

const generateApiKey = () => `kta_${crypto.randomBytes(24).toString('hex')}`;

const apiKeyAuth = async (req, res, next) => {
  try {
    const header = req.header('x-api-key');
    if (!header) {
      return res.status(401).json({ error: 'Missing API key in x-api-key header' });
    }

    const user = await get('SELECT * FROM users WHERE api_key = ?', [header]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const initDb = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      username TEXT,
      xp INTEGER NOT NULL DEFAULT 0,
      api_key TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT NOT NULL DEFAULT 'easy',
      status TEXT NOT NULL DEFAULT 'new',
      xp_reward INTEGER NOT NULL DEFAULT 10,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const existing = await get('SELECT * FROM users WHERE id = ?', [DEFAULT_USER_ID]);
  if (!existing) {
    await run(
      'INSERT INTO users (id, telegram_id, username, xp, api_key) VALUES (?, ?, ?, ?, ?)',
      [DEFAULT_USER_ID, 'local_dev', 'Knight', 0, generateApiKey()]
    );
  }
};

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/api/dev/bootstrap', async (_, res, next) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [DEFAULT_USER_ID]);
    res.json({
      message: 'Use this API key for local development only',
      user: buildStatsResponse(user)
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/tasks', apiKeyAuth, async (req, res, next) => {
  try {
    const tasks = await all('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tasks', apiKeyAuth, async (req, res, next) => {
  try {
    const { title, description = '', difficulty = 'easy' } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!Object.keys(XP_BY_DIFFICULTY).includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of ${Object.keys(XP_BY_DIFFICULTY).join(', ')}` });
    }

    const xpReward = XP_BY_DIFFICULTY[difficulty];
    const result = await run(
      `INSERT INTO tasks (user_id, title, description, difficulty, status, xp_reward)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title.trim(), description, difficulty, STATUS.NEW, xpReward]
    );

    const task = await get('SELECT * FROM tasks WHERE id = ?', [result.lastID]);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/:id', apiKeyAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, description, difficulty, status } = req.body;

    const task = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const nextDifficulty = difficulty ?? task.difficulty;
    if (!Object.keys(XP_BY_DIFFICULTY).includes(nextDifficulty)) {
      return res.status(400).json({ error: `difficulty must be one of ${Object.keys(XP_BY_DIFFICULTY).join(', ')}` });
    }

    const nextStatus = status ?? task.status;
    if (!Object.values(STATUS).includes(nextStatus)) {
      return res.status(400).json({ error: `status must be one of ${Object.values(STATUS).join(', ')}` });
    }

    const nextXpReward = XP_BY_DIFFICULTY[nextDifficulty];
    const completedNow = task.status !== STATUS.DONE && nextStatus === STATUS.DONE;

    await run(
      `UPDATE tasks
       SET title = ?, description = ?, difficulty = ?, status = ?, xp_reward = ?, updated_at = CURRENT_TIMESTAMP,
           completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END
       WHERE id = ? AND user_id = ?`,
      [
        title ?? task.title,
        description ?? task.description,
        nextDifficulty,
        nextStatus,
        nextXpReward,
        completedNow ? 1 : 0,
        id,
        req.user.id
      ]
    );

    if (completedNow) {
      await run('UPDATE users SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [task.xp_reward, req.user.id]);
    }

    const updated = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    res.json({ task: updated, stats: buildStatsResponse(user) });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/tasks/:id', apiKeyAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.get('/api/stats', apiKeyAuth, async (req, res, next) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(buildStatsResponse(user));
  } catch (err) {
    next(err);
  }
});

app.post('/api/focus/complete', apiKeyAuth, async (req, res, next) => {
  try {
    const bonusXp = Math.max(5, Math.min(30, Number(req.body?.bonusXp || 15)));
    await run('UPDATE users SET xp = xp + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [bonusXp, req.user.id]);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ bonusXp, stats: buildStatsResponse(user) });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Knight Task Tracker API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });
