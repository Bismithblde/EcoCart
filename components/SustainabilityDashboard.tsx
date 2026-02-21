'use client';

import { Leaf, Droplets, Package, Wind } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color: 'emerald' | 'lime' | 'stone';
}

interface SustainabilityDashboardProps {
  productName: string;
  ecoScore: number;
  carbonFootprint: string;
  waterUsage: string;
  packagingType: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, unit, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300',
    lime: 'bg-lime-50 dark:bg-lime-900/30 border-lime-200 dark:border-lime-700 text-lime-700 dark:text-lime-300',
    stone: 'bg-stone-50 dark:bg-stone-900/30 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300',
  };

  const iconBgColor = {
    emerald: 'bg-emerald-100 dark:bg-emerald-800/50',
    lime: 'bg-lime-100 dark:bg-lime-800/50',
    stone: 'bg-stone-100 dark:bg-stone-800/50',
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className={`${iconBgColor[color]} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-medium opacity-75 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold">{value}</p>
        {unit && <p className="text-sm opacity-75">{unit}</p>}
      </div>
    </div>
  );
};

const EcoScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color based on score
  let ringColor = '#22c55e'; // lime-500 for good score
  if (score >= 75) {
    ringColor = '#059669'; // emerald-600 for excellent
  } else if (score >= 50) {
    ringColor = '#84cc16'; // lime-500
  } else {
    ringColor = '#ea580c'; // orange for poor
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-stone-200 dark:text-stone-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{score}</p>
          <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">Eco-Score</p>
        </div>
      </div>
    </div>
  );
};

export default function SustainabilityDashboard({
  productName,
  ecoScore,
  carbonFootprint,
  waterUsage,
  packagingType,
}: SustainabilityDashboardProps) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Sustainability Analysis</p>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{productName}</h2>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
        {/* Eco-Score Section */}
        <div className="flex flex-col items-center mb-12 pb-8 border-b border-stone-200 dark:border-stone-700">
          <EcoScoreRing score={ecoScore} />
          <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
            {ecoScore >= 75
              ? '⭐ Excellent! This is a highly sustainable choice.'
              : ecoScore >= 50
              ? '👍 Good! This product has a reasonable environmental impact.'
              : '⚠️ Consider this product carefully. There may be better alternatives.'}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Environmental Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              icon={<Wind className="w-6 h-6" />}
              label="Carbon Footprint"
              value={carbonFootprint}
              color="emerald"
            />
            <MetricCard
              icon={<Droplets className="w-6 h-6" />}
              label="Water Usage"
              value={waterUsage}
              color="lime"
            />
            <MetricCard
              icon={<Package className="w-6 h-6" />}
              label="Packaging Type"
              value={packagingType}
              color="stone"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex gap-4 flex-col sm:flex-row">
          <button className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors duration-200">
            Learn More
          </button>
          <button className="flex-1 px-6 py-3 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 font-semibold rounded-lg transition-colors duration-200">
            See Alternatives
          </button>
        </div>
      </div>
    </div>
  );
}
