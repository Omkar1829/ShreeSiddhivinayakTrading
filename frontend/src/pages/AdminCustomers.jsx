import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, ArrowLeft, Users, RefreshCw, Search } from 'lucide-react';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const loadCustomers = async (showLoader = true, searchStr = debouncedSearch, pageNum = page) => {
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
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadCustomers(true, debouncedSearch, page);
  }, [isAuthenticated, user, navigate, debouncedSearch, page]);

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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Users size={24} className="text-primary-850" /> Customer Registry
            </h1>
            <p className="text-xs text-gray-500 mt-1">Directory of registered shopper accounts, lifetime spends, and orders count.</p>
          </div>
        </div>
        <button
          onClick={loadCustomers}
          className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
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
          className="w-full rounded-xl border border-gray-250 py-2.5 pl-9 pr-4 text-xs text-gray-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
        />
      </div>

      {/* Customer List table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={44} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">No registered customers found yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Join Date</th>
                  <th className="p-4 text-center">Orders Count</th>
                  <th className="p-4 text-right">Lifetime Spend</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-extrabold text-gray-900">{c.name}</td>
                    <td className="p-4 font-semibold text-gray-600">{c.phone}</td>
                    <td className="p-4 text-gray-400 font-semibold">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-center font-bold text-gray-900">{c.ordersCount} orders</td>
                    <td className="p-4 text-right font-black text-gray-900">₹{c.totalSpend.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase ${
                        c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
