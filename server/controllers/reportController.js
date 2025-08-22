const pool = require("../config/db");

// GET /api/reports
exports.getReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = "monthly", range = "year", start, end } = req.query;

    // Handle date range
    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      endDate = new Date();
      if (range === "month") startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      else if (range === "quarter") startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, 1);
      else startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
    }

    const s = startDate.toISOString().slice(0, 10);
    const e = endDate.toISOString().slice(0, 10);

    let data = {};

    if (type === "monthly") {
      const [rows] = await pool.query(
        `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month, SUM(amount) AS total
         FROM expenses
         WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
         GROUP BY month
         ORDER BY month ASC`,
        [userId, s, e]
      );
      data.months = rows.map(r => r.month);
      data.amounts = rows.map(r => Number(r.total));
    }

    if (type === "category") {
      const [rows] = await pool.query(
        `SELECT category_id AS id, SUM(amount) AS total
         FROM expenses
         WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
         GROUP BY category_id`,
        [userId, s, e]
      );
      data.categories = rows.map(r => ({ id: r.id }));
      data.amounts = rows.map(r => Number(r.total));
    }

    // Top 5 expenses
    const [topRows] = await pool.query(
      `SELECT transaction_date AS date, merchant, amount, category_id AS categoryId
       FROM expenses
       WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
       ORDER BY amount DESC LIMIT 5`,
      [userId, s, e]
    );
    data.topExpenses = topRows;

    res.json(data);
  } catch (err) {
    console.error("getReports error:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};
