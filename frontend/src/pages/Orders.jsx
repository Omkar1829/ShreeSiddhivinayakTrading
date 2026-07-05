import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart } from '../store/cartSlice';
import api from '../services/api';
import { downloadInvoicePdf } from '../utils/invoice';
import { ShoppingBag, ChevronRight, Loader2, Calendar, ClipboardCheck } from 'lucide-react';

export default function Orders() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'past'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/api/orders');
        if (res.data.success) {
          setOrders(res.data.orders);
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve order history.');
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [isAuthenticated, navigate]);

  // Separate active and past orders
  const activeStates = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'OUT_FOR_DELIVERY'];
  const activeOrders = orders.filter(o => activeStates.includes(o.status));
  const pastOrders = orders.filter(o => !activeStates.includes(o.status));

  const handleReorder = async (orderId) => {
    try {
      const res = await api.get(`/api/orders/${orderId}`);
      if (res.data.success) {
        const items = res.data.order.items;
        // Fetch current active products in backend to verify stock (simplified client-side merge)
        for (const item of items) {
          if (item.variantId) {
            dispatch(addToCart({
              variantId: item.variantId,
              productId: item.productId,
              name: item.productName,
              variantName: item.variantName,
              price: item.price,
              quantity: item.quantity,
              imageUrl: null, // Image can fall back to null
              stock: 999 // Assume instock, Redux caps at checkout if insufficient
            }));
          }
        }
        navigate('/cart');
      }
    } catch (err) {
      alert('Failed to reorder items. Some variants may no longer be available.');
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      const res = await api.get(`/api/orders/${orderId}`);
      if (res.data.success) {
        downloadInvoicePdf(res.data.order);
      }
    } catch (err) {
      alert('Failed to load invoice details.');
    }
  };

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
      default: return 'bg-gray-50 text-gray-700 border-gray-150';
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-8">My Orders</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-150 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'active' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'past' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {(activeTab === 'active' ? activeOrders : pastOrders).length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <ClipboardCheck size={44} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No {activeTab} orders found.</p>
          </div>
        ) : (
          (activeTab === 'active' ? activeOrders : pastOrders).map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-gray-900">{order.orderNumber}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-gray-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                  <span>
                    Total: <span className="text-gray-900 font-black">₹{Number(order.totalAmount).toFixed(2)}</span>
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
                <button
                  onClick={() => handleDownloadInvoice(order.id)}
                  className="flex-1 sm:flex-none text-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
                >
                  Print Bill
                </button>
                <Link
                  to={`/orders/${order.id}`}
                  className="flex-1 sm:flex-none text-center rounded-xl bg-primary-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-md"
                >
                  Track Order
                </Link>
                {activeTab === 'past' && (
                  <button
                    onClick={() => handleReorder(order.id)}
                    className="flex-1 sm:flex-none rounded-xl bg-indigo-750 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-855 transition shadow-md"
                  >
                    Reorder
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
