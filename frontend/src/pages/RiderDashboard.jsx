import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearCredentials } from '../store/authSlice';
import api from '../services/api';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Truck,
  CheckCircle,
  Package,
  MapPin,
  Phone,
  QrCode,
  KeyRound,
  LogOut,
  Loader2,
  Camera,
  X,
  IndianRupee
} from 'lucide-react';

export default function RiderDashboard() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pickups'); // 'pickups' | 'deliveries' | 'completed'

  // COD Payment choice state
  const [codPaymentMode, setCodPaymentMode] = useState(null); // 'CASH' | 'SHOP_QR' | null
  const [showCodChoiceModal, setShowCodChoiceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'SCAN' | 'OTP', order }

  // Scanner Modal state
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState(null); // 'PICKUP' | 'DELIVERY'
  const [activeScanOrder, setActiveScanOrder] = useState(null);
  const [scannerError, setScannerError] = useState('');
  const qrRegionId = "rider-qr-reader";
  const scannerRef = useRef(null);

  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpOrder, setOtpOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Expandable details block
  const [expandedOrderId, setExpandedOrderId] = useState('');

  const loadRiderOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/delivery/assigned');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      console.error('Failed to load assigned rider orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'DELIVERY') {
      navigate('/');
      return;
    }
    loadRiderOrders();
  }, [isAuthenticated, user, navigate]);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  // Pickup operations
  const handlePickup = async (orderId) => {
    try {
      const res = await api.patch(`/api/delivery/orders/${orderId}/pickup`);
      if (res.data.success) {
        alert('Order picked up successfully! Drive safe.');
        loadRiderOrders(true);
      }
    } catch (err) {
      alert(err.message || 'Pickup registration failed.');
    }
  };

  // Trigger Delivery flow - handles COD check
  const triggerDeliveryAction = (type, order) => {
    if (order.paymentMethod === 'COD') {
      setPendingAction({ type, order });
      setShowCodChoiceModal(true);
    } else {
      // Pre-paid orders, bypass COD choice
      setCodPaymentMode(null);
      if (type === 'SCAN') {
        startCameraScanner('DELIVERY', order, null);
      } else {
        setOtpOrder(order);
        setOtpInput('');
        setShowOtpModal(true);
        setOtpError('');
      }
    }
  };

  // Start QR camera scanner
  const startCameraScanner = async (mode, order = null, selectedPaymentMode = null) => {
    setScannerMode(mode);
    setActiveScanOrder(order);
    setCodPaymentMode(selectedPaymentMode);
    setShowScanner(true);
    setScannerError('');

    setTimeout(async () => {
      try {
        const html5QrcodeScanner = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrcodeScanner;
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrcodeScanner.start(
          { facingMode: "environment" },
          config,
          handleScanSuccess,
          handleScanError
        );
      } catch (err) {
        console.error('Camera init error:', err);
        setScannerError('Could not access camera. Please check permissions.');
      }
    }, 300);
  };

  // Stop QR scanner
  const stopCameraScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
    setShowScanner(false);
    setScannerMode(null);
    setActiveScanOrder(null);
  };

  // Scan handler
  const handleScanSuccess = async (decodedText) => {
    await stopCameraScanner();
    setLoading(true);

    try {
      if (scannerMode === 'PICKUP') {
        const orderId = decodedText.trim();
        const res = await api.post('/api/delivery/scan-pickup', { orderId });
        if (res.data.success) {
          alert('Pickup registered successfully via scanner!');
          loadRiderOrders(true);
        }
      } else if (scannerMode === 'DELIVERY') {
        let token = decodedText;
        if (decodedText.includes('token=')) {
          const urlObj = new URL(decodedText);
          token = urlObj.searchParams.get('token');
        }

        const res = await api.post('/api/delivery/verify', { token, codPaymentMode });
        if (res.data.success) {
          alert(`Delivery confirmed for Order ${res.data.orderNumber}!`);
          loadRiderOrders(true);
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message || 'QR Verification failed.';
      alert(errMsg);
      setLoading(false);
    }
  };

  const handleScanError = () => {
    // Silent
  };

  // OTP complete delivery
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (otpInput.length !== 6) {
      setOtpError('OTP must be exactly 6 digits.');
      return;
    }

    setOtpSubmitting(true);
    try {
      const res = await api.post(`/api/delivery/orders/${otpOrder.id}/verify-otp`, { 
        otp: otpInput,
        codPaymentMode
      });
      if (res.data.success) {
        alert('Delivery OTP verified. Order completed!');
        setShowOtpModal(false);
        setOtpInput('');
        loadRiderOrders(true);
      }
    } catch (err) {
      setOtpError(err.response?.data?.error?.message || err.message || 'Incorrect OTP code.');
    } finally {
      setOtpSubmitting(false);
    }
  };

  // Filter list
  const pickups = orders.filter(o => ['CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.status));
  const deliveries = orders.filter(o => o.status === 'OUT_FOR_DELIVERY');
  const completed = orders.filter(o => o.status === 'DELIVERED');

  const totalCashCollected = completed
    .filter(o => o.paymentMethod === 'COD' && o.cashCollected)
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 flex flex-col">
      
      {/* Header bar */}
      <header className="bg-primary-950 text-white p-4 shrink-0 shadow-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-800 flex items-center justify-center font-black text-xs text-white">R</div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase">SST Rider Desk</h1>
            <span className="block text-[9px] text-emerald-400 font-semibold">{user?.name}</span>
          </div>
        </div>

        <button 
          onClick={handleLogout} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 rounded-xl text-red-400 hover:text-red-300 transition text-[10px] font-bold"
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </header>

      {/* Primary KPI box for cash collections */}
      {totalCashCollected > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-150 p-4 shrink-0 flex items-center justify-between text-xs font-bold text-emerald-800">
          <span className="flex items-center gap-1.5"><IndianRupee size={15} /> Cash Collected (To Settle)</span>
          <span className="font-black text-sm">₹{totalCashCollected.toLocaleString()}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-white border-b border-gray-150 sticky top-[68px] z-20 shadow-sm shrink-0">
        <button
          onClick={() => setActiveTab('pickups')}
          className={`py-3 text-xs font-bold border-b-2 text-center transition ${activeTab === 'pickups' ? 'border-primary-800 text-primary-800 bg-primary-50/10' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Pickups ({pickups.length})
        </button>
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`py-3 text-xs font-bold border-b-2 text-center transition ${activeTab === 'deliveries' ? 'border-primary-800 text-primary-800 bg-primary-50/10' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Deliveries ({deliveries.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`py-3 text-xs font-bold border-b-2 text-center transition ${activeTab === 'completed' ? 'border-primary-800 text-primary-800 bg-primary-50/10' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Delivered ({completed.length})
        </button>
      </div>

      {/* Main List panel */}
      <div className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        
        {/* Quick action pickup scan */}
        {activeTab === 'pickups' && (
          <button
            onClick={() => startCameraScanner('PICKUP')}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary-850 p-4 text-xs font-bold text-white hover:bg-primary-900 shadow-md transition"
          >
            <Camera size={18} /> Scan Store Order Slip to Pick Up
          </button>
        )}

        <div className="space-y-4">
          
          {/* Pickups View */}
          {activeTab === 'pickups' && pickups.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <Package className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-xs text-gray-500">No shipments ready for store pick up.</p>
            </div>
          )}

          {activeTab === 'pickups' && pickups.map(order => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3 transition hover:shadow-md">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{order.orderNumber}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${order.status === 'PACKED' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.status}
                  </span>
                </div>

                <div className="text-xs text-gray-600 font-semibold space-y-1">
                  <div className="flex gap-1.5"><MapPin size={14} className="text-gray-400 shrink-0" /><span className="truncate">{order.deliveryAddress}</span></div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? '' : order.id)}
                    className="flex-1 rounded-xl border py-2.5 text-[10px] font-bold text-gray-650 hover:bg-gray-50 transition"
                  >
                    {isExpanded ? 'Hide Items' : 'View Items'}
                  </button>
                  <button
                    onClick={() => handlePickup(order.id)}
                    className="flex-1 rounded-xl bg-primary-800 py-2.5 text-[10px] font-bold text-white hover:bg-primary-900 transition"
                  >
                    Mark Picked Up
                  </button>
                </div>

                {isExpanded && (
                  <div className="rounded-xl bg-gray-50 p-3.5 text-[11px] font-semibold text-gray-650 space-y-1 border border-gray-150">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 block mb-1 font-black">Bag Items</span>
                    {order.items?.map(it => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.productName} ({it.variantName})</span>
                        <span className="text-gray-900 font-black">x {it.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Deliveries View */}
          {activeTab === 'deliveries' && deliveries.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <Truck className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-xs text-gray-500">No active shipments in transit.</p>
            </div>
          )}

          {activeTab === 'deliveries' && deliveries.map(order => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4 hover:shadow-md transition">
                
                {/* Meta details */}
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{order.orderNumber}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{order.paymentMethod === 'COD' ? '💰 Cash On Delivery' : '💳 Pre-Paid UPI'}</span>
                  </div>
                  <span className="rounded-full bg-teal-50 border border-teal-150 px-2.5 py-0.5 text-[9px] font-black text-teal-700 uppercase">
                    IN TRANSIT
                  </span>
                </div>

                {/* Shipping target card */}
                <div className="rounded-2xl bg-gray-550/5 border border-gray-150 p-3 text-xs font-semibold text-gray-700 space-y-2">
                  <div className="flex gap-1.5"><MapPin size={15} className="text-primary-850 shrink-0 mt-0.5" /><span>{order.deliveryAddress}</span></div>
                  <div className="flex gap-1.5 items-center"><Phone size={14} className="text-gray-400 shrink-0" /><span>{order.recipientName} ({order.recipientPhone})</span></div>
                  
                  {order.paymentMethod === 'COD' && (
                    <div className="mt-1 bg-amber-50 border border-amber-150 rounded-xl p-2.5 text-amber-850 flex items-center justify-between text-[11px]">
                      <span>Collect Cash</span>
                      <span className="font-black text-sm">₹{Number(order.totalAmount).toFixed(0)}</span>
                    </div>
                  )}
                </div>

                {/* Multi complete options */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => triggerDeliveryAction('SCAN', order)}
                    className="flex items-center justify-center gap-1 rounded-xl bg-primary-800 py-3 font-bold text-white hover:bg-primary-900 transition shadow-sm"
                  >
                    <QrCode size={15} /> Scan customer QR
                  </button>

                  <button
                    onClick={() => triggerDeliveryAction('OTP', order)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-primary-800 py-3 font-bold text-primary-800 hover:bg-primary-50 transition"
                  >
                    <KeyRound size={15} /> Enter Delivery OTP
                  </button>
                </div>

                {/* Details toggle */}
                <button
                  onClick={() => setExpandedOrderId(isExpanded ? '' : order.id)}
                  className="w-full rounded-xl border py-2 text-[10px] font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  {isExpanded ? 'Hide Bag Items' : 'View Bag Items'}
                </button>

                {isExpanded && (
                  <div className="rounded-xl bg-gray-50 p-3 text-[11px] font-semibold text-gray-650 space-y-1">
                    {order.items?.map(it => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.productName} ({it.variantName})</span>
                        <span className="text-gray-900 font-black">x {it.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}

          {/* Delivered View */}
          {activeTab === 'completed' && completed.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
              <CheckCircle className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="text-xs text-gray-500">No completed orders today.</p>
            </div>
          )}

          {activeTab === 'completed' && completed.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-gray-900">{order.orderNumber}</span>
                <span className="text-emerald-700 font-bold flex items-center gap-0.5"><CheckCircle size={14} /> Delivered</span>
              </div>
              <p className="text-[10px] text-gray-400 font-semibold">
                Recipient: {order.recipientName} • {order.codPaymentMode === 'SHOP_QR' ? 'UPI QR Payment' : 'Cash Payment'}
              </p>
              
              {order.paymentMethod === 'COD' && (
                <div className="flex justify-between font-bold border-t border-dashed pt-2 mt-2">
                  <span className="text-gray-500">COD Collected:</span>
                  <span className={order.cashCollected ? 'text-emerald-700 font-black' : 'text-red-500'}>
                    {order.cashCollected ? `₹${Number(order.totalAmount).toFixed(0)}` : 'Pending Settle'}
                  </span>
                </div>
              )}
            </div>
          ))}

        </div>

      </div>

      {/* 1. CAMERA SCANNER MODAL VIEW */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col justify-center p-4">
          <div className="max-w-md w-full mx-auto space-y-4">
            <div className="flex justify-between items-center text-white p-2">
              <h2 className="text-sm font-bold flex items-center gap-1">
                <Camera size={18} /> {scannerMode === 'PICKUP' ? 'Scan Store Order Slip' : 'Scan Customer Delivery QR'}
              </h2>
              <button onClick={stopCameraScanner} className="p-1 text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-dashed border-emerald-500">
              <div id={qrRegionId} className="h-full w-full"></div>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="h-60 w-60 border-2 border-dashed border-emerald-500 rounded-lg bg-emerald-500 bg-opacity-5"></div>
              </div>
            </div>

            {scannerError && (
              <div className="rounded-xl bg-red-950 text-red-400 border border-red-900 p-3 text-xs text-center">
                {scannerError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MANUAL OTP ENTRY MODAL */}
      {showOtpModal && otpOrder && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowOtpModal(false);
                setOtpInput('');
              }}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-black text-gray-900">Verify Delivery OTP</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Enter the 6-digit confirmation OTP shown on the customer's tracking screen.</p>
            </div>

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-full tracking-[1.5em] text-center rounded-2xl border border-gray-250 py-3 text-lg font-black focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="000000"
                required
              />

              {otpError && (
                <div className="rounded-xl bg-red-50 text-red-650 border border-red-100 p-2.5 text-[10px] text-center font-bold">
                  {otpError}
                </div>
              )}

              <button
                type="submit"
                disabled={otpSubmitting || otpInput.length !== 6}
                className="w-full rounded-2xl bg-primary-850 py-3 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center justify-center gap-1.5 shadow-md disabled:bg-gray-300 disabled:shadow-none"
              >
                {otpSubmitting && <Loader2 className="animate-spin" size={14} />}
                Confirm Delivery
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. COD PAYMENT MODE SELECTION CHOICE MODAL */}
      {showCodChoiceModal && pendingAction && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowCodChoiceModal(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-gray-900">COD Collection Mode</h3>
              <p className="text-[10px] text-gray-500">Specify payment type for Order {pendingAction.order.orderNumber}</p>
            </div>

            <div className="bg-amber-50 border border-amber-150 rounded-2xl p-4 text-center">
              <span className="text-[10px] text-amber-700 font-bold block">Collect Total COD Cash</span>
              <span className="text-2xl font-black text-amber-850">₹{Number(pendingAction.order.totalAmount).toFixed(0)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const order = pendingAction.order;
                  const type = pendingAction.type;
                  setShowCodChoiceModal(false);
                  setPendingAction(null);
                  if (type === 'SCAN') {
                    startCameraScanner('DELIVERY', order, 'CASH');
                  } else {
                    setOtpOrder(order);
                    setCodPaymentMode('CASH');
                    setOtpInput('');
                    setShowOtpModal(true);
                    setOtpError('');
                  }
                }}
                className="rounded-xl border border-primary-800 bg-white py-3 text-xs font-bold text-primary-800 hover:bg-primary-50 transition text-center shadow-sm"
              >
                💵 Collected Cash
              </button>

              <button
                onClick={() => {
                  const order = pendingAction.order;
                  const type = pendingAction.type;
                  setShowCodChoiceModal(false);
                  setPendingAction(null);
                  if (type === 'SCAN') {
                    startCameraScanner('DELIVERY', order, 'SHOP_QR');
                  } else {
                    setOtpOrder(order);
                    setCodPaymentMode('SHOP_QR');
                    setOtpInput('');
                    setShowOtpModal(true);
                    setOtpError('');
                  }
                }}
                className="rounded-xl bg-primary-800 py-3 text-xs font-bold text-white hover:bg-primary-900 transition text-center shadow-sm"
              >
                📱 Paid on Shop QR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
