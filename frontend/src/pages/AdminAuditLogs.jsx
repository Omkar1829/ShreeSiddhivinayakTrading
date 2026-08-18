import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, ArrowLeft, ShieldAlert, ChevronDown, Calendar, Filter, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [period, setPeriod] = useState('all'); // 'all', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1
  });

  // Expanded log ID detail view state
  const [expandedLogId, setExpandedLogId] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      if (filterTable) params.append('tableName', filterTable);
      if (filterAction) params.append('action', filterAction);
      if (period && period !== 'all') params.append('period', period);
      if (period === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      const res = await api.get(`/api/admin/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.logs);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterTable, filterAction, period, startDate, endDate]);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadLogs();
  }, [isAuthenticated, user, loadLogs, navigate]);

  const handleResetFilters = () => {
    setFilterTable('');
    setFilterAction('');
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1); // Reset to first page on filter change
  };

  const isFiltered = filterTable || filterAction || (period !== 'all') || startDate || endDate;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldAlert size={24} className="text-primary-850" /> System Audit Logs
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Chronological record of database edits, configurations modifications, and administrative activity.</p>
          </div>
        </div>

        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition shadow-xs self-start sm:self-auto"
          >
            <RotateCcw size={13} /> Reset All Filters
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b border-gray-100 pb-3">
          <Filter size={14} className="text-primary-850" /> Filter Logs & Time Range
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
          
          {/* Time Period Filter (Day / Week Wise) */}
          <div>
            <label className="block text-[10px] text-gray-450 uppercase mb-1 flex items-center gap-1">
              <Calendar size={11} /> Date / Period
            </label>
            <select
              value={period}
              onChange={(e) => handleFilterChange(setPeriod, e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-800 bg-white text-gray-800"
            >
              <option value="all">All Time</option>
              <option value="today">Today (Day-wise)</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week (Last 7 Days)</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Table Filter */}
          <div>
            <label className="block text-[10px] text-gray-450 uppercase mb-1">Target Table</label>
            <select
              value={filterTable}
              onChange={(e) => handleFilterChange(setFilterTable, e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-800 bg-white text-gray-800"
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

          {/* Action Filter */}
          <div>
            <label className="block text-[10px] text-gray-450 uppercase mb-1">Operation Action</label>
            <select
              value={filterAction}
              onChange={(e) => handleFilterChange(setFilterAction, e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-800 bg-white text-gray-800"
            >
              <option value="">All Actions</option>
              <option value="INSERT">INSERT (Create)</option>
              <option value="UPDATE">UPDATE (Edit)</option>
              <option value="DELETE">DELETE (Remove)</option>
            </select>
          </div>

          {/* Items Per Page Filter */}
          <div>
            <label className="block text-[10px] text-gray-450 uppercase mb-1">Logs Per Page</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-800 bg-white text-gray-800"
            >
              <option value={10}>10 per page</option>
              <option value={15}>15 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

        </div>

        {/* Custom Date Pickers */}
        {period === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2 text-xs focus:outline-none bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2 text-xs focus:outline-none bg-white text-gray-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Audit table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col justify-between">
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-primary-850" size={32} />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <ShieldAlert size={44} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 font-medium">No audit logs found matching selected filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 text-xs flex-1">
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50/50 transition space-y-4">
                  
                  {/* Summary Grid */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-gray-500 font-semibold">{new Date(log.createdAt).toLocaleString()}</span>
                      
                      <span className="rounded-lg bg-gray-100 border border-gray-200 px-2 py-0.5 text-[9px] font-black uppercase text-gray-800">
                        {log.tableName}
                      </span>
                      
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border ${
                        log.action === 'INSERT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-red-50 text-red-700 border-red-200'
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
                        title="Toggle Snapshot Diffs"
                      >
                        <ChevronDown size={14} className={`transform transition duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Diffs view */}
                  {isExpanded && (
                    <div className="rounded-xl border border-gray-800 p-4 bg-gray-900 text-emerald-450 font-mono text-[10px] grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto no-scrollbar">
                      
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

        {/* Pagination Footer */}
        {!loading && pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-600">
            <div>
              Showing <span className="font-bold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to <span className="font-bold text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-bold text-gray-900">{pagination.total}</span> audit records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                  page === 1 ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs'
                }`}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <div className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-extrabold text-gray-800">
                Page {pagination.page} of {pagination.totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                  page >= pagination.totalPages ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs'
                }`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
