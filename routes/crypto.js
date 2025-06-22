const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/database');
const cryptoApi = require('../services/cryptoApi');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get current prices for all supported coins
router.get('/prices', async (req, res) => {
  try {
    const prices = await cryptoApi.getAllCurrentPrices();
    res.json({ prices });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Get current price for a specific coin
router.get('/prices/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await cryptoApi.getCurrentPrice(symbol.toUpperCase());
    res.json({ price });
  } catch (error) {
    console.error(`Error fetching price for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// Get candlestick data for a coin
router.get('/candlesticks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d', limit = 100 } = req.query;
    
    const candlestickData = await cryptoApi.getCandlestickData(
      symbol.toUpperCase(),
      interval,
      parseInt(limit)
    );
    
    res.json({ candlestickData });
  } catch (error) {
    console.error(`Error fetching candlestick data for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch candlestick data' });
  }
});

// Get historical data for a coin
router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 30 } = req.query;
    
    const historicalData = await cryptoApi.getHistoricalDataForDays(
      symbol.toUpperCase(),
      parseInt(days)
    );
    
    res.json({ historicalData });
  } catch (error) {
    console.error(`Error fetching historical data for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Get moving averages for all coins
router.get('/moving-averages', async (req, res) => {
  try {
    const { periods } = req.query;
    const periodArray = periods ? periods.split(',').map(p => parseInt(p)) : [1, 2, 5, 9, 15];
    
    const movingAverages = await cryptoApi.getAllMovingAverages(periodArray);
    res.json({ movingAverages });
  } catch (error) {
    console.error('Error fetching moving averages:', error);
    res.status(500).json({ error: 'Failed to fetch moving averages' });
  }
});

// Get moving averages for a specific coin
router.get('/moving-averages/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { periods } = req.query;
    const periodArray = periods ? periods.split(',').map(p => parseInt(p)) : [1, 2, 5, 9, 15];
    
    const movingAverages = await cryptoApi.getMovingAverages(
      symbol.toUpperCase(),
      periodArray
    );
    
    res.json({ movingAverages });
  } catch (error) {
    console.error(`Error fetching moving averages for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch moving averages' });
  }
});

// Get historical moving averages for chart plotting
router.get('/historical-moving-averages/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 30, periods = '5,9,15' } = req.query;
    const periodArray = periods.split(',').map(p => parseInt(p));
    const maxPeriod = Math.max(...periodArray);
    
    // Fetch more data than requested to ensure we have enough for moving average calculations
    // Add extra days equal to the maximum period to ensure we can calculate moving averages for the full range
    const extraDays = maxPeriod + 10; // Add buffer for safety
    const totalDays = parseInt(days) + extraDays;
    
    // Get historical data first
    const historicalData = await cryptoApi.getHistoricalDataForDays(
      symbol.toUpperCase(),
      totalDays
    );
    
    // Calculate historical moving averages
    const historicalMovingAverages = cryptoApi.calculateHistoricalMovingAverages(
      historicalData,
      periodArray
    );
    
    // Return only the requested number of days (trim from the end to get the most recent data)
    const requestedDays = parseInt(days);
    const trimmedData = historicalMovingAverages.slice(-requestedDays);
    
    res.json({ historicalMovingAverages: trimmedData });
  } catch (error) {
    console.error(`Error fetching historical moving averages for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch historical moving averages' });
  }
});

// Transaction validation
const transactionValidation = [
  body('coin_symbol')
    .isIn(['BTC', 'ETH', 'XRP'])
    .withMessage('Invalid coin symbol'),
  body('type')
    .isIn(['buy', 'sell'])
    .withMessage('Transaction type must be buy or sell'),
  body('quantity')
    .isFloat({ min: 0.00000001 })
    .withMessage('Quantity must be a positive number'),
  body('price_at_transaction')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stop_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Stop limit must be a positive number'),
  body('trailing_stop_pct')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Trailing stop percentage must be between 0 and 100')
];

// Create a new transaction
router.post('/transactions', transactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      coin_symbol,
      type,
      quantity,
      price_at_transaction,
      stop_limit,
      trailing_stop_pct
    } = req.body;

    const userId = req.user.id;

    // Check if user has enough balance for sell transactions
    if (type === 'sell') {
      const portfolioResult = await pool.query(
        'SELECT quantity FROM portfolio WHERE user_id = $1 AND coin_symbol = $2',
        [userId, coin_symbol]
      );

      if (portfolioResult.rows.length === 0 || portfolioResult.rows[0].quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient balance for sell transaction' });
      }
    }

    // Create transaction
    const transactionResult = await pool.query(
      `INSERT INTO transactions 
       (user_id, coin_symbol, type, quantity, price_at_transaction, stop_limit, trailing_stop_pct)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, coin_symbol, type, quantity, price_at_transaction, stop_limit, trailing_stop_pct]
    );

    const transaction = transactionResult.rows[0];

    // Update portfolio
    await updatePortfolio(userId, coin_symbol, type, quantity, price_at_transaction);

    // Log the transaction
    await pool.query(
      'INSERT INTO logs (user_id, transaction_id, action, message) VALUES ($1, $2, $3, $4)',
      [userId, transaction.id, 'CREATE', `Created ${type} transaction for ${quantity} ${coin_symbol} at $${price_at_transaction}`]
    );

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get user's transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, coin_symbol, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, 
             CASE 
               WHEN t.type = 'buy' THEN -t.quantity * t.price_at_transaction
               ELSE t.quantity * t.price_at_transaction
             END as transaction_value
      FROM transactions t 
      WHERE t.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (coin_symbol) {
      paramCount++;
      query += ` AND t.coin_symbol = $${paramCount}`;
      params.push(coin_symbol);
    }

    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get user's portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const userId = req.user.id;

    const portfolioResult = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1',
      [userId]
    );

    // Get current prices to calculate current values
    const currentPrices = await cryptoApi.getAllCurrentPrices();
    const priceMap = {};
    currentPrices.forEach(price => {
      priceMap[price.symbol] = price.price;
    });

    const portfolio = portfolioResult.rows.map(item => ({
      ...item,
      current_price: priceMap[item.coin_symbol] || 0,
      current_value: (priceMap[item.coin_symbol] || 0) * parseFloat(item.quantity),
      unrealized_pl: ((priceMap[item.coin_symbol] || 0) - parseFloat(item.avg_price)) * parseFloat(item.quantity)
    }));

    res.json({ portfolio });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// Helper function to update portfolio
async function updatePortfolio(userId, coinSymbol, type, quantity, price) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if portfolio entry exists
    const existingResult = await client.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND coin_symbol = $2',
      [userId, coinSymbol]
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      let newQuantity, newAvgPrice;

      if (type === 'buy') {
        newQuantity = parseFloat(existing.quantity) + parseFloat(quantity);
        newAvgPrice = ((parseFloat(existing.quantity) * parseFloat(existing.avg_price)) + 
                      (parseFloat(quantity) * parseFloat(price))) / newQuantity;
      } else {
        newQuantity = parseFloat(existing.quantity) - parseFloat(quantity);
        newAvgPrice = parseFloat(existing.avg_price); // Keep same average price for sells
      }

      if (newQuantity <= 0) {
        // Remove portfolio entry if quantity becomes 0 or negative
        await client.query(
          'DELETE FROM portfolio WHERE user_id = $1 AND coin_symbol = $2',
          [userId, coinSymbol]
        );
      } else {
        await client.query(
          'UPDATE portfolio SET quantity = $1, avg_price = $2 WHERE user_id = $3 AND coin_symbol = $4',
          [newQuantity, newAvgPrice, userId, coinSymbol]
        );
      }
    } else if (type === 'buy') {
      // Create new portfolio entry for buy transactions
      await client.query(
        'INSERT INTO portfolio (user_id, coin_symbol, quantity, avg_price) VALUES ($1, $2, $3, $4)',
        [userId, coinSymbol, quantity, price]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = router; 