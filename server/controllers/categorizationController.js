// server/controllers/categorizationController.js
const categorizer = require('../services/categorizationService');
const Expense = require('../models/expense');

exports.retrain = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { expenseId, correctCategoryId } = req.body;

    if (!expenseId || !correctCategoryId) {
      return res.status(400).json({ success:false, message: 'expenseId and correctCategoryId are required' });
    }

    const exp = await Expense.findById(expenseId, userId);
    if (!exp || !exp.description) {
      return res.status(404).json({ success:false, message: 'Expense not found or has no description' });
    }

    // Train the per-user classifier with this correction
    await categorizer.trainWithFeedback(userId, exp.description, Number(correctCategoryId));

    // Persist the corrected category on the expense
    await Expense.updateCategory(expenseId, userId, Number(correctCategoryId));

    res.json({ success:true });
  } catch (e) {
    console.error('Retrain error:', e);
    res.status(500).json({ success:false, message: 'Failed to retrain' });
  }
};
