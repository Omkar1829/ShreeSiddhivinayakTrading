import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearCredentials } from '../store/authSlice';
import { selectCartCount } from '../store/cartSlice';
import { selectIsStoreOpen } from '../store/storeSlice';
import LoginModal from './LoginModal';
import { ShoppingCart, User, LogOut, LayoutDashboard, Shield, Menu, X, Clock } from 'lucide-react';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const cartCount = useSelector(selectCartCount);
  const isStoreOpen = useSelector(selectIsStoreOpen);
  const storeSettings = useSelector((state) => state.store.settings);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    dispatch(clearCredentials());
    setIsDropdownOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm backdrop-blur-md bg-opacity-95">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex flex-col">
                <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-primary-800 leading-none">
                  SHREE SIDDHIVINAYAK
                </span>
                <span className="font-sans text-[10px] sm:text-xs font-semibold tracking-widest text-accent-600 uppercase mt-0.5 mx-auto">
                  Trading • Since 2007
                </span>
              </Link>

              {/* Store timing tag */}
              <div className="hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border transition hover:bg-gray-50">
                <span className={`h-2 w-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-gray-600">
                  {isStoreOpen ? 'Store Open' : 'Store Closed'}
                </span>
                <span className="text-gray-400 font-normal">
                  ({storeSettings?.opening_time || '08:00'} - {storeSettings?.closing_time || '21:00'})
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-700">
              <Link to="/" className="hover:text-primary-800 transition">Home</Link>
              <Link to="/catalog" className="hover:text-primary-800 transition">Shop Catalog</Link>
              {isAuthenticated && user?.isAdmin && (
                <Link to="/admin" className="flex items-center gap-1 text-accent-700 hover:text-accent-800 transition">
                  <Shield size={14} /> Admin Panel
                </Link>
              )}
            </nav>

            {/* Icons Actions */}
            <div className="flex items-center gap-4">

              {/* Cart */}
              <Link to="/cart" className="relative p-2 text-gray-600 hover:bg-gray-50 rounded-full transition">
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md border border-white animate-bounce">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-gray-50 transition border border-gray-100 pr-3"
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-800 font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs font-bold text-gray-700 truncate max-w-[100px]">
                      {user?.name}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white p-1.5 shadow-xl border border-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <User size={16} /> My Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <ShoppingCart size={16} /> My Orders
                      </Link>
                      {user?.isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent-700 hover:bg-accent-50 transition font-semibold"
                        >
                          <LayoutDashboard size={16} /> Admin Console
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition text-left"
                      >
                        <LogOut size={16} /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
                >
                  Log In
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-full md:hidden transition"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white md:hidden p-4 space-y-3 shadow-inner">

            {/* Timings Status Bar */}
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-gray-700 font-bold">
                {isStoreOpen ? 'Store Open & Accepting Orders' : 'Store Closed'}
              </span>
              <span className="text-gray-500 text-[10px] ml-auto flex items-center gap-0.5">
                <Clock size={12} /> {storeSettings?.opening_time || '08:00'} - {storeSettings?.closing_time || '21:00'}
              </span>
            </div>

            <nav className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-gray-50 transition"
              >
                Home
              </Link>
              <Link
                to="/catalog"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 hover:bg-gray-50 transition"
              >
                Shop Catalog
              </Link>
              {isAuthenticated && user?.isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-accent-700 hover:bg-accent-50 transition"
                >
                  <Shield size={16} /> Admin Console
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Login Modal Wrapper */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
