require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const verifyToken = (token) => {
  const jwt = require('jsonwebtoken');
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false;
  }
};

// Batch insert for better performance
const batchInsertSteps = async (userId, stepsData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const values = stepsData.map(step => [
      uuidv4(),
      userId,
      step.value,
      new Date(step.startDate)
    ]);
    
    const placeholders = values.map(
      (_, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`
    ).join(',');
    
    await client.query(
      `INSERT INTO activity_steps (id, user_id, value, created_at) 
       VALUES ${placeholders}`,
      values.flat()
    );
    
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { userId, steps, authToken } = req.body;

    if (!verifyToken(authToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Handle both single step and batch inserts
      if (Array.isArray(steps)) {
        await batchInsertSteps(userId, steps);
      } else {
        await pool.query(
          `INSERT INTO activity_steps (id, user_id, value, created_at) 
           VALUES ($1, $2, $3, $4)`,
          [uuidv4(), userId, steps, new Date()]
        );
      }
      
      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to save steps' });
    }
  } else if (req.method === 'GET') {
    // Add GET endpoint to fetch historical data
    const { userId, authToken, startDate, endDate } = req.query;
    
    if (!verifyToken(authToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await pool.query(
        `SELECT value, created_at 
         FROM activity_steps 
         WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
         ORDER BY created_at DESC`,
        [userId, new Date(startDate), new Date(endDate)]
      );
      
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to fetch steps' });
    }
  } else {
    res.status(405).end();
  }
};