// server/models/Category.js
const pool = require('../config/db');

exports.findByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT category_id AS categoryId, category_name AS categoryName FROM categories WHERE category_name = ?',
    [name]
  );
  return rows[0] || null;
};

exports.findAll = async () => {
  const [rows] = await pool.query(
    'SELECT category_id AS categoryId, category_name AS categoryName FROM categories ORDER BY category_name'
  );
  return rows;
};
