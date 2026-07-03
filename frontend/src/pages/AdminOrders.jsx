import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { Loader2, ArrowLeft, RefreshCw, ClipboardList, MapPin, Truck, ChevronDown, Check, X, ShieldAlert } from 'lucide-react';

export default function AdminOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [orders, setOrders] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  // Modal Assignments state
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [riders, setRiders] = useState([]);
  const [selectedRiderId, setSelectedRiderId] = useState('');

  // Modal Manual Order state
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [manualName, setManualName] = useState('Counter Sale');
  const [manualPhone, setManualPhone] = useState('9999999999');
  const [manualAddress, setManualAddress] = useState('Counter Store Sale');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');

  // Collapsed order ID details view state
  const [selectedOrderId, setSelectedOrderId] = useState('');

  useEffect(() => {
    if (location.state?.openPOS) {
      setIsManualOrderOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const loadOrdersData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const ordersRes = await api.get('/api/admin/orders');
      const prodRes = await api.get('/api/products/admin/all');
      const teamRes = await api.get('/api/admin/team');

      if (ordersRes.data.success) setOrders(ordersRes.data.orders);
      if (teamRes.data.success) {
        const activeRiders = teamRes.data.team.filter(t => t.role === 'DELIVERY');
        setRiders(activeRiders);
        if (activeRiders.length > 0) setSelectedRiderId(activeRiders[0].id);
      }
      
      // Flatten products to get list of active variants for manual orders lookup
      if (prodRes.data.success) {
        const flatVars = [];
        prodRes.data.products.forEach(p => {
          if (p.variants) {
            p.variants.forEach(v => {
              if (v.status === 'ACTIVE' && p.status === 'ACTIVE') {
                flatVars.push({
                  id: v.id,
                  label: `${p.name} (${v.attributeName}: ${v.attributeValue}) - Price: ₹${v.price} - Stock: ${v.stock}`
                });
              }
            });
          }
        });
        setVariants(flatVars);
        if (flatVars.length > 0) setSelectedVariantId(flatVars[0].id);
      }
    } catch (err) {
      console.error('Failed to load orders console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadOrdersData(true);

    const baseUrl = import.meta.env.VITE_API_URL || 'http://54.234.20.250:5000';
    const eventSource = new EventSource(`${baseUrl}/api/store/events`);

    const handleRealtimeEvent = () => {
      loadOrdersData(false);
    };

    eventSource.addEventListener('ORDER_PLACED', handleRealtimeEvent);
    eventSource.addEventListener('ORDER_UPDATED', handleRealtimeEvent);

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, user, navigate]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!window.confirm(`Advance order status to ${newStatus}?`)) return;

    setLoading(true);
    try {
      const res = await api.patch(`/api/admin/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        loadOrdersData();
      }
    } catch (err) {
      alert(err.message || 'Status transition failed.');
      setLoading(false);
    }
  };

  const handleAssignRiderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRiderId) {
      alert('Rider selection is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.patch(`/api/admin/orders/${assigningOrder.id}/assign-delivery`, {
        deliveryRiderId: selectedRiderId
      });

      if (res.data.success) {
        await loadOrdersData();
        setAssigningOrder(null);
      }
    } catch (err) {
      alert(err.message || 'Rider assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateManualOrder = async (e) => {
    e.preventDefault();
    if (!selectedVariantId || !selectedQty) {
      alert('Please select a product variant and quantity.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/orders/manual', {
        recipientName: manualName,
        recipientPhone: manualPhone,
        deliveryAddress: manualAddress,
        items: [{
          variantId: selectedVariantId,
          quantity: parseInt(selectedQty)
        }]
      });

      if (res.data.success) {
        await loadOrdersData();
        setIsManualOrderOpen(false);
        setManualName('Counter Sale');
        setManualPhone('9999999999');
        setManualAddress('Counter Store Sale');
        setSelectedQty('1');
      }
    } catch (err) {
      alert(err.message || 'Counter sale submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'ACTIVE') return ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'].includes(order.status);
    return order.status === activeTab;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'PROCESSING': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'PACKED': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'OUT_FOR_DELIVERY': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'DELIVERED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-100';
      case 'REJECTED': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-750 border-gray-150';
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders Desk</h1>
            <p className="text-xs text-gray-500 mt-1">Review incoming grocery orders, assign delivery drivers, and record counter sales.</p>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsManualOrderOpen(true)}
            className="rounded-xl border border-primary-800 px-4 py-2.5 text-xs font-bold text-primary-800 hover:bg-primary-50 transition shadow-sm"
          >
            Counter Sale POS
          </button>
          <button
            onClick={loadOrdersData}
            className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw size={14} /> Refresh Desk
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-150 gap-1 sm:gap-2">
        {['ALL', 'ACTIVE', 'PENDING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition ${activeTab === tab ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Orders list table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No orders found matching this filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => {
              const isSelected = selectedOrderId === order.id;
              return (
                <div key={order.id} className="p-5 hover:bg-gray-50/50 transition space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    
                    {/* Primary Meta */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">{order.orderNumber}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold">
                        Customer: <span className="text-gray-900">{order.recipientName} ({order.recipientPhone})</span> • {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Quick values & actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="text-left sm:text-right">
                        <span className="block font-black text-sm text-gray-900">₹{Number(order.totalAmount).toFixed(2)}</span>
                        <span className="block text-[10px] text-gray-400 font-bold">{order.paymentMethod === 'COD' ? 'COD' : 'UPI Pre-Pay'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Status workflow triggers */}
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                              className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-800 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'REJECTED')}
                              className="rounded-lg bg-red-50 text-red-600 px-2.5 py-1.5 text-[10px] font-bold border border-red-100 hover:bg-red-100 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                            className="rounded-lg bg-indigo-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-800 transition"
                          >
                            Start Pack
                          </button>
                        )}
                        {order.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'PACKED')}
                            className="rounded-lg bg-purple-750 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-purple-800 transition"
                          >
                            Finish Pack
                          </button>
                        )}
                        {order.status === 'PACKED' && (
                          <button
                            onClick={() => setAssigningOrder(order)}
                            className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-teal-800 transition flex items-center gap-0.5"
                          >
                            <Truck size={12} /> Dispatch Rider
                          </button>
                        )}

                        {/* Dropdown toggle */}
                        <button
                          onClick={() => setSelectedOrderId(isSelected ? '' : order.id)}
                          className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition"
                        >
                          <ChevronDown size={14} className={`transform transition duration-300 ${isSelected ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Accordion Details Panel */}
                  {isSelected && (
                    <div className="rounded-xl border border-gray-100 p-4 bg-gray-50 text-xs font-semibold text-gray-650 grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-down">
                      
                      {/* Products detail items */}
                      <div className="md:col-span-1 space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase font-black block border-b border-gray-200 pb-1">Items Summary</span>
                        <div className="space-y-1.5 divide-y divide-gray-150">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between pt-1.5">
                              <span>{item.productName} ({item.variantName}) x {item.quantity}</span>
                              <span className="text-gray-900 font-extrabold">₹{(Number(item.price) * item.quantity).toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping details */}
                      <div className="md:col-span-1 space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase font-black block border-b border-gray-200 pb-1">Delivery Target</span>
                        <p className="leading-relaxed flex gap-1.5">
                          <MapPin size={14} className="text-gray-450 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{order.deliveryAddress}</span>
                        </p>
                      </div>

                      {/* Delivery assignments details */}
                      <div className="md:col-span-1 space-y-2">
                        <span className="text-[10px] text-gray-400 uppercase font-black block border-b border-gray-200 pb-1">Rider Assignment</span>
                        {order.deliveryRiderName ? (
                          <div className="space-y-1">
                            <p className="text-gray-700">Rider: <span className="font-extrabold text-gray-900">{order.deliveryRiderName}</span></p>
                            <p className="text-gray-700">Phone: <span className="font-extrabold text-gray-900">{order.deliveryRiderPhone}</span></p>
                            {order.paymentMethod === 'COD' && (
                              <p className="text-gray-700">
                                Cash Status:{' '}
                                <span className={`font-black uppercase px-2 py-0.5 rounded text-[8px] ${
                                  order.cashCollected ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : 'bg-red-50 text-red-650 border border-red-100'
                                }`}>
                                  {order.cashCollected ? `₹${Number(order.totalAmount).toFixed(0)} Collected` : 'Pending Settle'}
                                </span>
                              </p>
                            )}
                            {order.deliveryToken && (
                              <div className="mt-2 text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg p-2 flex items-center gap-1.5 leading-snug">
                                <Check size={14} /> Signed verification QR token is active & pending rider scan
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-400 italic">No delivery driver assigned yet.</p>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dispatch Rider Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setAssigningOrder(null);
                loadOrdersData();
              }}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">Dispatch Order</h3>
              <p className="text-[10px] text-gray-500">Order: <span className="font-extrabold text-gray-800">{assigningOrder.orderNumber}</span></p>
            </div>

            {/* Option 1: Manual Dropdown Assignment */}
            <form onSubmit={handleAssignRiderSubmit} className="space-y-3 text-xs font-semibold text-gray-755 border-b border-gray-100 pb-4">
              <div>
                <label className="block text-[9px] text-gray-450 uppercase mb-1 font-bold">1. Assign Rider Manually</label>
                {riders.length === 0 ? (
                  <p className="text-red-500 italic text-[10px] py-1">
                    No active riders found! Add riders in Settings - Staff.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <select
                      value={selectedRiderId}
                      onChange={(e) => setSelectedRiderId(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white font-medium"
                      required
                    >
                      {riders.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name || 'Unnamed'} ({r.phone})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-lg bg-primary-800 px-3 py-2 text-[10px] font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm shrink-0"
                    >
                      {submitting && <Loader2 className="animate-spin" size={10} />}
                      Assign
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Option 2: QR Code Scan self-assignment */}
            <div className="space-y-3 text-center">
              <span className="block text-[9px] text-gray-450 uppercase font-bold text-left">2. Or Rider Scan QR Code</span>
              
              <div className="flex justify-center bg-gray-50 border border-gray-150 rounded-2xl p-4 shadow-inner">
                <QRCodeSVG value={assigningOrder.id} size={160} includeMargin={true} />
              </div>

              <p className="text-[10px] text-gray-500 font-semibold leading-relaxed px-2">
                Rider can scan this QR code with their mobile Rider Console to self-assign and pick up this order.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setAssigningOrder(null);
                  loadOrdersData();
                }}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-650 hover:bg-gray-50 transition shadow-sm"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Counter POS Manual Order Modal */}
      {isManualOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-gray-900">Counter Sale POS Entry</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Record counter sale. Stock is immediately decremented and order logged as DELIVERED.</p>
            </div>
            
            <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs font-semibold text-gray-750">
              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Counter Description</label>
                  <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Select Staple Variant *</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white truncate"
                  >
                    {variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Qty *</label>
                  <input
                    type="number"
                    min={1}
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none text-center bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsManualOrderOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || variants.length === 0}
                  className="rounded-lg bg-primary-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm"
                >
                  {submitting && <Loader2 className="animate-spin" size={12} />}
                  Complete POS Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
