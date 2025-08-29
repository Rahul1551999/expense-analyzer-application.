const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');

/** ---------- Tesseract worker (singleton) ---------- */
let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker({
        // logger: m => console.log(m),
        cachePath: path.join(__dirname, '../.tess-cache'),
      });
      // IMPORTANT: load() before loadLanguage/initialize
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        user_defined_dpi: '300',
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** ---------- Optional preprocessing with sharp (if installed) ---------- */
async function preprocess(absPath) {
  try {
    const sharp = require('sharp');
    const out = absPath + '.pre.png';
    await sharp(absPath)
      .rotate() // auto-orient
      .resize({ width: 2000, withoutEnlargement: true }) // cap gigantic photos
      .grayscale()
      .normalise()
      .sharpen()
      .threshold(170) // binarize
      .toFormat('png')
      .toFile(out);
    return out;
  } catch {
    // sharp not installed or failed—fallback
    return absPath;
  }
}

/** ---------- OCR ---------- */
async function extractTextFromPath(absPath) {
  try {
    // 1) Validate file exists & is readable
    if (!absPath || !fs.existsSync(absPath)) {
      console.warn('[OCR] File not found:', absPath);
      return '';
    }

    // 2) Preprocess and read as Buffer (more reliable than path strings)
    const src = await preprocess(absPath);

    let input;
    try {
      input = fs.readFileSync(src);
      if (!input || input.length === 0) {
        // Fall back to original file if preprocessed is empty for any reason
        input = fs.readFileSync(absPath);
      }
    } catch (e) {
      console.warn('[OCR] Failed reading preprocessed file, fallback to original. Reason:', e?.message);
      input = fs.readFileSync(absPath);
    }

    // 3) OCR
    const worker = await getWorker();
    const { data: { text } } = await worker.recognize(input, 'eng');
    return (text || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n');
  } catch (err) {
    console.error('OCR error:', err);
    return ''; // never crash the server
  }
}

/** ---------- Parsing helpers ---------- */
const MONEY_RE = /(?:£|\$|€)?\s*\d{1,3}(?:[,\s]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/g;

function normMoneyToken(tok) {
  if (!tok) return null;
  tok = tok.replace(/[^\d.,]/g, '');
  if (tok.includes(',') && tok.includes('.')) tok = tok.replace(/,/g, '');
  else if (tok.includes(',') && !tok.includes('.')) tok = tok.replace(',', '.');
  const n = Number(tok);
  return Number.isFinite(n) ? n : null;
}

function parseAmount(rawText) {
  if (!rawText) return '';
  const lines = rawText.split('\n').map(s => s.trim()).filter(Boolean);
  const totalLike = lines.filter(l =>
    /(total|amount\s*due|grand\s*total|balance\s*due|amt\s*due)/i.test(l)
  );
  for (const l of totalLike) {
    const matches = l.match(MONEY_RE);
    if (matches && matches.length) {
      const nums = matches.map(normMoneyToken).filter(n => n != null);
      if (nums.length) return nums[nums.length - 1].toFixed(2);
    }
  }
  const all = (rawText.match(MONEY_RE) || []).map(normMoneyToken).filter(n => n != null);
  if (all.length) {
    const max = Math.max(...all);
    if (Number.isFinite(max)) return max.toFixed(2);
  }
  return '';
}

const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(text) {
  if (!text) return '';
  let m = text.match(/(\d{4})[/-](\d{2})[/-](\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) {
    const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yyyy = m[3];
    const dayFirst = dd > 12 || true; // prefer UK dd/mm
    const day = dayFirst ? dd : mm;
    const month = dayFirst ? mm : dd;
    return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  m = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (m) {
    const d = String(parseInt(m[1], 10)).padStart(2, '0');
    const mm = MONTHS[m[2].slice(0,3).toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${d}`;
  }
  m = text.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m) {
    const d = String(parseInt(m[2], 10)).padStart(2, '0');
    const mm = MONTHS[m[1].slice(0,3).toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${d}`;
  }
  return '';
}

function parseMerchant(rawText) {
  if (!rawText) return '';
  const BAD = /receipt|invoice|tax|vat|subtotal|total|cashier|pos|thank\s*you|order|no\.\s*|card|visa|master|debit|credit/i;
  const lines = rawText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const candidates = lines.filter(l =>
    l.length >= 3 && !/\d{5,}/.test(l) && !BAD.test(l)
  );
  if (candidates.length) {
    let best = candidates[0], bestScore = 0;
    for (const c of candidates) {
      const letters = (c.match(/[A-Za-z]/g) || []).length;
      const score = letters / c.length;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best.replace(/\s{2,}/g, ' ');
  }
  return lines[0] || '';
}

function extractExpenseData(text) {
  return {
    amount: parseAmount(text),
    merchant: parseMerchant(text),
    date: parseDate(text),
  };
}

/** ---------- Warm-up on a valid 1×1 PNG (not an empty buffer) ---------- */
const ONE_BY_ONE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

async function warmUpOCR() {
  try {
    const worker = await getWorker();
    await worker.recognize(Buffer.from(ONE_BY_ONE_PNG_BASE64, 'base64'), 'eng');
    console.log('[OCR] Warm-up complete');
  } catch (err) {
    console.warn('[OCR] Warm-up failed (will retry on first request):', err?.message || err);
  }
}

module.exports = {
  extractTextFromPath,
  extractExpenseData,
  warmUpOCR,
};
