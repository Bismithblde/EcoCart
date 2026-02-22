'use client';

import { Wind, Droplets, Package, MessageSquare } from 'lucide-react';

interface Metrics {
  carbonFootprint: string;
  waterUsage: string;
  packaging: string;
}

interface SustainabilityDashboardProps {
  productName: string;
  ecoScore: number;
  metrics: Metrics;
  /** AI reasoning for the assessment (from sustainability/assess). */
  reasoning?: string;
  /** Verdict: good | moderate | poor */
  verdict?: 'good' | 'moderate' | 'poor';
}

function EcoScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };
  
  const getScoreText = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="mb-4">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fontSize="28"
          fontWeight="bold"
          fill={getColor()}
        >
          {score}
        </text>
      </svg>
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{getScoreText()}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">Sustainability Score</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg">
      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-gray-600 dark:text-gray-300">{label}</p>
        <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function SustainabilityDashboard({
  productName,
  ecoScore,
  metrics,
  reasoning,
  verdict,
}: SustainabilityDashboardProps) {
  const verdictLabel = verdict === 'good' ? 'Good' : verdict === 'moderate' ? 'Moderate' : verdict === 'poor' ? 'Poor' : null;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl border border-green-200 dark:border-green-800 p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Sustainability Analysis: {productName}
      </h2>

      {verdictLabel && (
        <p className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Verdict: <span className="capitalize">{verdictLabel}</span>
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex justify-center md:justify-start">
          <EcoScoreRing score={ecoScore} />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Environmental Impact
          </h3>
          <MetricCard
            icon={Wind}
            label="Carbon Footprint"
            value={metrics.carbonFootprint}
          />
          <MetricCard
            icon={Droplets}
            label="Water Usage"
            value={metrics.waterUsage}
          />
          <MetricCard
            icon={Package}
            label="Packaging"
            value={metrics.packaging}
          />
        </div>
      </div>

      {reasoning && (
        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex gap-3">
          <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Assessment</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{reasoning}</p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-semibold">Score Interpretation:</span> Products with higher eco-scores have lower environmental impact and are made with more sustainable practices.
        </p>
      </div>
    </div>
  );
}
