# 🏪 ClintStore - Premium Online Store

ClintStore adalah aplikasi toko online premium yang dibangun dengan Express.js dan SQLite.

**Saat ini: TAHAP 1 - Backend Setup**

## 📋 Fitur TAHAP 1

✅ Database SQLite dengan tabel: products, orders, promos, settings
✅ Backend Express.js dengan route API publik dan admin
✅ Admin login sederhana (username: admin / password: clintstore123)
✅ Admin dashboard dengan statistik penjualan
✅ Struktur folder yang rapi dan terorganisir

---

## 📂 Struktur Folder

```
ClintStore12/
├── database/
│   ├── db.js                 # Database connection
│   └── clintstore.db         # SQLite database file (generated)
├── middleware/
│   └── auth.js               # Authentication & session management
├── routes/
│   ├── api.js                # Public API routes
│   └── admin.js              # Admin routes & dashboard
├── scripts/
│   └── init-db.js            # Database initialization script
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env                       # Environment variables
├── .gitignore                # Git ignore file
└── README.md                 # Documentation
```

---

## 🚀 Cara Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Inisialisasi Database
```bash
npm run init-db
```

Ini akan membuat:
- Database SQLite dengan semua tabel
- Sample products dan promo

### 3. Jalankan Server
```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

Server akan berjalan di `http://localhost:3000`

---

## 🔑 Admin Login

**Username:** `admin`
**Password:** `clintstore123`

Ubah credentials di file `.env`

---

## 📚 API Endpoints

### Public API (Tanpa Login)

#### GET /api/products
Dapatkan semua produk aktif
```bash
curl http://localhost:3000/api/products
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Premium Hoodie",
      "description": "Comfortable premium hoodie",
      "price": 250000,
      "stock": 50,
      "image_url": null,
      "created_at": "2024-01-01 10:00:00"
    }
  ],
  "total": 1
}
```

#### POST /api/checkout
Buat pesanan baru

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "08123456789",
    "payment_method": "transfer",
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 250000
      }
    ],
    "promo_code": "WELCOME10"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Order created successfully",
  "order": {
    "id": 1,
    "invoice_number": "INV-1704110400000-ABC123XYZ",
    "total_price": 500000,
    "promo_discount": 50000,
    "final_price": 450000,
    "customer_name": "John Doe",
    "payment_method": "transfer",
    "created_at": "2024-01-01 10:00:00"
  }
}
```

#### GET /api/orders/:invoice
Dapatkan detail pesanan

```bash
curl http://localhost:3000/api/orders/INV-1704110400000-ABC123XYZ
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "invoice_number": "INV-1704110400000-ABC123XYZ",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "08123456789",
    "total_price": 500000,
    "final_price": 450000,
    "payment_status": "pending",
    "order_status": "pending",
    "payment_method": "transfer",
    "created_at": "2024-01-01 10:00:00",
    "items": [
      {
        "quantity": 2,
        "price": 250000,
        "subtotal": 500000,
        "name": "Premium Hoodie",
        "image_url": null
      }
    ]
  }
}
```

---

### Admin API (Perlu Login)

#### POST /admin/login
Login admin

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "clintstore123"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "sessionId": "a1b2c3d4e5f6...",
  "user": {
    "username": "admin"
  }
}
```

#### GET /admin/dashboard
Dashboard dengan ringkasan statistik

```bash
curl "http://localhost:3000/admin/dashboard?sessionId=a1b2c3d4e5f6..."
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_orders": 5,
    "total_revenue_today": 1500000,
    "total_revenue_all": 3500000,
    "total_products": 3,
    "low_stock_products": 1,
    "orders_today": 2,
    "recent_orders": [
      {
        "id": 5,
        "invoice_number": "INV-1704110400000-ABC123XYZ",
        "customer_name": "John Doe",
        "final_price": 450000,
        "order_status": "pending",
        "created_at": "2024-01-01 10:00:00"
      }
    ]
  }
}
```

#### GET /admin/orders
Dapatkan semua pesanan

```bash
curl "http://localhost:3000/admin/orders?sessionId=a1b2c3d4e5f6...&page=1&limit=20"
```

#### GET /admin/products
Dapatkan semua produk

```bash
curl "http://localhost:3000/admin/products?sessionId=a1b2c3d4e5f6..."
```

#### POST /admin/products
Tambah produk baru

```bash
curl -X POST http://localhost:3000/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "description": "Product description",
    "price": 150000,
    "stock": 100
  }' \
  -H "Cookie: sessionId=a1b2c3d4e5f6..."
```

#### PUT /admin/products/:id
Update produk

```bash
curl -X PUT http://localhost:3000/admin/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 75,
    "price": 200000
  }' \
  -H "Cookie: sessionId=a1b2c3d4e5f6..."
```

#### GET /admin/promos
Dapatkan semua promo

```bash
curl "http://localhost:3000/admin/promos?sessionId=a1b2c3d4e5f6..."
```

#### POST /admin/promos
Tambah promo baru

```bash
curl -X POST http://localhost:3000/admin/promos \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SPECIAL20",
    "description": "Special discount 20%",
    "discount_type": "percentage",
    "discount_value": 20,
    "min_purchase": 500000,
    "max_usage": 100,
    "end_date": "2024-12-31"
  }' \
  -H "Cookie: sessionId=a1b2c3d4e5f6..."
```

#### PUT /admin/orders/:id/status
Update status pesanan

```bash
curl -X PUT http://localhost:3000/admin/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "order_status": "shipped",
    "payment_status": "paid"
  }' \
  -H "Cookie: sessionId=a1b2c3d4e5f6..."
```

---

## 🗄️ Database Schema

### Products
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Orders
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  total_price REAL,
  promo_id INTEGER,
  final_price REAL,
  payment_status TEXT,
  order_status TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Promos
```sql
CREATE TABLE promos (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,
  description TEXT,
  discount_type TEXT,
  discount_value REAL,
  min_purchase REAL,
  max_usage INTEGER,
  used_count INTEGER,
  is_active INTEGER,
  start_date DATETIME,
  end_date DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);
```

### Settings
```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

---

## 🔄 Roadmap

- **TAHAP 1** ✅ Backend setup & API
- **TAHAP 2** 🚧 Frontend user (React/Vue)
- **TAHAP 3** 🚧 Payment gateway & advanced features

---

## 📝 Environment Variables

Edit `.env`:
```
PORT=3000
NODE_ENV=development
DB_PATH=./database/clintstore.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=clintstore123
JWT_SECRET=your-secret-key-tahap-1
```

---

## 💡 Catatan Penting

- Database file akan dibuat otomatis di `database/clintstore.db`
- Session admin berakhir dalam 24 jam
- Promo otomatis mengurangi stok produk saat checkout
- Setiap order mendapat invoice number unik
- Admin bisa update status order (pending, processing, shipped, delivered)

---

## 📞 Support

Untuk pertanyaan atau masalah, hubungi tim development.

---

**Happy Coding! 🚀**
