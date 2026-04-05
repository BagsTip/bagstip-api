require('dotenv').config();

const express = require('express');
const errorHandler = require('./middleware/errorHandler');
const claimRoutes = require('./routes/claim');
const creatorRoutes = require('./routes/creator');
const tipRoutes = require('./routes/tip');

// Initialize DB (creates tables on first run)
require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'BagsTip Claim API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'POST /claim/init': 'Start claim process — get verification code',
      'POST /claim/verify': 'Verify X account ownership',
      'POST /claim/release': 'Release funds to wallet',
    },
  });
});

app.use('/claim', claimRoutes);
app.use('/creator', creatorRoutes);
app.use('/tip', tipRoutes);

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
  console.log('🚀  BagsTip Claim API');
  console.log(`📡  http://localhost:${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});
