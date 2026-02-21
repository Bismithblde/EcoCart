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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-serif relative overflow-hidden">
      {/* Magical Background Effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className="border-b border-purple-600/30 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-serif font-bold text-amber-300 drop-shadow-lg">
                HerbCart
              </h1>
              <p className="text-sm text-purple-300 italic">Sustainability Analysis Platform</p>
            </div>
            <div className="text-5xl animate-pulse">✨</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Input Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-serif font-bold text-amber-100 mb-4 drop-shadow-lg">
              Check Any Product's Sustainability
            </h2>
            <p className="text-xl text-purple-300 max-w-3xl mx-auto">
              Get instant environmental impact analysis and discover more sustainable alternatives
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 border-purple-600/50 rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-auto mb-12 backdrop-blur-sm">
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
              <h3 className="text-3xl font-serif font-bold text-amber-300 mb-2">
                � Better Alternatives Available
              </h3>
              <p className="text-purple-300">
                We found more sustainable options for you
              </p>
            </div>
            <BetterChoiceCard
              originalProduct="Conventional Cotton T-Shirt"
              originalScore={45}
              alternativeProduct="Organic Hemp Blend T-Shirt"
              alternativeScore={88}
              impactSaved="2.5kg of CO₂"
              impactType="co2"
              onViewProduct={() => alert('🪄 Apparition Spell Cast! Redirecting to product...')}
            />
          </section>
        )}

        {/* Features Section - Like Hogwarts Houses */}
        <section className="py-12">
          <h3 className="text-4xl font-serif font-bold text-amber-300 text-center mb-12 drop-shadow-lg">
            Why Choose HerbCart
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 border-2 border-emerald-600/50 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:border-emerald-500 backdrop-blur-sm">
              <div className="text-5xl mb-4">📊</div>
              <h4 className="text-2xl font-serif font-bold text-emerald-300 mb-3">
                Accurate Data
              </h4>
              <p className="text-emerald-200/90">
                Comprehensive sustainability scores based on verified environmental impact standards and research
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-950/60 to-purple-900/40 border-2 border-purple-600/50 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:border-purple-500 backdrop-blur-sm">
              <div className="text-5xl mb-4">💡</div>
              <h4 className="text-2xl font-serif font-bold text-purple-300 mb-3">
                Smart Alternatives
              </h4>
              <p className="text-purple-200/90">
                Discover better sustainable alternatives that maintain quality while reducing environmental impact
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-950/60 to-amber-900/40 border-2 border-amber-600/50 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all hover:border-amber-500 backdrop-blur-sm">
              <div className="text-5xl mb-4">🌱</div>
              <h4 className="text-2xl font-serif font-bold text-amber-300 mb-3">
                Measurable Impact
              </h4>
              <p className="text-amber-200/90">
                See exactly how much CO₂, water, and waste you save with each sustainable choice
              </p>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="mt-16 p-8 bg-gradient-to-r from-purple-950/50 to-slate-900/50 border-l-4 border-amber-500 rounded-lg">
          <p className="text-amber-200 text-center italic font-serif">
            Every sustainable choice matters. Start making a difference today.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-600/30 bg-slate-900/80 backdrop-blur-sm mt-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-purple-300 font-serif">
            © 2025 HerbCart. Making sustainability accessible to everyone.
          </p>
          <p className="text-purple-400/70 text-sm mt-2">
            Building a more sustainable world, one choice at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
