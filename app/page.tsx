'use client';

import { useState } from 'react';
import ProductInput from '@/components/ProductInput';
import SustainabilityDashboard from '@/components/SustainabilityDashboard';
import BetterChoiceCard from '@/components/BetterChoiceCard';

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showBetterChoice, setShowBetterChoice] = useState(false);

  const handleProductSubmit = async (name: string) => {
    setShowDashboard(false);
    setShowBetterChoice(false);
    
    // Simulate API call
    setTimeout(() => {
      setShowDashboard(true);
    }, 800);
    
    setTimeout(() => {
      setShowBetterChoice(true);
    }, 1600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-lime-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-sans">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">EcoCart</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Sustainability Made Simple</p>
            </div>
            <div className="text-3xl">🌱</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Input Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Check Any Product's Sustainability
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get detailed environmental impact analysis and discover eco-friendly alternatives
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 max-w-2xl mx-auto mb-12">
            <ProductInput onSubmit={handleProductSubmit} />
          </div>
        </section>

        {/* Dashboard Section */}
        {showDashboard && (
          <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SustainabilityDashboard
              productName="Organic Cotton T-Shirt"
              ecoScore={82}
              carbonFootprint="Low"
              waterUsage="Minimal (500L)"
              packagingType="Biodegradable"
            />
          </section>
        )}

        {/* Better Choice Section */}
        {showBetterChoice && (
          <section className="mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                💡 Smarter Choices
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We found even more sustainable alternatives
              </p>
            </div>
            <BetterChoiceCard
              originalProduct="Conventional Cotton T-Shirt"
              originalScore={45}
              alternativeProduct="Organic Hemp Blend T-Shirt"
              alternativeScore={88}
              impactSaved="2.5kg of CO₂"
              impactType="co2"
              onViewProduct={() => alert('Navigating to product...')}
            />
          </section>
        )}

        {/* Features Section */}
        <section className="py-12">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            Why Choose EcoCart?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Accurate Metrics
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Get comprehensive sustainability scores based on certified data and environmental impact studies
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💡</div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Smart Recommendations
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Discover better alternatives that reduce your environmental footprint without compromising quality
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🌱</div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Make an Impact
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Every choice counts. See exactly how much you're helping the planet with each purchase
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2025 EcoCart. Making sustainability simple, one product at a time.</p>
        </div>
      </footer>
    </div>
  );
}
