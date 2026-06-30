const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const verifyAdmin = require('../verifyAdmin');
const { Resend } = require('resend');

// ===== RESEND SETUP =====
const resend = new Resend(process.env.RESEND_API_KEY);

// ===== SEND ORDER EMAIL (Resend) =====
const sendOrderEmail = async (order) => {
  try {
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

    // ⭐ Resend ile email gönder
    const { data, error } = await resend.emails.send({
      from: 'Sleepy Pie Bakery <onboarding@resend.dev>',
      to: [email],
      subject: '🧁 Siparişiniz Onaylandı!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>🧁 Siparişiniz Onaylandı!</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FFF8F4; padding: 16px; }
            .container { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 40px rgba(74,36,25,0.10); border: 1px solid #F3C8BE; }
            .header { background: linear-gradient(135deg, #fad6df 0%, #fdabc4 100%); padding: 32px 24px 24px; text-align: center; }
            .header-icon { font-size: 52px; display: block; margin-bottom: 6px; }
            .header h1 { font-family: Georgia, serif; font-size: 28px; color: #4A2419; }
            .body { padding: 28px 24px 20px; }
            .greeting { font-size: 20px; font-weight: 700; color: #4A2419; }
            .greeting span { color: #FF73B3; }
            .subtext { font-size: 15px; color: #9B7B6D; margin-bottom: 24px; }
            .order-box { background: #FFF3EE; border-radius: 16px; padding: 18px 20px; margin-bottom: 24px; border: 1px solid #F3C8BE; }
            .order-box .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #6E4A3D; }
            .order-box .row strong { color: #4A2419; }
            .order-box .order-id { font-family: 'Courier New', monospace; font-weight: 700; color: #4A2419; background: rgba(255,255,255,0.5); padding: 2px 12px; border-radius: 8px; }
            .order-box .divider { border-top: 1px dashed #F3C8BE; margin: 8px 0; }
            .items-title { font-size: 16px; font-weight: 700; color: #4A2419; margin-bottom: 12px; }
            .btn-wrapper { text-align: center; margin: 28px 0 16px; }
            .btn-download { display: inline-block; padding: 16px 48px; background: #fdabc4; color: #4A2419; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 16px rgba(253,171,196,0.35); }
            .link-note { text-align: center; font-size: 13px; color: #C2A79A; margin-top: 6px; }
            .footer { background: #FFF3EE; padding: 18px 24px; text-align: center; border-top: 1px solid #F3C8BE; }
            .footer .brand { font-weight: 700; color: #4A2419; }
            .footer .cozy { font-size: 13px; color: #C2A79A; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="header-icon">🧁</span>
              <h1>Siparişiniz Hazır!</h1>
            </div>
            <div class="body">
              <p class="greeting">Merhaba <span>${email.split('@')[0] || 'Misafir'}</span>! 🎀</p>
              <p class="subtext">Siparişiniz başarıyla oluşturuldu.</p>
              <div class="order-box">
                <div class="row"><strong>📦 Sipariş No</strong><span class="order-id">${order.orderNumber || 'SPB-XXXX'}</span></div>
                <div class="row"><strong>📅 Tarih</strong><span>${new Date(order.createdAt || Date.now()).toLocaleDateString('tr-TR')}</span></div>
                <div class="divider"></div>
                <div class="row"><strong>📧 Email</strong><span>${email}</span></div>
              </div>
              <p class="items-title">🛍️ Siparişinizdeki Ürünler</p>
              ${itemsHtml}
              <div class="btn-wrapper">
                <a href="${downloadLink}" class="btn-download" target="_blank">✨ Ürünlerimi İndir</a>
              </div>
              <p class="link-note">🔗 İndirme linki <strong>7 gün</strong> boyunca geçerlidir.</p>
            </div>
            <div class="footer">
              <p>🍰 <span class="brand">Sleepy Pie Bakery</span></p>
              <p class="cozy">Made with 💕 and lots of sleep</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log('✅ Email sent successfully!', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
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

    // ⭐ Send email with Resend
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