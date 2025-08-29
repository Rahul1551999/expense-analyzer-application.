const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const receipt = require('../controllers/receiptController');

// form-data key is "receipt" in your React code
router.post('/', auth, receipt.upload.single('receipt'), receipt.uploadReceipt);
router.post('/:id/process', auth, receipt.processReceipt);
router.delete('/:id', auth, receipt.deleteReceipt);

module.exports = router;
