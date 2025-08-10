const express = require('express');
const router = express.Router();
const { upload, uploadReceipt, processReceipt } = require('../controllers/receiptController');
const auth = require('../middlewares/auth');

router.post('/', auth, upload.single('receipt'), uploadReceipt);
router.post('/:id/process', auth, processReceipt);

module.exports = router;