const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const verifyAdmin = require('../verifyAdmin');

// ===== EMAIL SETUP =====
let emailjs;
try {
  emailjs = require('@emailjs/nodejs');
} catch (e) {
  console.log('⚠️ @emailjs/nodejs not found, trying @emailjs/browser...');
  try {
    emailjs = require('@emailjs/browser');
  } catch (e2) {
    console.error('❌ EmailJS not loaded!');
    emailjs = null;
  }
}

// ===== SEND ORDER EMAIL =====
const sendOrderEmail = async (order) => {
  try {
    if (!emailjs) {
      console.warn('⚠️ EmailJS not initialized, skipping email');
      return false;
    }

    const email = order.customer.email;
    if (!email) {
      console.error('❌ Email address empty!');
      return false;
    }

    // Generate items HTML
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach(item => {
        itemsHtml += `
          <div class="item">
            <span class="item-icon">🧁</span>
            <span class="item-name">${item.name || 'Product'}</span>
            <span class="item-qty">x${item.quantity || 1}</span>
          </div>
        `;
      });
    } else {
      itemsHtml = `
        <div class="item">
          <span class="item-icon">🧁</span>
          <span class="item-name">Product</span>
          <span class="item-qty">x1</span>
        </div>
      `;
    }
    // Generate download link
    let downloadLink = '#';
    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      if (firstItem.fileUrl && firstItem.fileUrl !== '') {
        downloadLink = firstItem.fileUrl;
        console.log('📦 Using file URL:', downloadLink);
      } else {
        downloadLink = order.downloadToken 
          ? `${process.env.SITE_URL || 'https://sleepypiebakery.art'}/download/${order.downloadToken}`
          : '#';
        console.log('📦 Using download token:', downloadLink);
      }
    }

    const templateParams = {
      to_email: email,
      to_name: email.split('@')[0] || 'Guest',
      order_number: order.orderNumber || 'SPB-XXXX',
      order_date: new Date(order.createdAt || Date.now()).toLocaleDateString('tr-TR'),
      items_html: itemsHtml,
      download_link: downloadLink,
      site_url: process.env.SITE_URL || 'https://sleepypiebakery.art'
    };

    console.log('📧 Sending email to:', email);

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );

    console.log('✅ Email sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email error:', error.message);
    return false;
  }
};

// ===== HELPERS =====
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SPB-${year}${month}${day}-${random}`;
};

const generateDownloadToken = (orderNumber) => {
  return crypto
    .createHash('sha256')
    .update(`${orderNumber}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 32);
};

// ===== GET - List all orders (admin only) =====
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error("❌ Orders GET error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST - Create order =====
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    console.log("📦 New order received:", JSON.stringify(data, null, 2));

    // Validate required fields
    if (!data.customer?.email) {
      return res.status(400).json({ error: "Email address required" });
    }

    if (!data.termsAccepted) {
      return res.status(400).json({ error: "Terms must be accepted" });
    }

    if (!data.kvkkAccepted) {
      return res.status(400).json({ error: "KVKK consent required" });
    }

    if (!data.items?.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Validate products
    const validatedItems = [];
    for (const item of data.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }

      if (!product.isFree) {
        return res.status(400).json({ 
          error: `Product is paid: ${product.name}. Only free products available now.` 
        });
      }

      if (!product.active) {
        return res.status(400).json({ error: `Product inactive: ${product.name}` });
      }

      const quantity = item.quantity || 1;
      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: 0,
        quantity: quantity,
        thumbnailUrl: product.thumbnailUrl || '',
        fileUrl: product.fileUrl || ''
      });
    }

    // Create order
    const orderNumber = generateOrderNumber();
    const downloadToken = generateDownloadToken(orderNumber);
    const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const orderData = {
      customer: {
        email: data.customer.email.trim().toLowerCase()
      },
      items: validatedItems,
      total: 0,
      status: 'pending',
      paymentMethod: 'free',
      paymentStatus: 'pending',
      termsAccepted: data.termsAccepted,
      kvkkAccepted: data.kvkkAccepted,
      notes: data.notes || '',
      orderNumber: orderNumber,
      downloadToken: downloadToken,
      downloadExpiresAt: downloadExpiresAt
    };

    const order = await Order.create(orderData);
    console.log("✅ Order created:", order.orderNumber);

    // Send email
    const emailSent = await sendOrderEmail(order);
    
    if (emailSent) {
      order.mailSent = true;
      order.mailSentAt = new Date();
      order.status = 'completed';
      order.paymentStatus = 'paid';
      await order.save();
      console.log("✅ Email sent:", order.orderNumber);
    } else {
      order.mailError = 'Email delivery failed';
      await order.save();
      console.log("❌ Email failed:", order.orderNumber);
    }

    res.status(201).json({
      order: order,
      message: emailSent 
        ? "Order confirmed! Download links sent to your email. 📧"
        : "Order created! But email delivery failed. Please contact us.",
      mailSent: emailSent
    });
  } catch (error) {
    console.error("❌ Order creation error:", error);
    res.status(500).json({ 
      error: "Order creation failed",
      details: error.message 
    });
  }
});

// ===== DELETE - Delete order (admin only) =====
router.delete('/', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "ID required" });
    }

    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("✅ Order deleted:", deleted.orderNumber);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("❌ Order delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;