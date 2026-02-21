'use client';

import { useState } from 'react';
import { Wand2 } from 'lucide-react';

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
          <label htmlFor="product-input" className="block text-sm font-serif font-semibold text-amber-300 mb-2 uppercase tracking-wide">
            Product Name
          </label>
          <input
            id="product-input"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g., Cotton T-Shirt, Plastic Water Bottle, Wool Sweater..."
            className="w-full px-4 py-3 rounded-lg border-2 border-purple-600/50 bg-slate-900/50 text-amber-50 placeholder-purple-400/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-serif backdrop-blur-sm"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !productName.trim()}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-amber-50 font-serif font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-600/50 uppercase text-sm tracking-widest"
        >
          <Wand2 className="w-4 h-4" />
          {isLoading ? 'Analyzing...' : 'Analyze Sustainability'}
        </button>
      </form>
    </div>
  );
}
