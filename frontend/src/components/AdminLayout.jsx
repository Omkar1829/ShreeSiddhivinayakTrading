import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { setSettings } from '../store/storeSlice';
import { clearCredentials } from '../store/authSlice';
import api from '../services/api';
import { toast } from '../utils/toast';
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
  Menu
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

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
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-14 bg-[#0e110f] text-white flex items-center justify-between px-4 shrink-0 shadow-md">
          <button onClick={() => setMobileOpen(true)} className="p-1 hover:bg-[#1b2520] rounded-lg">
            <Menu size={20} />
          </button>
          <span className="font-black text-xs uppercase tracking-wider text-white">SST Console</span>
          <div className="w-8" /> {/* Balance spacer */}
        </header>

        {/* Scrollable Page pane */}
        <main className="flex-1 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>

    </div>
  );
}
