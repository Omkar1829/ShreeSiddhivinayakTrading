import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { clearCart, selectCartTotal } from '../store/cartSlice';
import api from '../services/api';
import { toast } from '../utils/toast';
import { MapPin, Plus, CheckCircle, Loader2, ArrowLeft, ShieldCheck, Wallet, QrCode } from 'lucide-react';

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector((state) => state.cart.items);
  const cartTotal = useSelector(selectCartTotal);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);

  // Address Form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Redirect if cart is empty or not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/cart');
      return;
    }
    if (cartItems.length === 0) {
      navigate('/catalog');
    }
  }, [isAuthenticated, cartItems.length, navigate]);

  // Load saved addresses
  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await api.get('/api/addresses');
      if (res.data.success) {
        setAddresses(res.data.addresses);
        // Default to first address or default address
        const def = res.data.addresses.find(a => a.isDefault);
        if (def) {
          setSelectedAddressId(def.id);
        } else if (res.data.addresses.length > 0) {
          setSelectedAddressId(res.data.addresses[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setAddressError('');
    if (!recipientName || !recipientPhone || !addressLine1 || !postalCode) {
      setAddressError('Please fill in all required fields.');
      return;
    }

    setAddressSubmitting(true);
    try {
      const res = await api.post('/api/addresses', {
        recipientName,
        recipientPhone,
        addressLine1,
        addressLine2,
        landmark,
        city: 'Panvel',
        state: 'Maharashtra',
        postalCode,
        isDefault: addresses.length === 0 // Make default if first address
      });

      if (res.data.success) {
        // Reload addresses list and select the newly created address
        await loadAddresses();
        setSelectedAddressId(res.data.address.id);
        setShowAddressForm(false);
        // Reset form
        setRecipientName('');
        setRecipientPhone('');
        setAddressLine1('');
        setAddressLine2('');
        setLandmark('');
        setPostalCode('');
      }
    } catch (err) {
      setAddressError(err.message || 'Failed to save shipping address.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.warning('Please select or add a shipping address.');
      return;
    }

    setLoading(true);
    try {
      const orderItems = cartItems.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }));

      const res = await api.post('/api/orders', {
        addressId: selectedAddressId,
        paymentMethod,
        items: orderItems
      });

      if (res.data.success) {
        dispatch(clearCart());
        navigate(`/orders/${res.data.order.id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Checkout failed. Please review stock availability.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      <div className="flex items-center gap-2 mb-8">
        <Link to="/cart" className="text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Checkout Order</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Address & Payment Selection */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Shipping Address Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <MapPin size={18} className="text-primary-850" /> Shipping Address
              </h3>
              {!showAddressForm && (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="text-xs font-bold text-primary-800 hover:text-primary-900 transition flex items-center gap-0.5"
                >
                  <Plus size={14} /> Add New Address
                </button>
              )}
            </div>

            {showAddressForm ? (
              <form onSubmit={handleAddAddress} className="rounded-xl border border-gray-100 p-4 space-y-4 bg-gray-50">
                <h4 className="text-xs font-bold text-gray-800">New Address Details</h4>
                {addressError && (
                  <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-100">
                    {addressError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient Phone *</label>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Street Address Details *</label>
                  <input
                    type="text"
                    placeholder="House No, Building Name, Street..."
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Landmark / Locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Uran Naka Circle"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pincode *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-center"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addressSubmitting}
                    className="rounded-lg bg-primary-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1"
                  >
                    {addressSubmitting && <Loader2 className="animate-spin" size={12} />}
                    Save Address
                  </button>
                </div>
              </form>
            ) : addressesLoading ? (
              <div className="flex py-6 justify-center">
                <Loader2 className="animate-spin text-primary-850" size={20} />
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">No saved addresses found. Please add a shipping address to proceed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition shadow-sm ${selectedAddressId === addr.id ? 'border-primary-800 bg-primary-50' : 'border-gray-150 hover:bg-gray-50'}`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-black text-gray-900">{addr.recipientName}</span>
                      {selectedAddressId === addr.id && <CheckCircle size={14} className="text-primary-850" />}
                    </div>
                    <span className="text-[10px] font-bold text-accent-700 mt-0.5">{addr.recipientPhone}</span>
                    <span className="text-[11px] text-gray-600 leading-snug mt-2 line-clamp-3">
                      {addr.addressLine1}, {addr.addressLine2 ? addr.addressLine2 + ', ' : ''}{addr.landmark ? addr.landmark + ', ' : ''}{addr.city}, {addr.state} - {addr.postalCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Selection Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Payment Option</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* COD */}
              <button
                onClick={() => setPaymentMethod('COD')}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${paymentMethod === 'COD' ? 'border-primary-800 bg-primary-50' : 'border-gray-150 hover:bg-gray-50'}`}
              >
                <Wallet className="text-primary-800 mt-0.5" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-gray-950">Cash On Delivery (COD)</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Pay with physical cash or your own UPI scanner app upon doorstep arrival.</p>
                </div>
              </button>

              {/* Static QR Payment Display */}
              <button
                onClick={() => setPaymentMethod('QR_PAYMENT')}
                className={`flex items-start gap-3 p-4 rounded-xl border text-left transition ${paymentMethod === 'QR_PAYMENT' ? 'border-primary-800 bg-primary-50' : 'border-gray-150 hover:bg-gray-50'}`}
              >
                <QrCode className="text-primary-800 mt-0.5" size={20} />
                <div>
                  <h4 className="text-xs font-bold text-gray-950">UPI QR Pay Ahead</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Scan our shop's static QR code now, complete UPI transaction, and show proof on delivery.</p>
                </div>
              </button>
            </div>

            {/* If QR display selected, show instructions */}
            {paymentMethod === 'QR_PAYMENT' && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col sm:flex-row items-center gap-6 justify-center">
                {/* Mock static UPI QR Code */}
                <div className="bg-white border border-gray-200 rounded-lg p-2 shrink-0">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=siddhivinayaksales@upi%26pn=Siddhivinayak%2520Trading%26am=0.00"
                    alt="Store UPI QR Code"
                    className="h-28 w-28 object-contain"
                  />
                  <span className="block text-[8px] text-center text-gray-400 font-bold mt-1 uppercase">SST Store UPI ID</span>
                </div>
                <div className="space-y-2 text-xs font-medium text-gray-700">
                  <p className="font-bold text-gray-900">How to pay ahead:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-gray-500">
                    <li>Scan this QR using GPay, PhonePe, Paytm, or any BHIM UPI app.</li>
                    <li>Enter amount: <span className="font-extrabold text-gray-900">₹{cartTotal.toFixed(2)}</span></li>
                    <li>Complete transaction and note down UPI transaction Ref ID.</li>
                    <li>Our delivery boy will verify this payment proof upon doorstep package arrival.</li>
                  </ol>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Order Review Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6 sticky top-24">
            <h3 className="text-base font-bold text-gray-900">Review Basket</h3>
            
            <div className="max-h-56 overflow-y-auto space-y-3 divide-y divide-gray-50 pr-1 no-scrollbar">
              {cartItems.map((item, index) => (
                <div key={item.variantId} className={`flex justify-between text-xs pt-3 ${index === 0 ? 'pt-0 border-0' : ''}`}>
                  <div className="max-w-[70%]">
                    <span className="font-bold text-gray-900 block truncate">{item.name}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{item.variantName} x {item.quantity}</span>
                  </div>
                  <span className="font-black text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <hr className="border-gray-100" />

            <div className="space-y-3 text-sm font-medium">
              <div className="flex justify-between text-gray-550">
                <span>Cart Subtotal</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-550">
                <span>Shipping Fees</span>
                <span className="text-emerald-600 font-bold">FREE</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-base font-black text-gray-900">
                <span>Final Billing</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddressId}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-accent-600 py-3.5 px-4 text-sm font-bold text-white hover:bg-accent-700 transition shadow-md disabled:bg-gray-300 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Creating Order...
                </>
              ) : (
                <>
                  Place Order (₹{cartTotal.toFixed(2)})
                </>
              )}
            </button>

            {/* Local Security Badges */}
            <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Checked, verified, & secured checkout</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
