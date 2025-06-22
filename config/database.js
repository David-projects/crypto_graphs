const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database schema initialization
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coin_symbol VARCHAR(10) NOT NULL,
        type VARCHAR(4) NOT NULL CHECK (type IN ('buy', 'sell')),
        quantity DECIMAL(20, 8) NOT NULL,
        price_at_transaction DECIMAL(15, 2) NOT NULL,
        stop_limit DECIMAL(15, 2),
        trailing_stop_pct DECIMAL(5, 2),
        status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Portfolio table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        coin_symbol VARCHAR(10) NOT NULL,
        quantity DECIMAL(20, 8) DEFAULT 0,
        avg_price DECIMAL(15, 2) DEFAULT 0,
        UNIQUE(user_id, coin_symbol)
      )
    `);

    // Moving averages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moving_averages (
        id SERIAL PRIMARY KEY,
        coin_symbol VARCHAR(10) NOT NULL,
        days INTEGER NOT NULL,
        value DECIMAL(15, 2) NOT NULL,
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        calculated_date DATE GENERATED ALWAYS AS (calculated_at::date) STORED,
        UNIQUE(coin_symbol, days, calculated_date)
      )
    `);

    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        notify_email BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = { pool, initDatabase }; 