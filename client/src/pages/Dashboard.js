import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Activity, BarChart3, Clock } from 'lucide-react';
import PriceCard from '../components/PriceCard';
import MovingAveragesCard from '../components/MovingAveragesCard';
import TradingForm from '../components/TradingForm';
import UnifiedChart from '../components/UnifiedChart';

const Dashboard = () => {
  const [prices, setPrices] = useState([]);
  const [movingAverages, setMovingAverages] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [candlestickData, setCandlestickData] = useState([]);
  const [historicalMovingAverages, setHistoricalMovingAverages] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [timeframe, setTimeframe] = useState(30);
  const [chartInterval, setChartInterval] = useState('1d'); // New state for chart interval
  const [loading, setLoading] = useState(true);
  const [showMovingAverages, setShowMovingAverages] = useState(true);
  const [chartType, setChartType] = useState('line'); // 'line' or 'candlestick'
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const timeframes = [
    { value: 1, label: '1D' },
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
  ];

  // New timeframe intervals for candlestick charts
  const chartIntervals = [
    { value: '1m', label: '1m', description: '1 minute' },
    { value: '5m', label: '5m', description: '5 minutes' },
    { value: '15m', label: '15m', description: '15 minutes' },
    { value: '1h', label: '1h', description: '1 hour' },
    { value: '4h', label: '4h', description: '4 hours' },
    { value: '1d', label: '1d', description: '1 day' },
  ];

  // Calculate appropriate limit based on timeframe and interval
  const getLimitForTimeframe = (timeframe, interval) => {
    const intervalMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };
    
    const totalMinutes = timeframe * 24 * 60; // Convert days to minutes
    const intervalMin = intervalMinutes[interval] || 1440;
    
    return Math.min(Math.ceil(totalMinutes / intervalMin), 1000); // Max 1000 candles
  };

  const fetchHistoricalData = useCallback(async () => {
    try {
      const response = await axios.get(`/api/crypto/historical/${selectedCoin}?days=${timeframe}`);
      setHistoricalData(response.data.historicalData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  }, [selectedCoin, timeframe]);

  const fetchCandlestickData = useCallback(async () => {
    try {
      const limit = getLimitForTimeframe(timeframe, chartInterval);
      const response = await axios.get(`/api/crypto/candlesticks/${selectedCoin}?interval=${chartInterval}&limit=${limit}`);
      setCandlestickData(response.data.candlestickData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching candlestick data:', error);
    }
  }, [selectedCoin, timeframe, chartInterval]);

  const fetchCandlestickMovingAverages = useCallback(async () => {
    try {
      const limit = getLimitForTimeframe(timeframe, chartInterval);
      const response = await axios.get(`/api/crypto/candlestick-moving-averages/${selectedCoin}?interval=${chartInterval}&limit=${limit}&periods=5,9,15`);
      setHistoricalMovingAverages(response.data.candlestickMovingAverages);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching candlestick moving averages:', error);
    }
  }, [selectedCoin, timeframe, chartInterval]);

  const fetchHistoricalMovingAverages = useCallback(async () => {
    try {
      const response = await axios.get(`/api/crypto/historical-moving-averages/${selectedCoin}?days=${timeframe}&periods=5,9,15`);
      setHistoricalMovingAverages(response.data.historicalMovingAverages);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching historical moving averages:', error);
    }
  }, [selectedCoin, timeframe]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pricesRes, movingAveragesRes] = await Promise.all([
        axios.get('/api/crypto/prices'),
        axios.get('/api/crypto/moving-averages'),
      ]);
      
      setPrices(pricesRes.data.prices);
      setMovingAverages(movingAveragesRes.data.movingAverages);
      await fetchHistoricalData();
      await fetchCandlestickData();
      
      // Use candlestick-based moving averages for intraday charts
      const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(chartInterval);
      if (isIntraday) {
        await fetchCandlestickMovingAverages();
      } else {
        await fetchHistoricalMovingAverages();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchHistoricalData, fetchCandlestickData, fetchHistoricalMovingAverages, fetchCandlestickMovingAverages, chartInterval]);

  const fetchPrices = useCallback(async () => {
    try {
      const response = await axios.get('/api/crypto/prices');
      setPrices(response.data.prices);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Update all data every 30 seconds for more frequent updates
    const priceInterval = setInterval(fetchPrices, 30000);
    const candlestickInterval = setInterval(fetchCandlestickData, 30000);
    
    // Use appropriate moving average update based on interval
    const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(chartInterval);
    const movingAverageInterval = setInterval(
      isIntraday ? fetchCandlestickMovingAverages : fetchHistoricalMovingAverages, 
      30000
    );
    
    return () => {
      clearInterval(priceInterval);
      clearInterval(candlestickInterval);
      clearInterval(movingAverageInterval);
    };
  }, [fetchData, fetchPrices, fetchCandlestickData, fetchCandlestickMovingAverages, fetchHistoricalMovingAverages, chartInterval]);

  useEffect(() => {
    fetchHistoricalData();
    fetchCandlestickData();
    
    // Use appropriate moving average fetch based on interval
    const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(chartInterval);
    if (isIntraday) {
      fetchCandlestickMovingAverages();
    } else {
      fetchHistoricalMovingAverages();
    }
  }, [fetchHistoricalData, fetchCandlestickData, fetchCandlestickMovingAverages, fetchHistoricalMovingAverages, chartInterval]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Track cryptocurrency prices, analyze trends, and manage your portfolio
        </p>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {prices.map((price) => (
          <PriceCard
            key={price.symbol}
            price={price}
            onClick={() => setSelectedCoin(price.symbol)}
            isSelected={selectedCoin === price.symbol}
          />
        ))}
      </div>

      {/* Main Chart Section */}
      <div className="mb-8">
        {/* Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedCoin} Price Chart
              </h2>
              <p className="text-sm text-gray-500">
                {chartType === 'candlestick' 
                  ? `${timeframe} day historical data • ${chartIntervals.find(i => i.value === chartInterval)?.description} intervals`
                  : `${timeframe} day historical data`
                } • Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowMovingAverages(!showMovingAverages)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  showMovingAverages
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                MA
              </button>
              <button
                onClick={() => setChartType(chartType === 'line' ? 'candlestick' : 'line')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  chartType === 'candlestick'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                {chartType === 'line' ? 'Candles' : 'Line'}
              </button>
              
              {/* Interval selection for candlestick charts */}
              {chartType === 'candlestick' && (
                <div className="flex border border-gray-300 rounded-md">
                  {chartIntervals.map((interval) => (
                    <button
                      key={interval.value}
                      onClick={() => setChartInterval(interval.value)}
                      className={`px-3 py-1 text-sm transition-colors ${
                        chartInterval === interval.value
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={interval.description}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {interval.label}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Timeframe selection */}
              <div className="flex border border-gray-300 rounded-md">
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeframe(tf.value)}
                    className={`px-3 py-1 text-sm transition-colors ${
                      timeframe === tf.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-96">
            <UnifiedChart
              historicalData={historicalData}
              candlestickData={candlestickData}
              historicalMovingAverages={historicalMovingAverages}
              showMovingAverages={showMovingAverages}
              coinSymbol={selectedCoin}
              chartType={chartType}
              chartInterval={chartInterval}
            />
          </div>
        </div>
      </div>

      {/* Sidebar - Now below the chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moving Averages */}
        <MovingAveragesCard
          movingAverages={movingAverages.find(ma => ma.symbol === selectedCoin)}
          coinSymbol={selectedCoin}
        />

        {/* Trading Form */}
        <TradingForm
          selectedCoin={selectedCoin}
          currentPrice={prices.find(p => p.symbol === selectedCoin)?.price}
          onTransactionComplete={fetchData}
        />
      </div>
    </div>
  );
};

export default Dashboard; 