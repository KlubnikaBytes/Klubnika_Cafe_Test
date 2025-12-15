// backend/src/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');

// --- This is your original function for REGULAR users ---
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Adds user info (like ID) to the request object
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// --- This is the NEW function for ADMINS ---
function authenticateAdmin(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No admin token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check for the specific admin flag
    if (decoded.isAdmin) {
      req.user = decoded; // Adds admin info
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Admin only.' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

// --- Make sure to export BOTH ---
module.exports = { authenticateToken, authenticateAdmin };