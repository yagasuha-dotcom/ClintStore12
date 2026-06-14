const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

// GET / - Homepage
router.get('/', async (req, res) => {
  try {
    const productsRes = await fetch(`${API_BASE}/products`);
    const productsData = await productsRes.json();
    
    res.render('index', {
      title: 'Beranda - ClintStore',
      products: productsData.data || []
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.render('index', {
      title: 'Beranda - ClintStore',
      products: []
    });
  }
});

// GET /produk - All products
router.get('/produk', async (req, res) => {
  try {
    const category = req.query.kategori || 'semua';
    const search = req.query.cari || '';
    
    const productsRes = await fetch(`${API_BASE}/products`);
    const productsData = await productsRes.json();
    
    let products = productsData.data || [];
    
    // Filter berdasarkan kategori (disimpan di field description untuk sekarang)
    // Di TAHAP 3 bisa tambahkan field category
    if (category !== 'semua') {
      products = products.filter(p => 
        p.description && p.description.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Filter berdasarkan search
    if (search) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    const categories = ['semua', 'joki', 'akun', 'apk', 'executor', 'script'];
    
    res.render('products', {
      title: 'Semua Produk - ClintStore',
      products,
      categories,
      selectedCategory: category,
      searchQuery: search
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.render('products', {
      title: 'Semua Produk - ClintStore',
      products: [],
      categories: [],
      selectedCategory: 'semua',
      searchQuery: ''
    });
  }
});

// GET /produk/:id - Product detail
router.get('/produk/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const productsRes = await fetch(`${API_BASE}/products`);
    const productsData = await productsRes.json();
    
    const product = (productsData.data || []).find(p => p.id == productId);
    
    if (!product) {
      return res.status(404).render('404', { title: 'Produk Tidak Ditemukan' });
    }
    
    res.render('product-detail', {
      title: `${product.name} - ClintStore`,
      product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).render('error', {
      title: 'Error',
      error: 'Gagal mengambil detail produk'
    });
  }
});

// GET /keranjang - Cart
router.get('/keranjang', (req, res) => {
  res.render('cart', {
    title: 'Keranjang - ClintStore'
  });
});

// GET /checkout - Checkout
router.get('/checkout', (req, res) => {
  res.render('checkout', {
    title: 'Checkout - ClintStore'
  });
});

// GET /cek-pesanan - Track order
router.get('/cek-pesanan', (req, res) => {
  res.render('track', {
    title: 'Cek Pesanan - ClintStore'
  });
});

// POST /cek-pesanan - Track order
router.post('/cek-pesanan', async (req, res) => {
  try {
    const invoice = req.body.invoice_number;
    
    if (!invoice) {
      return res.render('track', {
        title: 'Cek Pesanan - ClintStore',
        error: 'Masukkan nomor invoice',
        order: null
      });
    }
    
    const orderRes = await fetch(`${API_BASE}/orders/${invoice}`);
    const orderData = await orderRes.json();
    
    if (!orderData.data) {
      return res.render('track', {
        title: 'Cek Pesanan - ClintStore',
        error: 'Pesanan tidak ditemukan',
        order: null
      });
    }
    
    res.render('track', {
      title: 'Cek Pesanan - ClintStore',
      error: null,
      order: orderData.data
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.render('track', {
      title: 'Cek Pesanan - ClintStore',
      error: 'Terjadi kesalahan saat mencari pesanan',
      order: null
    });
  }
});

// GET /sukses - Success page
router.get('/sukses', (req, res) => {
  const invoice = req.query.invoice || '';
  const total = req.query.total || 0;
  
  res.render('success', {
    title: 'Pesanan Berhasil - ClintStore',
    invoice,
    total
  });
});

module.exports = router;
