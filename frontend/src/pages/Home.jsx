import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setCatalogLoading, setCatalogError } from '../store/catalogSlice';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import {
  ShoppingBag,
  ChevronRight,
  Phone,
  MessageSquare,
  Search,
  Award,
  ShieldCheck,
  Truck,
  Sparkles,
  Star
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories, loading } = useSelector((state) => state.catalog);
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const storeSettings = useSelector((state) => state.store.settings);
  const phone = storeSettings?.phone_number || '+918879279207';
  const whatsapp = storeSettings?.whatsapp_number || '+919833607049';
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

  const quickSearchTags = [
    { label: '🌾 Basmati Rice', query: 'Basmati Rice' },
    { label: '🫘 Toor Dal', query: 'Toor Dal' },
    { label: '🌻 Sunflower Oil', query: 'Sunflower Oil' },
    { label: '🌾 Chakki Atta', query: 'Atta' },
    { label: '🧈 Amul Butter', query: 'Amul' },
    { label: '🍵 Tea', query: 'Tea' }
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
    if (lower.includes('snack') || lower.includes('biscuit')) return '🍪';
    return '🛒';
  };

  useEffect(() => {
    // Fetch categories and featured products
    const loadHomeData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        const catRes = await api.get('/api/categories');
        if (catRes.data.success) {
          dispatch(setCategories(catRes.data.categories));
        }

        // Fetch top products as featured
        const prodRes = await api.get('/api/products?limit=12');
        if (prodRes.data.success) {
          setFeaturedProducts(prodRes.data.products);
        }
      } catch (err) {
        dispatch(setCatalogError(err.message || 'Failed to fetch home catalog data.'));
      } finally {
        dispatch(setCatalogLoading(false));
      }
    };
    loadHomeData();
  }, [dispatch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleCategoryClick = (categorySlug) => {
    navigate(`/catalog?category=${categorySlug}`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. TOP FREE DELIVERY ANNOUNCEMENT STRIP */}
      <div className="bg-emerald-950 text-emerald-200 text-xs py-2 px-4 text-center font-bold flex items-center justify-center gap-2 border-b border-emerald-900/60">
        <Truck size={14} className="text-emerald-400 shrink-0" />
        <span>⚡ Free Doorstep Delivery across Panvel on orders above ₹499 • Open daily 8 AM - 9 PM</span>
      </div>

      {/* 2. MODERN COMPACT HERO SECTION */}
      <section className="relative overflow-hidden bg-[#0a1811] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-emerald-950/60">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="relative mx-auto max-w-4xl text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/80 px-3.5 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-700/60 uppercase tracking-widest shadow-xs">
            <Award size={13} className="text-emerald-400" /> Trusted Neighborhood Kirana Since 2007
          </span>

          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Everyday Essentials. Exceptional Quality. <br />
            <span className="text-accent-400">Fresh groceries, delivered free across Panvel.</span>
          </h1>

          <p className="mx-auto max-w-xl text-xs sm:text-sm text-emerald-100/80 font-medium">
            From premium rice and pulses to pure cooking oils and daily essentials, enjoy trusted Kirana quality with doorstep delivery.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="mx-auto max-w-xl pt-2">
            <div className="relative flex items-center rounded-2xl bg-white p-1.5 shadow-2xl border border-gray-100">
              <Search className="ml-3 text-gray-400 shrink-0" size={20} />
              <input
                type="text"
                placeholder="Search rice, dal, oil, tea, Amul butter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-0 bg-transparent py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-sm font-semibold"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider mr-1">Popular:</span>
            {quickSearchTags.map((tag) => (
              <button
                key={tag.query}
                type="button"
                onClick={() => navigate(`/catalog?search=${encodeURIComponent(tag.query)}`)}
                className="rounded-full bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-200 transition"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. TOUCH-FRIENDLY HORIZONTAL CATEGORY STRIP */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <span>Shop Categories</span>
          </h2>
          <Link to="/catalog" className="flex items-center gap-0.5 text-xs font-bold text-primary-850 hover:underline">
            View All <ChevronRight size={14} />
          </Link>
        </div>

        {/* Scrollable Category Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group"
          >
            <span className="text-lg">🛒</span>
            <div className="text-left">
              <span className="block font-bold text-xs text-gray-800 group-hover:text-primary-850">All Items</span>
              <span className="block text-[10px] text-gray-400 font-medium">Browse Entire Store</span>
            </div>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className="flex items-center gap-2.5 rounded-2xl bg-white border border-gray-200 px-4 py-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition shrink-0 group text-left"
            >
              <span className="text-xl">{getCategoryEmoji(cat.name)}</span>
              <div>
                <span className="block font-bold text-xs text-gray-900 group-hover:text-primary-850 leading-tight">
                  {cat.name}
                </span>
                <span className="block text-[10px] text-gray-400 font-medium mt-0.5">
                  {cat.subcategories?.length > 0 ? `${cat.subcategories.length} varieties` : 'Staples'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. FEATURED STAPLES & BEST SELLERS (ZEPTO-STYLE PRODUCT CARDS) */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <span>Deals of the Day & Best Sellers</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Top-rated staples at discounted Kirana prices</p>
          </div>
          <Link to="/catalog" className="text-xs font-bold text-primary-850 hover:underline transition">
            See More Products →
          </Link>
        </div>

        {loading && featuredProducts.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-white animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. VERIFIED CUSTOMER REVIEWS */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 border-t border-gray-150 pt-8">
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="text-[10px] font-black uppercase text-accent-700 tracking-wider">Neighborhood Feedback</span>
          <h3 className="text-xl font-black text-gray-900 tracking-tight mt-0.5">Loved by Panvel Families</h3>
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
              "The WhatsApp order support is super convenient. You can also customize pack sizes easily and Yatish ensures everything arrives fresh."
            </p>
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Mahendra Joshi</span>
              <span className="text-[10px] text-gray-400 font-semibold">Panvel City</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CUSTOMER PROMISE / BADGES */}
      <section className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 border-t border-gray-150 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-150 shadow-xs">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-850 shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Free Doorstep Delivery</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Order online or by phone and receive fast doorstep delivery across Panvel.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-150 shadow-xs">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-850 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Only the Finest Quality</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Sourced from certified brands and trusted millers, inspected for hygiene and purity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-150 shadow-xs">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-850 shrink-0">
              <Award size={24} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-900">Legacy of Trust Since 2007</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Serving generations of Panvel families with fair prices and dependable neighborhood service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. QUICK DIRECT ACTIONS: CALL OR WHATSAPP */}
      <section className="mx-auto max-w-3xl px-4 text-center space-y-4 pt-4">
        <h3 className="text-lg font-bold text-gray-900">Prefer Ordering via Call or WhatsApp?</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Need a quick delivery, special pack weight, or monthly ration order? Message or call our store team directly:
        </p>
        <div className="flex items-center justify-center gap-3">
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-250 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Phone size={15} /> Call: {phone}
          </a>
          <a
            href={`https://wa.me/${cleanWhatsapp}`}
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
