const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const moment = require('moment');
require('dotenv').config();

// POST /admin/login - Login admin
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'clintstore123';

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = auth.createSession(username);
  
  res.json({
    status: 'success',
    message: 'Login successful',
    sessionId,
    user: { username }
  });
});

// POST /admin/logout - Logout admin
router.post('/logout', auth.adminAuth, (req, res) => {
  auth.destroySession(req.sessionId);
  res.json({ status: 'success', message: 'Logout successful' });
});

// GET /admin/dashboard - Dashboard dengan ringkasan
router.get('/dashboard', auth.adminAuth, (req, res) => {
  const today = moment().format('YYYY-MM-DD');

  db.serialize(() => {
    let dashboardData = {
      total_orders: 0,
      total_revenue_today: 0,
      total_revenue_all: 0,
      total_products: 0,
      low_stock_products: 0,
      orders_today: 0,
      recent_orders: []
    };

    // Total orders
    db.get(`SELECT COUNT(*) as count FROM orders`, (err, row) => {
      if (!err) dashboardData.total_orders = row.count;
    });

    // Total revenue hari ini
    db.get(
      `SELECT SUM(final_price) as total FROM orders WHERE DATE(created_at) = ?`,
      [today],
      (err, row) => {
        if (!err) dashboardData.total_revenue_today = row.total || 0;
      }
    );

    // Total revenue semua
    db.get(`SELECT SUM(final_price) as total FROM orders`, (err, row) => {
      if (!err) dashboardData.total_revenue_all = row.total || 0;
    });

    // Total produk
    db.get(`SELECT COUNT(*) as count FROM products WHERE is_active = 1`, (err, row) => {
      if (!err) dashboardData.total_products = row.count;
    });

    // Produk stok rendah (< 10)
    db.get(`SELECT COUNT(*) as count FROM products WHERE stock < 10 AND is_active = 1`, (err, row) => {
      if (!err) dashboardData.low_stock_products = row.count;
    });

    // Orders hari ini
    db.get(
      `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?`,
      [today],
      (err, row) => {
        if (!err) dashboardData.orders_today = row.count;
      }
    );

    // Recent orders (10 terakhir)
    db.all(
      `SELECT id, invoice_number, customer_name, final_price, order_status, created_at 
       FROM orders 
       ORDER BY created_at DESC 
       LIMIT 10`,
      (err, rows) => {
        if (!err) {
          dashboardData.recent_orders = rows.map(order => ({
            ...order,
            created_at: moment(order.created_at).format('YYYY-MM-DD HH:mm:ss')
          }));
        }

        res.json({
          status: 'success',
          data: dashboardData
        });
      }
    );
  });
});

// GET /admin/orders - Dapatkan semua orders
router.get('/orders', auth.adminAuth, (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT id, invoice_number, customer_name, customer_email, total_price, final_price, payment_status, order_status, created_at 
     FROM orders 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      db.get(`SELECT COUNT(*) as total FROM orders`, (err, countRow) => {
        res.json({
          status: 'success',
          data: orders,
          pagination: {
            page,
            limit,
            total: countRow.total,
            pages: Math.ceil(countRow.total / limit)
          }
        });
      });
    }
  );
});

// GET /admin/orders/:id - Detail order
router.get('/orders/:id', auth.adminAuth, (req, res) => {
  const orderId = req.params.id;

  db.get(
    `SELECT * FROM orders WHERE id = ?`,
    [orderId],
    (err, order) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.all(
        `SELECT oi.quantity, oi.price, oi.subtotal, p.name, p.image_url 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [orderId],
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

// PUT /admin/orders/:id/status - Update status order
router.put('/orders/:id/status', auth.adminAuth, (req, res) => {
  const orderId = req.params.id;
  const { order_status, payment_status } = req.body;

  let updateQuery = 'UPDATE orders SET ';
  let params = [];

  if (order_status) {
    updateQuery += 'order_status = ?, ';
    params.push(order_status);
  }

  if (payment_status) {
    updateQuery += 'payment_status = ?, ';
    params.push(payment_status);
  }

  updateQuery += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  params.push(orderId);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error', message: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ status: 'success', message: 'Order status updated' });
  });
});

// GET /admin/products - Dapatkan semua produk
router.get('/products', auth.adminAuth, (req, res) => {
  db.all(
    `SELECT id, name, description, price, stock, image_url, is_active, created_at 
     FROM products 
     ORDER BY created_at DESC`,
    (err, products) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      res.json({
        status: 'success',
        data: products,
        total: products.length
      });
    }
  );
});

// POST /admin/products - Tambah produk baru
router.post('/products', auth.adminAuth, (req, res) => {
  const { name, description, price, stock, image_url } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  db.run(
    `INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)`,
    [name, description || '', price, stock || 0, image_url || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create product', message: err.message });
      }

      res.status(201).json({
        status: 'success',
        message: 'Product created',
        product_id: this.lastID
      });
    }
  );
});

// PUT /admin/products/:id - Update produk
router.put('/products/:id', auth.adminAuth, (req, res) => {
  const productId = req.params.id;
  const { name, description, price, stock, image_url, is_active } = req.body;

  let updateQuery = 'UPDATE products SET ';
  let params = [];

  if (name) {
    updateQuery += 'name = ?, ';
    params.push(name);
  }
  if (description !== undefined) {
    updateQuery += 'description = ?, ';
    params.push(description);
  }
  if (price) {
    updateQuery += 'price = ?, ';
    params.push(price);
  }
  if (stock !== undefined) {
    updateQuery += 'stock = ?, ';
    params.push(stock);
  }
  if (image_url !== undefined) {
    updateQuery += 'image_url = ?, ';
    params.push(image_url);
  }
  if (is_active !== undefined) {
    updateQuery += 'is_active = ?, ';
    params.push(is_active);
  }

  updateQuery += 'updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  params.push(productId);

  db.run(updateQuery, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error', message: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ status: 'success', message: 'Product updated' });
  });
});

// GET /admin/promos - Dapatkan semua promo
router.get('/promos', auth.adminAuth, (req, res) => {
  db.all(
    `SELECT id, code, description, discount_type, discount_value, min_purchase, max_usage, used_count, is_active, end_date 
     FROM promos 
     ORDER BY created_at DESC`,
    (err, promos) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', message: err.message });
      }

      res.json({
        status: 'success',
        data: promos,
        total: promos.length
      });
    }
  );
});

// POST /admin/promos - Tambah promo baru
router.post('/promos', auth.adminAuth, (req, res) => {
  const { code, description, discount_type, discount_value, min_purchase, max_usage, end_date } = req.body;

  if (!code || !discount_value) {
    return res.status(400).json({ error: 'Code and discount value are required' });
  }

  db.run(
    `INSERT INTO promos (code, description, discount_type, discount_value, min_purchase, max_usage, end_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [code.toUpperCase(), description || '', discount_type || 'percentage', discount_value, min_purchase || 0, max_usage || null, end_date || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create promo', message: err.message });
      }

      res.status(201).json({
        status: 'success',
        message: 'Promo created',
        promo_id: this.lastID
      });
    }
  );
});

module.exports = router;
