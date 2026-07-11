import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { toast } from '../utils/toast';
import { downloadInvoicePdf } from '../utils/invoice';
import { ArrowLeft, Phone, MessageSquare, Loader2, Calendar, MapPin, CreditCard, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const storeSettings = useSelector((state) => state.store.settings);
  const phone = storeSettings?.phone_number || '+919999999999';
  const whatsapp = storeSettings?.whatsapp_number || '+919999999999';
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Poll for order status updates
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const fetchOrder = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const res = await api.get(`/api/orders/${id}`);
        if (res.data.success) {
          setOrder(res.data.order);
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve tracking info.');
      } finally {
        if (showLoader) setLoading(false);
      }
    };

    fetchOrder(true);

    // Setup polling every 10 seconds
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [id, isAuthenticated, navigate]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    try {
      const res = await api.post(`/api/orders/${id}/cancel`);
      if (res.data.success) {
        setOrder(prev => ({ ...prev, status: 'CANCELLED', cancelledAt: new Date() }));
      }
    } catch (err) {
      toast.error(err.message || 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  const getStepIndex = (status) => {
    const steps = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-xl text-center py-20 px-4">
        <h3 className="text-xl font-bold text-gray-900">Tracking details unavailable</h3>
        <p className="text-xs text-gray-500 mt-2">{error || 'Order could not be located.'}</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-primary-800 px-5 py-3 text-xs font-bold text-white hover:bg-primary-900 transition"
        >
          <ArrowLeft size={16} /> Back to My Orders
        </button>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REJECTED';

  // Construct absolute QR verification URL
  const qrVerifyUrl = `${window.location.origin}/delivery/verify?token=${encodeURIComponent(order.deliveryToken || '')}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Back button */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/orders" className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary-800 transition">
          <ArrowLeft size={16} /> My Orders
        </Link>
        <span className="text-xs font-bold text-gray-400">Order Number: {order.orderNumber}</span>
      </div>

      <div className="space-y-6">

        {/* Core tracking status card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-900">Track Progress</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase border ${isCancelled ? 'bg-red-50 text-red-700 border-red-100' : 'bg-primary-50 text-primary-800 border-primary-100'
              }`}>
              {order.status}
            </span>
          </div>

          {isCancelled ? (
            <div className="rounded-2xl bg-red-50 p-4 border border-red-100 flex items-start gap-3">
              <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-bold text-red-800">Order Cancelled or Rejected</h4>
                <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
                  This order was cancelled by you or rejected by the store. If this was an error, please browse our catalog and create a new order or call support at {phone}.
                </p>
              </div>
            </div>
          ) : (
            /* Progress Bar Stepper */
            <div className="relative">
              <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-gray-100"></div>
              {/* Stepper Progress color */}
              {currentStep > 0 && (
                <div
                  className="absolute left-4 top-1 w-0.5 bg-primary-800 transition-all duration-500"
                  style={{ height: `${(currentStep / 5) * 98}%` }}
                ></div>
              )}

              <div className="space-y-6">
                {[
                  { label: 'Order Submitted', desc: 'Waiting for store partner approval' },
                  { label: 'Order Confirmed', desc: 'Approved, items locked in stock' },
                  { label: 'Preparing Items', desc: 'Packing fresh goods and items' },
                  { label: 'Order Packed', desc: 'Ready for delivery driver dispatch' },
                  { label: 'Out for Delivery', desc: 'Driver is on the way to your door' },
                  { label: 'Delivered', desc: 'Package handed over successfully' }
                ].map((step, idx) => {
                  const isActive = idx <= currentStep;
                  return (
                    <div key={idx} className="flex items-start gap-4 pl-1.5 relative z-10">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black transition duration-300 ${isActive ? 'bg-primary-800 border-primary-800 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-400'
                        }`}>
                        {idx + 1}
                      </div>
                      <div className={isActive ? 'text-gray-900' : 'text-gray-450'}>
                        <h4 className="text-sm font-bold leading-none">{step.label}</h4>
                        <p className="text-[11px] text-gray-500 mt-1">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* QR Delivery verification panel (shown only when OUT_FOR_DELIVERY) */}
        {order.status === 'OUT_FOR_DELIVERY' && (
          <div className="bg-emerald-800 rounded-3xl p-6 text-white text-center space-y-5 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="relative space-y-2">
              <h3 className="text-lg font-extrabold flex items-center justify-center gap-1.5">
                <ShieldCheck size={20} className="text-emerald-300" /> Secure Delivery QR
              </h3>
              <p className="text-xs text-emerald-100 max-w-sm mx-auto">
                Show this QR code to {order.deliveryRiderName || 'our delivery boy'} when they arrive. Scanning this will automatically verify your order receipt.
              </p>
            </div>

            {/* QR Generation SVG */}
            <div className="relative flex justify-center">
              <div className="bg-white border-4 border-emerald-700 rounded-2xl p-4 shadow-xl">
                {order.deliveryToken ? (
                  <QRCodeSVG
                    value={order.deliveryToken || ''}
                    size={260}
                    level="L"
                    includeMargin={true}
                  />
                ) : (
                  <div className="h-40 w-40 flex items-center justify-center text-xs text-gray-400">Loading token...</div>
                )}
              </div>
            </div>

            {order.deliveryOtp && (
              <div className="bg-emerald-950 bg-opacity-30 border border-emerald-700 rounded-2xl p-4 max-w-xs mx-auto space-y-1">
                <span className="text-[9px] text-emerald-300 font-black uppercase tracking-widest block">Delivery Code (OTP)</span>
                <span className="text-2xl font-black tracking-widest text-white block">{order.deliveryOtp}</span>
                <span className="text-[10px] text-emerald-200 block font-semibold leading-relaxed">
                  Provide this 6-digit code if the rider is verifying manually.
                </span>
              </div>
            )}

            {order.deliveryRiderName && (
              <div className="text-xs text-emerald-100 font-semibold bg-emerald-850 py-2.5 px-4 rounded-xl border border-emerald-700 inline-block">
                Assigned Rider: <span className="text-white font-extrabold">{order.deliveryRiderName}</span> • Phone: <a href={`tel:${order.deliveryRiderPhone}`} className="text-emerald-300 underline font-extrabold">{order.deliveryRiderPhone}</a>
              </div>
            )}
          </div>
        )}

        {/* Order Details Accordion Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-900">Receipt Details</h3>
            <button
              onClick={() => downloadInvoicePdf(order)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              Print Invoice
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold text-gray-500">
            <div className="flex gap-3">
              <Calendar size={16} className="text-gray-450 shrink-0" />
              <div>
                <span className="block text-[10px] text-gray-450 uppercase">Order Date</span>
                <span className="text-gray-800">{new Date(order.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <MapPin size={16} className="text-gray-450 shrink-0" />
              <div>
                <span className="block text-[10px] text-gray-450 uppercase">Delivery Address</span>
                <span className="text-gray-800 leading-relaxed block max-w-md">{order.deliveryAddress}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <CreditCard size={16} className="text-gray-450 shrink-0" />
              <div>
                <span className="block text-[10px] text-gray-450 uppercase">Payment Method</span>
                <span className="text-gray-800">{order.paymentMethod === 'COD' ? 'Cash On Delivery' : 'UPI QR Pre-Pay'}</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Items breakdown list */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Items Purchased</span>
            <div className="divide-y divide-gray-50">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2.5 text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{item.productName}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{item.variantName} x {item.quantity}</span>
                  </div>
                  <span className="font-black text-gray-800">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-3 text-sm font-black text-gray-900">
              <span>Amount Billed</span>
              <span>₹{Number(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cancellation/Support actions footer */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="w-full sm:w-auto rounded-xl border border-red-200 bg-red-50 py-3 px-6 text-xs font-bold text-red-600 hover:bg-red-100 transition disabled:opacity-50 text-center"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          <div className="flex gap-2.5 w-full sm:w-auto justify-center">
            <a
              href={`tel:${phone}`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <Phone size={14} /> Call Partner
            </a>
            <a
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm"
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
          </div>
        </div>

      </div>

    </div>
  );
}
