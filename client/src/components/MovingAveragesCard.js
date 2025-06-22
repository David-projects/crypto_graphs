import React from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

const MovingAveragesCard = ({ movingAverages, coinSymbol }) => {
  if (!movingAverages) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Moving Averages</h3>
        </div>
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-500">Loading moving averages...</p>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getTrendIcon = (currentPrice, maPrice) => {
    if (!currentPrice || !maPrice) return null;
    if (currentPrice > maPrice) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (currentPrice < maPrice) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (currentPrice, maPrice) => {
    if (!currentPrice || !maPrice) return 'text-gray-500';
    if (currentPrice > maPrice) return 'text-green-600';
    if (currentPrice < maPrice) return 'text-red-600';
    return 'text-gray-500';
  };

  const periods = [1, 2, 5, 9, 15];
  const currentPrice = movingAverages.currentPrice || 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Moving Averages</h3>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Current Price</span>
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(currentPrice)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {periods.map((period) => {
          const maValue = movingAverages.movingAverages[period];
          const trendIcon = getTrendIcon(currentPrice, maValue);
          const trendColor = getTrendColor(currentPrice, maValue);

          return (
            <div key={period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{period}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {period} Day MA
                  </span>
                  <div className="flex items-center space-x-1">
                    {trendIcon}
                    <span className={`text-xs font-medium ${trendColor}`}>
                      {currentPrice > maValue ? 'Bullish' : currentPrice < maValue ? 'Bearish' : 'Neutral'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(maValue)}
                </div>
                {maValue && (
                  <div className={`text-xs ${trendColor}`}>
                    {currentPrice > maValue ? '+' : ''}
                    {((currentPrice - maValue) / maValue * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Last updated</span>
          <span>
            {new Date(movingAverages.lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MovingAveragesCard; 