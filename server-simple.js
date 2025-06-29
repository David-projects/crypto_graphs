const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware
app.use(compression());

// Rate limiting with proper configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available, otherwise use IP
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mode: 'simple'
  });
});

// Mock crypto data endpoint
app.get('/api/crypto/prices', async (req, res) => {
  try {
    // Mock data for development
    const mockData = {
      BTC: { price: 45000, change24h: 2.5 },
      ETH: { price: 2800, change24h: -1.2 },
      XRP: { price: 0.85, change24h: 5.8 },
      ADA: { price: 0.45, change24h: 3.2 },
      DOT: { price: 7.2, change24h: -0.8 }
    };
    
    res.json(mockData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crypto prices' });
  }
});

// Mock candlestick data endpoint
app.get('/api/crypto/candlesticks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = 100 } = req.query;
    
    // Generate mock candlestick data
    const mockCandlesticks = [];
    const basePrice = symbol === 'BTC' ? 45000 : symbol === 'ETH' ? 2800 : 100;
    
    for (let i = 0; i < limit; i++) {
      const time = Date.now() - (limit - i) * 60 * 60 * 1000; // 1 hour intervals
      const open = basePrice + (Math.random() - 0.5) * 1000;
      const high = open + Math.random() * 500;
      const low = open - Math.random() * 500;
      const close = open + (Math.random() - 0.5) * 200;
      const volume = Math.random() * 1000000;
      
      mockCandlesticks.push([time, open, high, low, close, volume]);
    }
    
    res.json(mockCandlesticks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candlestick data' });
  }
});

// Mock moving averages endpoint
app.get('/api/crypto/moving-averages/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = '7,14,30' } = req.query;
    
    const dayArray = days.split(',').map(d => parseInt(d));
    const mockAverages = {};
    
    dayArray.forEach(day => {
      const basePrice = symbol === 'BTC' ? 45000 : symbol === 'ETH' ? 2800 : 100;
      mockAverages[day] = basePrice + (Math.random() - 0.5) * 1000;
    });
    
    res.json(mockAverages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch moving averages' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Running in simple mode - no database required`);
}); 