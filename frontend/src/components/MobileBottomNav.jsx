import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { selectCartCount } from '../store/cartSlice';
import LoginModal from './LoginModal';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useSelector(selectCartCount);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Hide mobile bottom nav on delivery scanner and admin pages
  if (location.pathname.startsWith('/delivery') || location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleAccountClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setIsLoginOpen(true);
    } else {
      navigate('/profile');
    }
  };

  const navItems = [
    {
      label: 'Home',
      to: '/',
      icon: Home,
      isActive: location.pathname === '/'
    },
    {
      label: 'Categories',
      to: '/catalog',
      icon: LayoutGrid,
      isActive: location.pathname === '/catalog'
    },
    {
      label: 'Cart',
      to: '/cart',
      icon: ShoppingCart,
      isActive: location.pathname === '/cart',
      badge: cartCount
    },
    {
      label: 'Account',
      to: '/profile',
      icon: User,
      isActive: location.pathname === '/profile' || location.pathname === '/orders',
      onClick: handleAccountClick
    }
  ];

  return (
    <>
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg md:hidden transition-all duration-300"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;

            if (item.onClick) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center h-full w-full py-1 text-center transition ${
                    active ? 'text-primary-850 font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                  }`}
                >
                  <div className="relative">
                    <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight leading-none">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center justify-center h-full w-full py-1 text-center transition ${
                  active ? 'text-primary-850 font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 tracking-tight leading-none">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
