const categorizer = require('../services/categorizationService');
const Expense = require('../models/expense');

exports.retrain = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { expenseId, correctCategoryId } = req.body;

    const exp = await Expense.findById(expenseId, userId);
    if (!exp || !exp.description) {
      return res.status(404).json({ success:false, message: 'Expense not found or has no description' });
    }

    await categorizer.trainWithFeedback(userId, exp.description, Number(correctCategoryId));
    // persist corrected category
    await Expense.updateCategory(expenseId, userId, Number(correctCategoryId));

    res.json({ success:true });
  } catch (e) {
    console.error('Retrain error:', e);
    res.status(500).json({ success:false, message: 'Failed to retrain' });
  }
};