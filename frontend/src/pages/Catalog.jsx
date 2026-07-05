import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setProducts, setCategories, setBrands, setFilters, setCatalogLoading, setCatalogError } from '../store/catalogSlice';
import { addToCart, updateQuantity } from '../store/cartSlice';
import api from '../services/api';
import { Search, ShoppingBag, Filter, ArrowUpDown } from 'lucide-react';

export default function Catalog() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { products, categories, brands, filters, pagination, loading, error } = useSelector((state) => state.catalog);
  const cartItems = useSelector((state) => state.cart.items);

  // Sync route query parameters with Redux store filters
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const subcategory = searchParams.get('subcategory') || '';
    const brand = searchParams.get('brand') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const inStock = searchParams.get('inStock') || '';

    dispatch(setFilters({ search, category, subcategory, brand, minPrice, maxPrice, inStock }));
  }, [searchParams, dispatch]);

  // Load products, categories, and brands on filter change
  useEffect(() => {
    let active = true;

    const fetchCatalogData = async () => {
      dispatch(setCatalogLoading(true));
      try {
        // Fetch static categories and brands if not loaded
        if (categories.length === 0) {
          const catRes = await api.get('/api/categories');
          if (catRes.data.success && active) dispatch(setCategories(catRes.data.categories));
        }

        if (brands.length === 0) {
          const brandRes = await api.get('/api/brands');
          if (brandRes.data.success && active) dispatch(setBrands(brandRes.data.brands));
        }

        // Build query string directly from searchParams (single source of truth!)
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
        queryParams.append('limit', pagination.limit);
        queryParams.append('offset', offset);

        const prodRes = await api.get(`/api/products?${queryParams.toString()}`);
        if (prodRes.data.success && active) {
          dispatch(setProducts({
            products: prodRes.data.products,
            pagination: prodRes.data.pagination
          }));
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
  }, [categories.length, brands.length, pagination.limit, searchParams, dispatch]);

  const updateSearchParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset offset on filter changes
    if (key !== 'offset') {
      newParams.delete('offset');
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (e) => {
    updateSearchParam('search', e.target.value);
  };

  const handlePageChange = (newOffset) => {
    updateSearchParam('offset', newOffset);
  };

  const getCartQuantity = (variantId) => {
    const item = cartItems.find(i => i.variantId === variantId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Search Bar & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Catalog</h1>
          <p className="text-xs text-gray-500 mt-1">Browse and search our available inventory</p>
        </div>
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search groceries..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
          />
        </div>
      </div>

      {/* Top Horizontal Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between mb-8">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* Category Dropdown */}
          <select
            value={filters.category}
            onChange={(e) => {
              updateSearchParam('category', e.target.value);
              updateSearchParam('subcategory', ''); // Reset subcat
            }}
            className="rounded-xl border border-gray-250 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>

          {/* Subcategory Dropdown */}
          {filters.category && categories.find(c => c.slug === filters.category)?.subcategories?.length > 0 && (
            <select
              value={filters.subcategory}
              onChange={(e) => updateSearchParam('subcategory', e.target.value)}
              className="rounded-xl border border-gray-250 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none"
            >
              <option value="">All Subcategories</option>
              {categories.find(c => c.slug === filters.category).subcategories.map(sub => (
                <option key={sub.id} value={sub.slug}>{sub.name}</option>
              ))}
            </select>
          )}

          {/* Brand Dropdown */}
          <select
            value={filters.brand}
            onChange={(e) => updateSearchParam('brand', e.target.value)}
            className="rounded-xl border border-gray-255 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.slug}>{b.name}</option>
            ))}
          </select>

          {/* Price Range */}
          <div className="flex items-center gap-1.5 border border-gray-250 rounded-xl px-2.5 py-1.5 bg-white">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Price:</span>
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => updateSearchParam('minPrice', e.target.value)}
              className="w-14 bg-transparent text-xs font-semibold text-gray-755 focus:outline-none"
            />
            <span className="text-gray-300 text-xs">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => updateSearchParam('maxPrice', e.target.value)}
              className="w-14 bg-transparent text-xs font-semibold text-gray-755 focus:outline-none"
            />
          </div>

          {/* Availability */}
          <select
            value={filters.inStock}
            onChange={(e) => updateSearchParam('inStock', e.target.value)}
            className="rounded-xl border border-gray-250 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">All Availability</option>
            <option value="true">In Stock Only</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(filters.category || filters.subcategory || filters.brand || filters.minPrice || filters.maxPrice || filters.inStock) && (
          <button
            onClick={() => {
              const newParams = new URLSearchParams();
              if (filters.search) newParams.set('search', filters.search);
              setSearchParams(newParams);
            }}
            className="text-xs text-primary-850 hover:underline font-bold"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="space-y-8">
        
        {/* Right Side Products Grid */}
        <main className="w-full space-y-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-72 rounded-2xl animate-pulse bg-gray-100"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-900">No products found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Try clearing search parameters or adjusting active filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const defaultVariant = product.variants?.[0];
                const quantityInCart = defaultVariant ? getCartQuantity(defaultVariant.id) : 0;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-xl hover:border-primary-100 transition relative group"
                  >
                    {/* Image */}
                    <Link to={`/catalog/${product.slug}`} className="block overflow-hidden rounded-xl bg-gray-50 aspect-square group-hover:opacity-90 transition">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-102 transition duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300 font-bold text-xs uppercase bg-gray-100">
                          {product.name.slice(0, 2)}
                        </div>
                      )}
                    </Link>

                    {/* Metadata */}
                    <div className="mt-3 flex-1 flex flex-col">
                      <span className="text-[10px] font-bold text-accent-600 uppercase tracking-wider">
                        {product.brand?.name || 'Local'}
                      </span>
                      <Link to={`/catalog/${product.slug}`} className="block hover:text-primary-800 transition">
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight line-clamp-2 mt-0.5 min-h-[32px]">
                          {product.name}
                        </h4>
                      </Link>

                      {/* Display variants info */}
                      {defaultVariant ? (
                        <div className="mt-auto pt-3">
                          <span className="text-[10px] text-gray-400 font-bold block">
                            {defaultVariant.attributeName}: {defaultVariant.attributeValue}
                          </span>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-black text-gray-900">
                              ₹{Number(defaultVariant.price).toFixed(2)}
                            </span>

                            {defaultVariant.stock > 0 ? (
                              quantityInCart > 0 ? (
                                <div className="flex items-center border border-primary-800 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => dispatch(updateQuantity({
                                      variantId: defaultVariant.id,
                                      quantity: quantityInCart - 1
                                    }))}
                                    className="px-2 py-1 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 text-xs font-black text-primary-800">{quantityInCart}</span>
                                  <button
                                    onClick={() => dispatch(updateQuantity({
                                      variantId: defaultVariant.id,
                                      quantity: quantityInCart + 1
                                    }))}
                                    className="px-2 py-1 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
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
                                  className="rounded-lg bg-primary-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
                                >
                                  Add
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-red-500">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 mt-auto font-medium">Unavailable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple Pagination Controls */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-6">
              <button
                disabled={pagination.offset === 0}
                onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                ← Previous
              </button>
              <span className="text-xs font-semibold text-gray-500">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
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
