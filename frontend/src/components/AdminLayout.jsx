import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { setSettings } from '../store/storeSlice';
import { clearCredentials } from '../store/authSlice';
import api, { API_BASE_URL } from '../services/api';
import { toast } from '../utils/toast';
import { io } from 'socket.io-client';
import {
  requestNotificationPermission,
  registerDeviceToken,
  onForegroundMessage
} from '../firebase/firebase';
import {
  fetchNotifications,
  receiveRealtimeNotification
} from '../store/notificationSlice';
import NotificationCenter from './NotificationCenter';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  Layers,
  Users,
  ShieldCheck,
  Settings,
  FolderTree,
  PlusCircle,
  Plus,
  LogOut,
  X,
  Store,
  Menu,
  Bell
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);
  const { unreadCount } = useSelector((state) => state.notifications);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const showNativeNotification = (title, body, targetUrl = '/admin/orders') => {
    // 1. Play Synthesized Double Chime (using Web Audio API for offline-friendly reliability)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 Note
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      
      // Play second higher pitch note shortly after
      setTimeout(() => {
        oscillator.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5 Note
      }, 100);

      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 250);
    } catch (err) {
      console.warn('[Audio Chime Warning] Audio playback blocked by browser user gesture policy:', err.message);
    }

    // 2. Trigger native OS System Notification Banner (Windows/Android Notification Center)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const options = {
        body,
        icon: '/manifest-icon-192.png',
        badge: '/manifest-icon-192.png',
        data: { url: targetUrl }
      };

      // Windows 10/11 requires notifications to be bound to a Service Worker to display banners reliably
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, options);
          })
          .catch((err) => {
            console.warn('[SW Notification Warning] Failed to show via Service Worker, using fallback:', err);
            try {
              new Notification(title, options);
            } catch (fallbackErr) {
              console.error('[Notification Error] Fallback constructor failed:', fallbackErr);
            }
          });
      } else {
        try {
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            navigate(targetUrl);
            notif.close();
          };
        } catch (err) {
          console.error('[Notification Error] Main context constructor failed:', err);
        }
      }
    }
  };

  const handleRequestPermission = async () => {
    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    if (permission === 'granted') {
      const token = await requestNotificationPermission();
      if (token) await registerDeviceToken(token);
    }
  };

  // 1. Initial Load of Admin Notifications
  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      dispatch(fetchNotifications({ limit: 15, offset: 0 }));
    }
  }, [dispatch, isAuthenticated, user]);

  // 2. FCM Push Registration
  useEffect(() => {
    const setupFcm = async () => {
      if (isAuthenticated && user?.isAdmin) {
        try {
          if (Notification.permission === 'granted') {
            const token = await requestNotificationPermission();
            if (token) {
              await registerDeviceToken(token);
            }
          }
        } catch (err) {
          console.error('[AdminLayout FCM Error] Failed to initialize FCM:', err);
        }
      }
    };
    setupFcm();
  }, [isAuthenticated, user, permissionState]);

  // 3. Socket.IO & FCM Foreground Message Handlers
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) return;

    let socket = null;
    let unsubscribeFcm = () => {};

    try {
      const token = localStorage.getItem('accessToken');
      socket = io(API_BASE_URL, {
        auth: { token: `Bearer ${token}` }
      });

      socket.on('connect', () => {
        console.log('[Socket.IO Client] Connected to backend.');
      });

      // Listen for custom notifications pushed to this admin
      socket.on('new-notification', (notif) => {
        console.log('[Socket.IO Client] Received new-notification:', notif);
        dispatch(receiveRealtimeNotification(notif));
        toast.success(`${notif.title}: ${notif.message}`);

        // Trigger native OS banner and sound chime
        const target = notif.orderId ? '/admin/orders' : (notif.type === 'LOW_STOCK' ? '/admin/inventory' : '/admin');
        showNativeNotification(notif.title, notif.message, target);
      });

      // Listen for order dispatches to reload table metrics
      socket.on('new-order', (data) => {
        console.log('[Socket.IO Client] new-order received:', data);
        window.dispatchEvent(new CustomEvent('ORDER_PLACED', { detail: data }));
      });

      socket.on('order-cancelled', (data) => {
        console.log('[Socket.IO Client] order-cancelled received:', data);
        window.dispatchEvent(new CustomEvent('ORDER_UPDATED', { detail: data }));
      });

      socket.on('low-stock', (data) => {
        console.log('[Socket.IO Client] low-stock alert received:', data);
        toast.error(`LOW STOCK WARNING: ${data.message}`);
        showNativeNotification('Low Stock Alert', data.message, '/admin/inventory');
      });

    } catch (err) {
      console.error('[Socket.IO Connection Error] Failed to connect:', err);
    }

    // Connect FCM foreground listeners
    try {
      unsubscribeFcm = onForegroundMessage((payload) => {
        console.log('[FCM Foreground] Push received:', payload);
        toast.info(`${payload.notification.title}: ${payload.notification.body}`);
        showNativeNotification(payload.notification.title, payload.notification.body, payload.data?.url || '/admin/orders');
      });
    } catch (err) {
      console.error('[FCM Foreground Error] Listener setup failed:', err);
    }

    return () => {
      if (socket) socket.disconnect();
      unsubscribeFcm();
    };
  }, [isAuthenticated, user, dispatch]);

  const storeStatus = storeSettings?.store_status || 'OPEN';
  const isStoreOpen = storeStatus === 'OPEN';

  const handleStatusToggle = async () => {
    if (toggleLoading) return;
    setToggleLoading(true);
    const newStatus = isStoreOpen ? 'CLOSED' : 'OPEN';

    // Build complete settings payload for updates
    const settingsArray = Object.keys(storeSettings || {}).map(key => {
      if (key === 'store_status') return { key, value: newStatus };
      return { key, value: storeSettings[key] };
    });

    try {
      const res = await api.put('/api/store/settings', { settings: settingsArray });
      if (res.data.success) {
        dispatch(setSettings(res.data.settings));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update store status.');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Orders', icon: ClipboardList, path: '/admin/orders' },
    { label: 'Products', icon: ShoppingBag, path: '/admin/products' },
    { label: 'Catalog Config', icon: FolderTree, path: '/admin/catalog' },
    { label: 'Inventory', icon: Layers, path: '/admin/inventory' },
    { label: 'Customers', icon: Users, path: '/admin/customers' },
    { label: 'Audit Logs', icon: ShieldCheck, path: '/admin/audit-logs' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' }
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-6 bg-[#0e110f] border-r border-[#1a201b] text-white">
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c241f]">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary-800 flex items-center justify-center text-white font-black text-sm shadow-md border border-primary-750">
              SV
            </div>
            <div>
              <span className="block font-black text-xs uppercase tracking-wider text-white">Siddhivinayak</span>
              <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Admin Panel</span>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Store Status Toggle Box */}
        <div className="rounded-2xl bg-[#151c17] border border-[#222e26] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-300">Store Status</span>
            
            {/* Toggle Switch Pill */}
            <button
              onClick={handleStatusToggle}
              disabled={toggleLoading}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-250 focus:outline-none ${
                isStoreOpen ? 'bg-emerald-500' : 'bg-gray-700'
              } ${toggleLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-250 ease-in-out mt-[3px] ${
                  isStoreOpen ? 'translate-x-[22px]' : 'translate-x-[4px]'
                }`}
              />
            </button>
          </div>
          
          <div className="text-[10px] uppercase font-black tracking-wider flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
            <span className={isStoreOpen ? 'text-emerald-450' : 'text-red-400'}>
              {isStoreOpen ? 'Open • Checkout Active' : 'Closed • Checkout Disabled'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin/');
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition ${
                  isActive
                    ? 'bg-[#1b2520] text-emerald-450 border-l-2 border-primary-500'
                    : 'text-gray-400 hover:bg-[#121614] hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-emerald-450' : 'text-gray-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Actions & Logout */}
      <div className="space-y-5">
        <div className="space-y-2">
          <span className="block text-[9px] font-black uppercase text-gray-500 tracking-wider">Quick Actions</span>
          
          <button
            onClick={() => {
              setMobileOpen(false);
              navigate('/admin/orders', { state: { openPOS: true } });
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-gray-300 hover:text-white rounded-xl border border-[#202923] hover:bg-[#121614] transition text-left"
          >
            <PlusCircle size={14} className="text-primary-500" />
            Create Manual Order
          </button>

          <button
            onClick={() => {
              setMobileOpen(false);
              navigate('/admin/products', { state: { openAddProduct: true } });
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-gray-300 hover:text-white rounded-xl border border-[#202923] hover:bg-[#121614] transition text-left"
          >
            <Plus size={14} className="text-primary-500" />
            Add Product
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold text-red-400 hover:text-red-300 rounded-xl hover:bg-red-950/20 transition text-left border border-red-950/30"
        >
          <LogOut size={14} />
          Log Out Console
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:block w-64 h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-xs h-full flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Header Bar (Desktop & Mobile) */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-xs">
          {/* Left: Mobile Menu Toggle / Desktop Title */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 text-gray-500 hover:bg-gray-100 rounded-xl transition">
              <Menu size={20} />
            </button>
            <span className="hidden lg:block text-xs font-bold text-gray-500">
              Logged in as <span className="text-primary-850 font-black">{user?.name || 'Admin'}</span>
            </span>
            <span className="lg:hidden font-black text-xs uppercase tracking-wider text-gray-900">SST Console</span>
          </div>

          {/* Right: Notification Toggle Badge */}
          <div className="flex items-center gap-3">
            {permissionState !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100 transition shadow-xs"
                title="Enable browser system push notification banners"
              >
                <Bell size={14} className="animate-bounce" />
                Enable System Banners
              </button>
            )}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-xl transition"
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 bg-primary-800 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Page pane */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>

      {/* Notification Center sliding panel */}
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
