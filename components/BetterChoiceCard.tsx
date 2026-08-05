'use client';

import { ListPlus } from 'lucide-react';

interface BetterChoiceCardProps {
  currentProduct: string;
  currentScore: number;
  betterProduct: string;
  betterBrand?: string;
  betterScore?: number;
  improvement: string;
  scoreDelta?: number;
  confidence?: 'low' | 'medium' | 'high';
  onAddToList?: () => void;
}

export default function BetterChoiceCard({ currentProduct, currentScore, betterProduct, betterBrand, betterScore, improvement, scoreDelta, confidence, onAddToList }: BetterChoiceCardProps) {
  return (
    <article className="grid grid-cols-1 border-2 border-[#111714] bg-[#fffdf5] text-[#111714] sm:grid-cols-12">
      <div className="p-4 sm:col-span-4 sm:p-5">
        <p className="font-mono text-[0.62rem] font-semibold">CURRENT / {currentScore}</p>
        <p className="mt-3 font-semibold leading-tight">{currentProduct}</p>
      </div>
      <div className="flex items-center justify-center border-y-2 border-[#111714] bg-[#d59a12] px-3 py-2 font-mono text-lg font-semibold sm:col-span-1 sm:border-x-2 sm:border-y-0">→</div>
      <div className="p-4 sm:col-span-7 sm:p-5">
        <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[0.62rem] font-semibold text-[#0d563f]">BETTER / {betterScore ?? 'REVIEW'}{typeof scoreDelta === 'number' ? ` / +${scoreDelta} POINTS` : ''}</p><h4 className="mt-2 text-xl font-semibold tracking-[-0.035em]">{betterProduct}</h4>{betterBrand ? <p className="mt-1 text-sm text-[#4c514b]">{betterBrand}</p> : null}{confidence ? <p className="mt-2 font-mono text-[0.58rem] font-semibold uppercase text-[#4c514b]">{confidence} confidence</p> : null}</div>{onAddToList ? <button type="button" onClick={onAddToList} className="shrink-0 border-2 border-[#111714] bg-[#0d563f] p-2.5 text-white transition-colors hover:bg-[#2148d8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2148d8]" aria-label={`Add ${betterProduct} to a list`}><ListPlus className="h-4 w-4" /></button> : null}</div>
        <p className="mt-4 border-t-2 border-[#0d563f] pt-3 text-sm leading-6">{improvement}</p>
      </div>
    </article>
  );
}
