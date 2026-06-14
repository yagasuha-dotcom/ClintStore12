const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const webRoutes = require('./routes/web');

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', webRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClintStore API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Tidak Ditemukan' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', { 
    title: 'Error', 
    error: err.message 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 ClintStore running on http://localhost:${PORT}`);
  console.log(`📊 Admin: http://localhost:${PORT}/admin`);
  console.log(`🛍️  Shop: http://localhost:${PORT}`);
});
