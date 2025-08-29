// server/routes/categorizationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { retrain } = require('../controllers/categorizationController');

router.post('/retrain', auth, retrain);

module.exports = router;
