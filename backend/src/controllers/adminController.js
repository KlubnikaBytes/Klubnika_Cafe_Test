// backend/src/controllers/adminController.js

const jwt = require('jsonwebtoken');

// Sample hardcoded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123'; // Change this!

exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Check hardcoded credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // --- Login Successful ---
    // Create a special admin token
    const token = jwt.sign(
      { id: 'admin_user', isAdmin: true }, // <-- Note the isAdmin flag
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    
    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};  