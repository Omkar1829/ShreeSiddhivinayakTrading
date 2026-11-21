import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setCatalogLoading, setCatalogError } from '../store/catalogSlice';
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
  ShieldCheck,
  Truck,
  Sparkles,
  Star,
  MapPin,
  Clock,
  Tag,
  Flame,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories, loading } = useSelector((state) => state.catalog);
  const storeSettings = useSelector((state) => state.store.settings);

  const [searchTerm, setSearchTerm] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Animated search placeholder cycling
  const searchPlaceholders = [
    'Search "toor dal"',
    'Search "aishwarya kolam"',
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

  // Promo Banners (Slide pairs for Desktop, single card for Mobile)
  const promoBanners = [
    {
      id: 1,
      card1: {
        badge: '⚡ Panvel Express Delivery',
        title: 'FREE delivery on ₹499+',
        subtitle: 'Same-day doorstep delivery slots across central Panvel & New Panvel',
        cta: 'Start shopping →',
        link: '/catalog',
        gradient: 'from-amber-600 via-orange-600 to-amber-700',
        decorations: ['🛵', '🛒', '📦']
      },
      card2: {
        badge: '🌰 100% Premium Grade',
        title: 'Dry fruits for the season',
        subtitle: 'Badam, kaju, akhrot, kismis — wholesale grade at honest prices',
        cta: 'Shop dry fruits →',
        link: '/catalog?search=dry+fruits',
        gradient: 'from-[#4a2810] via-[#5c3315] to-[#3a1d08]',
        decorations: ['🥜', '🌰', '🍇']
      }
    },
    {
      id: 2,
      card1: {
        badge: '🌾 Direct APMC Rates',
        title: 'Wholesale Kirana Staples',
        subtitle: 'Wada Kolam Rice, Pure Toor Dal & Fresh Atta sorted with zero adulteration',
        cta: 'Explore staples →',
        link: '/catalog?category=rice',
        gradient: 'from-[#064e3b] via-[#047857] to-[#022c22]',
        decorations: ['🌾', '🍚', '🫘']
      },
      card2: {
        badge: '⚡ Daily Budget Store',
        title: 'Under ₹99 Budget Store',
        subtitle: 'Daily spices, salt, sugar, biscuits & kitchen necessities under ₹99',
        cta: 'Shop Under ₹99 →',
        link: '/catalog?maxPrice=99',
        gradient: 'from-blue-700 via-indigo-700 to-blue-900',
        decorations: ['⚡', '🌶️', '🧂']
      }
    },
    {
      id: 3,
      card1: {
        badge: '🧈 Purity Guaranteed',
        title: 'Pure Cooking Oils & Desi Ghee',
        subtitle: 'Fortune, Gemini, Dhara & Fresh Cow Ghee in family 1L & 5L packs',
        cta: 'Shop oils & ghee →',
        link: '/catalog?search=oil',
        gradient: 'from-amber-700 via-yellow-700 to-amber-900',
        decorations: ['🧈', '🌻', '🫒']
      },
      card2: {
        badge: '📱 1-Tap Easy Ordering',
        title: 'Order by WhatsApp List',
        subtitle: 'Send a picture of your handwritten ration list — we pack and deliver home!',
        cta: 'WhatsApp Us Now →',
        isWhatsapp: true,
        gradient: 'from-emerald-800 via-teal-800 to-emerald-950',
        decorations: ['📱', '💬', '🚚']
      }
    }
  ];

  // Auto-scroll banner carousel
  useEffect(() => {
    if (isCarouselHovered) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % promoBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isCarouselHovered, promoBanners.length]);

  // Load catalog data
  useEffect(() => {
    const loadHomeData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        const catRes = await api.get('/api/categories');
        if (catRes.data.success) {
          dispatch(setCategories(catRes.data.categories));
        }

        // Fetch products to curate into Deals, Under ₹99, Under ₹199
        const prodRes = await api.get('/api/products?limit=60');
        if (prodRes.data.success) {
          setAllProducts(prodRes.data.products || []);
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
      const v = product.variants?.[0];
      if (!v) return false;
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

    // If few items have explicit discounts, backfill with first few products to keep section lively
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

  const handleRotatingAdSelect = (query) => {
    if (query === 'under99') {
      navigate('/catalog?maxPrice=99');
    } else if (query === 'under199') {
      navigate('/catalog?minPrice=100&maxPrice=199');
    } else {
      navigate(`/catalog?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. TOP FREE DELIVERY ANNOUNCEMENT STRIP */}
      <div className="bg-emerald-950 text-emerald-200 text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2 border-b border-emerald-900/60">
        <Truck size={14} className="text-emerald-400 shrink-0" />
        <span>⚡ Free Doorstep Delivery across Panvel on orders above ₹499 • Open daily 8:00 AM - 9:00 PM</span>
      </div>

      {/* 2. AUTO-SCROLLING PROMOTIONAL AD BANNER CAROUSEL (REPLACES STATIC DARK HERO) */}
      <section
        className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 relative"
        onMouseEnter={() => setIsCarouselHovered(true)}
        onMouseLeave={() => setIsCarouselHovered(false)}
      >
        <div className="relative overflow-hidden rounded-3xl shadow-sm">
          {/* Slides Container */}
          <div
            className="flex transition-transform duration-600 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {promoBanners.map((slide) => (
              <div key={slide.id} className="min-w-full flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Banner Card 1 */}
                  <div
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${slide.card1.gradient} p-6 sm:p-8 text-white min-h-[170px] sm:min-h-[190px] flex flex-col justify-between shadow-sm`}
                  >
                    <div className="relative z-10 max-w-sm space-y-2">
                      <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                        {slide.card1.badge}
                      </span>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                        {slide.card1.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-white/90 font-medium line-clamp-2">
                        {slide.card1.subtitle}
                      </p>
                    </div>

                    <div className="relative z-10 pt-3">
                      <Link
                        to={slide.card1.link}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-900 hover:bg-emerald-50 transition shadow-sm active:scale-95"
                      >
                        {slide.card1.cta}
                      </Link>
                    </div>

                    {/* Subtle 3D-style decorative background emojis */}
                    <div className="absolute -right-4 -bottom-4 text-7xl sm:text-8xl opacity-20 pointer-events-none select-none">
                      {slide.card1.decorations[0]}
                    </div>
                    <div className="absolute right-16 top-4 text-4xl opacity-15 pointer-events-none select-none">
                      {slide.card1.decorations[1]}
                    </div>
                  </div>

                  {/* Banner Card 2 */}
                  <div
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${slide.card2.gradient} p-6 sm:p-8 text-white min-h-[170px] sm:min-h-[190px] flex flex-col justify-between shadow-sm`}
                  >
                    <div className="relative z-10 max-w-sm space-y-2">
                      <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                        {slide.card2.badge}
                      </span>
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                        {slide.card2.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-white/90 font-medium line-clamp-2">
                        {slide.card2.subtitle}
                      </p>
                    </div>

                    <div className="relative z-10 pt-3">
                      {slide.card2.isWhatsapp ? (
                        <a
                          href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hi Shree Siddhivinayak Trading, I would like to place an order for groceries.')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-900 hover:bg-emerald-50 transition shadow-sm active:scale-95"
                        >
                          <MessageSquare size={13} className="text-emerald-600" /> {slide.card2.cta}
                        </a>
                      ) : (
                        <Link
                          to={slide.card2.link}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-900 hover:bg-emerald-50 transition shadow-sm active:scale-95"
                        >
                          {slide.card2.cta}
                        </Link>
                      )}
                    </div>

                    {/* Decorative emojis */}
                    <div className="absolute -right-4 -bottom-4 text-7xl sm:text-8xl opacity-20 pointer-events-none select-none">
                      {slide.card2.decorations[0]}
                    </div>
                    <div className="absolute right-16 top-4 text-4xl opacity-15 pointer-events-none select-none">
                      {slide.card2.decorations[1]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Left / Right Chevron Controls (Desktop) */}
          <button
            type="button"
            onClick={() =>
              setActiveSlide((prev) => (prev === 0 ? promoBanners.length - 1 : prev - 1))
            }
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition shadow-md"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev + 1) % promoBanners.length)}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition shadow-md"
            aria-label="Next Slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Carousel Indicators (Zepto-style Pill & Dots) */}
        <div className="flex items-center justify-center gap-2 mt-3.5">
          {promoBanners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveSlide(i)}
              className={`transition-all duration-300 rounded-full h-1.5 ${
                activeSlide === i ? 'w-7 bg-emerald-700' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 3. SEARCH BAR WITH AUTO-ROTATING VERTICAL AD PILL (MATCHING SCREENSHOT) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-4xl mx-auto space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center rounded-2xl bg-white p-1.5 shadow-md border border-gray-200 hover:border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition">
              <Search className="ml-3 text-gray-400 shrink-0" size={19} />
              
              <input
                type="text"
                placeholder={searchPlaceholders[placeholderIndex]}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-0 bg-transparent py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-xs sm:text-sm font-semibold"
              />

              {/* Divider & Auto-Rotating Mini Ad Pill on Right */}
              <div className="flex items-center gap-2 pr-1 shrink-0">
                <span className="hidden sm:inline text-gray-300 select-none">|</span>
                
                <AutoRotatingAdPill onSelect={handleRotatingAdSelect} />

                <button
                  type="submit"
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900 transition shadow-xs shrink-0"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">
              Popular:
            </span>
            {quickSearchTags.map((tag) => (
              <button
                key={tag.query}
                type="button"
                onClick={() => handleRotatingAdSelect(tag.query)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition border ${
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

      {/* 4. CURATED STORES & CATEGORY NAVIGATION STRIP (INCLUDING UNDER ₹99 & UNDER ₹199) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-1.5">
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
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {/* SPECIAL PILL: UNDER ₹99 BUDGET STORE */}
          <button
            type="button"
            onClick={() => navigate('/catalog?maxPrice=99')}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300/80 px-4 py-3 shadow-xs hover:border-blue-500 hover:shadow-md transition shrink-0 group text-left"
          >
            <span className="text-xl">⚡</span>
            <div>
              <span className="block font-black text-xs text-blue-900 group-hover:text-blue-950">
                Under ₹99 Store
              </span>
              <span className="block text-[10px] text-blue-700/80 font-bold">Daily Budget Staples</span>
            </div>
          </button>

          {/* SPECIAL PILL: UNDER ₹199 VALUE STORE */}
          <button
            type="button"
            onClick={() => navigate('/catalog?minPrice=100&maxPrice=199')}
            className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 px-4 py-3 shadow-xs hover:border-emerald-500 hover:shadow-md transition shrink-0 group text-left"
          >
            <span className="text-xl">💎</span>
            <div>
              <span className="block font-black text-xs text-emerald-950 group-hover:text-emerald-900">
                Under ₹199 Store
              </span>
              <span className="block text-[10px] text-emerald-700 font-bold">Family Value Packs</span>
            </div>
          </button>

          {/* All Catalog Items */}
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group"
          >
            <span className="text-lg">🛒</span>
            <div className="text-left">
              <span className="block font-bold text-xs text-gray-800 group-hover:text-primary-850">
                All Items
              </span>
              <span className="block text-[10px] text-gray-400 font-medium">Browse Entire Shop</span>
            </div>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/catalog?category=${cat.slug}`)}
              className="flex items-center gap-2.5 rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group text-left"
            >
              <span className="text-xl">{getCategoryEmoji(cat.name)}</span>
              <div>
                <span className="block font-bold text-xs text-gray-900 group-hover:text-primary-850 leading-tight">
                  {cat.name}
                </span>
                <span className="block text-[10px] text-gray-400 font-medium mt-0.5">
                  {cat.subcategories?.length > 0 ? `${cat.subcategories.length} varieties` : 'Fresh Staples'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. SECTION 1: DISCOUNTED OFFERS & STEAL DEALS (ZEPTO HANGING RIBBON) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-100 text-amber-700 font-black text-xs">
                <Flame size={14} className="text-amber-600 fill-amber-500" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Today's Steal Deals & Offers
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Handpicked Kirana savings with verified discount badges
            </p>
          </div>
          <Link
            to="/catalog?deals=true"
            className="text-xs font-bold text-primary-850 hover:underline transition flex items-center gap-0.5"
          >
            See All Deals <ChevronRight size={14} />
          </Link>
        </div>

        {loading && discountedProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-white animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 6. SECTION 2: UNDER ₹99 BUDGET STORE */}
      {under99Products.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 bg-blue-50/40 py-6 rounded-3xl border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs shadow-xs">
                  ⚡
                </span>
                <h2 className="text-lg sm:text-xl font-black text-blue-950 tracking-tight">
                  Under ₹99 Budget Store
                </h2>
              </div>
              <p className="text-xs text-blue-700/80 mt-0.5 font-medium">
                Everyday kitchen necessities, cooking spices & daily staples under ₹99
              </p>
            </div>
            <Link
              to="/catalog?maxPrice=99"
              className="text-xs font-black text-blue-700 hover:text-blue-900 hover:underline transition flex items-center gap-0.5"
            >
              View All Under ₹99 ({under99Products.length}+) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {under99Products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 7. SECTION 3: UNDER ₹199 FAMILY VALUE STORE */}
      {under199Products.length > 0 && (
        <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 bg-emerald-50/40 py-6 rounded-3xl border border-emerald-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-xs shadow-xs">
                  💎
                </span>
                <h2 className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
                  Under ₹199 Value Store
                </h2>
              </div>
              <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">
                High-demand staple packs and family pantry essentials between ₹100 and ₹199
              </p>
            </div>
            <Link
              to="/catalog?minPrice=100&maxPrice=199"
              className="text-xs font-black text-emerald-800 hover:text-emerald-950 hover:underline transition flex items-center gap-0.5"
            >
              View All Under ₹199 ({under199Products.length}+) <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {under199Products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 8. DEDICATED ABOUT OUR SHOP & STORE DETAILS (REPLACES GENERIC BANNER) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="rounded-3xl bg-white border border-gray-200 p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Columns: Story, Address & Hours */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                <Award size={13} className="text-emerald-700" /> Panvel Kirana Merchant • Since 2007
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
                Shree Siddhivinayak Trading
              </h2>

              <p className="text-xs sm:text-sm text-gray-650 leading-relaxed font-medium">
                Serving generations of Panvel families with authentic grains, unpolished pulses, pure edible oils, and daily groceries at APMC wholesale prices. Every pack is quality-inspected before it leaves our counter.
              </p>

              {/* Store Address & Hours Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-150">
                  <MapPin size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-gray-500">Physical Store</span>
                    <p className="text-xs font-semibold text-gray-850 mt-0.5">
                      Shop No. 4, Opp. Krishna Tower, Uran Naka, Panvel, Navi Mumbai - 410206
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-150">
                  <Clock size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[11px] font-bold uppercase text-gray-500">Operating Timings</span>
                    <p className="text-xs font-semibold text-gray-850 mt-0.5">
                      Open Daily (Mon - Sun): {formatStoreTime(storeSettings?.opening_time || '08:00')} - {formatStoreTime(storeSettings?.closing_time || '21:00')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Coverage Badge */}
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-150">
                <Truck size={16} className="text-emerald-700 shrink-0" />
                <span>
                  <strong>Free Home Delivery Areas:</strong> Old Panvel, New Panvel, Khanda Colony, Karanjade, and Kamothe (₹499+).
                </span>
              </div>
            </div>

            {/* Right 5 Columns: 4 Key Pillars Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-gray-50 to-emerald-50/30 p-5 rounded-2xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                Why Panvel Trusts Us
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    🌾
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Direct APMC Wholesale Rates</h4>
                    <p className="text-[10px] text-gray-500">Pass-through savings with no middleman markup</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Zero Adulteration Guarantee</h4>
                    <p className="text-[10px] text-gray-500">100% genuine brand packaging & hygienic storage</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">2-Hour Express Dispatch</h4>
                    <p className="text-[10px] text-gray-500">Rapid local packing and doorstep delivery</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-150 shadow-xs">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    📱
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-900">Easy WhatsApp Ration Orders</h4>
                    <p className="text-[10px] text-gray-500">Simply photograph your grocery list & WhatsApp us</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. VERIFIED CUSTOMER REVIEWS */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 border-t border-gray-150 pt-8">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="text-[10px] font-black uppercase text-accent-700 tracking-wider">
            Neighborhood Feedback
          </span>
          <h3 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
            Loved by Panvel Families
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-current" />
              ))}
            </div>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">
              "Best quality Toor dal and Kolam rice in Panvel. Delivered within 2 hours to Old Panvel without any delivery fee. Outstanding service!"
            </p>
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Rajesh Patil</span>
              <span className="text-[10px] text-gray-400 font-semibold">Uran Naka, Panvel</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-current" />
              ))}
            </div>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">
              "Honest pricing and authentic grains. We have been ordering our monthly family ration from Shree Siddhivinayak for 3 years now."
            </p>
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Sunita Sharma</span>
              <span className="text-[10px] text-gray-400 font-semibold">New Panvel</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-xs space-y-3">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-current" />
              ))}
            </div>
            <p className="text-xs text-gray-650 leading-relaxed font-medium">
              "The WhatsApp order support is super convenient. You can customize pack sizes easily and Yatish ensures everything arrives fresh."
            </p>
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Mahendra Joshi</span>
              <span className="text-[10px] text-gray-400 font-semibold">Panvel City</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. QUICK DIRECT ACTIONS: CALL OR WHATSAPP */}
      <section className="mx-auto max-w-3xl px-4 text-center space-y-4 pt-4">
        <h3 className="text-lg font-bold text-gray-900">Prefer Ordering via Call or WhatsApp?</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Need a quick delivery, special pack weight, or monthly ration order? Message or call our store team directly:
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-250 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Phone size={15} /> Call: {phone}
          </a>
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hi Shree Siddhivinayak Trading, I would like to order groceries.')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
          >
            <MessageSquare size={15} /> WhatsApp Order
          </a>
        </div>
      </section>
    </div>
  );
}
