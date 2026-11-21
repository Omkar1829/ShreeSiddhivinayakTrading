import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity } from '../store/cartSlice';
import { calculatePricing } from '../utils/pricing';
import { Plus, Minus } from 'lucide-react';

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const storeSettings = useSelector((state) => state.store.settings);

  const variants = product.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || null);

  const currentVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];

  const cartItem = currentVariant ? cartItems.find((i) => i.variantId === currentVariant.id) : null;
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const pricing = currentVariant
    ? calculatePricing(
        currentVariant.price,
        currentVariant.mrp,
        product.id,
        storeSettings?.store_offers,
        currentVariant.id,
        storeSettings?.store_variant_offers
      )
    : null;
  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!currentVariant || isOutOfStock) return;

    dispatch(
      addToCart({
        variantId: currentVariant.id,
        productId: product.id,
        name: product.name,
        variantName: `${currentVariant.attributeName}: ${currentVariant.attributeValue}`,
        price: Number(currentVariant.price),
        quantity: 1,
        imageUrl: product.imageUrl,
        stock: currentVariant.stock
      })
    );
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    if (!currentVariant) return;
    dispatch(
      updateQuantity({
        variantId: currentVariant.id,
        quantity: quantityInCart + 1
      })
    );
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (!currentVariant) return;
    dispatch(
      updateQuantity({
        variantId: currentVariant.id,
        quantity: quantityInCart - 1
      })
    );
  };

  return (
    <div className="flex flex-col bg-white border border-gray-150 rounded-2xl p-3 hover:shadow-xl hover:border-emerald-200 transition duration-250 relative group h-full">
      {/* Hanging Bookmark Ribbon Offer Badge (Zepto style with inverted triangle cutout) */}
      {pricing && pricing.hasDiscount && pricing.discountPercent > 0 && (
        <div
          className="absolute top-0 left-3 z-20 flex flex-col items-center justify-center bg-blue-600 text-white font-black text-center shadow-md pt-1 pb-2.5 px-1.5 min-w-[34px] pointer-events-none rounded-t-xs"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)'
          }}
          title={`${pricing.discountPercent}% OFF`}
        >
          <span className="text-[10px] sm:text-[11px] font-black leading-none tracking-tight">
            {pricing.discountPercent}%
          </span>
          <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-blue-100 leading-tight mt-0.5">
            OFF
          </span>
        </div>
      )}

      {/* Top Bar: Stock Indicator on Right */}
      <div className="flex items-center justify-end gap-1 mb-2 z-10 pl-11 min-h-[18px]">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold ${
            isOutOfStock ? 'text-red-500' : 'text-emerald-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOutOfStock ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
            }`}
          />
          {isOutOfStock ? 'Out of stock' : 'In stock'}
        </span>
      </div>

      {/* Image container: Strict uniform height with object-contain */}
      <Link
        to={`/catalog/${product.slug}`}
        className="block h-44 sm:h-48 w-full overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center p-2 group-hover:opacity-95 transition relative border border-gray-100"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300 font-extrabold text-sm uppercase bg-gray-100">
            {product.name ? product.name.slice(0, 2) : 'ST'}
          </div>
        )}
      </Link>

      {/* Brand & Name */}
      <div className="mt-3 flex-1 flex flex-col">
        <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider line-clamp-1">
          {product.brand?.name || 'Siddhivinayak Fresh'}
        </span>

        <Link
          to={`/catalog/${product.slug}`}
          className="font-bold text-xs sm:text-sm text-gray-900 hover:text-primary-850 transition line-clamp-2 mt-0.5 leading-snug min-h-[2.5rem]"
          title={product.name}
        >
          {product.name}
        </Link>

        {/* Variant Pack Weight Chips (Direct on card) */}
        {variants.length > 1 ? (
          <div className="flex flex-wrap gap-1.5 my-2.5">
            {variants.map((v) => {
              const isSelected = v.id === currentVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariantId(v.id);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition border ${
                    isSelected
                      ? 'bg-primary-900 text-white border-primary-900 shadow-xs'
                      : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {v.attributeValue}
                </button>
              );
            })}
          </div>
        ) : currentVariant ? (
          <div className="my-2">
            <span className="text-[11px] text-gray-500 font-semibold">
              {currentVariant.attributeValue}
            </span>
          </div>
        ) : (
          <div className="my-2 text-[11px] text-gray-400">Single Pack</div>
        )}

        {/* Bottom Pricing & Add / Stepper Container */}
        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* Zepto-Style Dual Price */}
          {pricing ? (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-base sm:text-lg font-black text-emerald-700 leading-none">
                  ₹{pricing.price.toFixed(2)}
                </span>
                {pricing.hasDiscount && pricing.mrp > pricing.price && (
                  <span className="text-xs text-gray-400 font-semibold line-through">
                    ₹{pricing.mrp.toFixed(0)}
                  </span>
                )}
              </div>
              {pricing.hasDiscount && pricing.savings > 0 && (
                <span className="text-[9px] text-emerald-600 font-bold mt-0.5">
                  Save ₹{pricing.savings.toFixed(0)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unavailable</span>
          )}

          {/* Stepper or Add button */}
          {isOutOfStock ? (
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-400 border border-gray-200 cursor-not-allowed">
              Out of stock
            </span>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center border border-primary-800 rounded-lg overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={handleDecrement}
                className="p-1.5 text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                title="Decrease quantity"
              >
                <Minus size={13} className="stroke-[3]" />
              </button>
              <span className="px-2 text-xs font-black text-primary-800 select-none">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                className="p-1.5 text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                title="Increase quantity"
              >
                <Plus size={13} className="stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex items-center gap-1 rounded-xl bg-primary-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-900 active:scale-95 transition shadow-sm"
            >
              <Plus size={13} className="stroke-[3]" /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
