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
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="product-input" className="block border-x-2 border-t-2 border-[#111714] bg-[#fffdf5] px-4 py-2 font-mono text-[0.68rem] font-semibold sm:border-r-0">
            PRODUCT / NAME OR BARCODE
          </label>
          <input
            id="product-input"
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Oat milk, shampoo, 0737628064502..."
            className="min-h-16 w-full border-2 border-[#111714] bg-white px-4 py-4 text-base text-[#111714] outline-none transition-colors placeholder:text-[#727873] focus:bg-[#dfeef2] focus:ring-2 focus:ring-inset focus:ring-[#2148d8] sm:border-r-0"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !productName.trim()}
          className="flex min-h-16 items-center justify-center gap-2 border-2 border-t-0 border-[#111714] bg-[#0d563f] px-7 py-4 font-semibold text-white transition-colors hover:bg-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 sm:self-end sm:border-t-2"
        >
          {isLoading && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isLoading ? 'Searching...' : 'Search'} <span aria-hidden="true">↗</span>
        </button>
      </form>
    </div>
  );
}
