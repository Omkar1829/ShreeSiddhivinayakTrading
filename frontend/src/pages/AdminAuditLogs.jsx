import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, ArrowLeft, ShieldAlert, ChevronDown } from 'lucide-react';

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  
  // Expanded log ID detail view state
  const [expandedLogId, setExpandedLogId] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = '';
      if (filterTable) query += `?tableName=${filterTable}`;
      if (filterAction) query += `${query ? '&' : '?'}action=${filterAction}`;

      const res = await api.get(`/api/admin/audit-logs${query}`);
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadLogs();
  }, [isAuthenticated, user, filterTable, filterAction, navigate]);

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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <ShieldAlert size={24} className="text-primary-850" /> System Audit Logs
            </h1>
            <p className="text-xs text-gray-500 mt-1">Chronological record of database edits, configurations modifications, and transactions.</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-wrap gap-4 text-xs font-semibold">
        <div>
          <label className="block text-[10px] text-gray-450 uppercase mb-1">Filter Table</label>
          <select
            value={filterTable}
            onChange={(e) => setFilterTable(e.target.value)}
            className="rounded-lg border border-gray-200 p-2 focus:outline-none bg-white"
          >
            <option value="">All Tables</option>
            <option value="products">Products</option>
            <option value="variants">Variants</option>
            <option value="orders">Orders</option>
            <option value="brands">Brands</option>
            <option value="categories">Categories</option>
            <option value="store_settings">Store Settings</option>
            <option value="addresses">Addresses</option>
            <option value="users">Users</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-450 uppercase mb-1">Filter Action</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-gray-200 p-2 focus:outline-none bg-white"
          >
            <option value="">All Actions</option>
            <option value="INSERT">INSERT (Create)</option>
            <option value="UPDATE">UPDATE (Edit)</option>
            <option value="DELETE">DELETE (Remove)</option>
          </select>
        </div>
      </div>

      {/* Audit table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-20">
            <ShieldAlert size={44} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 font-medium">No audit logs found matching filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50/50 transition space-y-4">
                  
                  {/* Grid summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-gray-400 font-semibold">{new Date(log.createdAt).toLocaleString()}</span>
                      
                      <span className="rounded-lg bg-gray-50 border px-2 py-0.5 text-[9px] font-black uppercase text-gray-700">
                        {log.tableName}
                      </span>
                      
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                        log.action === 'INSERT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-gray-500 font-semibold">
                        Actor: <span className="text-gray-900 font-bold">{log.user?.name || 'System Auto'}</span>
                      </span>
                      
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? '' : log.id)}
                        className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50 transition"
                      >
                        <ChevronDown size={14} className={`transform transition duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Diffs view */}
                  {isExpanded && (
                    <div className="rounded-xl border border-gray-150 p-4 bg-gray-900 text-emerald-450 font-mono text-[10px] grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto no-scrollbar">
                      
                      {/* Old snapshot */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 uppercase font-sans font-black block border-b border-gray-800 pb-1">Old Values Snapshot</span>
                        <pre className="whitespace-pre-wrap">
                          {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'null'}
                        </pre>
                      </div>

                      {/* New snapshot */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 uppercase font-sans font-black block border-b border-gray-800 pb-1">New Values Snapshot</span>
                        <pre className="whitespace-pre-wrap">
                          {log.newValues ? JSON.stringify(log.newValues, null, 2) : 'null'}
                        </pre>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
