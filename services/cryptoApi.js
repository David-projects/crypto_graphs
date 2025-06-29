const axios = require('axios');

class CryptoApiService {
  constructor() {
    // Use Binance API instead of CoinGecko for better rate limits
    this.baseUrl = 'https://api.binance.com/api/v3';
    this.supportedCoins = ['BTC', 'ETH', 'XRP'];
    this.symbols = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT', 
      'XRP': 'XRPUSDT'
    };
    
    // Rate limiting configuration for Binance (much higher limits)
    this.requestDelay = 100; // 100ms between requests (much faster)
    this.lastRequestTime = 0;
    this.maxRetries = 2;
    this.useMockData = false;
  }

  // Helper method to add delay between requests
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to ensure rate limiting
  async ensureRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      await this.delay(this.requestDelay - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
  }

  // Helper method to make API requests with retry logic
  async makeRequest(url, params = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.ensureRateLimit();
        
        const response = await axios.get(url, { 
          params,
          timeout: 10000 // 10 second timeout
        });
        return response.data;
      } catch (error) {
        lastError = error;
        
        if (error.response && error.response.status === 429) {
          // Rate limited - wait before retry
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt}/${this.maxRetries}`);
          await this.delay(waitTime);
        } else if (error.response && error.response.status >= 500) {
          // Server error - wait before retry
          await this.delay(1000 * attempt);
        } else {
          // Other errors - don't retry
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  // Get current price for a specific coin
  async getCurrentPrice(coinSymbol) {
    try {
      const symbol = this.symbols[coinSymbol];
      if (!symbol) {
        throw new Error(`Unsupported coin: ${coinSymbol}`);
      }

      const data = await this.makeRequest(`${this.baseUrl}/ticker/price`, {
        symbol: symbol
      });

      return {
        symbol: coinSymbol,
        price: parseFloat(data.price),
        currency: 'USD',
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Error fetching current price for ${coinSymbol}:`, error.message);
      throw new Error(`Failed to fetch price for ${coinSymbol}`);
    }
  }

  // Get current prices for all supported coins
  async getAllCurrentPrices() {
    try {
      const prices = await Promise.all(
        this.supportedCoins.map(coin => this.getCurrentPrice(coin))
      );
      return prices;
    } catch (error) {
      console.error('Error fetching all current prices:', error.message);
      throw new Error('Failed to fetch current prices');
    }
  }

  // Get candlestick (OHLC) data for a specific coin
  async getCandlestickData(coinSymbol, interval = '1d', limit = 100) {
    try {
      const symbol = this.symbols[coinSymbol];
      if (!symbol) {
        throw new Error(`Unsupported coin: ${coinSymbol}`);
      }

      const data = await this.makeRequest(`${this.baseUrl}/klines`, {
        symbol: symbol,
        interval: interval,
        limit: limit
      });

      const candlestickData = data.map(([openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignore]) => ({
        date: new Date(openTime),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
        symbol: coinSymbol
      }));

      return candlestickData.sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error(`Error fetching candlestick data for ${coinSymbol}:`, error.message);
      throw new Error(`Failed to fetch candlestick data for ${coinSymbol}`);
    }
  }

  // Get historical data for a specific coin
  async getHistoricalData(coinSymbol, startDate, endDate) {
    try {
      const symbol = this.symbols[coinSymbol];
      if (!symbol) {
        throw new Error(`Unsupported coin: ${coinSymbol}`);
      }

      // Convert dates to Unix timestamps
      const startTimestamp = new Date(startDate).getTime();
      const endTimestamp = new Date(endDate).getTime();

      const data = await this.makeRequest(`${this.baseUrl}/klines`, {
        symbol: symbol,
        interval: '1d', // Daily intervals
        startTime: startTimestamp,
        endTime: endTimestamp,
        limit: 1000
      });

      const historicalData = data.map(([timestamp, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignore]) => ({
        date: new Date(timestamp),
        price: parseFloat(close),
        symbol: coinSymbol
      }));

      return historicalData.sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error(`Error fetching historical data for ${coinSymbol}:`, error.message);
      throw new Error(`Failed to fetch historical data for ${coinSymbol}`);
    }
  }

  // Get historical data for the last N days
  async getHistoricalDataForDays(coinSymbol, days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getHistoricalData(
      coinSymbol,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }

  // Calculate Simple Moving Average
  calculateSMA(data, period) {
    if (data.length < period) {
      return null;
    }

    const sum = data.slice(-period).reduce((acc, item) => acc + item.price, 0);
    return sum / period;
  }

  // Calculate historical moving averages for chart plotting
  calculateHistoricalMovingAverages(data, periods = [5, 9, 15]) {
    if (!data || data.length === 0) {
      return [];
    }

    const result = [];
    const maxPeriod = Math.max(...periods);

    // Calculate moving averages for all data points
    for (let i = 0; i < data.length; i++) {
      const point = {
        date: data[i].date,
        close: data[i].price || data[i].close,
        movingAverages: {}
      };

      // Calculate moving average for each period
      periods.forEach(period => {
        if (i >= period - 1) {
          // We have enough data to calculate this moving average
          const startIndex = i - period + 1;
          const prices = data.slice(startIndex, i + 1).map(d => d.price || d.close);
          const sum = prices.reduce((acc, price) => acc + price, 0);
          point.movingAverages[period] = sum / period;
        } else {
          // Not enough data yet, set to null
          point.movingAverages[period] = null;
        }
      });

      result.push(point);
    }

    return result;
  }

  // Calculate moving averages from candlestick data for different timeframes
  calculateCandlestickMovingAverages(candlestickData, periods = [5, 9, 15]) {
    if (!candlestickData || candlestickData.length === 0) {
      return [];
    }

    const result = [];
    const maxPeriod = Math.max(...periods);

    // Calculate moving averages for all data points
    for (let i = 0; i < candlestickData.length; i++) {
      const point = {
        date: candlestickData[i].date,
        close: candlestickData[i].close,
        movingAverages: {}
      };

      // Calculate moving average for each period
      periods.forEach(period => {
        if (i >= period - 1) {
          // We have enough data to calculate this moving average
          const startIndex = i - period + 1;
          const prices = candlestickData.slice(startIndex, i + 1).map(d => d.close);
          const sum = prices.reduce((acc, price) => acc + price, 0);
          point.movingAverages[period] = sum / period;
        } else {
          // Not enough data yet, set to null
          point.movingAverages[period] = null;
        }
      });

      result.push(point);
    }

    return result;
  }

  // Get moving averages for a coin
  async getMovingAverages(coinSymbol, periods = [1, 2, 5, 9, 15]) {
    try {
      const maxPeriod = Math.max(...periods);
      const historicalData = await this.getHistoricalDataForDays(coinSymbol, maxPeriod + 10);

      const movingAverages = {};
      periods.forEach(period => {
        movingAverages[period] = this.calculateSMA(historicalData, period);
      });

      return {
        symbol: coinSymbol,
        movingAverages,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error calculating moving averages for ${coinSymbol}:`, error.message);
      throw new Error(`Failed to calculate moving averages for ${coinSymbol}`);
    }
  }

  // Get all moving averages for all supported coins
  async getAllMovingAverages(periods = [1, 2, 5, 9, 15]) {
    try {
      const results = await Promise.all(
        this.supportedCoins.map(coin => this.getMovingAverages(coin, periods))
      );
      return results;
    } catch (error) {
      console.error('Error fetching all moving averages:', error.message);
      throw new Error('Failed to fetch moving averages');
    }
  }

  // Get price alerts for stop loss and trailing stop
  async checkPriceAlerts(coinSymbol, stopLimit, trailingStopPct, highestPrice) {
    try {
      const currentPrice = await this.getCurrentPrice(coinSymbol);
      
      const alerts = {
        stopLossTriggered: false,
        trailingStopTriggered: false,
        currentPrice: currentPrice.price
      };

      // Check stop loss
      if (stopLimit && currentPrice.price <= stopLimit) {
        alerts.stopLossTriggered = true;
      }

      // Check trailing stop
      if (trailingStopPct && highestPrice) {
        const trailingStopPrice = highestPrice * (1 - trailingStopPct / 100);
        if (currentPrice.price <= trailingStopPrice) {
          alerts.trailingStopTriggered = true;
        }
      }

      return alerts;
    } catch (error) {
      console.error(`Error checking price alerts for ${coinSymbol}:`, error.message);
      throw new Error(`Failed to check price alerts for ${coinSymbol}`);
    }
  }
}

module.exports = new CryptoApiService(); 