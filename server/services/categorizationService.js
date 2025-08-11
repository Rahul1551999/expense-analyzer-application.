const natural = require('natural');
const Expense = require('../models/expense');
const Category = require('../models/Category');

/**
 * A per-process singleton that keeps one Bayes classifier in memory.
 * It trains lazily from the user's labeled expenses. If there is no training data,
 * it will classify as "Uncategorized" (or null) and not crash.
 */
class CategorizationService {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.isTrainedForUser = new Map(); // userId -> boolean
    this.trainingPromises = new Map(); // userId -> Promise
  }

  async ensureTrained(userId) {
    if (this.isTrainedForUser.get(userId)) return;

    // Deduplicate concurrent training
    if (this.trainingPromises.has(userId)) {
      return this.trainingPromises.get(userId);
    }
    const p = (async () => {
      const data = await Expense.trainingData(userId);
      // If no labeled data, leave the classifier essentially empty for this user
      if (!data || data.length === 0) {
        this.isTrainedForUser.set(userId, true);
        return;
      }
      // Reset a fresh classifier per user
      const clf = new natural.BayesClassifier();
      for (const item of data) {
        // Guard: both text and category required
        if (item.text && item.category) {
          clf.addDocument(item.text.toLowerCase(), item.category);
        }
      }
      if (clf.docs && clf.docs.length > 0) {
        clf.train();
        // Swap in the trained classifier
        this.classifier = clf;
      }
      this.isTrainedForUser.set(userId, true);
    })();

    this.trainingPromises.set(userId, p);
    try {
      await p;
    } finally {
      this.trainingPromises.delete(userId);
    }
  }

  async categorizeExpense(expenseId, userId) {
    await this.ensureTrained(userId);
    const expense = await Expense.findById(expenseId, userId);
    if (!expense || !expense.description) return { categoryName: null, categoryId: null };

    const text = expense.description.toLowerCase();
    const keywordRules = [
    { re: /(tesco|asda|aldi|lidl|sainsbury)/i, name: 'Groceries' },
    { re: /(uber|bolt|taxi|train|bus|tfl|metro)/i, name: 'Transport' },
    { re: /(starbucks|costa|cafe|coffee|restaurant|mcdonald|kfc|burger)/i, name: 'Food' },
    { re: /(shell|bp|esso|petrol|diesel|fuel)/i, name: 'Fuel' },
  ];

  for (const r of keywordRules) {
    if (r.re.test(text)) {
      const cat = await Category.findByName(r.name);
      if (cat) {
        await Expense.updateCategory(expenseId, userId, cat.categoryId);
        return { categoryName: cat.categoryName, categoryId: cat.categoryId };
      }
    }
  }
    // If nothing trained, fallback
    if (!this.classifier || !this.classifier.docs || this.classifier.docs.length === 0) {
      return { categoryName: null, categoryId: null };
    }

    const categoryName = this.classifier.classify(text);
    const cat = await Category.findByName(categoryName);
    const categoryId = cat ? cat.categoryId : null;

    if (categoryId) {
      await Expense.updateCategory(expenseId, userId, categoryId);
    }
    return { categoryName, categoryId };
  }

  async trainWithFeedback(userId, description, correctCategoryId) {
    if (!description || !correctCategoryId) return;

    const all = await Category.findAll();
    const match = all.find(c => c.categoryId === Number(correctCategoryId));
    if (!match) return;

    // Add new example and retrain
    this.classifier.addDocument(description.toLowerCase(), match.categoryName);
    this.classifier.train();
    this.isTrainedForUser.set(userId, true);
  }
}

module.exports = new CategorizationService();
