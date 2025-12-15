// backend/src/routes/admin.js

const express = require('express');
const { adminLogin } = require('../controllers/adminController');
const router = express.Router();

// Route for admin login
router.post('/login', adminLogin);

module.exports = router;