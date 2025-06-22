const cron = require('node-cron');
const { pool } = require('../config/database');
const cryptoApi = require('./cryptoApi');
const emailService = require('./emailService');

class TradingEngine {
  constructor() {
    this.isRunning = false;
    this.highestPrices = new Map(); // Track highest prices for trailing stops
  }

  // Start the trading engine
  start() {
    if (this.isRunning) {
      console.log('Trading engine is already running');
      return;
    }

    console.log('Starting trading engine...');
    this.isRunning = true;

    // Run every 30 seconds to check for stop loss/trailing stop triggers
    cron.schedule('*/30 * * * * *', async () => {
      await this.checkStopLossOrders();
    });

    // Update moving averages every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateMovingAverages();
    });

    console.log('Trading engine started successfully');
  }

  // Stop the trading engine
  stop() {
    if (!this.isRunning) {
      console.log('Trading engine is not running');
      return;
    }

    console.log('Stopping trading engine...');
    this.isRunning = false;
    console.log('Trading engine stopped');
  }

  // Check for stop loss and trailing stop triggers
  async checkStopLossOrders() {
    try {
      // Get all open transactions with stop loss or trailing stop
      const result = await pool.query(`
        SELECT t.*, u.email, u.username
        FROM transactions t
        JOIN users u ON t.user_id = u.id
        WHERE t.status = 'open' 
        AND (t.stop_limit IS NOT NULL OR t.trailing_stop_pct IS NOT NULL)
        AND t.type = 'buy'
      `);

      for (const transaction of result.rows) {
        await this.processTransaction(transaction);
      }
    } catch (error) {
      console.error('Error checking stop loss orders:', error);
    }
  }

  // Process individual transaction for stop loss checks
  async processTransaction(transaction) {
    try {
      const { id, coin_symbol, stop_limit, trailing_stop_pct, user_id, email, username } = transaction;

      // Get current price
      const currentPriceData = await cryptoApi.getCurrentPrice(coin_symbol);
      const currentPrice = currentPriceData.price;

      // Update highest price for trailing stop
      const key = `${user_id}_${coin_symbol}`;
      const currentHighest = this.highestPrices.get(key) || currentPrice;
      const newHighest = Math.max(currentHighest, currentPrice);
      this.highestPrices.set(key, newHighest);

      let shouldSell = false;
      let triggerType = '';

      // Check stop loss
      if (stop_limit && currentPrice <= stop_limit) {
        shouldSell = true;
        triggerType = 'Stop Loss';
      }

      // Check trailing stop
      if (trailing_stop_pct && !shouldSell) {
        const trailingStopPrice = newHighest * (1 - trailing_stop_pct / 100);
        if (currentPrice <= trailingStopPrice) {
          shouldSell = true;
          triggerType = 'Trailing Stop';
        }
      }

      if (shouldSell) {
        await this.executeStopLossSell(transaction, currentPrice, triggerType);
      }

    } catch (error) {
      console.error(`Error processing transaction ${transaction.id}:`, error);
    }
  }

  // Execute stop loss sell order
  async executeStopLossSell(transaction, currentPrice, triggerType) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id, user_id, coin_symbol, quantity, price_at_transaction } = transaction;

      // Create sell transaction
      const sellTransactionResult = await client.query(`
        INSERT INTO transactions 
        (user_id, coin_symbol, type, quantity, price_at_transaction, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [user_id, coin_symbol, 'sell', quantity, currentPrice, 'closed']);

      const sellTransaction = sellTransactionResult.rows[0];

      // Update original transaction status
      await client.query(`
        UPDATE transactions 
        SET status = 'closed' 
        WHERE id = $1
      `, [id]);

      // Update portfolio
      await this.updatePortfolioForSell(client, user_id, coin_symbol, quantity, currentPrice);

      // Log the transaction
      await client.query(`
        INSERT INTO logs (user_id, transaction_id, action, message) 
        VALUES ($1, $2, $3, $4)
      `, [user_id, sellTransaction.id, 'STOP_LOSS', 
          `${triggerType} triggered: Sold ${quantity} ${coin_symbol} at $${currentPrice}`]);

      await client.query('COMMIT');

      // Send email notification
      try {
        await emailService.sendStopLossNotification(
          transaction.email,
          transaction.username,
          sellTransaction,
          currentPrice,
          triggerType
        );
      } catch (emailError) {
        console.error('Error sending stop loss email:', emailError);
      }

      console.log(`${triggerType} executed: Sold ${quantity} ${coin_symbol} at $${currentPrice}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error executing stop loss sell:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update portfolio for sell transaction
  async updatePortfolioForSell(client, userId, coinSymbol, quantity, price) {
    const portfolioResult = await client.query(`
      SELECT * FROM portfolio 
      WHERE user_id = $1 AND coin_symbol = $2
    `, [userId, coinSymbol]);

    if (portfolioResult.rows.length > 0) {
      const portfolio = portfolioResult.rows[0];
      const newQuantity = parseFloat(portfolio.quantity) - parseFloat(quantity);

      if (newQuantity <= 0) {
        // Remove portfolio entry if quantity becomes 0 or negative
        await client.query(`
          DELETE FROM portfolio 
          WHERE user_id = $1 AND coin_symbol = $2
        `, [userId, coinSymbol]);
      } else {
        await client.query(`
          UPDATE portfolio 
          SET quantity = $1 
          WHERE user_id = $2 AND coin_symbol = $3
        `, [newQuantity, userId, coinSymbol]);
      }
    }
  }

  // Update moving averages for all supported coins
  async updateMovingAverages() {
    try {
      console.log('Updating moving averages...');
      
      const periods = [1, 2, 5, 9, 15];
      const supportedCoins = ['BTC', 'ETH', 'XRP'];

      for (const coin of supportedCoins) {
        try {
          const movingAverages = await cryptoApi.getMovingAverages(coin, periods);
          
          for (const [period, value] of Object.entries(movingAverages.movingAverages)) {
            if (value !== null) {
              await pool.query(`
                INSERT INTO moving_averages (coin_symbol, days, value, calculated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                ON CONFLICT (coin_symbol, days, calculated_at::date) 
                DO UPDATE SET value = $3
              `, [coin, parseInt(period), value]);
            }
          }
        } catch (error) {
          console.error(`Error updating moving averages for ${coin}:`, error);
        }
      }

      console.log('Moving averages updated successfully');
    } catch (error) {
      console.error('Error updating moving averages:', error);
    }
  }

  // Get trading statistics
  async getTradingStats() {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN type = 'buy' THEN 1 END) as buy_transactions,
          COUNT(CASE WHEN type = 'sell' THEN 1 END) as sell_transactions,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_transactions,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_transactions
        FROM transactions
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting trading stats:', error);
      throw error;
    }
  }

  // Get user's trading statistics
  async getUserTradingStats(userId) {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN type = 'buy' THEN 1 END) as buy_transactions,
          COUNT(CASE WHEN type = 'sell' THEN 1 END) as sell_transactions,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_transactions,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_transactions,
          SUM(CASE WHEN type = 'buy' THEN quantity * price_at_transaction ELSE 0 END) as total_bought,
          SUM(CASE WHEN type = 'sell' THEN quantity * price_at_transaction ELSE 0 END) as total_sold
        FROM transactions
        WHERE user_id = $1
      `, [userId]);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting user trading stats:', error);
      throw error;
    }
  }

  // Clean up old moving averages data (keep last 30 days)
  async cleanupOldMovingAverages() {
    try {
      await pool.query(`
        DELETE FROM moving_averages 
        WHERE calculated_at < CURRENT_DATE - INTERVAL '30 days'
      `);
      console.log('Old moving averages cleaned up');
    } catch (error) {
      console.error('Error cleaning up old moving averages:', error);
    }
  }
}

module.exports = new TradingEngine(); 