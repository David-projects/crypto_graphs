import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import PriceCard from '../components/PriceCard';
import MovingAveragesCard from '../components/MovingAveragesCard';
import TradingForm from '../components/TradingForm';

const Dashboard = () => {
  const [prices, setPrices] = useState([]);
  const [movingAverages, setMovingAverages] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [timeframe, setTimeframe] = useState(30);
  const [loading, setLoading] = useState(true);
  const [showMovingAverages, setShowMovingAverages] = useState(true);

  const timeframes = [
    { value: 1, label: '1D' },
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
    { value: 90, label: '90D' },
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchPrices, 30000); // Update prices every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistoricalData();
  }, [selectedCoin, timeframe]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesRes, movingAveragesRes] = await Promise.all([
        axios.get('/api/crypto/prices'),
        axios.get('/api/crypto/moving-averages'),
      ]);
      
      setPrices(pricesRes.data.prices);
      setMovingAverages(movingAveragesRes.data.movingAverages);
      await fetchHistoricalData();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await axios.get('/api/crypto/prices');
      setPrices(response.data.prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const response = await axios.get(`/api/crypto/historical/${selectedCoin}?days=${timeframe}`);
      setHistoricalData(response.data.historicalData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  const getCoinColor = (symbol) => {
    const colors = {
      BTC: '#f7931a',
      ETH: '#627eea',
      XRP: '#23292f',
    };
    return colors[symbol] || '#3b82f6';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedCoin} Price Chart
                </h2>
                <p className="text-sm text-gray-500">
                  {timeframe} day historical data
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

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => [formatPrice(value), 'Price']}
                    labelFormatter={formatDate}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={getCoinColor(selectedCoin)}
                    fill={`${getCoinColor(selectedCoin)}20`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
    </div>
  );
};

export default Dashboard; 