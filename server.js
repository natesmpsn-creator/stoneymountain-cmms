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

const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        location VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        asset_id INTEGER REFERENCES assets(id),
        priority VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'open',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_plan_items (
        id SERIAL PRIMARY KEY,
        job_plan_id INTEGER REFERENCES job_plans(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        sort_order INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pm_schedules (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER REFERENCES assets(id),
        task_name VARCHAR(255) NOT NULL,
        frequency_days INTEGER,
        job_plan_id INTEGER REFERENCES job_plans(id),
        last_completed_date DATE,
        next_due_date DATE NOT NULL,
        completed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pm_completion_items (
        id SERIAL PRIMARY KEY,
        pm_schedule_id INTEGER REFERENCES pm_schedules(id),
        job_plan_item_id INTEGER REFERENCES job_plan_items(id),
        status VARCHAR(50),
        comment TEXT,
        completed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE pm_schedules ADD COLUMN IF NOT EXISTS job_plan_id INTEGER REFERENCES job_plans(id)
    `);

    await pool.query(`
      ALTER TABLE pm_schedules ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES users(id)
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
};

initializeDatabase();

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

// Job Plans
app.get('/api/job-plans', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM job_plans ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/job-plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT jp.*,
             json_agg(json_build_object('id', jpi.id, 'item_name', jpi.item_name, 'sort_order', jpi.sort_order)
                      ORDER BY jpi.sort_order) as items
      FROM job_plans jp
      LEFT JOIN job_plan_items jpi ON jp.id = jpi.job_plan_id
      WHERE jp.id = $1
      GROUP BY jp.id
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/job-plans', authenticateToken, async (req, res) => {
  const { name, description, items } = req.body;

  try {
    const planResult = await pool.query(`
      INSERT INTO job_plans (name, description, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `, [name, description]);

    const planId = planResult.rows[0].id;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        await pool.query(`
          INSERT INTO job_plan_items (job_plan_id, item_name, sort_order, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [planId, items[i], i + 1]);
      }
    }

    res.status(201).json(planResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/job-plans/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, items } = req.body;

  try {
    const updateResult = await pool.query(`
      UPDATE job_plans
      SET name = $1, description = $2
      WHERE id = $3
      RETURNING *
    `, [name, description, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job plan not found' });
    }

    if (items && items.length > 0) {
      await pool.query(`DELETE FROM job_plan_items WHERE job_plan_id = $1`, [id]);

      for (let i = 0; i < items.length; i++) {
        await pool.query(`
          INSERT INTO job_plan_items (job_plan_id, item_name, sort_order, created_at)
          VALUES ($1, $2, $3, NOW())
        `, [id, items[i], i + 1]);
      }
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/job-plans/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      DELETE FROM job_plans WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job plan not found' });
    }

    res.json({ message: 'Job plan deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preventative Maintenance Schedules
app.get('/api/schedules/:id/checklist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT jpi.id, jpi.item_name, jpi.sort_order
      FROM pm_schedules ps
      LEFT JOIN job_plans jp ON ps.job_plan_id = jp.id
      LEFT JOIN job_plan_items jpi ON jp.id = jpi.job_plan_id
      WHERE ps.id = $1
      ORDER BY jpi.sort_order
    `, [req.params.id]);

    res.json(result.rows.filter(row => row.id !== null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const { asset_id, task_name, frequency_days, last_completed_date, next_due_date, job_plan_id } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO pm_schedules (asset_id, task_name, frequency_days, job_plan_id, last_completed_date, next_due_date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `, [asset_id, task_name, frequency_days, job_plan_id || null, last_completed_date, next_due_date]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/bulk', authenticateToken, async (req, res) => {
  const { asset_ids, task_name, frequency_days, next_due_date, job_plan_id } = req.body;

  if (!asset_ids || asset_ids.length === 0) {
    return res.status(400).json({ error: 'No assets selected' });
  }

  try {
    const created = [];
    for (const assetId of asset_ids) {
      const result = await pool.query(`
        INSERT INTO pm_schedules (asset_id, task_name, frequency_days, job_plan_id, next_due_date, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [assetId, task_name, frequency_days, job_plan_id || null, next_due_date]);
      created.push(result.rows[0]);
    }
    res.status(201).json({ count: created.length, schedules: created });
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

app.post('/api/schedules/:id/complete', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { last_completed_date, next_due_date, items } = req.body;
  const userId = req.user.id;

  try {
    const updateResult = await pool.query(`
      UPDATE pm_schedules
      SET last_completed_date = $1, next_due_date = $2, completed_by = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [last_completed_date, next_due_date, userId, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(`
          INSERT INTO pm_completion_items (pm_schedule_id, job_plan_item_id, status, comment, completed_at)
          VALUES ($1, $2, $3, $4, NOW())
        `, [id, item.job_plan_item_id, item.status, item.comment || null]);
      }
    }

    res.json(updateResult.rows[0]);
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

app.delete('/api/assets/all', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM assets');
    res.json({ message: 'All assets deleted' });
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
      SELECT ps.*, u.name as completed_by_name
      FROM pm_schedules ps
      LEFT JOIN users u ON ps.completed_by = u.id
      WHERE ps.last_completed_date IS NOT NULL
      ORDER BY ps.last_completed_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migrate user emails to new format
app.post('/api/migrate-users', async (req, res) => {
  try {
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash('changeme123', salt);

    await pool.query(`
      UPDATE users SET email = $1 WHERE email = $2
    `, ['nate@stoneymt.local', 'nate@stoneymountain.local']);

    await pool.query(`
      UPDATE users SET email = $1 WHERE email = $2
    `, ['dalton@stoneymt.local', 'dalton@stoneymountain.local']);

    res.json({ message: 'Users migrated to new email format' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed endpoint for creating default job plan
app.post('/api/seed-job-plans', authenticateToken, async (req, res) => {
  try {
    const planResult = await pool.query(
      `INSERT INTO job_plans (name, description, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING RETURNING id`,
      ['Basic HVAC PM', 'Visual inspection and filter change for indoor and outdoor units']
    );

    if (planResult.rows.length > 0) {
      const jobPlanId = planResult.rows[0].id;
      const items = [
        'Inspect outdoor unit for debris and damage',
        'Check outdoor unit fins and clean if needed',
        'Inspect indoor unit/air handler for dust and debris',
        'Replace air filter',
        'Check refrigerant lines for leaks',
        'Inspect electrical connections',
        'Check thermostat operation',
        'Verify airflow from all vents'
      ];

      for (let i = 0; i < items.length; i++) {
        await pool.query(
          `INSERT INTO job_plan_items (job_plan_id, item_name, sort_order, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
          [jobPlanId, items[i], i + 1]
        );
      }
      res.json({ message: 'Job plan seeded successfully', jobPlanId });
    } else {
      res.json({ message: 'Job plan already exists' });
    }
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
