const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// GET /api/products - Dapatkan semua produk aktif
router.get('/products', (req, res) => {
  db.all(
    `SELECT id, name, description, price, stock, image_url, created_at 
     FROM products 
     WHERE is_active = 1 
     ORDER BY created_at DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }
      res.json({
        status: 'success',
        data: rows,
        total: rows.length
      });
    }
  );
});

// POST /api/checkout - Buat pesanan baru
router.post('/checkout', (req, res) => {
  const { customer_name, customer_email, customer_phone, items, promo_code, payment_method } = req.body;

  // Validasi input
  if (!customer_name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid input. Customer name and items required.' });
  }

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  db.serialize(() => {
    // Hitung total harga
    let totalPrice = 0;
    let checkError = false;

    // Validasi stok dan hitung total
    let itemCount = 0;
    items.forEach((item, index) => {
      db.get(
        `SELECT id, price, stock FROM products WHERE id = ? AND is_active = 1`,
        [item.product_id],
        (err, row) => {
          if (err || !row) {
            checkError = true;
            return res.status(400).json({ error: `Product ${item.product_id} not found` });
          }

          if (row.stock < item.quantity) {
            checkError = true;
            return res.status(400).json({ error: `Insufficient stock for product ${item.product_id}` });
          }

          totalPrice += row.price * item.quantity;
          itemCount++;

          // Lanjutkan jika semua item sudah divalidasi
          if (itemCount === items.length && !checkError) {
            processCheckout(invoiceNumber, customer_name, customer_email, customer_phone, items, totalPrice, promo_code, payment_method, res);
          }
        }
      );
    });
  });
});

function processCheckout(invoiceNumber, customer_name, customer_email, customer_phone, items, totalPrice, promo_code, payment_method, res) {
  let finalPrice = totalPrice;
  let promoId = null;

  // Cek promo code jika ada
  if (promo_code) {
    db.get(
      `SELECT id, discount_type, discount_value, min_purchase, max_usage, used_count, is_active 
       FROM promos 
       WHERE code = ? AND is_active = 1 AND (end_date IS NULL OR end_date > datetime('now'))`,
      [promo_code],
      (err, promo) => {
        if (err || !promo) {
          return res.status(400).json({ error: 'Invalid or expired promo code' });
        }

        if (promo.max_usage && promo.used_count >= promo.max_usage) {
          return res.status(400).json({ error: 'Promo code usage limit exceeded' });
        }

        if (totalPrice < promo.min_purchase) {
          return res.status(400).json({ error: `Minimum purchase amount not reached. Min: ${promo.min_purchase}` });
        }

        let discount = 0;
        if (promo.discount_type === 'percentage') {
          discount = (totalPrice * promo.discount_value) / 100;
        } else {
          discount = promo.discount_value;
        }

        finalPrice = Math.max(0, totalPrice - discount);
        promoId = promo.id;

        insertOrder(invoiceNumber, customer_name, customer_email, customer_phone, items, totalPrice, finalPrice, promoId, payment_method, res, promo_code);
      }
    );
  } else {
    insertOrder(invoiceNumber, customer_name, customer_email, customer_phone, items, totalPrice, finalPrice, promoId, payment_method, res);
  }
}

function insertOrder(invoiceNumber, customer_name, customer_email, customer_phone, items, totalPrice, finalPrice, promoId, payment_method, res, promo_code = null) {
  const query = `
    INSERT INTO orders (invoice_number, customer_name, customer_email, customer_phone, total_price, promo_id, final_price, payment_method, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;

  db.run(query, [invoiceNumber, customer_name, customer_email, customer_phone, totalPrice, promoId, finalPrice, payment_method], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create order', message: err.message });
    }

    const orderId = this.lastID;

    // Insert order items
    let insertedItems = 0;
    items.forEach(item => {
      db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) 
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price, item.quantity * item.price],
        (err) => {
          if (err) console.error('Error inserting order item:', err);
          insertedItems++;

          // Kurangi stok produk
          if (insertedItems === items.length) {
            items.forEach(item => {
              db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.quantity, item.product_id]);
            });

            // Update promo usage jika ada
            if (promo_code && promoId) {
              db.run(`UPDATE promos SET used_count = used_count + 1 WHERE id = ?`, [promoId]);
            }

            res.status(201).json({
              status: 'success',
              message: 'Order created successfully',
              order: {
                id: orderId,
                invoice_number: invoiceNumber,
                total_price: totalPrice,
                promo_discount: totalPrice - finalPrice,
                final_price: finalPrice,
                customer_name,
                payment_method,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
              }
            });
          }
        }
      );
    });
  });
}

// GET /api/orders/:invoice - Dapatkan detail pesanan berdasarkan invoice
router.get('/orders/:invoice', (req, res) => {
  const invoiceNumber = req.params.invoice;

  db.get(
    `SELECT id, invoice_number, customer_name, customer_email, customer_phone, total_price, final_price, payment_status, order_status, payment_method, created_at 
     FROM orders 
     WHERE invoice_number = ?`,
    [invoiceNumber],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Ambil detail items
      db.all(
        `SELECT oi.quantity, oi.price, oi.subtotal, p.name, p.image_url 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id],
        (err, items) => {
          if (err) {
            return res.status(500).json({ error: 'Database error', message: err.message });
          }

          res.json({
            status: 'success',
            data: {
              ...order,
              items
            }
          });
        }
      );
    }
  );
});

module.exports = router;
