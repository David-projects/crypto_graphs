const axios = require('axios');

class CryptoApiService {
  constructor() {
    this.baseUrl = process.env.COINDESK_API_URL || 'https://api.coindesk.com/v1';
    this.supportedCoins = ['BTC', 'ETH', 'XRP'];
  }

  // Get current price for a specific coin
  async getCurrentPrice(coinSymbol) {
    try {
      const response = await axios.get(`${this.baseUrl}/bpi/currentprice/${coinSymbol}.json`);
      return {
        symbol: coinSymbol,
        price: parseFloat(response.data.bpi[coinSymbol].rate.replace(',', '')),
        currency: response.data.bpi[coinSymbol].code,
        timestamp: new Date(response.data.time.updatedISO)
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

  // Get historical data for a specific coin
  async getHistoricalData(coinSymbol, startDate, endDate) {
    try {
      const response = await axios.get(`${this.baseUrl}/bpi/historical/close.json`, {
        params: {
          currency: coinSymbol,
          start: startDate,
          end: endDate
        }
      });

      const data = [];
      for (const [date, price] of Object.entries(response.data.bpi)) {
        data.push({
          date: new Date(date),
          price: parseFloat(price),
          symbol: coinSymbol
        });
      }

      return data.sort((a, b) => a.date - b.date);
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