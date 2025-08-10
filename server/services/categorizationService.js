const natural = require('natural');
const { Category, Expense } = require('../models');

class CategorizationService {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.initializeClassifier();
  }

  async initializeClassifier() {
    // Load training data from database
    const trainingData = await this.loadTrainingData();
    trainingData.forEach(item => {
      this.classifier.addDocument(item.text, item.category);
    });
    this.classifier.train();
  }

  async categorizeExpense(expenseId) {
    const expense = await Expense.findById(expenseId);
    const category = this.classifier.classify(expense.description);
    
    // Update expense with category
    await Expense.updateCategory(expenseId, category);
    
    return category;
  }

  async trainWithFeedback(feedbackId) {
    // Implement feedback-based retraining
  }
}

module.exports = new CategorizationService();