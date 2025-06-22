import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalUnrealizedPL, setTotalUnrealizedPL] = useState(0);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/crypto/portfolio');
      const portfolioData = response.data.portfolio;
      
      setPortfolio(portfolioData);
      
      // Calculate totals
      const total = portfolioData.reduce((sum, item) => sum + (item.current_value || 0), 0);
      const totalPL = portfolioData.reduce((sum, item) => sum + (item.unrealized_pl || 0), 0);
      
      setTotalValue(total);
      setTotalUnrealizedPL(totalPL);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getCoinColor = (symbol) => {
    const colors = {
      BTC: '#f7931a',
      ETH: '#627eea',
      XRP: '#23292f',
    };
    return colors[symbol] || '#3b82f6';
  };

  const getPLColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPLBgColor = (value) => {
    if (value > 0) return 'bg-green-50';
    if (value < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  // Prepare data for pie chart
  const pieChartData = portfolio
    .filter(item => item.current_value > 0)
    .map(item => ({
      name: item.coin_symbol,
      value: item.current_value,
      color: getCoinColor(item.coin_symbol),
    }));

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
        <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
        <p className="mt-2 text-gray-600">
          Track your cryptocurrency holdings and performance
        </p>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${getPLColor(totalUnrealizedPL)}`}>
                {formatPrice(totalUnrealizedPL)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Percent className="w-8 h-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Return</p>
              <p className={`text-2xl font-bold ${getPLColor(totalUnrealizedPL)}`}>
                {totalValue > 0 ? formatPercentage((totalUnrealizedPL / (totalValue - totalUnrealizedPL)) * 100) : '0.00%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Holdings List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
            </div>

            {portfolio.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No holdings yet</h3>
                <p className="text-gray-500">
                  Start trading to build your portfolio.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {portfolio.map((item) => (
                  <div key={item.coin_symbol} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: getCoinColor(item.coin_symbol) }}
                        >
                          <span className="text-white font-bold text-lg">
                            {item.coin_symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {item.coin_symbol}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {parseFloat(item.quantity).toFixed(8)} coins
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatPrice(item.current_value)}
                        </div>
                        <div className={`text-sm font-medium ${getPLColor(item.unrealized_pl)}`}>
                          {formatPrice(item.unrealized_pl)}
                        </div>
                        <div className={`text-xs ${getPLColor(item.unrealized_pl)}`}>
                          {item.avg_price > 0 ? formatPercentage(((item.current_price - item.avg_price) / item.avg_price) * 100) : '0.00%'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Avg Price:</span>
                        <div className="font-medium">{formatPrice(item.avg_price)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Price:</span>
                        <div className="font-medium">{formatPrice(item.current_price)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Allocation:</span>
                        <div className="font-medium">
                          {totalValue > 0 ? ((item.current_value / totalValue) * 100).toFixed(1) : '0'}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Chart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Allocation</h3>
            
            {pieChartData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No data to display</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatPrice(value), 'Value']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {pieChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-gray-600">
                    {formatPrice(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio; 