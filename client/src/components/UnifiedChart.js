import React, { useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const UnifiedChart = ({ historicalData, candlestickData, historicalMovingAverages, showMovingAverages, coinSymbol, chartType, chartInterval = '1d' }) => {
  const [tooltip, setTooltip] = useState(null);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (date) => {
    const dateObj = new Date(date);
    
    // For intraday intervals, show time
    if (['1m', '5m', '15m', '1h', '4h'].includes(chartInterval)) {
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    // For daily intervals, show just date
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTooltipDate = (date) => {
    const dateObj = new Date(date);
    
    // For intraday intervals, show detailed time
    if (['1m', '5m', '15m', '1h', '4h'].includes(chartInterval)) {
      return dateObj.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
    
    // For daily intervals, show date
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCoinColor = (symbol) => {
    const colors = {
      BTC: '#f7931a',
      ETH: '#627eea',
      XRP: '#23292f',
    };
    return colors[symbol] || '#3b82f6';
  };

  // Helper to normalize a date to UTC midnight
  function normalizeToUTCDay(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }

  // Candlestick chart rendering
  const renderCandlestickChart = () => {
    if (!candlestickData || candlestickData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No candlestick data available</p>
        </div>
      );
    }

    // Align moving averages with candlestick data by UTC day
    const alignMovingAverages = () => {
      if (!showMovingAverages || !historicalMovingAverages || historicalMovingAverages.length === 0) {
        return [];
      }

      // For intraday intervals, we need to align by exact time
      // For daily intervals, we can align by UTC day
      const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(chartInterval);
      
      if (isIntraday) {
        // For intraday, align by exact date/time
        const maMap = new Map();
        historicalMovingAverages.forEach(point => {
          const dateKey = new Date(point.date).getTime();
          maMap.set(dateKey, point.movingAverages);
        });

        // Align moving averages with candlestick data by exact date
        return candlestickData.map(candle => {
          const dateKey = new Date(candle.date).getTime();
          return maMap.get(dateKey) || { 5: null, 9: null, 15: null };
        });
      } else {
        // For daily intervals, align by UTC day
        const maMap = new Map();
        historicalMovingAverages.forEach(point => {
          const day = normalizeToUTCDay(point.date);
          maMap.set(day, point.movingAverages);
        });

        // Align moving averages with candlestick data
        return candlestickData.map(candle => {
          const day = normalizeToUTCDay(candle.date);
          return maMap.get(day) || { 5: null, 9: null, 15: null };
        });
      }
    };

    const alignedMovingAverages = alignMovingAverages();

    // Calculate price range for proper scaling
    const priceRange = {
      min: Math.min(...candlestickData.map(d => d.low)),
      max: Math.max(...candlestickData.map(d => d.high))
    };

    // Include moving averages in price range calculation if they should be shown
    if (showMovingAverages && alignedMovingAverages && alignedMovingAverages.length > 0) {
      const maPrices = alignedMovingAverages.flatMap(point => 
        Object.values(point).filter(price => price !== null)
      );
      if (maPrices.length > 0) {
        priceRange.min = Math.min(priceRange.min, Math.min(...maPrices));
        priceRange.max = Math.max(priceRange.max, Math.max(...maPrices));
      }
    }

    const pricePadding = (priceRange.max - priceRange.min) * 0.05;
    const minPrice = priceRange.min - pricePadding;
    const maxPrice = priceRange.max + pricePadding;
    const priceRangeTotal = maxPrice - minPrice;

    // Chart dimensions
    const width = 1200; // Increased width for full screen
    const height = 400; // Increased height to accommodate volume
    const margin = { top: 20, right: 30, bottom: 80, left: 60 }; // Increased bottom margin for volume
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Volume chart dimensions
    const volumeHeight = 80; // Height for volume bars
    const priceChartHeight = chartHeight - volumeHeight - 20; // Remaining height for price chart

    // Calculate candlestick dimensions
    const candleWidth = Math.max(2, chartWidth / candlestickData.length * 0.8);
    const candleSpacing = chartWidth / candlestickData.length;

    // Helper function to convert price to Y coordinate
    const priceToY = (price) => {
      return margin.top + priceChartHeight - ((price - minPrice) / priceRangeTotal) * priceChartHeight;
    };

    // Helper function to convert index to X coordinate
    const indexToX = (index) => {
      return margin.left + index * candleSpacing + candleSpacing / 2;
    };

    // Calculate volume range for scaling
    const volumeRange = {
      min: 0,
      max: Math.max(...candlestickData.map(d => d.volume))
    };

    // Helper function to convert volume to Y coordinate for volume bars
    const volumeToY = (volume) => {
      const volumeY = margin.top + priceChartHeight + 20 + volumeHeight;
      return volumeY - (volume / volumeRange.max) * volumeHeight;
    };

    const CustomTooltip = ({ x, y, data }) => {
      if (!data) return null;
      
      return (
        <g>
          <rect
            x={x + 10}
            y={y - 100}
            width={120}
            height={120}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={1}
            rx={4}
            filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
          />
          <text x={x + 20} y={y - 80} fontSize="12" fontWeight="bold" fill="#374151">
            {formatTooltipDate(data.date)}
          </text>
          <text x={x + 20} y={y - 65} fontSize="10" fill="#6b7280">
            Open: <tspan fontWeight="500" fill="#374151">{formatPrice(data.open)}</tspan>
          </text>
          <text x={x + 20} y={y - 50} fontSize="10" fill="#6b7280">
            High: <tspan fontWeight="500" fill="#374151">{formatPrice(data.high)}</tspan>
          </text>
          <text x={x + 20} y={y - 35} fontSize="10" fill="#6b7280">
            Low: <tspan fontWeight="500" fill="#374151">{formatPrice(data.low)}</tspan>
          </text>
          <text x={x + 20} y={y - 20} fontSize="10" fill="#6b7280">
            Close: <tspan fontWeight="500" fill="#374151">{formatPrice(data.close)}</tspan>
          </text>
          <text x={x + 20} y={y - 5} fontSize="10" fill="#6b7280">
            Volume: <tspan fontWeight="500" fill="#374151">{data.volume?.toLocaleString() || 'N/A'}</tspan>
          </text>
        </g>
      );
    };

    return (
      <div className="h-full overflow-x-auto">
        <svg width={width} height={height} className="w-full h-full">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = margin.top + ratio * priceChartHeight;
            const price = maxPrice - ratio * priceRangeTotal;
            return (
              <g key={i}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + chartWidth}
                  y2={y}
                  stroke="#f3f4f6"
                  strokeWidth={1}
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {formatPrice(price)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {candlestickData.map((candle, index) => {
            const x = indexToX(index);
            const isGreen = candle.close >= candle.open;
            const bodyTop = priceToY(Math.max(candle.open, candle.close));
            const bodyBottom = priceToY(Math.min(candle.open, candle.close));
            const bodyHeight = Math.abs(bodyBottom - bodyTop);
            const wickTop = priceToY(candle.high);
            const wickBottom = priceToY(candle.low);
            
            const candleColor = isGreen ? '#10b981' : '#ef4444';
            const strokeColor = isGreen ? '#059669' : '#dc2626';

            return (
              <g
                key={index}
                onMouseEnter={() => setTooltip({ x, y: wickTop, data: candle })}
                onMouseLeave={() => setTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Wick */}
                <line
                  x1={x}
                  y1={wickTop}
                  x2={x}
                  y2={wickBottom}
                  stroke="#6b7280"
                  strokeWidth={1}
                />
                
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={Math.max(1, bodyHeight)}
                  fill={candleColor}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* Volume Bars */}
          {candlestickData.map((candle, index) => {
            const x = indexToX(index);
            const isGreen = candle.close >= candle.open;
            const volumeBarHeight = (candle.volume / volumeRange.max) * volumeHeight;
            const volumeBarY = margin.top + priceChartHeight + 20 + volumeHeight - volumeBarHeight;
            
            return (
              <rect
                key={`volume-${index}`}
                x={x - candleWidth / 2}
                y={volumeBarY}
                width={candleWidth}
                height={Math.max(1, volumeBarHeight)}
                fill={isGreen ? '#10b981' : '#ef4444'}
                opacity={0.6}
              />
            );
          })}

          {/* Volume Chart Border */}
          <rect
            x={margin.left}
            y={margin.top + priceChartHeight + 20}
            width={chartWidth}
            height={volumeHeight}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />

          {/* Volume Label */}
          <text
            x={margin.left - 10}
            y={margin.top + priceChartHeight + 20 + volumeHeight / 2}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
            transform={`rotate(-90 ${margin.left - 10} ${margin.top + priceChartHeight + 20 + volumeHeight / 2})`}
          >
            Volume
          </text>

          {/* Moving Average Lines */}
          {showMovingAverages && alignedMovingAverages && alignedMovingAverages.length > 0 && (
            <>
              {/* 5-day MA */}
              <path
                d={alignedMovingAverages
                  .map((point, index) => {
                    if (point[5] === null) return null;
                    const x = indexToX(index);
                    const y = priceToY(point[5]);
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .map((coord, index) => index === 0 ? `M ${coord}` : `L ${coord}`)
                  .join(' ')}
                stroke="#3b82f6"
                strokeWidth={2}
                fill="none"
                opacity={0.8}
              />
              
              {/* 9-day MA */}
              <path
                d={alignedMovingAverages
                  .map((point, index) => {
                    if (point[9] === null) return null;
                    const x = indexToX(index);
                    const y = priceToY(point[9]);
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .map((coord, index) => index === 0 ? `M ${coord}` : `L ${coord}`)
                  .join(' ')}
                stroke="#f59e0b"
                strokeWidth={2}
                fill="none"
                opacity={0.8}
              />
              
              {/* 15-day MA */}
              <path
                d={alignedMovingAverages
                  .map((point, index) => {
                    if (point[15] === null) return null;
                    const x = indexToX(index);
                    const y = priceToY(point[15]);
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .map((coord, index) => index === 0 ? `M ${coord}` : `L ${coord}`)
                  .join(' ')}
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="none"
                opacity={0.8}
              />
            </>
          )}

          {/* Tooltip */}
          {tooltip && <CustomTooltip {...tooltip} />}

          {/* Legend */}
          {showMovingAverages && alignedMovingAverages && alignedMovingAverages.length > 0 && (
            <g>
              <rect
                x={margin.left}
                y={margin.top - 15}
                width={200}
                height={60}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth={1}
                rx={4}
                opacity={0.9}
              />
              <text x={margin.left + 10} y={margin.top} fontSize="12" fontWeight="bold" fill="#374151">
                Moving Averages
              </text>
              <line x1={margin.left + 10} y1={margin.top + 5} x2={margin.left + 50} y2={margin.top + 5} stroke="#3b82f6" strokeWidth={2} />
              <text x={margin.left + 55} y={margin.top + 8} fontSize="10" fill="#374151">
                {['1m', '5m', '15m', '1h', '4h'].includes(chartInterval) ? '5-period MA' : '5-day MA'}
              </text>
              <line x1={margin.left + 10} y1={margin.top + 20} x2={margin.left + 50} y2={margin.top + 20} stroke="#f59e0b" strokeWidth={2} />
              <text x={margin.left + 55} y={margin.top + 23} fontSize="10" fill="#374151">
                {['1m', '5m', '15m', '1h', '4h'].includes(chartInterval) ? '9-period MA' : '9-day MA'}
              </text>
              <line x1={margin.left + 10} y1={margin.top + 35} x2={margin.left + 50} y2={margin.top + 35} stroke="#8b5cf6" strokeWidth={2} />
              <text x={margin.left + 55} y={margin.top + 38} fontSize="10" fill="#374151">
                {['1m', '5m', '15m', '1h', '4h'].includes(chartInterval) ? '15-period MA' : '15-day MA'}
              </text>
            </g>
          )}
        </svg>
      </div>
    );
  };

  // Line chart rendering
  const renderLineChart = () => {
    if (!historicalData || historicalData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">No historical data available</p>
        </div>
      );
    }

    // Combine historical data with moving averages if available
    const chartData = showMovingAverages && historicalMovingAverages && historicalMovingAverages.length > 0
      ? historicalMovingAverages.map(point => ({
          date: point.date,
          price: point.close,
          ma5: point.movingAverages[5] || null,
          ma9: point.movingAverages[9] || null,
          ma15: point.movingAverages[15] || null
        }))
      : historicalData.map(point => ({
          date: point.date,
          price: point.price
        }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
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
            formatter={(value, name) => {
              const isIntraday = ['1m', '5m', '15m', '1h', '4h'].includes(chartInterval);
              const labels = {
                price: 'Price',
                ma5: isIntraday ? '5-period MA' : '5-day MA',
                ma9: isIntraday ? '9-period MA' : '9-day MA',
                ma15: isIntraday ? '15-period MA' : '15-day MA'
              };
              return [formatPrice(value), labels[name] || name];
            }}
            labelFormatter={formatTooltipDate}
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
            stroke={getCoinColor(coinSymbol)}
            fill={`${getCoinColor(coinSymbol)}20`}
            strokeWidth={2}
          />
          {showMovingAverages && historicalMovingAverages && historicalMovingAverages.length > 0 && (
            <>
              <Area
                type="monotone"
                dataKey="ma5"
                stroke="#3b82f6"
                fill="none"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="ma9"
                stroke="#f59e0b"
                fill="none"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="ma15"
                stroke="#8b5cf6"
                fill="none"
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="h-full">
      {chartType === 'candlestick' ? renderCandlestickChart() : renderLineChart()}
    </div>
  );
};

export default UnifiedChart; 