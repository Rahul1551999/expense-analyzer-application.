const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listExpenses, createExpense } = require('../controllers/expenseController');

router.get('/', auth, listExpenses);
router.post('/', auth, createExpense);

module.exports = router;
