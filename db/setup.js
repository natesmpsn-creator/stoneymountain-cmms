import { Pool } from 'pg';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/cmms'
});

const setup = async () => {
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

    const nateHash = await bcryptjs.hash('changeme123', 10);
    const daltonHash = await bcryptjs.hash('changeme123', 10);

    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      ['nate@stoneymountain.local', nateHash, 'Nate Simpson']
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      ['dalton@stoneymountain.local', daltonHash, 'Dalton McKie']
    );

    console.log('Database setup complete');
    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err);
    process.exit(1);
  }
};

setup();
