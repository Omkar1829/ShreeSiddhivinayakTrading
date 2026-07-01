import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, ArrowLeft, Users, RefreshCw } from 'lucide-react';

export default function AdminCustomers() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      if (res.data.success) {
        setCustomers(res.data.customers);
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
    loadCustomers();
  }, [isAuthenticated, user, navigate]);

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

    </div>
  );
}
