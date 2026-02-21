'use client';

import { TrendingUp, CheckCircle } from 'lucide-react';

interface BetterChoiceCardProps {
  currentProduct: string;
  currentScore: number;
  betterProduct: string;
  betterScore: number;
  improvement: string;
}

export default function BetterChoiceCard({
  currentProduct,
  currentScore,
  betterProduct,
  betterScore,
  improvement,
}: BetterChoiceCardProps) {
  const scoreDifference = betterScore - currentScore;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-amber-600 dark:text-amber-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/50';
    if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/50';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/50';
    return 'bg-red-100 dark:bg-red-900/50';
  };

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Choice</p>
          <p className="font-semibold text-gray-900 dark:text-white">{currentProduct}</p>
          <div className={`inline-block mt-2 px-3 py-1 rounded-full font-bold ${getScoreColor(currentScore)} ${getScoreBgColor(currentScore)}`}>
            Score: {currentScore}
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 my-4 border border-green-100 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="font-semibold text-green-900 dark:text-green-300">Better Choice</p>
        </div>
        <p className="font-semibold text-gray-900 dark:text-white text-lg mb-2">{betterProduct}</p>
        <div className={`inline-block px-3 py-1 rounded-full font-bold ${getScoreColor(betterScore)} ${getScoreBgColor(betterScore)}`}>
          Score: {betterScore}
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 mt-2 font-semibold flex items-center gap-1">
          <span className="text-lg">↑</span> {improvement}
        </p>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">Switch to a more sustainable alternative</p>
    </div>
  );
}
