import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../utils/toast';
import { Loader2, ArrowLeft, Users, RefreshCw, Search, Power, Trash2, ShieldAlert } from 'lucide-react';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  // Search and pagination state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalCustomers, setTotalCustomers] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page to 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const loadCustomers = useCallback(async (showLoader = true, searchStr = debouncedSearch, pageNum = page) => {
    if (showLoader) setLoading(true);
    try {
      const offset = (pageNum - 1) * limit;
      const res = await api.get(`/api/admin/users?search=${encodeURIComponent(searchStr)}&limit=${limit}&offset=${offset}`);
      if (res.data.success) {
        setCustomers(res.data.customers);
        if (res.data.pagination) {
          setTotalCustomers(res.data.pagination.total);
        } else {
          setTotalCustomers(res.data.customers.length);
        }
      }
    } catch (err) {
      console.error('Failed to load customers list:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit]);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadCustomers(true, debouncedSearch, page);
  }, [isAuthenticated, user, navigate, loadCustomers, debouncedSearch, page]);

  const handleToggleDeactivate = async (customer) => {
    const actionText = customer.isDeactivated ? 'reactivate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} customer account "${customer.name}" (${customer.phone})?`)) {
      return;
    }

    setActionId(customer.id);
    try {
      const res = await api.patch(`/api/admin/users/${customer.id}/toggle-status`);
      if (res.data.success) {
        toast.success(res.data.message || `Customer ${actionText}d successfully.`);
        loadCustomers(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || `Failed to ${actionText} customer.`);
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`🚨 PERMANENT DELETE WARNING: Are you sure you want to permanently delete customer account "${customer.name}" (${customer.phone})? This action cannot be undone.`)) {
      return;
    }

    setActionId(customer.id);
    try {
      const res = await api.delete(`/api/admin/users/${customer.id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Customer deleted successfully.');
        loadCustomers(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete customer.');
    } finally {
      setActionId(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Users size={24} className="text-primary-850" /> Customer Directory
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Directory of registered shopper accounts. Store admins and delivery riders are managed in Store Settings.</p>
          </div>
        </div>
        
        <button
          onClick={() => loadCustomers(true)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh Directory
        </button>
      </div>

      {/* Search Input bar */}
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-250 py-2.5 pl-9 pr-4 text-xs text-gray-950 focus:border-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-800 shadow-xs"
        />
      </div>

      {/* Customer List table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
        {customers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={44} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 font-medium">No registered customers found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Registered On</th>
                  <th className="p-4 text-center">Orders Placed</th>
                  <th className="p-4 text-right">Lifetime Spend</th>
                  <th className="p-4 text-center">Account Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => {
                  const isBusy = actionId === c.id;
                  return (
                    <tr key={c.id} className={`hover:bg-gray-50/50 transition ${c.isDeactivated ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-extrabold text-gray-900 flex items-center gap-2">
                        {c.name}
                        {c.isDeactivated && (
                          <span className="text-[10px] text-red-600 font-semibold italic">(Deactivated)</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-gray-600">{c.phone}</td>
                      <td className="p-4 text-gray-400 font-semibold">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-center font-bold text-gray-900">{c.ordersCount} orders</td>
                      <td className="p-4 text-right font-black text-gray-900">₹{c.totalSpend.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border ${
                          c.isDeactivated 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {c.isDeactivated ? 'DEACTIVATED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Toggle Deactivate / Activate */}
                          <button
                            onClick={() => handleToggleDeactivate(c)}
                            disabled={isBusy}
                            title={c.isDeactivated ? 'Reactivate Customer' : 'Deactivate Customer'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition shadow-xs ${
                              c.isDeactivated
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                            }`}
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                            {c.isDeactivated ? 'Activate' : 'Deactivate'}
                          </button>

                          {/* Delete Customer */}
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            disabled={isBusy}
                            title="Delete Customer Account"
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-650 hover:bg-red-50 hover:border-red-200 transition shadow-xs"
                          >
                            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCustomers > limit && (
        <div className="flex items-center justify-between border border-gray-100 rounded-2xl bg-white p-4 shadow-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold text-gray-500">
            Page {page} of {Math.ceil(totalCustomers / limit)}
          </span>
          <button
            disabled={page * limit >= totalCustomers}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}
