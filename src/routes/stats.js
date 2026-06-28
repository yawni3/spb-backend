const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const verifyAdmin = require('../verifyAdmin');

// ===== GET - Dashboard stats (admin only) =====
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ active: true });
    const totalOrders = await Order.countDocuments();

    res.json({
      totalProducts,
      totalOrders,
      totalVisitors: 0
    });
  } catch (error) {
    console.error("❌ Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;