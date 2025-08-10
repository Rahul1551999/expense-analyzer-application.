// server/controllers/expenseController.js
const pool = require('../config/db');
const categorizer = require('../services/categorizationService');
const categorizationService = require('../services/categorizationService');

function toISODate(d) {
  if (!d) return null;
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m1) return d;
  const m2 = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(d);
  if (m2) {
    const [_, a, b, y] = m2;
    const tryA = `${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`;
    const tryB = `${y}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    const da = new Date(tryA);
    const db = new Date(tryB);
    if (!isNaN(da)) return tryA;
    if (!isNaN(db)) return tryB;
    return null;
  }
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0,10);
}

// GET /api/expenses
exports.listExpenses = async (req, res) => {
  try {
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
       ORDER BY transaction_date DESC, expense_id DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('listExpenses error:', e);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
};

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, date, merchant, description, categoryId, receiptId } = req.body;

    const amt   = (amount === 0 || amount) ? Number(amount) : null;
    const tx    = toISODate(date);
    const merch = merchant || null;
    const desc  = description || null;
    const catId = categoryId ? Number(categoryId) : null;
    const recId = receiptId ? Number(receiptId) : null;

    if (tx === null && date) {
      return res.status(400).json({ success:false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const [result] = await pool.query(
      `INSERT INTO expenses
         (user_id, amount, transaction_date, merchant, description, category_id, receipt_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, amt, tx, merch, desc, catId, recId]
    );

    const expenseId = result.insertId;

    // Auto-categorize if no category was provided and we have description
    if (!catId && desc) {
      await categorizer.categorizeExpense(expenseId, userId);
    }

    res.status(201).json({ success: true, expenseId });
  } catch (e) {
    console.error('Create expense error:', e);
    res.status(500).json({ success:false, message: e.sqlMessage || e.message || 'Failed to create expense' });
  }
};
