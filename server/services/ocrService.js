// server/services/ocrService.js
const Tesseract = require('tesseract.js');
const path = require('path');

async function extractTextFromPath(absPath) {
  const { data: { text } } = await Tesseract.recognize(absPath, 'eng');
  return text || '';
}

// --- very simple parsers; refine as you wish ---
function parseAmount(text) {
  // looks for "TOTAL ... 12.34" or "Amount ... 12.34"
  const m = text.match(/(?:total|amount|grand\s*total)[^\d]*(\d+[.,]\d{2})/i);
  return m ? m[1].replace(',', '.') : '';
}
function parseDate(text) {
  // 2025-08-10 or 10/08/2025 etc.
  const m = text.match(/(\d{4}[/-]\d{2}[/-]\d{2}|\d{2}[/-]\d{2}[/-]\d{4})/);
  if (!m) return '';
  const raw = m[1];
  if (raw.includes('-')) {
    const [y, mm, dd] = raw.split('-');
    return `${y}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  const [dd, mm, y] = raw.split('/');
  return `${y}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}
function parseMerchant(text) {
  const first = text.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  return first.length > 3 ? first : '';
}

function extractExpenseData(text) {
  return {
    amount: parseAmount(text),
    merchant: parseMerchant(text),
    date: parseDate(text),
  };
}

module.exports = {
  extractTextFromPath,
  extractExpenseData,
};
