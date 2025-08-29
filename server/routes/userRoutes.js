const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  uploadAvatar
} = require('../controllers/userController');

const auth = require('../middlewares/auth');

// ensure upload dir exists
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const userId = req.user?.userId || 'user';
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${userId}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Invalid file type'));
    cb(null, true);
  }
});

// existing routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', auth, getProfile);

// new: update profile (name, age, optional avatarUrl)
router.put('/profile', auth, updateProfile);

// new: upload avatar
router.post('/profile/avatar', auth, upload.single('avatar'), uploadAvatar);

// alias endpoints if your frontend uses /me
router.get('/me', auth, getProfile);
router.put('/me', auth, updateProfile);
router.post('/me/avatar', auth, upload.single('avatar'), uploadAvatar);

// refresh route unchanged
router.post('/refresh', (req, res) => {
  const rt = req.cookies?.refreshToken;
  if (!rt) return res.status(401).json({ ok: false, code: 'NO_REFRESH' });

  try {
    const payload = jwt.verify(rt, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    return res.json({ ok: true, accessToken });
  } catch {
    return res.status(401).json({ ok: false, code: 'REFRESH_EXPIRED' });
  }
});

module.exports = router;
