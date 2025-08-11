const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { registerUser, loginUser, getProfile } = require('../controllers/userController');
const auth = require('../middlewares/auth');

// existing routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', auth, getProfile);

// 🔹 add this refresh route
router.post('/refresh', (req, res) => {
  const rt = req.cookies?.refreshToken;
  if (!rt) return res.status(401).json({ ok:false, code:'NO_REFRESH' });

  try {
    const payload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    return res.json({ ok:true, accessToken });
  } catch {
    return res.status(401).json({ ok:false, code:'REFRESH_EXPIRED' });
  }
});

module.exports = router;
