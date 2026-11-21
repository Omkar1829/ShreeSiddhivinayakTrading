import { useState, useEffect } from 'react';
import { ArrowRight, Tag } from 'lucide-react';

export default function AutoRotatingAdPill({ brands = [], onSelect, className = '' }) {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Filter only active brands
  const activeBrands = (brands || []).filter((b) => b && b.status !== 'INACTIVE' && b.name);

  useEffect(() => {
    if (activeBrands.length <= 1) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % activeBrands.length);
        setIsTransitioning(false);
      }, 300);
    }, 2800);

    return () => clearInterval(timer);
  }, [activeBrands.length]);

  // If the store has no brands configured, render nothing (strictly NO hardcoded dummy brands!)
  if (!activeBrands.length) {
    return null;
  }

  const currentBrand = activeBrands[index % activeBrands.length];

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect && currentBrand) {
      onSelect(currentBrand.slug || currentBrand.name);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-2.5 pr-2.5 sm:pr-3 py-1 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/95 to-orange-50/80 hover:from-amber-100 hover:to-orange-100 transition shadow-xs group shrink-0 cursor-pointer text-left select-none overflow-hidden h-8 sm:h-9 ${className}`}
      title={`Explore ${currentBrand.name} products`}
    >
      {/* Brand Logo or Initial Avatar */}
      {currentBrand.logoUrl ? (
        <img
          src={currentBrand.logoUrl}
          alt={currentBrand.name}
          className="h-5 w-5 rounded-md object-contain shrink-0"
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-200/80 text-amber-900 font-black text-[10px] shrink-0 uppercase">
          {currentBrand.name.charAt(0)}
        </span>
      )}

      {/* Vertical Animated Content */}
      <div className="relative h-5 sm:h-6 overflow-hidden flex flex-col justify-center min-w-[70px] sm:min-w-[100px] max-w-[110px] sm:max-w-[140px]">
        <div
          className={`transform transition-all duration-300 ease-out ${
            isTransitioning ? '-translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}
        >
          <div className="flex items-center gap-1 leading-none">
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight text-gray-900 uppercase truncate">
              {currentBrand.name}
            </span>
            <span className="hidden sm:inline-block text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-amber-500 text-white shrink-0">
              BRAND
            </span>
          </div>
          <p className="text-[8px] sm:text-[9px] text-gray-500 font-medium truncate mt-0.5 leading-none">
            {currentBrand.description || 'Verified Brand'}
          </p>
        </div>
      </div>

      <ArrowRight
        size={11}
        className="text-amber-700/60 group-hover:text-amber-800 group-hover:translate-x-0.5 transition shrink-0 hidden xs:block"
      />
    </button>
  );
}
