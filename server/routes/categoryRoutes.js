const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth'); // If you want to protect routes
const pool = require('../config/db');

// GET all categories
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT category_id AS categoryId, category_name AS categoryName FROM categories'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

module.exports = router;
