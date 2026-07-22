import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setCategories, setCatalogLoading, setCatalogError } from '../store/catalogSlice';
import { addToCart } from '../store/cartSlice';
import api from '../services/api';
import { ShoppingBag, ChevronRight, Phone, MessageSquare, Search, Award, ShieldCheck, Truck } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { categories, loading } = useSelector((state) => state.catalog);
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const storeSettings = useSelector((state) => state.store.settings);
  const phone = storeSettings?.phone_number || '+919999999999';
  const whatsapp = storeSettings?.whatsapp_number || '+919999999999';
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

  useEffect(() => {
    // Fetch categories and featured products
    const loadHomeData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        const catRes = await api.get('/api/categories');
        if (catRes.data.success) {
          dispatch(setCategories(catRes.data.categories));
        }

        // Fetch top 6 products as featured
        const prodRes = await api.get('/api/products?limit=6');
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
    <div className="space-y-10 pb-16">

      {/* Hero Search Section */}
      <section className="relative overflow-hidden bg-primary-800 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-700 px-3.5 py-1 text-xs font-bold text-emerald-300 border border-primary-600 uppercase tracking-widest">
            <Award size={13} /> Trusted Neighborhood Kirana Since 2007
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Everyday Essentials. Exceptional Quality. <br />
            <span className="text-accent-400">Delivered Fresh. Delivered Free across panvel.</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm sm:text-base text-primary-100 font-medium">
            From premium rice and pulses to cooking oils, and household essentials, enjoy trusted brands and dependable service—all in one place.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="mx-auto max-w-xl">
            <div className="relative flex items-center rounded-2xl bg-white p-1.5 shadow-xl">
              <Search className="ml-3 text-gray-400 shrink-0" size={20} />
              <input
                type="text"
                placeholder="Search rice, dal, tea, milk, Amul..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-0 bg-transparent py-3 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-base"
              />
              <button
                type="submit"
                className="rounded-xl bg-accent-600 px-6 py-3 text-sm font-bold text-white hover:bg-accent-700 transition"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Categories Grid Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Shop by Category
          </h2>
          <Link to="/catalog" className="flex items-center gap-0.5 text-sm font-bold text-primary-800 hover:text-primary-900 transition">
            View All Catalog <ChevronRight size={16} />
          </Link>
        </div>

        {loading && categories.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-lg transition text-center group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-800 font-bold group-hover:bg-primary-800 group-hover:text-white transition duration-300">
                  <ShoppingBag size={22} />
                </div>
                <span className="mt-3 font-semibold text-sm text-gray-800 group-hover:text-primary-800 transition">
                  {cat.name}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  {cat.subcategories?.length || 0} subcategories
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Featured Staples
          </h2>
          <Link to="/catalog" className="text-sm font-bold text-primary-800 hover:underline transition">
            See More Products
          </Link>
        </div>

        {loading && featuredProducts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-shimmer h-72 rounded-2xl"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featuredProducts.map((product) => {
              const defaultVariant = product.variants?.[0];
              return (
                <div
                  key={product.id}
                  className="flex flex-col bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-xl hover:border-primary-100 transition relative group"
                >
                  {/* Product Image */}
                  <Link to={`/catalog/${product.slug}`} className="block overflow-hidden rounded-xl bg-gray-50 aspect-square">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300 font-bold text-xs uppercase bg-gray-100">
                        {product.name.slice(0, 2)}
                      </div>
                    )}
                  </Link>

                  {/* Brand & Name */}
                  <div className="mt-3 flex-1 flex flex-col">
                    <span className="text-[10px] font-bold text-accent-600 uppercase tracking-wider">
                      {product.brand?.name || 'Local'}
                    </span>
                    <Link to={`/catalog/${product.slug}`} className="font-bold text-xs sm:text-sm text-gray-900 hover:text-primary-800 transition line-clamp-2 mt-0.5">
                      {product.name}
                    </Link>

                    {/* Default variant display */}
                    {defaultVariant ? (
                      <div className="mt-auto pt-3">
                        <span className="text-[10px] text-gray-400 font-semibold block">
                          {defaultVariant.attributeName}: {defaultVariant.attributeValue}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black text-gray-900">
                            ₹{Number(defaultVariant.price).toFixed(2)}
                          </span>
                          {defaultVariant.stock > 0 ? (
                            <button
                              onClick={() => dispatch(addToCart({
                                variantId: defaultVariant.id,
                                productId: product.id,
                                name: product.name,
                                variantName: `${defaultVariant.attributeName}: ${defaultVariant.attributeValue}`,
                                price: defaultVariant.price,
                                quantity: 1,
                                imageUrl: product.imageUrl,
                                stock: defaultVariant.stock
                              }))}
                              className="rounded-lg bg-primary-800 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-primary-900 transition shadow-sm"
                            >
                              Add
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-red-500">Out of Stock</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 mt-auto font-medium">No variants available</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Customer Promise / Badges Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-gray-100 pt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <Truck size={36} className="text-primary-800 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-gray-900">Free Doorstep Delivery</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Order online and receive quick home delivery completely free across Panvel (MVP scope).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <ShieldCheck size={36} className="text-primary-800 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-gray-900">Only the Finest, Every Time</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                We source from trusted brands and maintain the highest standards of freshness, hygiene, and quality.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <Award size={36} className="text-primary-800 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-gray-900">A Legacy of Trust Since 2007</h4>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Serving generations of families with honest pricing, dependable service, and uncompromising quality across navi mumbai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Direct Actions Footer */}
      <section className="mx-auto max-w-3xl px-4 text-center space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Prefer Ordering via Call or WhatsApp?</h3>
        <p className="text-xs text-gray-500">
          Our team is ready to assist you with your orders over the phone. Feel free to contact us for any queries or assistance.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="tel:+919833607049"
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Phone size={15} /> Call: {phone}
          </a>
          <a
            href={`https://wa.me/${cleanWhatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm"
          >
            <MessageSquare size={15} /> WhatsApp Order
          </a>
        </div>
      </section>

    </div>
  );
}
