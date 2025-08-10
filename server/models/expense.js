const { poolPromise, sql } = require('../config/db');

class Expense {
  static async create(userId, expenseData) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('amount', sql.Decimal(10, 2), expenseData.amount)
      .input('description', sql.NVarChar(255), expenseData.description)
      .input('merchant', sql.NVarChar(100), expenseData.merchant)
      .input('transactionDate', sql.DateTime, expenseData.transactionDate)
      .input('categoryId', sql.Int, expenseData.categoryId)
      .input('receiptImageURL', sql.NVarChar(255), expenseData.receiptImageURL)
      .query(`INSERT INTO Expenses (UserID, CategoryID, Amount, Description, Merchant, TransactionDate, ReceiptImageURL)
              VALUES (@userId, @categoryId, @amount, @description, @merchant, @transactionDate, @receiptImageURL);
              SELECT SCOPE_IDENTITY() AS newId;`);
    
    return result.recordset[0].newId;
  }

  static async findByUser(userId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`SELECT e.*, c.CategoryName 
              FROM Expenses e
              LEFT JOIN Categories c ON e.CategoryID = c.CategoryID
              WHERE e.UserID = @userId
              ORDER BY e.TransactionDate DESC`);
    
    return result.recordset;
  }
}

module.exports = Expense;