import React from 'react';

const CandlestickChart = ({ data, coinSymbol }) => {
  const [tooltip, setTooltip] = React.useState(null);

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

  function normalizeToDay(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Calculate price range for proper scaling
  const priceRange = {
    min: Math.min(...data.map(d => d.low)),
    max: Math.max(...data.map(d => d.high))
  };

  const pricePadding = (priceRange.max - priceRange.min) * 0.05;
  const minPrice = priceRange.min - pricePadding;
  const maxPrice = priceRange.max + pricePadding;
  const priceRangeTotal = maxPrice - minPrice;

  // Chart dimensions
  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate candlestick dimensions
  const candleWidth = Math.max(2, chartWidth / data.length * 0.8);
  const candleSpacing = chartWidth / data.length;

  // Helper function to convert price to Y coordinate
  const priceToY = (price) => {
    return margin.top + chartHeight - ((price - minPrice) / priceRangeTotal) * chartHeight;
  };

  // Helper function to convert index to X coordinate
  const indexToX = (index) => {
    return margin.left + index * candleSpacing + candleSpacing / 2;
  };

  const CustomTooltip = ({ x, y, data }) => {
    if (!data) return null;
    
    return (
      <g>
        <rect
          x={x + 10}
          y={y - 80}
          width={120}
          height={100}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth={1}
          rx={4}
          filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))"
        />
        <text x={x + 20} y={y - 60} fontSize="12" fontWeight="bold" fill="#374151">
          {formatDate(data.date)}
        </text>
        <text x={x + 20} y={y - 45} fontSize="10" fill="#6b7280">
          Open: <tspan fontWeight="500" fill="#374151">{formatPrice(data.open)}</tspan>
        </text>
        <text x={x + 20} y={y - 30} fontSize="10" fill="#6b7280">
          High: <tspan fontWeight="500" fill="#374151">{formatPrice(data.high)}</tspan>
        </text>
        <text x={x + 20} y={y - 15} fontSize="10" fill="#6b7280">
          Low: <tspan fontWeight="500" fill="#374151">{formatPrice(data.low)}</tspan>
        </text>
        <text x={x + 20} y={y} fontSize="10" fill="#6b7280">
          Close: <tspan fontWeight="500" fill="#374151">{formatPrice(data.close)}</tspan>
        </text>
      </g>
    );
  };

  const maMap = new Map();
  historicalMovingAverages.forEach(point => {
    const day = normalizeToDay(point.date);
    maMap.set(day, point.movingAverages);
  });

  const aligned = data.map(candle => {
    const day = normalizeToDay(candle.date);
    return maMap.get(day) || { 5: null, 9: null, 15: null };
  });

  return (
    <div className="h-80 overflow-x-auto">
      <svg width={width} height={height} className="w-full h-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = margin.top + ratio * chartHeight;
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
        {data.map((candle, index) => {
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

        {/* Tooltip */}
        {tooltip && <CustomTooltip {...tooltip} />}
      </svg>
    </div>
  );
};

export default CandlestickChart; 