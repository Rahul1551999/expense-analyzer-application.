const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile  } = require('../controllers/userController');
const auth = require('../middlewares/auth');
const authMiddleware = require('../middlewares/auth');
const userController = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware, getProfile);
module.exports = router;