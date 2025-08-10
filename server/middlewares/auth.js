const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
  // Get complete user data
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE id = ?', // Include needed fields
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
      console.error('Auth error:', err);
    
    const message = err.name === 'JsonWebTokenError' 
      ? 'Invalid token' 
      : 'Not authorized';
      
    res.status(401).json({
      success: false,
      message
    });
  }
};