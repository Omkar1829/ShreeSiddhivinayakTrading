import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../store/cartSlice';
import api from '../services/api';
import { ArrowLeft, ShoppingBag, ShieldCheck, Loader2 } from 'lucide-react';

export default function ProductDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cartItems = useSelector((state) => state.cart.items);
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/products/${slug}`);
        if (res.data.success) {
          setProduct(res.data.product);
          // Auto select first variant if available
          if (res.data.product.variants && res.data.product.variants.length > 0) {
            setSelectedVariant(res.data.product.variants[0]);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve product specs.');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [slug]);

  const getCartQuantity = (variantId) => {
    const item = cartItems.find(i => i.variantId === variantId);
    return item ? item.quantity : 0;
  };

  const currentCartQty = selectedVariant ? getCartQuantity(selectedVariant.id) : 0;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <h3 className="text-xl font-bold text-gray-900">Failed to load product</h3>
        <p className="text-xs text-gray-500 mt-2">{error || 'The requested product page does not exist.'}</p>
        <button
          onClick={() => navigate('/catalog')}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary-800 px-5 py-3 text-xs font-bold text-white hover:bg-primary-900 transition"
        >
          <ArrowLeft size={16} /> Back to Shop Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Back button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary-800 mb-6 transition"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 bg-white rounded-3xl border border-gray-100 p-6 md:p-10 shadow-sm">
        
        {/* Left Side Image */}
        <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-square max-w-md mx-auto w-full border border-gray-100">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300 font-bold text-lg uppercase bg-gray-100">
              {product.name.slice(0, 2)}
            </div>
          )}
        </div>

        {/* Right Side Content Info */}
        <div className="flex flex-col space-y-6">
          
          {/* Breadcrumbs / Metadata */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-bold text-accent-700 uppercase tracking-widest border border-accent-100">
              {product.brand?.name || 'Local Brand'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Category: <span className="text-gray-600 font-bold">{product.category?.name}</span> • Subcategory: <span className="text-gray-600 font-bold">{product.subcategory?.name}</span>
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* Pricing & Stock Details */}
          {selectedVariant && (
            <div className="flex items-baseline gap-4">
              <span className="text-3xl font-black text-gray-900">
                ₹{Number(selectedVariant.price).toFixed(2)}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${selectedVariant.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {selectedVariant.stock > 0 ? `In Stock (${selectedVariant.stock} left)` : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* Product Description */}
          {product.description && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Product Info</span>
              <p className="text-xs text-gray-650 leading-relaxed font-medium">
                {product.description}
              </p>
            </div>
          )}

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Select Option</span>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-xl border px-4 py-3 text-xs font-bold transition text-left ${selectedVariant?.id === v.id ? 'border-primary-850 bg-primary-50 text-primary-800' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    <span className="block text-[10px] text-gray-450 font-normal">{v.attributeName}</span>
                    <span className="block mt-0.5">{v.attributeValue} - ₹{Number(v.price).toFixed(0)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Cart Stepper Counter or Add Button */}
          {selectedVariant && selectedVariant.stock > 0 ? (
            currentCartQty > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Quantity in Cart</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-primary-850 rounded-xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => dispatch(updateQuantity({ variantId: selectedVariant.id, quantity: currentCartQty - 1 }))}
                      className="px-4 py-2.5 text-sm font-black text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                    >
                      -
                    </button>
                    <span className="px-5 text-sm font-black text-primary-800 bg-white">{currentCartQty}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ variantId: selectedVariant.id, quantity: currentCartQty + 1 }))}
                      className="px-4 py-2.5 text-sm font-black text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                    >
                      +
                    </button>
                  </div>
                  <Link to="/cart" className="text-xs font-bold text-primary-800 hover:underline">
                    Go to Cart →
                  </Link>
                </div>
              </div>
            ) : (
              <button
                onClick={() => dispatch(addToCart({
                  variantId: selectedVariant.id,
                  productId: product.id,
                  name: product.name,
                  variantName: `${selectedVariant.attributeName}: ${selectedVariant.attributeValue}`,
                  price: selectedVariant.price,
                  quantity: 1,
                  imageUrl: product.imageUrl,
                  stock: selectedVariant.stock
                }))}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary-800 py-4 px-6 text-sm font-bold text-white hover:bg-primary-900 transition shadow-md md:max-w-xs"
              >
                <ShoppingBag size={18} />
                Add to Cart Basket
              </button>
            )
          ) : (
            selectedVariant && (
              <button
                disabled
                className="w-full rounded-2xl bg-gray-300 py-4 px-6 text-sm font-bold text-gray-500 cursor-not-allowed md:max-w-xs text-center"
              >
                Temporarily Out of Stock
              </button>
            )
          )}

          {/* Local Assurance Badge */}
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 border border-gray-100 max-w-md">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
            <span className="text-[10px] text-gray-500 font-semibold leading-snug">
              Secure counter pickup or free neighborhood doorstep delivery. Inspected and verified fresh by Siddhivinayak partners Yatish and Manas.
            </span>
          </div>

        </div>

      </div>

    </div>
  );
}
