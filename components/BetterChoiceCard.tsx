'use client';

import { Leaf, TrendingDown, ArrowRight } from 'lucide-react';

interface BetterChoiceCardProps {
  originalProduct: string;
  originalScore: number;
  alternativeProduct: string;
  alternativeScore: number;
  impactSaved: string;
  impactType: 'co2' | 'water' | 'plastic' | 'waste';
  onViewProduct?: () => void;
}

const ImpactBadge: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  const typeConfig = {
    co2: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-200 dark:border-emerald-700',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: '💨',
      label: 'CO₂ Saved',
    },
    water: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      icon: '💧',
      label: 'Water Saved',
    },
    plastic: {
      bg: 'bg-lime-50 dark:bg-lime-900/30',
      border: 'border-lime-200 dark:border-lime-700',
      text: 'text-lime-700 dark:text-lime-300',
      icon: '♻️',
      label: 'Plastic Reduced',
    },
    waste: {
      bg: 'bg-stone-50 dark:bg-stone-900/30',
      border: 'border-stone-200 dark:border-stone-700',
      text: 'text-stone-700 dark:text-stone-300',
      icon: '🌍',
      label: 'Waste Reduced',
    },
  };

  const config = typeConfig[type as keyof typeof typeConfig];

  return (
    <div className={`border rounded-lg p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium opacity-75 ${config.text}`}>{config.label}</p>
          <p className={`text-2xl font-bold ${config.text}`}>{value}</p>
        </div>
        <p className="text-3xl">{config.icon}</p>
      </div>
    </div>
  );
};

const ProductComparison: React.FC<{
  original: string;
  originalScore: number;
  alternative: string;
  alternativeScore: number;
}> = ({ original, originalScore, alternative, alternativeScore }) => {
  const scoreDiff = alternativeScore - originalScore;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Original Product */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Current Product</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{original}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-300 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${originalScore}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-10">{originalScore}</p>
        </div>
      </div>

      {/* Alternative Product */}
      <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-6 border border-emerald-200 dark:border-emerald-700">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">✨ Better Choice</p>
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-4">{alternative}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-emerald-300 dark:bg-emerald-600 rounded-full h-2">
            <div
              className="bg-emerald-600 dark:bg-emerald-400 h-2 rounded-full"
              style={{ width: `${alternativeScore}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 w-10">{alternativeScore}</p>
        </div>
        {scoreDiff > 0 && (
          <div className="flex items-center gap-1 mt-3 text-emerald-700 dark:text-emerald-300">
            <TrendingDown className="w-4 h-4" />
            <p className="text-xs font-medium">+{scoreDiff} points better</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BetterChoiceCard({
  originalProduct,
  originalScore,
  alternativeProduct,
  alternativeScore,
  impactSaved,
  impactType,
  onViewProduct,
}: BetterChoiceCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-stone-200 dark:border-stone-700">
          <div className="bg-lime-100 dark:bg-lime-900/30 p-3 rounded-lg">
            <Leaf className="w-6 h-6 text-lime-600 dark:text-lime-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-lime-600 dark:text-lime-400">Smart Swap</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">Find a Better Alternative</p>
          </div>
        </div>

        {/* Product Comparison */}
        <ProductComparison
          original={originalProduct}
          originalScore={originalScore}
          alternative={alternativeProduct}
          alternativeScore={alternativeScore}
        />

        {/* Impact Badge */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Environmental Impact</p>
          <ImpactBadge type={impactType} value={impactSaved} />
        </div>

        {/* Benefits List */}
        <div className="bg-lime-50 dark:bg-lime-900/20 rounded-lg p-6 mb-8 border border-lime-200 dark:border-lime-800/50">
          <p className="text-sm font-semibold text-lime-900 dark:text-lime-200 mb-4">Why This Swap Matters</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-600 flex items-center justify-center mt-0.5">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-lime-900 dark:text-lime-100">Significantly lower environmental impact</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-600 flex items-center justify-center mt-0.5">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-lime-900 dark:text-lime-100">Made from sustainable materials</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-lime-600 flex items-center justify-center mt-0.5">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-lime-900 dark:text-lime-100">Supports eco-conscious brands</p>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={onViewProduct}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          View Product
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Trust Badge */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          Based on verified sustainability data from certified sources
        </p>
      </div>
    </div>
  );
}
