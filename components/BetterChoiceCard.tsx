'use client';

import { Wand2, TrendingDown, ArrowRight, Sparkles } from 'lucide-react';

interface BetterChoiceCardProps {
  originalProduct: string;
  originalScore: number;
  alternativeProduct: string;
  alternativeScore: number;
  impactSaved: string;
  impactType: 'co2' | 'water' | 'plastic' | 'waste';
  onViewProduct?: () => void;
}

const TransmutationBadge: React.FC<{ type: string; value: string }> = ({ type, value }) => {
  const typeConfig = {
    co2: {
      bg: 'bg-purple-950/40 border-purple-500/50',
      text: 'text-purple-200',
      icon: '💨',
      label: 'CO₂ Reduction',
    },
    water: {
      bg: 'bg-blue-950/40 border-blue-500/50',
      text: 'text-blue-200',
      icon: '💧',
      label: 'Water Saved',
    },
    plastic: {
      bg: 'bg-emerald-950/40 border-emerald-500/50',
      text: 'text-emerald-200',
      icon: '🪴',
      label: 'Plastic Reduction',
    },
    waste: {
      bg: 'bg-amber-950/40 border-amber-500/50',
      text: 'text-amber-200',
      icon: '✨',
      label: 'Waste Reduction',
    },
  };

  const config = typeConfig[type as keyof typeof typeConfig];

  return (
    <div className={`border-2 rounded-lg p-4 ${config.bg} ${config.text} border-opacity-50`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest opacity-75">{config.label}</p>
          <p className="text-3xl font-serif font-bold">{value}</p>
        </div>
        <p className="text-4xl">{config.icon}</p>
      </div>
    </div>
  );
};

const AlchemicalComparison: React.FC<{
  original: string;
  originalScore: number;
  alternative: string;
  alternativeScore: number;
}> = ({ original, originalScore, alternative, alternativeScore }) => {
  const scoreDiff = alternativeScore - originalScore;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Current Product */}
      <div className="bg-gradient-to-br from-red-950/60 to-red-900/40 rounded-lg p-6 border-2 border-red-600/40">
        <p className="text-xs font-semibold text-red-300 uppercase tracking-widest mb-2">Current Product</p>
        <p className="text-lg font-serif font-semibold text-red-100 mb-4">{original}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-red-950 rounded-full h-3 border border-red-700/50">
            <div
              className="bg-red-600 h-3 rounded-full shadow-lg shadow-red-600/50"
              style={{ width: `${originalScore}%` }}
            />
          </div>
          <p className="text-sm font-serif font-bold text-red-200 w-10">{originalScore}</p>
        </div>
      </div>

      {/* Better Alternative */}
      <div className="bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 rounded-lg p-6 border-2 border-emerald-500/40">
        <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-2">Better Alternative</p>
        <p className="text-lg font-serif font-semibold text-emerald-100 mb-4">{alternative}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-emerald-950 rounded-full h-3 border border-emerald-700/50">
            <div
              className="bg-emerald-500 h-3 rounded-full shadow-lg shadow-emerald-500/50"
              style={{ width: `${alternativeScore}%` }}
            />
          </div>
          <p className="text-sm font-serif font-bold text-emerald-200 w-10">{alternativeScore}</p>
        </div>
        {scoreDiff > 0 && (
          <div className="flex items-center gap-1 mt-3 text-emerald-300">
            <TrendingDown className="w-4 h-4" />
            <p className="text-xs font-semibold">+{scoreDiff} points more sustainable</p>
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
      <div className="bg-gradient-to-br from-slate-900/90 via-purple-900/50 to-slate-900/90 border-2 border-amber-600/50 rounded-2xl shadow-2xl p-8 md:p-10 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-purple-600/30">
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-3 rounded-lg">
            <Wand2 className="w-6 h-6 text-amber-100" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Smart Alternative</p>
            <p className="text-lg font-serif font-bold text-amber-100">More Sustainable Option</p>
          </div>
        </div>

        {/* Alchemical Comparison */}
        <AlchemicalComparison
          original={originalProduct}
          originalScore={originalScore}
          alternative={alternativeProduct}
          alternativeScore={alternativeScore}
        />

        {/* Impact Badge */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-widest mb-4">Environmental Impact</p>
          <TransmutationBadge type={impactType} value={impactSaved} />
        </div>

        {/* Benefits - Why This Choice Matters */}
        <div className="bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 rounded-lg p-6 mb-8 border-2 border-emerald-500/40">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-4">Why This Alternative</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center mt-0.5 shadow-lg shadow-emerald-600/50">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-emerald-200">Significantly lower environmental impact</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center mt-0.5 shadow-lg shadow-emerald-600/50">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-emerald-200">Made from sustainable or recycled materials</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center mt-0.5 shadow-lg shadow-emerald-600/50">
                <p className="text-xs text-white font-bold">✓</p>
              </div>
              <p className="text-sm text-emerald-200">Supports eco-conscious and ethical brands</p>
            </li>
          </ul>
        </div>

        {/* Call to Action Button */}
        <button
          onClick={onViewProduct}
          className="w-full px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 active:from-emerald-800 active:to-emerald-700 text-amber-50 font-serif font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-600/50 flex items-center justify-center gap-2 uppercase text-sm tracking-wide"
        >
          View Product
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Verification Badge */}
        <p className="text-xs text-purple-300/75 text-center mt-4 italic">
          Verified by certified sustainability standards
        </p>
      </div>
    </div>
  );
}
