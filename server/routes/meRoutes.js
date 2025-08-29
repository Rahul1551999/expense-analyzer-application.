// server/routes/meRoutes.js
const router = require('express').Router();
const auth = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 3 * 1024 * 1024 } }); // 3MB

router.get('/', auth, async (req, res) => {
  // fetch from DB using req.user.userId
  res.json({ name: 'User', age: 25, avatarUrl: null });
});

router.put('/', auth, async (req, res) => {
  const { name, age, avatarUrl } = req.body;
  // persist to DB
  res.json({ success: true });
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  // save file (disk, S3, etc.) and store URL in DB
  // return the public URL
  res.json({ avatarUrl: '/uploads/your-file.png' });
});

module.exports = router;

// in index.js
app.use('/api/me', require('./routes/meRoutes'));
