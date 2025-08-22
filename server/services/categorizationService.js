// server/services/categorizationService.js
const natural = require('natural');
const Expense = require('../models/expense');
const Category = require('../models/Category');

/**
 * Per-user classifiers. The previous code replaced a global classifier each time
 * a different user trained, causing cross-user bleed. This fixes it.
 */
class CategorizationService {
  constructor() {
    this.classifiers = new Map();       // userId -> BayesClassifier
    this.trainingPromises = new Map();  // userId -> Promise
  }

  async ensureTrained(userId) {
    if (this.classifiers.has(userId)) return this.classifiers.get(userId);

    if (this.trainingPromises.has(userId)) {
      await this.trainingPromises.get(userId);
      return this.classifiers.get(userId);
    }

    const p = (async () => {
      const data = await Expense.trainingData(userId);
      const clf = new natural.BayesClassifier();

      if (Array.isArray(data) && data.length) {
        for (const item of data) {
          if (item.text && item.category) {
            clf.addDocument(item.text.toLowerCase(), item.category);
          }
        }
        if (clf.docs && clf.docs.length) {
          clf.train();
        }
      }
      this.classifiers.set(userId, clf);
    })();

    this.trainingPromises.set(userId, p);
    try {
      await p;
    } finally {
      this.trainingPromises.delete(userId);
    }
    return this.classifiers.get(userId);
  }

  /** quick keyword hooks that usually outperform a model on receipts */
  async keywordCategory(text) {
    const keywordRules = [
      { re: /(tesco|asda|aldi|lidl|sainsbury)/i, name: 'Groceries' },
      { re: /(uber|bolt|taxi|train|bus|tfl|metro|rail)/i, name: 'Transport' },
      { re: /(starbucks|costa|café|cafe|coffee|restaurant|mcdonald|kfc|burger|pizza|domino)/i, name: 'Food' },
      { re: /(shell|bp|esso|petrol|diesel|fuel)/i, name: 'Fuel' },
      { re: /(boots|pharmacy|chemist)/i, name: 'Health' },
      { re: /(amazon|argos|currys|ikea)/i, name: 'Shopping' },
    ];

    for (const r of keywordRules) {
      if (r.re.test(text)) {
        const cat = await Category.findByName(r.name);
        if (cat) return cat;
      }
    }
    return null;
  }

  async categorizeExpense(expenseId, userId) {
    const exp = await Expense.findById(expenseId, userId);
    if (!exp) return { categoryName: null, categoryId: null };

    // Combine multiple signals
    const text = [
      exp.description || '',
      exp.merchant || '',
    ].join(' ').toLowerCase();

    // 1) keyword hooks first (fast and precise for branded receipts)
    const byKeyword = await this.keywordCategory(text);
    if (byKeyword) {
      await Expense.updateCategory(expenseId, userId, byKeyword.categoryId);
      return { categoryName: byKeyword.categoryName, categoryId: byKeyword.categoryId };
    }

    // 2) fall back to trained model for the user
    const clf = await this.ensureTrained(userId);
    if (clf && clf.docs && clf.docs.length) {
      const categoryName = clf.classify(text);
      const cat = await Category.findByName(categoryName);
      const categoryId = cat ? cat.categoryId : null;

      if (categoryId) {
        await Expense.updateCategory(expenseId, userId, categoryId);
      }
      return { categoryName, categoryId };
    }

    return { categoryName: null, categoryId: null };
  }

  async trainWithFeedback(userId, description, correctCategoryId) {
    if (!description || !correctCategoryId) return;

    const all = await Category.findAll();
    const match = all.find(c => c.categoryId === Number(correctCategoryId));
    if (!match) return;

    const clf = await this.ensureTrained(userId);
    clf.addDocument(description.toLowerCase(), match.categoryName);
    clf.train();
    this.classifiers.set(userId, clf);
  }
}

module.exports = new CategorizationService();
