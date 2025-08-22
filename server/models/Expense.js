// server/models/Expense.js
const pool = require('../config/db');

exports.create = async (userId, expense) => {
  const [result] = await pool.query(
    `INSERT INTO expenses
      (user_id, category_id, amount, description, merchant, transaction_date, receipt_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      expense.categoryId ?? null,
      expense.amount ?? null,
      expense.description ?? null,
      expense.merchant ?? null,
      expense.transactionDate ?? null,
      expense.receiptId ?? null
    ]
  );
  return result.insertId;
};

exports.findById = async (id, userId) => {
  const [rows] = await pool.query(
    `SELECT expense_id AS expenseId, user_id AS userId, description, merchant,
            amount, transaction_date AS transactionDate, category_id AS categoryId
     FROM expenses
     WHERE expense_id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
};

exports.updateCategory = async (expenseId, userId, categoryId) => {
  await pool.query(
    'UPDATE expenses SET category_id = ? WHERE expense_id = ? AND user_id = ?',
    [categoryId, expenseId, userId]
  );
};

exports.trainingData = async (userId) => {
  const [rows] = await pool.query(
    `SELECT e.description AS text, c.category_name AS category
       FROM expenses e
       JOIN categories c ON c.category_id = e.category_id
      WHERE e.user_id = ?
        AND e.description IS NOT NULL AND e.description <> ''
        AND e.category_id IS NOT NULL`,
    [userId]
  );
  return rows;
};

exports.findByUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
       expense_id       AS expenseId,
       transaction_date AS transactionDate,
       merchant,
       description,
       amount,
       category_id      AS categoryId,
       receipt_id       AS receiptId
     FROM expenses
     WHERE user_id = ?
     ORDER BY expense_id DESC`,
    [userId]
  );
  return rows;
};
