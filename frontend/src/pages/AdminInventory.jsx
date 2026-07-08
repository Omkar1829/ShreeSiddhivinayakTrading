import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../utils/toast';
import { Loader2, ArrowLeft, RefreshCw, History, AlertTriangle, Search } from 'lucide-react';

export default function AdminInventory() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' or 'history'

  // Search and Filter states
  const [search, setSearch] = useState('');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Stock Adjustment Drawer
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('STOCK_ADDITION');
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const prodRes = await api.get('/api/products/admin/all');
      const txRes = await api.get('/api/admin/inventory/transactions');
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (txRes.data.success) setTransactions(txRes.data.transactions);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadInventoryData();
  }, [isAuthenticated, user, navigate]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustQty);
    if (!qty || qty === 0) {
      toast.warning('Please enter a non-zero quantity adjustment.');
      return;
    }

    // Determine correct quantity direction based on type
    let finalQty = qty;
    if (adjustType === 'STOCK_REDUCTION') {
      finalQty = -Math.abs(qty);
    } else if (adjustType === 'STOCK_ADDITION') {
      finalQty = Math.abs(qty);
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/inventory/adjust', {
        variantId: selectedVariant.id,
        quantity: finalQty,
        transactionType: adjustType,
        reason: adjustReason
      });

      if (res.data.success) {
        await loadInventoryData();
        setSelectedVariant(null);
        setAdjustQty('');
        setAdjustReason('');
        setAdjustType('STOCK_ADDITION');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to execute stock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  // Flatten products list into array of variants with search & filters applied
  const variantsList = products.reduce((acc, prod) => {
    if (prod.variants) {
      prod.variants.forEach(v => {
        // Apply category filter
        if (categoryFilter !== 'ALL' && prod.category?.name !== categoryFilter) {
          return;
        }

        const sku = prod.sku || v.id.slice(0, 8).toUpperCase();
        const productName = prod.name;

        // Apply search keyword filter
        if (search.trim()) {
          const s = search.toLowerCase();
          const matchesSearch = productName.toLowerCase().includes(s) || sku.toLowerCase().includes(s);
          if (!matchesSearch) return;
        }

        // Apply stock status filter
        if (stockStatus !== 'ALL') {
          if (stockStatus === 'IN_STOCK' && v.stock <= 5) return;
          if (stockStatus === 'LOW_STOCK' && (v.stock === 0 || v.stock > 5)) return;
          if (stockStatus === 'OUT_OF_STOCK' && v.stock > 0) return;
        }

        acc.push({
          ...v,
          productName,
          imageUrl: prod.imageUrl,
          sku,
          categoryName: prod.category?.name || 'Uncategorized'
        });
      });
    }
    return acc;
  }, []);

  const uniqueCategories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventory Control</h1>
            <p className="text-xs text-gray-500 mt-1">Audit variant stock counts, manually adjust levels, and check transactions history.</p>
          </div>
        </div>
        <button
          onClick={loadInventoryData}
          className="flex items-center gap-1 border rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <RefreshCw size={14} /> Refresh Stock
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-150">
        <button
          onClick={() => setActiveTab('levels')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'levels' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          Active Stock Levels ({variantsList.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'history' ? 'border-primary-800 text-primary-800' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
        >
          <History className="inline mr-1" size={16} /> Transaction History ({transactions.length})
        </button>
      </div>

      {activeTab === 'levels' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            {/* Search input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-250 py-2 pl-9 pr-4 text-xs text-gray-955 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-250 bg-white px-3 py-2 text-xs font-semibold text-gray-750 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className="rounded-xl border border-gray-250 bg-white px-3 py-2 text-xs font-semibold text-gray-750 focus:outline-none"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">In Stock (&gt; 5 units)</option>
              <option value="LOW_STOCK">Low Stock (1 - 5 units)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0 units)</option>
            </select>
          </div>
        </div>
      )}

      {activeTab === 'levels' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="p-4">SKU Reference</th>
                  <th className="p-4">Staple Name</th>
                  <th className="p-4">Option Details</th>
                  <th className="p-4 text-center">In Stock Count</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variantsList.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-mono font-bold text-gray-650">{v.sku}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                          {v.imageUrl && <img src={v.imageUrl} alt={v.productName} className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-extrabold text-gray-900">{v.productName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-800">{v.attributeName}: {v.attributeValue}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-black text-sm ${v.stock < 5 ? 'text-red-650 font-extrabold flex items-center justify-center gap-0.5' : 'text-gray-900'}`}>
                        {v.stock < 5 && <AlertTriangle size={14} className="text-red-500" />}
                        {v.stock} units
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedVariant(v)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 transition inline-flex items-center gap-1"
                      >
                        Adjust Levels
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Transactions History view */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Staple Product</th>
                  <th className="p-4">Option Size</th>
                  <th className="p-4 text-center">Qty Shift</th>
                  <th className="p-4">Transaction Type</th>
                  <th className="p-4">Audit Reason</th>
                  <th className="p-4">Executed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 text-gray-400 font-semibold">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="p-4 font-extrabold text-gray-900">{tx.variant?.product?.name}</td>
                    <td className="p-4 text-gray-700">{tx.variant?.attributeName}: {tx.variant?.attributeValue}</td>
                    <td className="p-4 text-center">
                      <span className={`font-black text-sm ${tx.quantity > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-lg bg-gray-50 border px-2 py-0.5 text-[9px] font-bold text-gray-650 uppercase">
                        {tx.transactionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium max-w-xs truncate">{tx.reason || 'No description provided.'}</td>
                    <td className="p-4 font-bold text-gray-800">{tx.adminUser?.name || 'System Auto'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Level Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Adjust Inventory Stock</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Modifying {selectedVariant.productName} ({selectedVariant.attributeValue})
              </p>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs font-semibold text-gray-750">
              <div className="rounded-xl bg-gray-50 p-3 text-[10px] text-gray-500 leading-snug border border-gray-150">
                Current Stock Level: <span className="font-extrabold text-gray-900">{selectedVariant.stock} units</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Adjustment Type</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white"
                  >
                    <option value="STOCK_ADDITION">Add Stock (+)</option>
                    <option value="STOCK_REDUCTION">Deduct Stock (-)</option>
                    <option value="MANUAL_ADJUSTMENT">Audit Adjust</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white text-center"
                    placeholder="e.g. 50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-1">Audit Log Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Received shipment, damage writeoff..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 text-xs focus:outline-none bg-white"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedVariant(null)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm"
                >
                  {submitting && <Loader2 className="animate-spin" size={12} />}
                  Confirm Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
