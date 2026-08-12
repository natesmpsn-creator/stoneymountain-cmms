import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/cmms'
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const validPassword = await bcryptjs.compare(password, user.password_hash);

    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance Requests
app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM maintenance_requests
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', authenticateToken, async (req, res) => {
  const { title, description, asset_id, priority, status } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO maintenance_requests (title, description, asset_id, priority, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [title, description, asset_id, priority || 'medium', status || 'open', req.user.id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/requests/:id', authenticateToken, async (req, res) => {
  const { status, priority, description } = req.body;
  const { id } = req.params;

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(`
      UPDATE maintenance_requests
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preventative Maintenance Schedules
app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pm_schedules
      ORDER BY next_due_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules', authenticateToken, async (req, res) => {
  const { asset_id, task_name, frequency_days, last_completed_date, next_due_date } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO pm_schedules (asset_id, task_name, frequency_days, last_completed_date, next_due_date, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [asset_id, task_name, frequency_days, last_completed_date, next_due_date]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/schedules/:id', authenticateToken, async (req, res) => {
  const { last_completed_date, next_due_date } = req.body;
  const { id } = req.params;

  try {
    const result = await pool.query(`
      UPDATE pm_schedules
      SET last_completed_date = $1, next_due_date = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [last_completed_date, next_due_date, id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assets
app.get('/api/assets', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM assets ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', authenticateToken, async (req, res) => {
  const { name, category, location, description } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO assets (name, category, location, description, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [name, category, location, description]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/assets/:id', authenticateToken, async (req, res) => {
  const { name, category, location, description } = req.body;
  const { id } = req.params;

  try {
    const result = await pool.query(`
      UPDATE assets
      SET name = $1, category = $2, location = $3, description = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, category, location, description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets/bulk', authenticateToken, async (req, res) => {
  const { assets } = req.body;

  if (!Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({ error: 'No assets provided' });
  }

  try {
    const inserted = [];
    for (const asset of assets) {
      const result = await pool.query(`
        INSERT INTO assets (name, category, location, description, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [asset.name, asset.category, asset.location, asset.description]);
      inserted.push(result.rows[0]);
    }
    res.status(201).json({ count: inserted.length, assets: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// History endpoints
app.get('/api/history/requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM maintenance_requests
      WHERE status = 'completed'
      ORDER BY updated_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history/schedules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pm_schedules
      WHERE last_completed_date IS NOT NULL
      ORDER BY last_completed_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to React for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CMMS server running on port ${PORT}`);
});
