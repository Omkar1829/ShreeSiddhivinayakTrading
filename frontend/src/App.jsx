import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSettings, setStoreLoading } from './store/storeSlice';
import api from './services/api';
import { Loader2 } from 'lucide-react';

// Layout Wrappers
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminLayout from './components/AdminLayout';
import ToastContainer from './components/ToastContainer';

// Customer Eager Pages
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';

// Lazy Loaded Pages
const Profile = lazy(() => import('./pages/Profile'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const DeliveryScanner = lazy(() => import('./pages/DeliveryScanner'));
const RiderDashboard = lazy(() => import('./pages/RiderDashboard'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminInventory = lazy(() => import('./pages/AdminInventory'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminCustomers = lazy(() => import('./pages/AdminCustomers'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const AdminCategoriesBrands = lazy(() => import('./pages/AdminCategoriesBrands'));

const PageLoader = () => (
  <div className="flex h-96 items-center justify-center">
    <Loader2 className="animate-spin text-primary-850" size={32} />
  </div>
);

// Helper Route Guard: Authenticated Users Only
function PrivateRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  const location = useLocation();

  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Load public store settings on application startup
  useEffect(() => {
    const loadSettings = async () => {
      dispatch(setStoreLoading(true));
      try {
        const res = await api.get('/api/store/settings');
        if (res.data.success) {
          dispatch(setSettings(res.data.settings));
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
      } finally {
        dispatch(setStoreLoading(false));
      }
    };
    loadSettings();
  }, [dispatch]);

  // Case 1: Logged in as Admin -> Render dedicated Full-Fledge Admin Console Shell
  if (isAuthenticated && user?.isAdmin) {
    return (
      <>
        <AdminLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/inventory" element={<AdminInventory />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/customers" element={<AdminCustomers />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/admin/catalog" element={<AdminCategoriesBrands />} />
              
              {/* Allow admins to access the scanner directly from their session */}
              <Route path="/delivery/scan" element={<DeliveryScanner />} />
              <Route path="/delivery/verify" element={<DeliveryScanner />} />

              {/* Catch-all redirect for admin users back to dashboard */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </AdminLayout>
        <ToastContainer />
      </>
    );
  }

  // Case 2: Logged in as Delivery Rider -> Render Rider Dashboard directly
  if (isAuthenticated && user?.role === 'DELIVERY') {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RiderDashboard />} />
            
            {/* Catch-all redirect for riders back to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </>
    );
  }

  // Case 3: Standard Shopper / Driver / Guest -> Render normal client layout
  const isScannerPage = location.pathname.startsWith('/delivery/');

  return (
    <div className="flex flex-col min-h-screen min-w-[320px] bg-gray-50 text-gray-900">
      {!isScannerPage && <Navbar />}

      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Customer Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/:slug" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />

            {/* Customer Private Routes */}
            <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/orders/:id" element={<PrivateRoute><OrderTracking /></PrivateRoute>} />

            {/* Unauthenticated Delivery Scanner Route */}
            <Route path="/delivery/scan" element={<DeliveryScanner />} />
            <Route path="/delivery/verify" element={<DeliveryScanner />} />

            {/* Catch-all redirect for guest users */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isScannerPage && <Footer />}
      <ToastContainer />
    </div>
  );
}
