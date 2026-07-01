import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { removeFromCart, updateQuantity, selectCartTotal, clearCart } from '../store/cartSlice';
import { selectIsStoreOpen } from '../store/storeSlice';
import LoginModal from '../components/LoginModal';
import { Trash2, ShoppingCart, ArrowRight, ArrowLeft, Clock, AlertTriangle } from 'lucide-react';

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector((state) => state.cart.items);
  const cartTotal = useSelector(selectCartTotal);
  const isStoreOpen = useSelector(selectIsStoreOpen);
  const storeSettings = useSelector((state) => state.store.settings);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleCheckoutClick = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
    } else {
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center py-20 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-400 mx-auto mb-4 border border-gray-100">
          <ShoppingCart size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-xs text-gray-500 mt-2">Looks like you haven't added any grocery items to your basket yet.</p>
        <Link
          to="/catalog"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary-800 px-5 py-3 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
        >
          <ArrowLeft size={16} /> Start Browsing Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-8">Shopping Cart</h1>

      {/* Store Closed Warning Banner */}
      {!isStoreOpen && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-100 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Store is Currently Closed</h4>
            <p className="text-xs text-amber-600 mt-0.5 leading-relaxed">
              We are closed right now. You can still customize your cart basket, but checkout is disabled until we open at {storeSettings?.opening_time || '08:00 AM'}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-150">
              {cartItems.map((item) => (
                <div key={item.variantId} className="flex gap-4 p-4 items-center">
                  
                  {/* Image */}
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300 font-bold text-[10px] uppercase bg-gray-100">
                        {item.name.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      {item.variantName}
                    </span>
                    <Link to={`/catalog/${item.productId}`} className="font-bold text-sm text-gray-900 hover:text-primary-850 truncate block mt-0.5">
                      {item.name}
                    </Link>
                    <span className="block text-xs font-black text-gray-800 mt-1">
                      ₹{item.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity Actions Stepper */}
                  <div className="flex items-center border border-primary-850 rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => dispatch(updateQuantity({ variantId: item.variantId, quantity: item.quantity - 1 }))}
                      className="px-2.5 py-1 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-black text-primary-800 bg-white">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ variantId: item.variantId, quantity: item.quantity + 1 }))}
                      className="px-2.5 py-1 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 transition"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => dispatch(removeFromCart(item.variantId))}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-650 hover:bg-red-50 transition shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              ))}
            </div>
            
            {/* Clear Cart Button */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 text-right">
              <button
                onClick={() => dispatch(clearCart())}
                className="text-xs font-bold text-red-600 hover:text-red-700 transition"
              >
                Clear Cart Basket
              </button>
            </div>

          </div>
        </div>

        {/* Right Side: Order Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6 sticky top-24">
            <h3 className="text-base font-bold text-gray-900">Checkout Summary</h3>
            
            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between text-gray-555">
                <span>Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-555">
                <span>Delivery Fees</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-base font-black text-gray-900">
                <span>Grand Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkouts Actions */}
            {isStoreOpen ? (
              <button
                onClick={handleCheckoutClick}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary-800 py-3.5 px-4 text-sm font-bold text-white hover:bg-primary-900 transition shadow-md"
              >
                {isAuthenticated ? 'Proceed to Address Checkout' : 'Login to Checkout'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                disabled
                className="w-full rounded-xl bg-gray-200 py-3.5 px-4 text-sm font-bold text-gray-400 cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Clock size={16} /> Checkout Closed
              </button>
            )}

            <div className="text-center">
              <Link to="/catalog" className="text-xs font-bold text-primary-800 hover:underline">
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Login modal if checkout clicked by guest */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

    </div>
  );
}
