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
       ORDER BY expense_id DESC`,
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
      const { categoryName, categoryId: newCatId } =
        await categorizationService.categorizeExpense(expenseId, userId);

      return res.status(201).json({
        success: true,
        expenseId,
        autoCategory: { categoryId: newCatId, categoryName }
      });
    }
    res.status(201).json({ success: true, expenseId });
  } catch (e) {
    console.error('Create expense error:', e);
    res.status(500).json({ success:false, message: e.sqlMessage || e.message || 'Failed to create expense' });
  }
};
// helper to build date range (inclusive)
function getRange(range = 'month') {
  const end = new Date();                      // today
  end.setHours(0,0,0,0);
  const start = new Date(end);

  switch ((range || '').toLowerCase()) {
    case 'week':
      start.setDate(end.getDate() - 6);        // last 7 days
      break;
    case 'year':
      start.setFullYear(end.getFullYear(), 0, 1); // Jan 1 this year
      break;
    case 'all':
      return { start: null, end: null };
    case 'month':
    default:
      start.setDate(1);                         // 1st of this month
      break;
  }
  return { start, end };
}
function inclusiveDays(a, b) {
  const ms = (b - a) / 86400000;
  return Math.max(1, Math.round(ms) + 1);
}

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Priority 1: explicit custom range via start & end (YYYY-MM-DD or parseable)
    const startQ = req.query.start ? toISODate(req.query.start) : null;
    const endQ   = req.query.end   ? toISODate(req.query.end)   : null;

    let start = null, end = null, rangeLabel = (req.query.range || 'month').toLowerCase();

    if (startQ && endQ) {
      // custom range
      start = new Date(startQ);
      end   = new Date(endQ);
      // normalize to midnight for safety
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);

      if (isNaN(start) || isNaN(end) || start > end) {
        return res.status(400).json({ message: 'Invalid custom date range.' });
      }
    } else {
      // fall back to named range (week/month/year/all)
      const r = getRange(rangeLabel);
      start = r.start;
      end   = r.end;
    }

    // WHERE clause
    const where = ['e.user_id = ?'];
    const params = [userId];

    if (start && end) {
      where.push('transaction_date BETWEEN ? AND ?');
      params.push(
        start.toISOString().slice(0,10),
        end.toISOString().slice(0,10)
      );
    }

    // 1) Total spent
    const [totRows] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS totalSpent
         FROM expenses e
        WHERE ${where.join(' AND ')}`,
      params
    );
    const totalSpent = Number(totRows[0]?.totalSpent || 0);

    // 2) Avg per day
    const daysInRange = (start && end) ? inclusiveDays(start, end) : 1;
    const avgPerDay = totalSpent / daysInRange;

    // 3) Receipts processed (kept unfiltered unless you later add a joinable date)
    const [rcptRows] = await pool.query(
      `SELECT COUNT(*) AS cnt
         FROM receipts
        WHERE user_id = ? AND processed = 1`,
      [userId]
    );
    const receiptsProcessed = Number(rcptRows[0]?.cnt || 0);

    // 4) Category breakdown
    const [catRows] = await pool.query(
      `SELECT 
          COALESCE(c.category_name,'Uncategorized') AS category,
          COALESCE(SUM(e.amount),0) AS total
         FROM expenses e
    LEFT JOIN categories c ON c.category_id = e.category_id
        WHERE ${where.join(' AND ')}
     GROUP BY category
     ORDER BY total DESC`,
      params
    );

    // 5) Trend grouping
    // If custom range is long (> ~90 days), group by month; else group by day.
    let useMonthly = false;
    if (start && end) {
      useMonthly = inclusiveDays(start, end) > 92;
    } else {
      // named ranges: year => monthly, week/month => daily
      useMonthly = rangeLabel === 'year';
    }

    const groupFmt = useMonthly ? "%Y-%m" : "%Y-%m-%d";

    const [trendRows] = await pool.query(
      `SELECT DATE_FORMAT(transaction_date, '${groupFmt}') AS label,
              COALESCE(SUM(amount),0) AS total
         FROM expenses e
        WHERE ${where.join(' AND ')}
     GROUP BY label
     ORDER BY label ASC`,
      params
    );

    const topCategory = catRows.length ? catRows[0].category : null;

    res.json({
      totalSpent,
      avgPerDay,
      receiptsProcessed,
      topCategory,
      categoryBreakdown: catRows,
      monthlyTrend: trendRows.map(r => ({
        month: r.label,
        total: Number(r.total)
      })),
      // Optional echo for debugging on frontend:
      // rangeUsed: start && end ? { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) } : rangeLabel,
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).json({ message: 'Failed to build dashboard' });
  }
};
// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.userId; // from auth middleware
    const expenseId = Number(req.params.id);

    if (!expenseId) {
      return res.status(400).json({ success: false, message: "Invalid expense id" });
    }

    const [result] = await pool.query(
      `DELETE FROM expenses WHERE expense_id = ? AND user_id = ?`,
      [expenseId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (err) {
    console.error("deleteExpense error:", err);
    res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
};


// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenseId = Number(req.params.id);

    if (!expenseId) {
      return res.status(400).json({ success: false, message: 'Invalid expense id' });
    }

    // Accept your frontend payload keys
    const { amount, date, merchant, description, categoryId, receiptId } = req.body;

    const amt   = (amount === 0 || amount) ? Number(amount) : null;
    const tx    = toISODate(date);
    const merch = merchant ?? null;
    const desc  = description ?? null;
    const catId = (categoryId === 0 || categoryId) ? Number(categoryId) : null;
    const recId = (receiptId === 0 || receiptId) ? Number(receiptId) : null;

    if (date && tx === null) {
      return res.status(400).json({ success:false, message: 'Invalid date. Use YYYY-MM-DD.' });
    }

    const [result] = await pool.query(
      `UPDATE expenses
          SET amount = ?, transaction_date = ?, merchant = ?, description = ?, category_id = ?, receipt_id = ?
        WHERE expense_id = ? AND user_id = ?`,
      [amt, tx, merch, desc, catId, recId, expenseId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success:false, message: 'Expense not found' });
    }

    res.json({ success:true, message: 'Expense updated' });
  } catch (err) {
    console.error('updateExpense error:', err);
    res.status(500).json({ success:false, message: 'Failed to update expense' });
  }
};
