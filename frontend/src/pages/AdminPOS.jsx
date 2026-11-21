import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from '../utils/toast';
import { calculatePricing } from '../utils/pricing';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  X,
  QrCode,
  Banknote,
  Clock,
  User,
  Phone,
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  Check,
  CheckCircle2,
  Coins,
  ArrowRight,
  Edit3
} from 'lucide-react';

export default function AdminPOS({ onClose }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const searchInputRef = useRef(null);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Active Billing Register Cart
  // Item: { variantId, productId, name, variantName, price, originalPrice, mrp, quantity, stock, imageUrl }
  const [cart, setCart] = useState([]);

  // Mobile POS View Mode ('CATALOG' or 'REGISTER')
  const [mobileTab, setMobileTab] = useState('CATALOG');

  // Customer Information
  const [customerName, setCustomerName] = useState('Counter Sale');
  const [customerPhone, setCustomerPhone] = useState('');
  const [counterNote, setCounterNote] = useState('Counter Store Sale');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH or UPI only

  // Variant Selection Popup State (when clicking card with multiple variants)
  const [variantModalProduct, setVariantModalProduct] = useState(null);

  // Payment Confirmation Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState('');

  // Sale Completed Animation Screen State
  const [completedOrder, setCompletedOrder] = useState(null);

  // Track selected variant per product on catalog side: { [productId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus search on '/' or 'F2'
      if ((e.key === '/' || e.key === 'F2') && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Close on Esc
      if (e.key === 'Escape') {
        if (isPaymentModalOpen) {
          setIsPaymentModalOpen(false);
        } else if (variantModalProduct) {
          setVariantModalProduct(null);
        } else if (completedOrder) {
          handleNextCustomer();
        } else if (onClose) {
          onClose();
        } else {
          navigate('/admin/orders');
        }
      }
      // Enter on Completed Screen triggers next customer
      if (e.key === 'Enter' && completedOrder) {
        handleNextCustomer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onClose, isPaymentModalOpen, variantModalProduct, completedOrder]);

  // Load catalog products & categories
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/api/products/admin/all'),
          api.get('/api/categories')
        ]);

        if (prodRes.data.success) {
          const activeProds = (prodRes.data.products || []).filter(
            (p) => p.status === 'ACTIVE' && p.variants && p.variants.length > 0
          );
          setProducts(activeProds);

          // Initialize selected variants map to first active variant
          const initialSelection = {};
          activeProds.forEach((p) => {
            const firstActive = p.variants.find((v) => v.status === 'ACTIVE') || p.variants[0];
            if (firstActive) initialSelection[p.id] = firstActive.id;
          });
          setSelectedVariants(initialSelection);
        }

        if (catRes.data.success) {
          setCategories(catRes.data.categories || []);
        }
      } catch (err) {
        console.error('POS fetch error:', err);
        toast.error('Failed to load catalog for POS register.');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // Filter products by category and search query (name, sku, barcode, brand)
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      const matchName = p.name?.toLowerCase().includes(query);
      const matchSku = p.sku?.toLowerCase().includes(query);
      const matchBarcode = p.barcode?.toLowerCase().includes(query);
      const matchBrand = p.brand?.name?.toLowerCase().includes(query);
      const matchVariant = p.variants?.some(
        (v) =>
          v.attributeValue?.toLowerCase().includes(query) ||
          v.barcode?.toLowerCase().includes(query)
      );
      return matchName || matchSku || matchBarcode || matchBrand || matchVariant;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add variant to bill
  const handleAddToBill = (product, variant) => {
    if (!variant || variant.stock <= 0) {
      toast.warning(`${product.name} (${variant?.attributeValue || ''}) is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.quantity >= variant.stock) {
          toast.warning(`Only ${variant.stock} units available in inventory.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1
        };
        return updated;
      }

      const pricing = calculatePricing(
        variant.price,
        variant.mrp,
        product.id,
        storeSettings?.store_offers,
        variant.id,
        storeSettings?.store_variant_offers
      );

      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          variantName: `${variant.attributeName}: ${variant.attributeValue}`,
          price: Number(pricing.price),
          originalPrice: Number(variant.price),
          mrp: pricing.mrp,
          quantity: 1,
          stock: variant.stock,
          imageUrl: product.imageUrl
        }
      ];
    });

    toast.success(`Added ${product.name} (${variant.attributeValue})`);
  };

  // Card click handler: if multiple variants, open popup; if single variant, add directly
  const handleProductCardClick = (product) => {
    const variants = product.variants || [];
    if (variants.length > 1) {
      setVariantModalProduct(product);
    } else if (variants.length === 1) {
      handleAddToBill(product, variants[0]);
    }
  };

  // Update item quantity (allows custom number input)
  const handleUpdateQty = (variantId, newQty) => {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty <= 0) {
      handleRemoveItem(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          if (qty > item.stock) {
            toast.warning(`Only ${item.stock} units available in stock.`);
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  // Update item price (custom price modification directly on POS line item)
  const handleUpdatePrice = (variantId, newPrice) => {
    const priceVal = parseFloat(newPrice);
    if (isNaN(priceVal) || priceVal < 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          return { ...item, price: priceVal };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (variantId) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const handleClearBill = () => {
    if (cart.length === 0) return;
    setCart([]);
    toast.info('Active bill cleared.');
  };

  // Barcode enter key trigger
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    let foundProduct = null;
    let foundVariant = null;

    for (const p of products) {
      if (p.barcode?.toLowerCase() === query || p.sku?.toLowerCase() === query) {
        foundProduct = p;
        foundVariant = p.variants.find((v) => v.id === selectedVariants[p.id]) || p.variants[0];
        break;
      }
      const matchingVariant = p.variants.find(
        (v) => v.barcode?.toLowerCase() === query || v.id.toLowerCase() === query
      );
      if (matchingVariant) {
        foundProduct = p;
        foundVariant = matchingVariant;
        break;
      }
    }

    if (foundProduct && foundVariant) {
      handleAddToBill(foundProduct, foundVariant);
      setSearchQuery('');
    }
  };

  // Cart calculations
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const totalMrp = useMemo(() => cart.reduce((sum, item) => sum + item.mrp * item.quantity, 0), [cart]);
  const totalSavings = Math.max(0, totalMrp - subtotal);

  // Cash change calculations
  const cashNum = parseFloat(cashTendered) || 0;
  const changeToReturn = Math.max(0, cashNum - subtotal);

  // Dynamic UPI URL for QR code
  const upiId = storeSettings?.upi_id || '9833607049@upi';
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    'Shree Siddhivinayak Trading'
  )}&am=${subtotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Store POS Bill')}`;

  // Step 1: Open Payment Modal when clicking Complete Sale
  const handleInitiateCompleteSale = () => {
    if (cart.length === 0) {
      toast.warning('Cannot complete an empty bill. Add products first.');
      return;
    }
    setCashTendered(subtotal.toString());
    setIsPaymentModalOpen(true);
  };

  // Step 2: Finalize transaction when Cash or UPI Collected button is clicked
  const handlePaymentCollected = async () => {
    setSubmitting(true);
    try {
      const payload = {
        recipientName: customerName.trim() || 'Counter Sale',
        recipientPhone: customerPhone.trim() || storeSettings?.phone_number || 'Counter Sale',
        deliveryAddress: counterNote.trim() || 'Counter Store Sale',
        paymentMethod: paymentMethod === 'UPI' ? 'QR_PAYMENT' : 'CASH',
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          customPrice: item.price
        }))
      };

      const res = await api.post('/api/admin/orders/manual', payload);

      if (res.data.success) {
        // Update local stock in products
        setProducts((prev) =>
          prev.map((p) => ({
            ...p,
            variants: p.variants.map((v) => {
              const bought = cart.find((c) => c.variantId === v.id);
              if (bought) {
                return { ...v, stock: Math.max(0, v.stock - bought.quantity) };
              }
              return v;
            })
          }))
        );

        // Close payment modal and show celebration animation
        setIsPaymentModalOpen(false);
        setCompletedOrder({
          orderNumber: res.data.order?.orderNumber || 'SALE-OK',
          amount: subtotal,
          itemsCount: totalItemsCount,
          method: paymentMethod
        });

        // Play gentle audio chime
        try {
          const audio = new Audio('/notification.mp3');
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    } catch (err) {
      console.error('POS Checkout Error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to complete POS sale.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Reset POS register for next customer
  const handleNextCustomer = () => {
    setCompletedOrder(null);
    setCart([]);
    setCustomerName('Counter Sale');
    setCustomerPhone('9999999999');
    setPaymentMethod('CASH');
    setCashTendered('');
    searchInputRef.current?.focus();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/admin/orders');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 text-gray-900 overflow-hidden select-none">
      {/* 1. TOP CASHIER HEADER */}
      <header className="h-16 bg-[#0c120e] text-white px-4 sm:px-6 flex items-center justify-between border-b border-emerald-950/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Shree Siddhivinayak Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-md border border-emerald-800 shrink-0"
            />
            <div>
              <span className="font-display font-black text-xs sm:text-sm tracking-wide text-white flex items-center gap-1.5 leading-none">
                SHREE SIDDHIVINAYAK TRADING
                <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 border border-emerald-500/30 uppercase font-mono">
                  POS
                </span>
              </span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5 block">
                Counter Sale Cashier Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Center Live Clock & Cashier Info */}
        <div className="hidden md:flex items-center gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-2 bg-[#141d17] px-3 py-1.5 rounded-xl border border-emerald-900/40">
            <Clock size={14} className="text-emerald-400" />
            <span className="font-mono font-bold text-gray-200">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              Cashier: <strong className="text-white">{user?.name || 'Admin'}</strong>
            </span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 px-3.5 py-2 text-xs font-bold text-gray-200 transition border border-gray-700 shadow-sm"
          >
            <ArrowLeft size={14} /> Exit POS (Esc)
          </button>
        </div>
      </header>

      {/* MOBILE SEGMENTED VIEW SWITCHER (lg:hidden) */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white shrink-0 shadow-xs z-20">
        <button
          type="button"
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'CATALOG'
              ? 'border-emerald-800 text-emerald-800 bg-emerald-50/60'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Package size={15} />
          <span>Product Catalog ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('REGISTER')}
          className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'REGISTER'
              ? 'border-emerald-800 text-emerald-800 bg-emerald-50/60'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShoppingCart size={15} />
          <span>Bill Register ({totalItemsCount})</span>
          {totalItemsCount > 0 && (
            <span className="rounded-full bg-emerald-800 text-white text-[10px] font-bold px-1.5 py-0.2">
              ₹{subtotal.toFixed(0)}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN POS WORKSPACE: 2-PANE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER PANE: Product Catalog & Fast Filtering */}
        <div
          className={`flex-1 flex-col bg-gray-50 overflow-hidden border-r border-gray-200 ${
            mobileTab === 'CATALOG' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Fast Search & Barcode Bar */}
          <div className="p-4 bg-white border-b border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search staple name, SKU, or scan barcode (Press '/' or F2)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                >
                  <X size={16} />
                </button>
              )}
            </form>

            <div className="flex items-center gap-2 shrink-0 text-xs font-semibold text-gray-500">
              <span className="hidden sm:inline">Found:</span>
              <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {/* Category Filter Pills Strip */}
          <div className="px-4 py-2.5 bg-white border-b border-gray-150 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-gray-100 text-gray-650 border-gray-200 hover:bg-gray-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                    : 'bg-gray-100 text-gray-650 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid: Clicking anywhere on card adds to cart or opens variant picker */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-60 rounded-2xl bg-white animate-pulse border border-gray-200"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <Package size={48} className="stroke-[1.5] text-gray-300 mb-3" />
                <h4 className="text-base font-bold text-gray-800">No matching products</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Try adjusting the search query or selecting a different category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredProducts.map((product) => {
                  const variants = product.variants || [];
                  const defaultVar = variants[0];
                  const isOutOfStock = !defaultVar || variants.every((v) => v.stock <= 0);
                  const pricing = defaultVar
                    ? calculatePricing(
                        defaultVar.price,
                        defaultVar.mrp,
                        product.id,
                        storeSettings?.store_offers,
                        defaultVar.id,
                        storeSettings?.store_variant_offers
                      )
                    : null;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && handleProductCardClick(product)}
                      className={`flex flex-col bg-white border border-gray-200 rounded-2xl p-3 shadow-xs transition duration-200 group cursor-pointer hover:border-emerald-500 hover:shadow-md ${
                        isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'
                      }`}
                    >
                      {/* Fixed Height Image Container with object-contain */}
                      <div className="relative h-36 w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-2 flex items-center justify-center p-2">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-black text-gray-300 text-xs">
                            {product.name.slice(0, 2)}
                          </div>
                        )}
                        <span
                          className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-md ${
                            isOutOfStock ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isOutOfStock ? '0 Left' : `${variants.reduce((acc, v) => acc + v.stock, 0)} Left`}
                        </span>
                      </div>

                      {/* Info */}
                      <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider truncate">
                        {product.brand?.name || 'Local Fresh'}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1 leading-snug mt-0.5">
                        {product.name}
                      </h4>

                      {/* Variant tags or single pack notice */}
                      <div className="my-1.5 flex items-center gap-1 flex-wrap">
                        {variants.length > 1 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-200">
                            {variants.length} Pack Sizes Available
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-500 font-semibold">
                            {defaultVar?.attributeValue || 'Standard Pack'}
                          </span>
                        )}
                      </div>

                      {/* Price & Click to Add Prompt */}
                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                        <div>
                          <span className="text-sm sm:text-base font-black text-emerald-700 leading-none">
                            ₹{pricing ? pricing.price.toFixed(2) : '0.00'}
                          </span>
                          {pricing && pricing.hasDiscount && pricing.mrp > pricing.price && (
                            <span className="text-[10px] text-gray-400 line-through ml-1">
                              ₹{pricing.mrp.toFixed(0)}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-black text-emerald-700 group-hover:underline flex items-center gap-0.5">
                          + Add
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Bottom Floating Action Bar: Go to Register */}
          {totalItemsCount > 0 && (
            <div className="lg:hidden p-3 bg-white border-t border-gray-200 shadow-2xl flex items-center justify-between shrink-0 z-20">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">
                  Active Bill
                </span>
                <span className="text-sm font-black text-emerald-800 leading-tight">
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} • ₹{subtotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileTab('REGISTER')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 text-xs font-black shadow-md active:scale-95 transition"
              >
                <span>View Bill & Pay</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Multi-Product Active Bill Register */}
        <div
          className={`w-full lg:w-[460px] xl:w-[500px] flex-col bg-white shadow-2xl border-l border-gray-200 shrink-0 h-full ${
            mobileTab === 'REGISTER' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Mobile Back Button to Catalog */}
          <button
            type="button"
            onClick={() => setMobileTab('CATALOG')}
            className="lg:hidden flex items-center gap-1 text-xs font-bold text-emerald-800 px-3 py-2 bg-emerald-50/80 border-b border-emerald-200 hover:bg-emerald-100 transition"
          >
            <ArrowLeft size={14} />
            <span>← Back to Products (+ Add More Items)</span>
          </button>

          {/* Register Top Bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-800" />
              <h3 className="font-black text-sm text-gray-900 tracking-tight">Active Billing Register</h3>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 border border-emerald-200">
                {totalItemsCount} items
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearBill}
                className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Customer Details Inputs */}
          <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                Customer Name
              </label>
              <div className="relative">
                <User size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Counter Sale"
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                Customer Phone
              </label>
              <div className="relative">
                <Phone size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone (optional)"
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Itemized Bill Table: Custom Quantity Input & Editable Price */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-300 mb-3">
                  <ShoppingCart size={28} />
                </div>
                <h4 className="text-sm font-bold text-gray-800">Your billing cart is empty</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Tap any product from the catalog pane or scan barcode to add to bill.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <div key={item.variantId} className="flex items-center gap-2.5 p-2 hover:bg-gray-50/70 rounded-xl transition">
                    <div className="h-9 w-9 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center p-0.5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" />
                      ) : (
                        <span className="font-bold text-[10px] text-gray-400">{item.name.slice(0, 2)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-gray-900 truncate">{item.name}</h5>
                      <span className="text-[10px] font-semibold text-gray-500 block truncate">
                        {item.variantName}
                      </span>
                    </div>

                    {/* Editable Price Input */}
                    <div className="flex items-center gap-0.5 shrink-0 bg-gray-50 border border-gray-200 rounded-lg px-1.5 py-0.5">
                      <span className="text-[11px] font-bold text-gray-500">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={item.price}
                        onChange={(e) => handleUpdatePrice(item.variantId, e.target.value)}
                        className="w-14 text-xs font-black text-emerald-800 bg-transparent text-right focus:outline-none"
                        title="Edit line item unit price"
                      />
                    </div>

                    {/* Quantity Stepper & Custom Number Input */}
                    <div className="flex items-center border border-gray-250 rounded-lg overflow-hidden bg-white shadow-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.variantId, item.quantity - 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 hover:text-red-600 transition"
                      >
                        <Minus size={11} className="stroke-[3]" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQty(item.variantId, e.target.value)}
                        className="w-10 text-center text-xs font-black text-gray-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.variantId, item.quantity + 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 hover:text-emerald-700 transition"
                      >
                        <Plus size={11} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 w-16">
                      <span className="block font-black text-xs text-gray-900">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.variantId)}
                      className="p-1 text-gray-300 hover:text-red-600 transition shrink-0"
                      title="Remove item"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Payment Method Selector (CASH or UPI only - Card removed) */}
          <div className="p-3.5 bg-gray-50 border-t border-gray-200">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Banknote size={16} /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <QrCode size={16} /> UPI / QR
              </button>
            </div>
          </div>

          {/* Summary & Single Primary "Complete Sale" Button */}
          <div className="p-4 bg-white border-t border-gray-200 space-y-3">
            <div className="space-y-1 text-xs font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal ({totalItemsCount} units)</span>
                <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Customer Savings</span>
                  <span className="font-bold">-₹{totalSavings.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-2 flex justify-between items-baseline">
                <span className="text-sm font-black text-gray-900">Grand Total</span>
                <span className="text-2xl font-black text-emerald-700">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Single Unified Primary Complete Sale Button */}
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleInitiateCompleteSale}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white py-3.5 px-4 text-sm font-black transition shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={18} />
              Complete Sale (₹{subtotal.toFixed(2)})
            </button>
          </div>
        </div>
      </div>

      {/* POPUP 1: VARIANT PICKER MODAL (When clicking a product card with multiple pack variants) */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-150">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center p-1 shrink-0">
                  {variantModalProduct.imageUrl ? (
                    <img
                      src={variantModalProduct.imageUrl}
                      alt={variantModalProduct.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="font-bold text-gray-400">{variantModalProduct.name.slice(0, 2)}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider block">
                    {variantModalProduct.brand?.name || 'Local Fresh'}
                  </span>
                  <h3 className="font-black text-sm text-gray-900">{variantModalProduct.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 my-3 font-semibold">
              Select pack weight to add to billing register:
            </p>

            <div className="space-y-2">
              {variantModalProduct.variants?.map((v) => {
                const isOutOfStock = v.stock <= 0;
                const pricing = calculatePricing(
                  v.price,
                  v.mrp,
                  variantModalProduct.id,
                  storeSettings?.store_offers,
                  v.id,
                  storeSettings?.store_variant_offers
                );
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      handleAddToBill(variantModalProduct, v);
                      setVariantModalProduct(null);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isOutOfStock
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 text-gray-900 border-gray-200 active:scale-98'
                    }`}
                  >
                    <div>
                      <span className="font-black text-xs block text-gray-900">
                        {v.attributeName}: {v.attributeValue}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        Stock: {v.stock} units available
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-emerald-700 block">
                        ₹{pricing.price.toFixed(2)}
                      </span>
                      {pricing.hasDiscount && pricing.mrp > pricing.price && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ₹{pricing.mrp.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: PAYMENT COLLECTION MODAL (Cash Tender or UPI QR Code) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
                  Payment Collection
                </span>
                <h3 className="font-black text-lg text-white">
                  {paymentMethod === 'CASH' ? 'Cash Payment Collection' : 'UPI / QR Payment Collection'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Grand Total Callout */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide block">
                    Amount to Collect
                  </span>
                  <span className="text-xs text-gray-500">
                    Customer: <strong>{customerName}</strong> ({customerPhone})
                  </span>
                </div>
                <span className="text-3xl font-black text-emerald-800">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              {/* PAYMENT OPTION A: CASH COLLECTED FLOW */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Cash Received from Customer (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min={subtotal}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={subtotal.toString()}
                      className="w-full px-4 py-3 text-lg font-black bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>

                  {/* Quick Cash Chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {[subtotal, 100, 200, 500, 1000, 2000].map((val) => {
                      if (val < subtotal && val !== subtotal) return null;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashTendered(val.toString())}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-black text-gray-800 transition border border-gray-200"
                        >
                          ₹{val}
                        </button>
                      );
                    })}
                  </div>

                  {/* Change to Return */}
                  {changeToReturn > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-bold text-amber-900">
                      <span>Change to return to customer:</span>
                      <span className="text-base font-black text-amber-800">
                        ₹{changeToReturn.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Action: Cash Collected Button */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePaymentCollected}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white py-4 px-4 text-sm font-black transition shadow-lg active:scale-98 disabled:opacity-50"
                  >
                    <Banknote size={20} />
                    {submitting ? 'Recording Sale...' : `Cash Collected (₹${subtotal.toFixed(2)})`}
                  </button>
                </div>
              )}

              {/* PAYMENT OPTION B: UPI / QR PAYMENT FLOW */}
              {paymentMethod === 'UPI' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center">
                    {/* Display Store's Uploaded QR photo if available */}
                    {storeSettings?.upi_qr_url ? (
                      <>
                        <div className="h-56 w-56 bg-white p-2 rounded-xl shadow-xs border border-gray-200 flex items-center justify-center mb-2">
                          <img
                            src={storeSettings.upi_qr_url}
                            alt="Store UPI QR Standee"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 block mt-1">
                          UPI ID: <strong className="text-emerald-700 font-mono">{storeSettings.upi_id || upiId}</strong>
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          Customer can scan using Google Pay, PhonePe, Paytm, or BHIM
                        </span>
                      </>
                    ) : (
                      <div className="p-4 text-center max-w-xs space-y-2">
                        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
                          <QrCode size={28} />
                        </div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                          No Store QR Code Uploaded
                        </h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          You haven't uploaded your shop UPI payment QR standee in Store Settings yet.
                        </p>
                        {storeSettings?.upi_id ? (
                          <div className="pt-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Pay to Store UPI ID:</span>
                            <span className="font-mono text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-gray-200 inline-block mt-0.5">
                              {storeSettings.upi_id}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Action: UPI Payment Collected Button */}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePaymentCollected}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white py-4 px-4 text-sm font-black transition shadow-lg active:scale-98 disabled:opacity-50"
                  >
                    <CheckCircle2 size={20} />
                    {submitting ? 'Recording Sale...' : 'Payment Collected / UPI Received'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP 3: SALE COMPLETED ANIMATION SCREEN */}
      {completedOrder && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-250">
            {/* Animated Checkmark Circle */}
            <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50 animate-bounce">
              <Check className="stroke-[3.5]" size={40} />
            </div>

            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 mb-2">
              <Sparkles size={12} /> Counter Sale Successful
            </span>

            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              Payment Collected!
            </h2>

            <p className="text-xs text-gray-500 mt-1 mb-4">
              Order #{completedOrder.orderNumber} • Paid via {completedOrder.method}
            </p>

            {/* Receipt Summary Card */}
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-6 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Sold:</span>
                <strong className="text-gray-900">{completedOrder.itemsCount} units</strong>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Payment Mode:</span>
                <strong className="text-gray-900">{completedOrder.method}</strong>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline">
                <span className="font-bold text-gray-700">Total Collected:</span>
                <span className="text-xl font-black text-emerald-700">
                  ₹{completedOrder.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Next Customer Button */}
            <button
              type="button"
              onClick={handleNextCustomer}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-black text-white py-3.5 px-4 text-xs font-black transition shadow-md active:scale-98"
            >
              Next Customer (Press Enter) <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
