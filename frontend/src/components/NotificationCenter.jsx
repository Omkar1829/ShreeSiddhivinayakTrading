import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markRead,
  markAllRead,
  deleteNotification
} from '../store/notificationSlice';
import {
  X,
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Package,
  Info,
  Clock,
  Loader2
} from 'lucide-react';

export default function NotificationCenter({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, unreadCount, total, loading } = useSelector((state) => state.notifications);
  const [offset, setOffset] = useState(0);
  const LIMIT = 15;

  useEffect(() => {
    if (isOpen) {
      // Reload from first page on open
      dispatch(fetchNotifications({ limit: LIMIT, offset: 0 }));
      setOffset(0);
    }
  }, [isOpen, dispatch]);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    dispatch(fetchNotifications({ limit: LIMIT, offset: nextOffset }));
    setOffset(nextOffset);
  };

  const handleMarkRead = (e, notif) => {
    e.stopPropagation();
    if (!notif.isRead) {
      dispatch(markRead(notif.id));
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    dispatch(deleteNotification(id));
  };

  const handleMarkAllRead = () => {
    dispatch(markAllRead());
  };

  const handleItemClick = (notif) => {
    if (!notif.isRead) {
      dispatch(markRead(notif.id));
    }
    onClose();

    // Navigate to appropriate screen
    if (notif.orderId) {
      navigate('/admin/orders');
      // Dispatch custom window event so orders page can auto-focus or open details modal
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('focus-order', { detail: notif.orderId }));
      }, 100);
    } else if (notif.type === 'LOW_STOCK') {
      navigate('/admin/inventory');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'NEW_ORDER':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Package size={18} />
          </div>
        );
      case 'ORDER_CANCELLED':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={18} />
          </div>
        );
      case 'LOW_STOCK':
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle size={18} />
          </div>
        );
      default:
        return (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Info size={18} />
          </div>
        );
    }
  };

  const formatRelativeTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.round(diffMs / (60 * 1000));
      const diffHr = Math.round(diffMs / (60 * 60 * 1000));
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full pl-10 flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100 transition-all duration-300">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell size={20} className="text-primary-850" />
                Notification Center
              </h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-800 text-white animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all read"
                  className="flex items-center gap-1 text-xs font-bold text-primary-800 hover:text-primary-900 transition"
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              )}
              <button 
                onClick={onClose} 
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <Bell size={32} />
                </div>
                <h3 className="text-sm font-bold text-gray-800">All caught up!</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  You have no notifications. Active alerts will show up here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-4 flex gap-3 transition cursor-pointer hover:bg-gray-50/80 relative group ${
                    !notif.isRead ? 'bg-primary-50/15' : ''
                  }`}
                >
                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <span className="absolute top-4 left-2.5 h-2 w-2 rounded-full bg-primary-800" />
                  )}

                  {/* Left Icon type */}
                  <div className="shrink-0 mt-0.5 ml-1">
                    {getIcon(notif.type)}
                  </div>

                  {/* Main text content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-2 font-medium">
                      <Clock size={12} />
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Action overlays visible on hover */}
                  <div className="flex flex-col gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition duration-200">
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(e, notif)}
                        title="Mark read"
                        className="rounded-lg p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-primary-800 hover:border-primary-100 hover:bg-primary-50 transition"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      title="Delete"
                      className="rounded-lg p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Load More Button */}
            {notifications.length < total && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin text-gray-500" size={14} />
                  ) : null}
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
