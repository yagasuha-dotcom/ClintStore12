const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/clintstore.db';

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to database');
  }
});

db.serialize(() => {
  // Tabel PRODUCTS
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabel ORDERS
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT,
      total_price REAL NOT NULL,
      promo_id INTEGER,
      final_price REAL NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      order_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(promo_id) REFERENCES promos(id)
    )
  `);

  // Tabel ORDER ITEMS
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // Tabel PROMOS
  db.run(`
    CREATE TABLE IF NOT EXISTS promos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      max_usage INTEGER,
      used_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabel SETTINGS
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('store_name', 'ClintStore Premium')`, function(err) {
    if (!err) console.log('✅ Store name setting added');
  });

  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('store_currency', 'IDR')`, function(err) {
    if (!err) console.log('✅ Currency setting added');
  });

  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_percentage', '0')`, function(err) {
    if (!err) console.log('✅ Tax setting added');
  });

  // Insert sample products
  const sampleProducts = [
    { name: 'Premium Hoodie', description: 'Comfortable premium hoodie', price: 250000, stock: 50 },
    { name: 'Exclusive T-Shirt', description: 'Limited edition t-shirt', price: 150000, stock: 100 },
    { name: 'Designer Sneakers', description: 'Premium sneakers with style', price: 500000, stock: 25 },
  ];

  sampleProducts.forEach(product => {
    db.run(
      `INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)`,
      [product.name, product.description, product.price, product.stock],
      function(err) {
        if (!err) console.log(`✅ Product added: ${product.name}`);
      }
    );
  });

  // Insert sample promo
  db.run(
    `INSERT OR IGNORE INTO promos (code, description, discount_type, discount_value, min_purchase, is_active) 
     VALUES ('WELCOME10', 'Welcome discount 10%', 'percentage', 10, 100000, 1)`,
    function(err) {
      if (!err) console.log('✅ Promo added: WELCOME10');
    }
  );

  console.log('🎉 Database initialized successfully!');
  db.close();
});
