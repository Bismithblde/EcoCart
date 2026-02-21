'use client';

import { Wand2, Droplets, Package, Flame, Sparkles } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  color: 'purple' | 'green' | 'gold';
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
    purple: 'bg-purple-950/40 dark:bg-purple-900/40 border-purple-500/50 dark:border-purple-600 text-purple-300 dark:text-purple-200',
    green: 'bg-emerald-950/40 dark:bg-emerald-900/40 border-emerald-500/50 dark:border-emerald-600 text-emerald-300 dark:text-emerald-200',
    gold: 'bg-amber-950/40 dark:bg-amber-900/40 border-amber-500/50 dark:border-amber-600 text-amber-300 dark:text-amber-200',
  };

  const iconBgColor = {
    purple: 'bg-purple-900/60 border border-purple-600/50',
    green: 'bg-emerald-900/60 border border-emerald-600/50',
    gold: 'bg-amber-900/60 border border-amber-600/50',
  };

  return (
    <div className={`border rounded-xl p-6 backdrop-blur-sm ${colorClasses[color]}`}>
      <div className={`${iconBgColor[color]} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-75 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold font-serif">{value}</p>
        {unit && <p className="text-sm opacity-75">{unit}</p>}
      </div>
    </div>
  );
};

const MandrakeEcoScore: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Score levels
  let ringColor = '#10b981'; // emerald for good
  let scoreEmoji = '😊';
  let statusText = 'Fair';

  if (score >= 80) {
    ringColor = '#fbbf24'; // gold for excellent
    scoreEmoji = '🌟';
    statusText = 'Excellent';
  } else if (score >= 60) {
    ringColor = '#8b5cf6'; // purple for good
    scoreEmoji = '✓';
    statusText = 'Good';
  } else if (score >= 40) {
    ringColor = '#ec4899'; // pink for moderate
    scoreEmoji = '○';
    statusText = 'Moderate';
  } else {
    ringColor = '#ef4444'; // red for poor
    scoreEmoji = '⚠';
    statusText = 'Poor';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle with mystical glow */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-purple-900/50 dark:text-purple-800/50"
          />
          {/* Progress circle - magical glow */}
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
            className="transition-all duration-500 drop-shadow-lg"
            style={{
              filter: `drop-shadow(0 0 8px ${ringColor})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl mb-1">{scoreEmoji}</p>
          <p className="text-2xl font-bold text-amber-100 font-serif">{score}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-purple-200 font-serif text-sm">{statusText}</p>
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
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <p className="text-sm font-semibold text-amber-400 uppercase tracking-widest">Sustainability Analysis</p>
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-amber-100 drop-shadow-lg">{productName}</h2>
        <p className="text-purple-300 text-sm mt-2 italic">Environmental Impact Report</p>
      </div>

      {/* Grimoire-like Card */}
      <div className="bg-cyan-950/30 dark:bg-slate-900/80 border-2 border-purple-600/50 rounded-2xl shadow-2xl p-8 md:p-12 backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-900/10 before:to-emerald-900/10 before:rounded-2xl before:-z-10">
        {/* Eco-Score Section */}
        <div className="flex flex-col items-center mb-12 pb-8 border-b-2 border-purple-600/30">
          <MandrakeEcoScore score={ecoScore} />
          <p className="mt-6 text-center text-amber-100/90 max-w-md">
            {ecoScore >= 80
              ? 'Excellent choice! This product has a very low environmental impact.'
              : ecoScore >= 60
              ? 'Good choice! This product is reasonably sustainable.'
              : ecoScore >= 40
              ? 'Moderate impact. Consider exploring more sustainable alternatives.'
              : 'High environmental impact. We recommend looking for better alternatives.'}
          </p>
        </div>

        {/* Sustainability Metrics */}
        <div className="mb-8">
          <h3 className="text-xl font-serif font-bold text-amber-300 mb-6 flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Sustainability Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              icon={<Flame className="w-6 h-6" />}
              label="Carbon Footprint"
              value={carbonFootprint}
              color="purple"
            />
            <MetricCard
              icon={<Droplets className="w-6 h-6" />}
              label="Water Usage"
              value={waterUsage}
              color="green"
            />
            <MetricCard
              icon={<Package className="w-6 h-6" />}
              label="Packaging"
              value={packagingType}
              color="gold"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 flex-col sm:flex-row">
          <button className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-amber-50 font-serif font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-600/50 uppercase text-sm tracking-wide">
            Learn More
          </button>
          <button className="flex-1 px-6 py-3 border-2 border-purple-600/60 text-purple-200 hover:bg-purple-900/40 font-serif font-semibold rounded-lg transition-all duration-200 uppercase text-sm tracking-wide">
            Find Alternatives
          </button>
        </div>
      </div>
    </div>
  );
}
