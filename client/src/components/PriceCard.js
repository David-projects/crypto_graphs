import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const PriceCard = ({ price, onClick, isSelected }) => {
  const [previousPrice, setPreviousPrice] = useState(price?.price);
  const [priceChange, setPriceChange] = useState(0);

  useEffect(() => {
    if (previousPrice && price?.price) {
      const change = ((price.price - previousPrice) / previousPrice) * 100;
      // Only update if the change is significant (more than 0.001% to avoid floating point issues)
      if (Math.abs(change) > 0.001) {
        setPriceChange(change);
      }
    }
    setPreviousPrice(price?.price);
  }, [price?.price, previousPrice]);

  const getCoinColor = (symbol) => {
    const colors = {
      BTC: '#f7931a',
      ETH: '#627eea',
      XRP: '#23292f',
    };
    return colors[symbol] || '#3b82f6';
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    // Show more decimal places for small changes to make them visible
    if (Math.abs(change) < 0.01) {
      return `${sign}${change.toFixed(4)}%`;
    } else if (Math.abs(change) < 0.1) {
      return `${sign}${change.toFixed(3)}%`;
    } else {
      return `${sign}${change.toFixed(2)}%`;
    }
  };

  const formatPriceDifference = (currentPrice, previousPrice) => {
    if (!currentPrice || !previousPrice) return '';
    const difference = currentPrice - previousPrice;
    const sign = difference >= 0 ? '+' : '';
    return `${sign}$${Math.abs(difference).toFixed(2)}`;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeBgColor = (change) => {
    if (change > 0) return 'bg-green-50';
    if (change < 0) return 'bg-red-50';
    return 'bg-gray-50';
  };

  if (!price) return null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getCoinColor(price.symbol) }}
            >
              <span className="text-white font-bold text-sm">
                {price.symbol.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {price.symbol}
              </h3>
              <p className="text-sm text-gray-500">Bitcoin</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(price.price)}
            </div>
            <div className={`text-sm font-medium ${getChangeColor(priceChange)}`}>
              {formatChange(priceChange)}
            </div>
            {previousPrice && price?.price && Math.abs(priceChange) > 0.001 && (
              <div className={`text-xs ${getChangeColor(priceChange)}`}>
                {formatPriceDifference(price.price, previousPrice)}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {priceChange > 0.001 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : priceChange < -0.001 ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : null}
            <span className={`text-sm font-medium ${getChangeColor(priceChange)}`}>
              {priceChange > 0.001 ? 'Up' : priceChange < -0.001 ? 'Down' : 'No change'}
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getChangeBgColor(priceChange)} ${getChangeColor(priceChange)}`}>
            {formatChange(priceChange)}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Last updated</span>
            <span>
              {new Date(price.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceCard; 