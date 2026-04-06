require('dotenv').config();

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Routes
const verifyRoutes = require('./routes/verify');
const tipRoutes = require('./routes/tip');
const profileRoutes = require('./routes/profile');
const claimRoutes = require('./routes/claim');
const dashboardRoutes = require('./routes/dashboard');

// Initialize DB
require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'BagsTip API',
    version: '1.0.0',
    status: 'running'
  });
});

// ─── Routes ─────────────────────────────────────────────
app.use('/api/v1/verify', verifyRoutes);
app.use('/api/v1/tip', tipRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/claim', claimRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// ─── 404 handler ────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Error handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('🚀  BagsTip Backend API (V1Spec)');
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});
