import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  setProducts,
  setCategories,
  setBrands,
  setFilters,
  setCatalogLoading,
  setCatalogError
} from '../store/catalogSlice';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { calculatePricing } from '../utils/pricing';
import {
  Search,
  ShoppingBag,
  Filter,
  X,
  SlidersHorizontal,
  Flame,
  Check,
  ChevronRight,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

const PRICE_PRESETS = [
  { id: 'all', label: 'All Prices', min: '', max: '' },
  { id: 'under99', label: 'Under ₹99 (Budget)', min: '', max: '99', badge: '⚡' },
  { id: 'under199', label: 'Under ₹199 (Value)', min: '100', max: '199', badge: '💎' },
  { id: '200-500', label: '₹200 - ₹500', min: '200', max: '500' },
  { id: 'above500', label: 'Above ₹500 (Bulk/Dry Fruits)', min: '500', max: '' }
];

export default function Catalog() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { products, categories, brands, filters, pagination, loading, error } = useSelector(
    (state) => state.catalog
  );
  const storeSettings = useSelector((state) => state.store.settings);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [customMin, setCustomMin] = useState(searchParams.get('minPrice') || '');
  const [customMax, setCustomMax] = useState(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState('default');
  const [dealsOnly, setDealsOnly] = useState(searchParams.get('deals') === 'true');

  // Sync route query parameters with Redux store filters
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const brand = searchParams.get('brand') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const inStock = searchParams.get('inStock') || '';
    const deals = searchParams.get('deals') === 'true';

    setDealsOnly(deals);
    setCustomMin(minPrice);
    setCustomMax(maxPrice);

    dispatch(setFilters({ search, category, subcategory, brand, minPrice, maxPrice, inStock }));
  }, [searchParams, dispatch]);

  // Load products, categories, and brands on filter change
  useEffect(() => {
    let active = true;

    const fetchCatalogData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        if (categories.length === 0) {
          const catRes = await api.get('/api/categories');
          if (catRes.data.success && active) dispatch(setCategories(catRes.data.categories));
        }

        if (brands.length === 0) {
          const brandRes = await api.get('/api/brands');
          if (brandRes.data.success && active) dispatch(setBrands(brandRes.data.brands));
        }

        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const subcategory = searchParams.get('subcategory') || '';
        const brand = searchParams.get('brand') || '';
        const minPrice = searchParams.get('minPrice') || '';
        const maxPrice = searchParams.get('maxPrice') || '';
        const inStock = searchParams.get('inStock') || '';
        const offset = parseInt(searchParams.get('offset')) || 0;

        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (category) queryParams.append('category', category);
        if (subcategory) queryParams.append('subcategory', subcategory);
        if (brand) queryParams.append('brand', brand);
        if (minPrice) queryParams.append('minPrice', minPrice);
        if (maxPrice) queryParams.append('maxPrice', maxPrice);
        if (inStock) queryParams.append('inStock', inStock);
        queryParams.append('limit', 40); // 40 items for optimal 4-column desktop viewing
        queryParams.append('offset', offset);

        const prodRes = await api.get(`/api/products?${queryParams.toString()}`);
        if (prodRes.data.success && active) {
          dispatch(
            setProducts({
              products: prodRes.data.products,
              pagination: prodRes.data.pagination
            })
          );
        }
      } catch (err) {
        if (active) {
          dispatch(setCatalogError(err.message || 'Failed to fetch catalog products.'));
        }
      } finally {
        if (active) {
          dispatch(setCatalogLoading(false));
        }
      }
    };

    fetchCatalogData();

    return () => {
      active = false;
    };
  }, [categories.length, brands.length, searchParams, dispatch]);

  const updateSearchParam = (keyOrUpdates, value) => {
    const newParams = new URLSearchParams(searchParams);

    if (typeof keyOrUpdates === 'string') {
      const key = keyOrUpdates;
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      if (key !== 'offset') {
        newParams.delete('offset');
      }
    } else {
      const updates = keyOrUpdates;
      Object.entries(updates).forEach(([key, val]) => {
        if (val) {
          newParams.set(key, val);
        } else {
          newParams.delete(key);
        }
        if (key !== 'offset') {
          newParams.delete('offset');
        }
      });
    }
    setSearchParams(newParams);
  };

  const handleApplyCustomPrice = (e) => {
    e.preventDefault();
    updateSearchParam({ minPrice: customMin, maxPrice: customMax });
  };

  const handlePricePreset = (preset) => {
    updateSearchParam({ minPrice: preset.min, maxPrice: preset.max });
  };

  const handleToggleDeals = () => {
    const nextVal = !dealsOnly;
    setDealsOnly(nextVal);
    updateSearchParam('deals', nextVal ? 'true' : '');
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('search', filters.search);
    setCustomMin('');
    setCustomMax('');
    setDealsOnly(false);
    setSearchParams(newParams);
  };

  const activeCategory = categories.find((c) => c.slug === filters.category);

  // Filter and Sort displayed products
  const displayedProducts = useMemo(() => {
    let list = [...products];

    // Filter deals/discounts only
    if (dealsOnly) {
      list = list.filter((p) => {
        return (p.variants || []).some((v) => {
          const pricing = calculatePricing(
            v.price,
            v.mrp,
            p.id,
            storeSettings?.store_offers,
            v.id,
            storeSettings?.store_variant_offers
          );
          return pricing.hasDiscount && pricing.discountPercent > 0;
        });
      });
    }

    // Client-side Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => (Number(a.variants?.[0]?.price) || 0) - (Number(b.variants?.[0]?.price) || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (Number(b.variants?.[0]?.price) || 0) - (Number(a.variants?.[0]?.price) || 0));
    } else if (sortBy === 'discount-desc') {
      list.sort((a, b) => {
        const pa = calculatePricing(
          a.variants?.[0]?.price,
          a.variants?.[0]?.mrp,
          a.id,
          storeSettings?.store_offers,
          a.variants?.[0]?.id,
          storeSettings?.store_variant_offers
        );
        const pb = calculatePricing(
          b.variants?.[0]?.price,
          b.variants?.[0]?.mrp,
          b.id,
          storeSettings?.store_offers,
          b.variants?.[0]?.id,
          storeSettings?.store_variant_offers
        );
        return (pb.discountPercent || 0) - (pa.discountPercent || 0);
      });
    }

    return list;
  }, [products, dealsOnly, sortBy, storeSettings]);

  // Check active filter count
  const activeFilterCount = [
    filters.category,
    filters.subcategory,
    filters.brand,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
    dealsOnly
  ].filter(Boolean).length;

  // Reusable Sidebar Filter Content Component
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Header with Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-150">
        <div className="flex items-center gap-1.5 font-black text-gray-900 text-sm tracking-tight">
          <SlidersHorizontal size={16} className="text-emerald-700" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 transition"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* 1. Quick Deal Toggle */}
      <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/70 p-3 border border-amber-200/80 shadow-xs">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-white text-xs">
              <Flame size={14} className="fill-current" />
            </span>
            <div>
              <span className="block text-xs font-black text-gray-900 leading-tight">
                Deals & Offers Only
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={dealsOnly}
            onChange={handleToggleDeals}
            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
          />
        </label>
      </div>

      {/* 2. Stock Availability */}
      <div>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.inStock === 'true'}
            onChange={(e) => updateSearchParam('inStock', e.target.checked ? 'true' : '')}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* 3. Price Range Presets */}
      <div className="space-y-2.5">
        <span className="block text-xs font-black uppercase text-gray-500 tracking-wider">
          Price Range
        </span>

        <div className="space-y-1.5">
          {PRICE_PRESETS.map((p) => {
            const isSelected = filters.minPrice === p.min && filters.maxPrice === p.max;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePricePreset(p)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left border ${isSelected
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <span className="flex items-center gap-1.5">
                  {p.badge && <span>{p.badge}</span>}
                  <span>{p.label}</span>
                </span>
                {isSelected && <Check size={14} className="text-emerald-700" />}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max Inputs */}
        <form onSubmit={handleApplyCustomPrice} className="pt-2 flex items-center gap-2">
          <input
            type="number"
            placeholder="Min ₹"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-250 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-300 text-xs">-</span>
          <input
            type="number"
            placeholder="Max ₹"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-1/2 rounded-lg border border-gray-250 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-black transition"
          >
            Go
          </button>
        </form>
      </div>

      {/* 4. Categories */}
      <div className="space-y-2.5">
        <span className="block text-xs font-black uppercase text-gray-500 tracking-wider">
          Categories
        </span>

        <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar pr-1">
          <button
            type="button"
            onClick={() => updateSearchParam({ category: '', subcategory: '' })}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left border ${!filters.category
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                : 'bg-white text-gray-700 border-transparent hover:bg-gray-50'
              }`}
          >
            <span>All Categories</span>
            {!filters.category && <Check size={14} className="text-emerald-700" />}
          </button>

          {categories.map((c) => {
            const isSelected = filters.category === c.slug;
            return (
              <div key={c.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    updateSearchParam({
                      category: isSelected ? '' : c.slug,
                      subcategory: ''
                    })
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left border ${isSelected
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50'
                    }`}
                >
                  <span className="truncate">{c.name}</span>
                  {isSelected && <Check size={14} className="text-emerald-700 shrink-0" />}
                </button>

                {/* Subcategories (Indented if Category Selected) */}
                {isSelected && c.subcategories?.length > 0 && (
                  <div className="pl-4 space-y-1 pt-0.5 pb-1">
                    {c.subcategories.map((sub) => {
                      const isSubSelected = filters.subcategory === sub.slug;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() =>
                            updateSearchParam('subcategory', isSubSelected ? '' : sub.slug)
                          }
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition text-left ${isSubSelected
                              ? 'bg-emerald-100 text-emerald-900 font-bold'
                              : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          <span className="truncate">↳ {sub.name}</span>
                          {isSubSelected && <Check size={12} className="text-emerald-800" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Brands */}
      {brands.length > 0 && (
        <div className="space-y-2.5">
          <span className="block text-xs font-black uppercase text-gray-500 tracking-wider">
            Popular Brands
          </span>

          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
            <button
              type="button"
              onClick={() => updateSearchParam('brand', '')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left border ${!filters.brand
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                  : 'bg-white text-gray-700 border-transparent hover:bg-gray-50'
                }`}
            >
              <span>All Brands</span>
              {!filters.brand && <Check size={14} className="text-emerald-700" />}
            </button>

            {brands.map((b) => {
              const isSelected = filters.brand === b.slug;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => updateSearchParam('brand', isSelected ? '' : b.slug)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left border ${isSelected
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                      : 'bg-white text-gray-700 border-transparent hover:bg-gray-50'
                    }`}
                >
                  <span className="truncate">{b.name}</span>
                  {isSelected && <Check size={14} className="text-emerald-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12 pb-24">
      {/* Top Banner / Breadcrumb & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shop Catalog</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            APMC wholesale rates • Freshly packed staples & dry fruits delivered in Panvel
          </p>
        </div>

        {/* Search Input in Catalog */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groceries by name, brand, or pack..."
            value={filters.search}
            onChange={(e) => updateSearchParam('search', e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 shadow-xs transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => updateSearchParam('search', '')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* MAIN 2-COLUMN LAYOUT: LEFT SIDEBAR FILTERS + RIGHT 4-COLUMN PRODUCT GRID */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* DESKTOP LEFT FILTER SIDEBAR (w-64 sm:w-72) */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 bg-white rounded-3xl border border-gray-200 p-5 shadow-sm">
          <FilterContent />
        </aside>

        {/* MOBILE FILTER MODAL DRAWER */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileFilterOpen(false)}
            />

            {/* Slide-in Drawer */}
            <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-white p-6 shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-gray-150 mb-4">
                <span className="font-black text-base text-gray-900">Filter Products</span>
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <FilterContent />

              <div className="mt-8 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full rounded-xl bg-primary-800 py-3 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm text-center"
                >
                  Apply & See Results
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT MAIN CATALOG & 4-COLUMN PRODUCTS GRID */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Top Results Toolbar: Mobile Filter Trigger, Result Count & Sort Dropdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Trigger Button */}
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-900 shadow-xs"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-700 text-white text-[9px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <span className="text-xs font-bold text-gray-700">
                Showing{' '}
                <strong className="text-emerald-800">{displayedProducts.length}</strong> items
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase hidden sm:inline">
                Sort by:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-250 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                <option value="default">Featured / Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount-desc">Top Discounts (Offers)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips Strip */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Active:</span>

              {dealsOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                  🔥 Deals Only
                  <button type="button" onClick={handleToggleDeals} className="hover:text-amber-950">
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                  {categories.find((c) => c.slug === filters.category)?.name || filters.category}
                  <button
                    type="button"
                    onClick={() => updateSearchParam({ category: '', subcategory: '' })}
                    className="hover:text-emerald-950"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.subcategory && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                  {filters.subcategory}
                  <button
                    type="button"
                    onClick={() => updateSearchParam('subcategory', '')}
                    className="hover:text-emerald-950"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.brand && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-[11px] font-bold text-gray-800">
                  Brand: {brands.find((b) => b.slug === filters.brand)?.name || filters.brand}
                  <button
                    type="button"
                    onClick={() => updateSearchParam('brand', '')}
                    className="hover:text-gray-900"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {(filters.minPrice || filters.maxPrice) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-900">
                  Price: ₹{filters.minPrice || '0'} - ₹{filters.maxPrice || '∞'}
                  <button
                    type="button"
                    onClick={() => updateSearchParam({ minPrice: '', maxPrice: '' })}
                    className="hover:text-blue-950"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.inStock && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                  In Stock Only
                  <button
                    type="button"
                    onClick={() => updateSearchParam('inStock', '')}
                    className="hover:text-emerald-950"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-red-600 hover:underline ml-2"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-xs sm:text-sm font-semibold">
              {error}
            </div>
          )}

          {/* 4-COLUMN RESPONSIVE PRODUCT GRID (2 col mobile, 3 col tablet, 4 COL DESKTOP) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl animate-pulse bg-white border border-gray-150"
                ></div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-200 rounded-3xl shadow-xs">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-black text-gray-900">No staples matched your search</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Try loosening the price presets, clearing the category filter, or searching for a general keyword.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between border-t border-gray-150 pt-6">
              <button
                disabled={pagination.offset === 0}
                onClick={() =>
                  updateSearchParam('offset', Math.max(0, pagination.offset - pagination.limit))
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-xs"
              >
                ← Previous
              </button>
              <span className="text-xs font-semibold text-gray-500">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() =>
                  updateSearchParam('offset', pagination.offset + pagination.limit)
                }
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-xs"
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
