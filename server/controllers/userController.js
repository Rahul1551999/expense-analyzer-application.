const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// controllers/userController.js
function cleanAge(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 120) return null;
  return Math.round(n);
}

// Register User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, age, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, null, null]
    );

    const token = jwt.sign(
      { userId: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.insertId, name, email, age: null, avatarUrl: null }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age ?? null,
        avatarUrl: user.avatar_url ?? null,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ===== Get Profile =====
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id; // depending on your auth middleware
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [rows] = await pool.query(
      'SELECT id, name, email, age, avatar_url, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const u = rows[0];
    res.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        age: u.age ?? null,
        avatarUrl: u.avatar_url ?? null,
        created_at: u.created_at
      }
    });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ success: false, message: 'Profile data unavailable' });
  }
};

// ===== Update Profile (name, age, optional avatarUrl) =====
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const name = (req.body.name || '').trim();
    const age = cleanAge(req.body.age);
    const avatarUrl = req.body.avatarUrl ?? undefined; // optional

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const fields = ['name = ?', 'age = ?'];
    const params = [name, age];

    if (avatarUrl !== undefined) {
      fields.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    params.push(userId);

    const [result] = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ===== Upload Avatar (multipart) =====
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Build public URL (served by app.use('/uploads', ...))
    const publicUrl = `/uploads/avatars/${req.file.filename}`;

    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [publicUrl, userId]);

    res.json({ success: true, avatarUrl: publicUrl });
  } catch (err) {
    console.error('uploadAvatar error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
};