const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const verifyAdmin = require('../middleware/verifyAdmin');

// ===== GET - List all or get by ID =====
router.get('/', async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      return res.json(product);
    }

    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("❌ Products GET error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST - Create product (admin only) =====
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const data = req.body;
    console.log("📝 Creating product:", data.name);

    if (!data.slug) {
      const baseSlug = data.name
        ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : `product-${Date.now()}`;
      data.slug = baseSlug;
    }

    try {
      const product = await Product.create(data);
      console.log("✅ Product created:", product.name);
      return res.status(201).json(product);
    } catch (createError) {
      if (createError.code === 11000) {
        const baseSlug = data.name
          ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          : 'product';
        data.slug = `${baseSlug}-${Date.now()}`;
        const product = await Product.create(data);
        return res.status(201).json(product);
      }
      throw createError;
    }
  } catch (error) {
    console.error("❌ Product creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PUT - Update product (admin only) =====
router.put('/', verifyAdmin, async (req, res) => {
  try {
    const { id, ...data } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID required" });
    }

    const updated = await Product.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ Product updated:", updated.name);
    res.json(updated);
  } catch (error) {
    console.error("❌ Product update error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DELETE - Delete product (admin only) =====
router.delete('/', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "ID required" });
    }

    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ Product deleted:", deleted.name);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("❌ Product delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;