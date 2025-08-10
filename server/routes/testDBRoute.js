// routes/testDBRoute.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const dbConfig = require('../config/db');

router.get('/test-db', async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`SELECT 1 AS test`;
    res.json({ 
      success: true,
      message: 'Database connection successful',
      data: result.recordset 
    });
  } catch (err) {
    console.error('Database test failed:', err);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    await sql.close();
  }
});

module.exports = router;