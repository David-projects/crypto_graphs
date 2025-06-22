import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, TrendingDown, Shield, Percent } from 'lucide-react';

const TradingForm = ({ selectedCoin, currentPrice, onTransactionComplete }) => {
  const [transactionType, setTransactionType] = useState('buy');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const quantity = watch('quantity');
  const price = watch('price_at_transaction');

  const onSubmit = async (data) => {
    if (!currentPrice) {
      toast.error('Current price not available');
      return;
    }

    setIsLoading(true);
    try {
      const transactionData = {
        coin_symbol: selectedCoin,
        type: transactionType,
        quantity: parseFloat(data.quantity),
        price_at_transaction: currentPrice,
        stop_limit: data.stop_limit ? parseFloat(data.stop_limit) : null,
        trailing_stop_pct: data.trailing_stop_pct ? parseFloat(data.trailing_stop_pct) : null,
      };

      const response = await axios.post('/api/crypto/transactions', transactionData);
      
      toast.success(`${transactionType.toUpperCase()} order placed successfully!`);
      reset();
      onTransactionComplete();
    } catch (error) {
      const message = error.response?.data?.error || 'Transaction failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!quantity || !currentPrice) return 0;
    return quantity * currentPrice;
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Trade {selectedCoin}</h3>
      </div>

      {/* Transaction Type Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
        <button
          type="button"
          onClick={() => setTransactionType('buy')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            transactionType === 'buy'
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Buy
        </button>
        <button
          type="button"
          onClick={() => setTransactionType('sell')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            transactionType === 'sell'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-gray-700 hover:text-gray-900'
          }`}
        >
          <TrendingDown className="w-4 h-4 inline mr-2" />
          Sell
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Current Price Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Current Price</span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </span>
          </div>
        </div>

        {/* Quantity Input */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            Quantity ({selectedCoin})
          </label>
          <input
            {...register('quantity', {
              required: 'Quantity is required',
              min: { value: 0.00000001, message: 'Quantity must be greater than 0' },
            })}
            type="number"
            step="0.00000001"
            id="quantity"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.quantity ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="0.00000000"
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
          )}
        </div>

        {/* Total Calculation */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Value</span>
            <span className="text-lg font-bold text-blue-900">
              {formatPrice(calculateTotal())}
            </span>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Shield className="w-4 h-4" />
            <span>Advanced Options</span>
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            {/* Stop Loss */}
            <div>
              <label htmlFor="stop_limit" className="block text-sm font-medium text-gray-700 mb-2">
                Stop Loss (USD)
              </label>
              <input
                {...register('stop_limit', {
                  min: { value: 0, message: 'Stop loss must be positive' },
                })}
                type="number"
                step="0.01"
                id="stop_limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
              <p className="mt-1 text-xs text-gray-500">
                Automatically sell when price drops to this level
              </p>
            </div>

            {/* Trailing Stop */}
            <div>
              <label htmlFor="trailing_stop_pct" className="block text-sm font-medium text-gray-700 mb-2">
                Trailing Stop (%)
              </label>
              <input
                {...register('trailing_stop_pct', {
                  min: { value: 0, message: 'Percentage must be positive' },
                  max: { value: 100, message: 'Percentage cannot exceed 100%' },
                })}
                type="number"
                step="0.1"
                id="trailing_stop_pct"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
              <p className="mt-1 text-xs text-gray-500">
                Automatically sell when price drops by this percentage from the highest reached
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !currentPrice}
          className={`w-full py-3 px-4 rounded-md text-sm font-medium text-white transition-colors ${
            transactionType === 'buy'
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <div className="loading-spinner mx-auto"></div>
          ) : (
            `${transactionType.toUpperCase()} ${selectedCoin}`
          )}
        </button>
      </form>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          This is a mock trading platform. No real money is involved.
        </p>
      </div>
    </div>
  );
};

export default TradingForm; 