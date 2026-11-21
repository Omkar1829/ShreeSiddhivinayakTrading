import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setBrands, setCatalogLoading, setCatalogError } from '../store/catalogSlice';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import AutoRotatingAdPill from '../components/AutoRotatingAdPill';
import { calculatePricing } from '../utils/pricing';
import { formatStoreTime } from '../utils/formatTime';
import {
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  Phone,
  MessageSquare,
  Search,
  Award,
  Truck,
  MapPin,
  Clock,
  Flame
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories, brands, loading } = useSelector((state) => state.catalog);
  const storeSettings = useSelector((state) => state.store.settings);

  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Animated search placeholder cycling
  const searchPlaceholders = [
    'Search "toor dal"',
    'Search "wada kolam"',
    'Search "sunflower oil"',
    'Search "chakki atta"',
    'Search "amul butter"',
    'Search "dry fruits"'
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [searchPlaceholders.length]);

  const phone = storeSettings?.phone_number || '+918879279207';
  const whatsapp = storeSettings?.whatsapp_number || '+919833607049';
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

  const quickSearchTags = [
    { label: '🌾 Basmati Rice', query: 'Basmati Rice' },
    { label: '🫘 Toor Dal', query: 'Toor Dal' },
    { label: '🌻 Sunflower Oil', query: 'Sunflower Oil' },
    { label: '⚡ Under ₹99', query: 'under99', isSpecial: true },
    { label: '💎 Under ₹199', query: 'under199', isSpecial: true },
    { label: '🥜 Dry Fruits', query: 'Dry Fruits' }
  ];

  const getCategoryEmoji = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('rice') || lower.includes('grain')) return '🌾';
    if (lower.includes('dal') || lower.includes('pulse')) return '🫘';
    if (lower.includes('oil') || lower.includes('ghee')) return '🧈';
    if (lower.includes('flour') || lower.includes('atta')) return '🌾';
    if (lower.includes('spice') || lower.includes('masala')) return '🌶️';
    if (lower.includes('tea') || lower.includes('beverage')) return '🍵';
    if (lower.includes('dairy') || lower.includes('milk')) return '🥛';
    if (lower.includes('sugar') || lower.includes('salt')) return '🧂';
    if (lower.includes('dry fruit') || lower.includes('kaju') || lower.includes('badam')) return '🥜';
    if (lower.includes('snack') || lower.includes('biscuit')) return '🍪';
    return '🛒';
  };

  // 4 Core Promotional Banners (Staples & Categories only, NO 499 delivery ad, NO whatsapp order ad)
  const promoBanners = [
    {
      id: 'staples',
      badge: '🌾 Direct APMC Rates',
      title: 'Wholesale Kirana Staples',
      subtitle: 'Wada Kolam Rice, Pure Toor Dal & Fresh Atta sorted with zero adulteration',
      cta: 'Explore staples →',
      link: '/catalog?category=rice',
      gradient: 'from-[#064e3b] via-[#047857] to-[#022c22]',
      decorations: ['🌾', '🍚', '🫘']
    },
    {
      id: 'under99',
      badge: '⚡ Daily Budget Store',
      title: 'Under ₹99 Budget Store',
      subtitle: 'Daily spices, salt, sugar, biscuits & kitchen necessities under ₹99',
      cta: 'Shop Under ₹99 →',
      link: '/catalog?maxPrice=99',
      gradient: 'from-blue-700 via-indigo-700 to-blue-900',
      decorations: ['⚡', '🌶️', '🧂']
    },
    {
      id: 'dryfruits',
      badge: '🌰 100% Premium Grade',
      title: 'Dry fruits for the season',
      subtitle: 'Badam, kaju, akhrot, kismis — wholesale grade at honest prices',
      cta: 'Shop dry fruits →',
      link: '/catalog?search=dry+fruits',
      gradient: 'from-[#4a2810] via-[#5c3315] to-[#3a1d08]',
      decorations: ['🥜', '🌰', '🍇']
    },
    {
      id: 'oils',
      badge: '🧈 Purity Guaranteed',
      title: 'Pure Cooking Oils & Desi Ghee',
      subtitle: 'Fortune, Gemini, Dhara & Fresh Cow Ghee in family 1L & 5L packs',
      cta: 'Shop oils & ghee →',
      link: '/catalog?search=oil',
      gradient: 'from-amber-700 via-yellow-700 to-amber-900',
      decorations: ['🧈', '🌻', '🫒']
    }
  ];

  // Desktop carousel pairs (2 cards per slide)
  const desktopSlides = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < promoBanners.length; i += 2) {
      pairs.push([promoBanners[i], promoBanners[i + 1]]);
    }
    return pairs;
  }, [promoBanners]);

  // Auto-scroll banner carousel
  useEffect(() => {
    if (isCarouselHovered) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % promoBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isCarouselHovered, promoBanners.length]);

  // Load catalog categories, brands & products dynamically
  useEffect(() => {
    const loadHomeData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        const [catRes, brandRes, prodRes] = await Promise.all([
          api.get('/api/categories').catch(() => ({ data: { success: false } })),
          api.get('/api/brands').catch(() => ({ data: { success: false } })),
          api.get('/api/products?limit=60').catch(() => ({ data: { success: false } }))
        ]);

        if (catRes.data?.success) {
          dispatch(setCategories(catRes.data.categories));
        }

        if (brandRes.data?.success && brandRes.data.brands) {
          dispatch(setBrands(brandRes.data.brands));
        }

        if (prodRes.data?.success && prodRes.data.products) {
          setAllProducts(prodRes.data.products);
        }
      } catch (err) {
        dispatch(setCatalogError(err.message || 'Failed to fetch home catalog data.'));
      } finally {
        dispatch(setCatalogLoading(false));
      }
    };
    loadHomeData();
  }, [dispatch]);

  // 1. Curate Discounted / Deals Products
  const discountedProducts = useMemo(() => {
    if (!allProducts.length) return [];
    const withDiscounts = allProducts.filter((product) => {
      return (product.variants || []).some((v) => {
        const pricing = calculatePricing(
          v.price,
          v.mrp,
          product.id,
          storeSettings?.store_offers,
          v.id,
          storeSettings?.store_variant_offers
        );
        return pricing.hasDiscount && pricing.discountPercent > 0;
      });
    });

    if (withDiscounts.length < 4) {
      const seen = new Set(withDiscounts.map((p) => p.id));
      for (const p of allProducts) {
        if (!seen.has(p.id)) {
          withDiscounts.push(p);
          if (withDiscounts.length >= 6) break;
        }
      }
    }
    return withDiscounts.slice(0, 8);
  }, [allProducts, storeSettings]);

  // 2. Curate Under ₹99 Products
  const under99Products = useMemo(() => {
    if (!allProducts.length) return [];
    return allProducts
      .filter((product) =>
        product.variants?.some((v) => Number(v.price) <= 99 && v.status === 'ACTIVE')
      )
      .slice(0, 8);
  }, [allProducts]);

  // 3. Curate Under ₹199 Products
  const under199Products = useMemo(() => {
    if (!allProducts.length) return [];
    return allProducts
      .filter((product) =>
        product.variants?.some(
          (v) => Number(v.price) > 99 && Number(v.price) <= 199 && v.status === 'ACTIVE'
        )
      )
      .slice(0, 8);
  }, [allProducts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleBrandSelect = (brandQuery) => {
    navigate(`/catalog?brand=${encodeURIComponent(brandQuery)}`);
  };

  const handleTagClick = (query) => {
    if (query === 'under99') {
      navigate('/catalog?maxPrice=99');
    } else if (query === 'under199') {
      navigate('/catalog?minPrice=100&maxPrice=199');
    } else {
      navigate(`/catalog?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 pt-2 sm:pt-4">
      {/* 1. AUTO-SCROLLING PROMOTIONAL AD BANNER CAROUSEL (CLEAN RESPONSIVE MOBILE + DESKTOP) */}
      <section
        className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 relative"
        onMouseEnter={() => setIsCarouselHovered(true)}
        onMouseLeave={() => setIsCarouselHovered(false)}
      >
        {/* MOBILE CAROUSEL: 1 Single Compact Card per Slide (Zero Clipping / Stacking) */}
        <div className="block md:hidden overflow-hidden rounded-2xl shadow-sm">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {promoBanners.map((banner) => (
              <div key={banner.id} className="min-w-full flex-shrink-0">
                <div
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${banner.gradient} p-4 sm:p-5 text-white min-h-[145px] flex flex-col justify-between shadow-xs`}
                >
                  <div className="relative z-10 space-y-1">
                    <span className="inline-block rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {banner.badge}
                    </span>
                    <h2 className="text-lg font-black tracking-tight leading-snug">
                      {banner.title}
                    </h2>
                    <p className="text-[11px] text-white/90 font-medium line-clamp-2">
                      {banner.subtitle}
                    </p>
                  </div>

                  <div className="relative z-10 pt-2">
                    <Link
                      to={banner.link}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-gray-900 shadow-xs active:scale-95"
                    >
                      {banner.cta}
                    </Link>
                  </div>

                  {/* Decorative background icons */}
                  <div className="absolute -right-2 -bottom-2 text-6xl opacity-20 pointer-events-none select-none">
                    {banner.decorations[0]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Dot Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            {promoBanners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  activeSlide === i ? 'w-5 bg-emerald-700' : 'w-1.5 bg-gray-300'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* DESKTOP CAROUSEL: 2 Cards Side-by-Side per Slide */}
        <div className="hidden md:block relative overflow-hidden rounded-3xl shadow-sm">
          <div
            className="flex transition-transform duration-600 ease-in-out"
            style={{
              transform: `translateX(-${Math.floor(activeSlide / 2) * 100}%)`
            }}
          >
            {desktopSlides.map((slidePair, slideIdx) => (
              <div key={slideIdx} className="min-w-full flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  {slidePair.map((banner) => (
                    <div
                      key={banner.id}
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${banner.gradient} p-6 lg:p-8 text-white min-h-[175px] flex flex-col justify-between shadow-xs`}
                    >
                      <div className="relative z-10 max-w-sm space-y-1.5">
                        <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          {banner.badge}
                        </span>
                        <h2 className="text-xl lg:text-2xl font-black tracking-tight leading-tight">
                          {banner.title}
                        </h2>
                        <p className="text-xs lg:text-sm text-white/90 font-medium line-clamp-2">
                          {banner.subtitle}
                        </p>
                      </div>

                      <div className="relative z-10 pt-3">
                        <Link
                          to={banner.link}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-900 hover:bg-emerald-50 transition shadow-sm active:scale-95"
                        >
                          {banner.cta}
                        </Link>
                      </div>

                      {/* Decorative emojis */}
                      <div className="absolute -right-3 -bottom-3 text-7xl opacity-20 pointer-events-none select-none">
                        {banner.decorations[0]}
                      </div>
                      <div className="absolute right-14 top-4 text-3xl opacity-15 pointer-events-none select-none">
                        {banner.decorations[1]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Left/Right Arrows */}
          <button
            type="button"
            onClick={() =>
              setActiveSlide((prev) =>
                prev < 2 ? promoBanners.length - 2 : 0
              )
            }
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition shadow-md"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveSlide((prev) => (prev + 2) % promoBanners.length)
            }
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition shadow-md"
            aria-label="Next Slide"
          >
            <ChevronRight size={18} />
          </button>

          {/* Desktop Indicators */}
          <div className="flex items-center justify-center gap-2 mt-3.5">
            {desktopSlides.map((_, i) => {
              const isActive = Math.floor(activeSlide / 2) === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveSlide(i * 2)}
                  className={`transition-all duration-300 rounded-full h-1.5 ${
                    isActive ? 'w-7 bg-emerald-700' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. SEARCH BAR WITH DYNAMIC STORE BRANDS AD PILL */}
      <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-4xl mx-auto space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-2xl bg-white p-1 sm:p-1.5 shadow-sm border border-gray-200 hover:border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
              <Search className="ml-2.5 sm:ml-3 text-gray-400 shrink-0" size={18} />

              <input
                type="text"
                placeholder={searchPlaceholders[placeholderIndex]}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-0 bg-transparent py-1.5 sm:py-2 px-2 sm:px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-xs sm:text-sm font-semibold"
              />

              {/* Dynamic Store Brand Ad Ticker on Right */}
              <div className="flex items-center gap-1 sm:gap-2 pr-0.5 sm:pr-1 shrink-0">
                <span className="hidden sm:inline text-gray-200 select-none">|</span>

                {/* Strictly Dynamic Brands (NO hardcoded data) */}
                <AutoRotatingAdPill brands={brands} onSelect={handleBrandSelect} />

                <button
                  type="submit"
                  className="rounded-xl bg-primary-800 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-white hover:bg-primary-900 transition shadow-xs shrink-0"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Quick Search Chips: Sleek 1-Row Horizontal Scroll on Mobile, Wrapped on Desktop */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar sm:flex-wrap sm:justify-center py-0.5 px-0.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0 mr-0.5">
              Popular:
            </span>
            {quickSearchTags.map((tag) => (
              <button
                key={tag.query}
                type="button"
                onClick={() => handleTagClick(tag.query)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition border shrink-0 whitespace-nowrap ${
                  tag.isSpecial
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CURATED STORES & CATEGORY NAVIGATION STRIP */}
      <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            <span>Explore Stores & Categories</span>
          </h2>
          <Link
            to="/catalog"
            className="flex items-center gap-0.5 text-xs font-bold text-primary-850 hover:underline"
          >
            All Products <ChevronRight size={14} />
          </Link>
        </div>

        {/* Scrollable Category & Special Store Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* SPECIAL PILL: UNDER ₹99 BUDGET STORE */}
          <button
            type="button"
            onClick={() => navigate('/catalog?maxPrice=99')}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300/80 px-3.5 py-2.5 shadow-xs hover:border-blue-500 hover:shadow-md transition shrink-0 group text-left"
          >
            <span className="text-lg">⚡</span>
            <div>
              <span className="block font-black text-xs text-blue-900 group-hover:text-blue-950">
                Under ₹99 Store
              </span>
              <span className="block text-[9px] text-blue-700 font-bold">Daily Budget Staples</span>
            </div>
          </button>

          {/* SPECIAL PILL: UNDER ₹199 VALUE STORE */}
          <button
            type="button"
            onClick={() => navigate('/catalog?minPrice=100&maxPrice=199')}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 px-3.5 py-2.5 shadow-xs hover:border-emerald-500 hover:shadow-md transition shrink-0 group text-left"
          >
            <span className="text-lg">💎</span>
            <div>
              <span className="block font-black text-xs text-emerald-950 group-hover:text-emerald-900">
                Under ₹199 Store
              </span>
              <span className="block text-[9px] text-emerald-700 font-bold">Family Value Packs</span>
            </div>
          </button>

          {/* All Catalog Items */}
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-3.5 py-2.5 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group"
          >
            <span className="text-base">🛒</span>
            <div className="text-left">
              <span className="block font-bold text-xs text-gray-800 group-hover:text-primary-850">
                All Items
              </span>
              <span className="block text-[9px] text-gray-400 font-medium">Browse Entire Shop</span>
            </div>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/catalog?category=${cat.slug}`)}
              className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-3.5 py-2.5 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group text-left"
            >
              <span className="text-lg">{getCategoryEmoji(cat.name)}</span>
              <div>
                <span className="block font-bold text-xs text-gray-900 group-hover:text-primary-850 leading-tight">
                  {cat.name}
                </span>
                <span className="block text-[9px] text-gray-400 font-medium mt-0.5">
                  {cat.subcategories?.length > 0 ? `${cat.subcategories.length} varieties` : 'Fresh Staples'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. SECTION 1: DISCOUNTED OFFERS & STEAL DEALS (ZEPTO HANGING RIBBON) */}
      <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-700 font-black text-xs">
                <Flame size={13} className="text-amber-600 fill-amber-500" />
              </span>
              <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">
                Today's Steal Deals & Offers
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
              Handpicked Kirana savings with verified discount badges
            </p>
          </div>
          <Link
            to="/catalog?deals=true"
            className="text-xs font-bold text-primary-850 hover:underline transition flex items-center gap-0.5"
          >
            See All <ChevronRight size={14} />
          </Link>
        </div>

        {loading && discountedProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-60 rounded-2xl bg-white animate-pulse border border-gray-150"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. SECTION 2: UNDER ₹99 BUDGET STORE */}
      {under99Products.length > 0 && (
        <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 bg-blue-50/40 py-5 sm:py-6 rounded-2xl sm:rounded-3xl border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
                  ⚡
                </span>
                <h2 className="text-base sm:text-xl font-black text-blue-950 tracking-tight">
                  Under ₹99 Budget Store
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-700/80 mt-0.5 font-medium">
                Everyday kitchen necessities, cooking spices & daily staples under ₹99
              </p>
            </div>
            <Link
              to="/catalog?maxPrice=99"
              className="text-xs font-black text-blue-700 hover:text-blue-900 hover:underline transition flex items-center gap-0.5"
            >
              View All ({under99Products.length}+) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {under99Products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. SECTION 3: UNDER ₹199 FAMILY VALUE STORE */}
      {under199Products.length > 0 && (
        <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12 bg-emerald-50/40 py-5 sm:py-6 rounded-2xl sm:rounded-3xl border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-xs shadow-xs">
                  💎
                </span>
                <h2 className="text-base sm:text-xl font-black text-emerald-950 tracking-tight">
                  Under ₹199 Value Store
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-700/80 mt-0.5 font-medium">
                High-demand staple packs and family pantry essentials between ₹100 and ₹199
              </p>
            </div>
            <Link
              to="/catalog?minPrice=100&maxPrice=199"
              className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline transition flex items-center gap-0.5"
            >
              View All ({under199Products.length}+) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {under199Products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 7. DEDICATED ABOUT OUR SHOP & STORE DETAILS */}
      <section className="w-full px-3 sm:px-6 lg:px-8 xl:px-12">
        <div className="rounded-2xl sm:rounded-3xl bg-white border border-gray-200 p-5 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Story, Address & Hours */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] sm:text-[11px] font-black text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                <Award size={13} className="text-emerald-700" /> Panvel Kirana Merchant • Since 2007
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Shree Siddhivinayak Trading
              </h2>

              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed font-medium">
                Serving generations of Panvel families with authentic grains, unpolished pulses, pure edible oils, and daily groceries at APMC wholesale prices. Every pack is quality-inspected before it leaves our counter.
              </p>

              {/* Store Address & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-150">
                  <MapPin size={17} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-gray-500">Physical Store</span>
                    <p className="text-xs font-semibold text-gray-850 mt-0.5">
                      Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel - 410206
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-150">
                  <Clock size={17} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-bold uppercase text-gray-500">Operating Timings</span>
                    <p className="text-xs font-semibold text-gray-850 mt-0.5">
                      Open Daily (Mon - Sun): {formatStoreTime(storeSettings?.opening_time || '08:00')} - {formatStoreTime(storeSettings?.closing_time || '21:00')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Coverage */}
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-150">
                <Truck size={15} className="text-emerald-700 shrink-0" />
                <span>
                  <strong>Delivery Areas:</strong> Old Panvel, New Panvel, Khanda Colony, Karanjade, and Kamothe.
                </span>
              </div>
            </div>

            {/* 4 Key Pillars */}
            <div className="lg:col-span-5 bg-gradient-to-br from-gray-50 to-emerald-50/30 p-4 sm:p-5 rounded-2xl border border-gray-200 space-y-2.5">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
                Why Panvel Trusts Us
              </h3>

              <div className="space-y-2">
                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-base shrink-0">🌾</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Direct APMC Wholesale Rates</h4>
                    <p className="text-[10px] text-gray-500">Pass-through savings with no middleman markup</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-base shrink-0">🛡️</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Zero Adulteration Guarantee</h4>
                    <p className="text-[10px] text-gray-500">100% genuine brand packaging & hygienic storage</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-base shrink-0">⚡</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">2-Hour Express Dispatch</h4>
                    <p className="text-[10px] text-gray-500">Rapid local packing and doorstep delivery</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-base shrink-0">📱</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Easy WhatsApp Ration Orders</h4>
                    <p className="text-[10px] text-gray-500">Simply message your grocery list to our store</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. QUICK DIRECT ACTIONS: CALL OR WHATSAPP */}
      <section className="mx-auto max-w-3xl px-3 text-center space-y-3 pt-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Need Help or Placing a Custom Order?</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Need a quick delivery, special pack weight, or monthly ration order? Message or call our store team directly:
        </p>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-250 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            <Phone size={14} /> Call: {phone}
          </a>
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hi Shree Siddhivinayak Trading, I would like to order groceries.')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <MessageSquare size={14} /> WhatsApp Order
          </a>
        </div>
      </section>
    </div>
  );
}
