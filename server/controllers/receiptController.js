// server/controllers/receiptController.js
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractTextFromPath, extractExpenseData } = require('../services/ocrService');
const Expense = require('../models/expense');
const categorizer = require('../services/categorizationService');
const Category = require('../models/Category');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
exports.upload = multer({ storage });

exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const userId = req.user.userId;
    const filePath = `/uploads/${req.file.filename}`;

    const [result] = await pool.query(
      'INSERT INTO receipts (user_id, file_path, processed, extracted_data) VALUES (?, ?, FALSE, NULL)',
      [userId, filePath]
    );

    res.status(201).json({ success: true, receipt: { id: result.insertId, filePath } });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload receipt' });
  }
};
exports.processReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [rows] = await pool.query(
      'SELECT file_path FROM receipts WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const rel = rows[0].file_path;
    const absPath = path.join(__dirname, '..', rel);

    const t0 = Date.now();
    const text = await extractTextFromPath(absPath);
    const extracted = extractExpenseData(text);
    const processingTimeMS = Date.now() - t0;

    // Save OCR result in the receipts table
    await pool.query(
      'UPDATE receipts SET processed = TRUE, extracted_data = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify({ ...extracted, rawTextLength: text.length, processingTimeMS }), id, userId]
    );

    // Suggest category (but don’t save expense yet)
    let suggestedCategory = null;
    const keywordRules = [
      { re: /(tesco|asda|aldi|lidl|sainsbury)/i, name: 'Groceries' },
      { re: /(uber|bolt|taxi|train|bus|tfl|metro)/i, name: 'Transport' },
      { re: /(starbucks|costa|cafe|café|coffee|restaurant|mcdonald|kfc|burger|pizza)/i, name: 'Food' },
      { re: /(shell|bp|esso|petrol|diesel|fuel)/i, name: 'Fuel' },
    ];
    for (const r of keywordRules) {
      if (r.re.test(text)) {
        const c = await Category.findByName(r.name);
        if (c) suggestedCategory = { categoryId: c.categoryId, categoryName: c.categoryName };
        break;
      }
    }

    return res.json({
      success: true,
      extractedData: extracted,
      suggestedCategory,
      meta: { processingTimeMS }
    });

  } catch (err) {
    console.error('processReceipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to process receipt' });
  }
};

exports.deleteReceipt = async (req, res) => {
  try {
    const userId = req.user.userId;
    const receiptId = Number(req.params.id);
    if (!receiptId) return res.status(400).json({ success: false, message: 'Invalid receipt id' });

    // break FK link first if you keep it
    await pool.query(
      'UPDATE expenses SET receipt_id = NULL WHERE receipt_id = ? AND user_id = ?',
      [receiptId, userId]
    );

    const [result] = await pool.query(
      'DELETE FROM receipts WHERE id = ? AND user_id = ?',
      [receiptId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    res.json({ success: true, message: 'Receipt deleted' });
  } catch (err) {
    console.error('deleteReceipt error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete receipt' });
  }
};
