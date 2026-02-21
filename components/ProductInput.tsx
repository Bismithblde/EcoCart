'use client';

import { useState } from 'react';

interface ProductInputProps {
  onSubmit: (productName: string) => void;
  isLoading?: boolean;
}

export default function ProductInput({ onSubmit, isLoading = false }: ProductInputProps) {
  const [productName, setProductName] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (productName.trim()) {
      onSubmit(productName);
      setProductName('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="product-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Name
          </label>
          <input
            id="product-input"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter a product name (e.g., cotton t-shirt, plastic bottle)"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 transition-colors"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !productName.trim()}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
        >
          {isLoading ? 'Checking Sustainability...' : 'Check Sustainability'}
        </button>
      </form>
    </div>
  );
}
