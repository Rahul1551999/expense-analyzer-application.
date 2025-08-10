// server/controllers/receiptController.js
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { extractTextFromPath, extractExpenseData } = require('../services/ocrService');

// (keep your upload storage exactly as you had)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
exports.upload = multer({ storage });

// Upload Receipt (unchanged, except tiny safety)
exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const userId = req.user.userId;
    const filePath = `/uploads/${req.file.filename}`; // stored as web path

    const [result] = await pool.query(
      'INSERT INTO receipts (user_id, file_path, processed, extracted_data) VALUES (?, ?, FALSE, NULL)',
      [userId, filePath]
    );

    res.status(201).json({
      success: true,
      receipt: { id: result.insertId, filePath }
    });
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
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // file_path is like "/uploads/xxx.jpg" → build absolute path: server + /uploads/xxx.jpg
    const absPath = path.join(__dirname, `..${rows[0].file_path}`);

    const t0 = Date.now();
    const text = await extractTextFromPath(absPath);
    const extracted = extractExpenseData(text);
    const processingTimeMS = Date.now() - t0;

    await pool.query(
      'UPDATE receipts SET processed = TRUE, extracted_data = ? WHERE id = ?',
      [JSON.stringify({ ...extracted, rawTextLength: text.length, processingTimeMS }), id]
    );

    res.json({ success: true, extractedData: extracted, meta: { processingTimeMS } });
  } catch (err) {
    console.error('Process error:', err);
    res.status(500).json({ success: false, message: 'Failed to process receipt' });
  }
};
