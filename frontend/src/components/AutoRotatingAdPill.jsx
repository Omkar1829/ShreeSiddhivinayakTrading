import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

const ROTATING_ADS = [
  {
    id: 'tata',
    brand: 'TATA BRAND',
    detail: 'Chakki Atta & Tea',
    badge: '15% OFF',
    query: 'Tata',
    emoji: '🌾',
    theme: 'bg-amber-50 text-amber-900 border-amber-200'
  },
  {
    id: 'aishwarya',
    brand: 'AISHWARYA',
    detail: 'Wada Kolam Rice',
    badge: 'TOP SELLER',
    query: 'Aishwarya',
    emoji: '🍚',
    theme: 'bg-emerald-50 text-emerald-900 border-emerald-200'
  },
  {
    id: 'fortune',
    brand: 'FORTUNE',
    detail: 'Sunlite & Kachi Ghani',
    badge: 'HOT DEAL',
    query: 'Fortune',
    emoji: '🌻',
    theme: 'bg-orange-50 text-orange-900 border-orange-200'
  },
  {
    id: 'dryfruits',
    brand: 'DRY FRUITS',
    detail: 'Kaju & Badam Packs',
    badge: 'SAVE ₹50',
    query: 'Dry Fruits',
    emoji: '🥜',
    theme: 'bg-amber-50 text-amber-950 border-amber-300'
  },
  {
    id: 'under99',
    brand: 'UNDER ₹99',
    detail: 'Budget Kirana Store',
    badge: 'DEAL STORE',
    query: 'under99',
    emoji: '⚡',
    theme: 'bg-blue-50 text-blue-900 border-blue-200'
  }
];

export default function AutoRotatingAdPill({ onSelect, className = '' }) {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ROTATING_ADS.length);
        setIsTransitioning(false);
      }, 300);
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  const currentAd = ROTATING_ADS[index];

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect) {
      onSelect(currentAd.query);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`hidden sm:flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-orange-50/70 hover:from-amber-100 hover:to-orange-100 transition shadow-xs group shrink-0 cursor-pointer text-left select-none overflow-hidden h-9 ${className}`}
      title={`Explore ${currentAd.brand}`}
    >
      {/* Mini Visual Icon */}
      <span className="text-sm shrink-0 leading-none">{currentAd.emoji}</span>

      {/* Vertical Animated Content */}
      <div className="relative h-6 overflow-hidden flex flex-col justify-center min-w-[110px] max-w-[150px]">
        <div
          className={`transform transition-all duration-300 ease-out ${
            isTransitioning ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-black tracking-tight text-gray-900 uppercase truncate">
              {currentAd.brand}
            </span>
            <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500 text-white shrink-0">
              {currentAd.badge}
            </span>
          </div>
          <p className="text-[9px] text-gray-500 font-medium truncate mt-0.5 leading-none">
            {currentAd.detail}
          </p>
        </div>
      </div>

      <ArrowRight
        size={11}
        className="text-amber-700/60 group-hover:text-amber-800 group-hover:translate-x-0.5 transition shrink-0"
      />
    </button>
  );
}
