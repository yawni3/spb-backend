const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// ===== POST - Admin login =====
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET env variable missing!");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    console.log("✅ Admin logged in:", email);

    res.json({
      token,
      admin: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;