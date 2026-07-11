import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { API_BASE_URL } from '../services/api';
import { DollarSign, ShoppingBag, Users, Layers, AlertCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [metrics, setMetrics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('week');
  const [chartData, setChartData] = useState([]);

  const loadDashboardData = async (showLoader = false, targetDate = selectedDate, targetMode = viewMode) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    
    try {
      const metricsRes = await api.get('/api/admin/dashboard/metrics', {
        params: {
          date: targetDate,
          mode: targetMode
        }
      });
      const lowStockRes = await api.get('/api/admin/dashboard/low-stock');
      const ordersRes = await api.get('/api/admin/orders');

      if (metricsRes.data.success) {
        setMetrics(metricsRes.data.metrics);
        setChartData(metricsRes.data.chartData || []);
      }
      if (lowStockRes.data.success) setLowStock(lowStockRes.data.variants);
      if (ordersRes.data.success) setRecentOrders(ordersRes.data.orders.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadDashboardData(true, selectedDate, viewMode);

    const baseUrl = API_BASE_URL;
    let eventSource = null;
    let pollInterval = null;

    const handleRealtimeEvent = () => {
      loadDashboardData(false, selectedDate, viewMode);
    };

    try {
      eventSource = new EventSource(`${baseUrl}/api/store/events`);

      eventSource.addEventListener('ORDER_PLACED', handleRealtimeEvent);
      eventSource.addEventListener('ORDER_UPDATED', handleRealtimeEvent);

      eventSource.onerror = (err) => {
        console.warn('[AdminDashboard] SSE connection error, falling back to 10s polling:', err);
        eventSource.close();
        if (!pollInterval) {
          pollInterval = setInterval(() => {
            loadDashboardData(false, selectedDate, viewMode);
          }, 10000);
        }
      };
    } catch (err) {
      console.warn('[AdminDashboard] SSE initialization failed, falling back to 10s polling:', err);
      pollInterval = setInterval(() => {
        loadDashboardData(false, selectedDate, viewMode);
      }, 10000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isAuthenticated, user, navigate, selectedDate, viewMode]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin Console</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time store metrics, inventory, and order operations dashboard.</p>
        </div>
        <button
          onClick={() => loadDashboardData(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Syncing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Date Scope Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500">View Mode:</span>
          <div className="inline-flex rounded-xl bg-gray-50 p-1 border border-gray-100">
            <button
              onClick={() => setViewMode('week')}
              className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                viewMode === 'week'
                  ? 'bg-primary-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                viewMode === 'day'
                  ? 'bg-primary-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day View
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-500 self-start sm:self-auto">Select Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-850 shadow-sm"
          />
          {metrics && (
            <span className="text-[10px] font-bold text-primary-800 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 shrink-0">
              {viewMode === 'week' 
                ? `Week Range: ${new Date(metrics.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${new Date(metrics.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`
                : `Selected Date: ${new Date(metrics.startDate).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}`
              }
            </span>
          )}
        </div>
      </div>

      {/* 4 Cards Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {viewMode === 'week' ? 'Weekly Sales' : 'Daily Sales'}
              </span>
              <span className="block text-xl font-black text-gray-900 mt-0.5">₹{metrics.revenue.toLocaleString()}</span>
              <span className="text-[10px] text-gray-400 font-semibold">
                All-time: ₹{metrics.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-800">
              <ShoppingBag size={24} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {viewMode === 'week' ? 'Weekly Orders' : 'Daily Orders'}
              </span>
              <span className="block text-xl font-black text-gray-900 mt-0.5">{metrics.ordersCount}</span>
              <span className="text-[10px] text-gray-400 font-semibold">
                All-time: {metrics.totalOrders} orders
              </span>
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-800">
              <Users size={24} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customers</span>
              <span className="block text-xl font-black text-gray-900 mt-0.5">{metrics.totalCustomers}</span>
              <span className="text-[10px] text-gray-400 font-semibold">Active accounts</span>
            </div>
          </div>

          {/* Products Count */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
              <Layers size={24} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Staples</span>
              <span className="block text-xl font-black text-gray-900 mt-0.5">{metrics.totalProducts}</span>
              <span className={`text-[10px] font-bold ${lowStock.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {lowStock.length} low stock alerts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Sales Chart */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-6">
          Weekly Sales Revenue Overview ({metrics && `${new Date(metrics.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${new Date(metrics.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`})
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
              <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
              <Tooltip formatter={(value) => [`₹${value}`, 'Sales']} contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6' }} />
              <Line type="monotone" dataKey="sales" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Orders Stream */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Recent Orders</h3>
            <button onClick={() => navigate('/admin/orders')} className="text-xs font-bold text-primary-800 hover:underline flex items-center gap-0.5">
              Manage Orders <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">No orders placed recently.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center py-3 text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{order.orderNumber}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{order.recipientName} • {new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-gray-900 block">₹{Number(order.totalAmount).toFixed(0)}</span>
                    <span className="text-[9px] font-bold text-primary-850 uppercase">{order.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1">
              <AlertCircle size={18} className="text-red-500 animate-bounce" /> Low Stock Alerts
            </h3>
            <button onClick={() => navigate('/admin/inventory')} className="text-xs font-bold text-primary-800 hover:underline flex items-center gap-0.5">
              Refill Stock <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto no-scrollbar">
            {lowStock.length === 0 ? (
              <p className="text-xs text-emerald-600 py-6 text-center font-bold">✓ All product inventory levels are adequate.</p>
            ) : (
              lowStock.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 text-xs">
                  <div>
                    <span className="font-extrabold text-gray-900 block">{item.product?.name}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{item.attributeName}: {item.attributeValue}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600 block">{item.stock} left</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Limit &lt; 5</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
