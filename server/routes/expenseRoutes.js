const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { listExpenses, createExpense ,getDashboard ,deleteExpense ,updateExpense } = require('../controllers/expenseController');

router.get('/', auth, listExpenses);
router.post('/', auth, createExpense);
router.get('/dashboard', auth, getDashboard);
router.put('/:id', auth, updateExpense);  
router.delete('/:id', auth, deleteExpense);  

module.exports = router;
