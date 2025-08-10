// server/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
router.get('/', (req,res)=> res.json([
  { categoryId: 1, categoryName: 'Food & Drinks' },
  { categoryId: 2, categoryName: 'Groceries' },
  { categoryId: 3, categoryName: 'Transport' },
  { categoryId: 4, categoryName: 'Shopping' },
  { categoryId: 5, categoryName: 'Bills & Utilities' },
]));
module.exports = router;
