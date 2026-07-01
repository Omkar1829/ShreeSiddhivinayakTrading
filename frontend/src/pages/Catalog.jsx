import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

    dispatch(setFilters({ search, category, subcategory, brand }));
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
        const offset = parseInt(searchParams.get('offset')) || 0;

        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (category) queryParams.append('category', category);
        if (subcategory) queryParams.append('subcategory', subcategory);
        if (brand) queryParams.append('brand', brand);
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side Filter Panels (Desktop) */}
        <aside className="space-y-6 lg:col-span-1">
          {/* Categories list */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
              <Filter size={15} /> Categories
            </h3>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              <button
                onClick={() => updateSearchParam('category', '')}
                className={`text-left px-3 py-2 rounded-xl transition ${!filters.category ? 'bg-primary-50 text-primary-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <button
                    onClick={() => updateSearchParam('category', cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition ${filters.category === cat.slug ? 'bg-primary-50 text-primary-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {cat.name}
                  </button>
                  
                  {/* Subcategories (only if category is active) */}
                  {filters.category === cat.slug && cat.subcategories && (
                    <div className="pl-4 flex flex-col gap-1 border-l border-gray-100 ml-3 py-1">
                      <button
                        onClick={() => updateSearchParam('subcategory', '')}
                        className={`text-left text-xs px-2 py-1 rounded-lg ${!filters.subcategory ? 'text-primary-800 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                      >
                        All {cat.name}
                      </button>
                      {cat.subcategories.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => updateSearchParam('subcategory', sub.slug)}
                          className={`text-left text-xs px-2 py-1 rounded-lg ${filters.subcategory === sub.slug ? 'text-primary-800 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Brands list */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Brands</h3>
            <div className="flex flex-col gap-1.5 text-sm font-medium">
              <button
                onClick={() => updateSearchParam('brand', '')}
                className={`text-left px-3 py-2 rounded-xl transition ${!filters.brand ? 'bg-primary-50 text-primary-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                All Brands
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => updateSearchParam('brand', b.slug)}
                  className={`text-left px-3 py-2 rounded-xl transition ${filters.brand === b.slug ? 'bg-primary-50 text-primary-800 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Side Products Grid */}
        <main className="lg:col-span-3 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-shimmer h-72 rounded-2xl"></div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-900">No products found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Try clearing search parameters or adjusting active category and brand filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((product) => {
                const defaultVariant = product.variants?.[0];
                const quantityInCart = defaultVariant ? getCartQuantity(defaultVariant.id) : 0;

                return (
                  <div
                    key={product.id}
                    className="flex flex-col bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-xl hover:border-primary-100 transition relative group"
                  >
                    {/* Image */}
                    <div className="block overflow-hidden rounded-xl bg-gray-50 aspect-square">
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
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 flex-1 flex flex-col">
                      <span className="text-[10px] font-bold text-accent-600 uppercase tracking-wider">
                        {product.brand?.name || 'Local'}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight line-clamp-2 mt-0.5 min-h-[32px]">
                        {product.name}
                      </h4>

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
