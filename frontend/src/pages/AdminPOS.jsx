import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { toast } from '../utils/toast';
import { printInvoice } from '../utils/invoice';
import { calculatePricing } from '../utils/pricing';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  X,
  CreditCard,
  QrCode,
  Banknote,
  Clock,
  User,
  Phone,
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  RotateCcw
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
  // Item structure: { variantId, productId, name, variantName, price, mrp, quantity, stock, imageUrl }
  const [cart, setCart] = useState([]);

  // Customer Information
  const [customerName, setCustomerName] = useState('Counter Sale');
  const [customerPhone, setCustomerPhone] = useState('9999999999');
  const [counterNote, setCounterNote] = useState('Counter Store Sale');
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI, CARD

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
        if (onClose) onClose();
        else navigate('/admin/orders');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onClose]);

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
      // Category check
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) {
        return false;
      }
      // Search check
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

      const pricing = calculatePricing(variant.price, variant.mrp);

      return [
        ...prev,
        {
          variantId: variant.id,
          productId: product.id,
          name: product.name,
          variantName: `${variant.attributeName}: ${variant.attributeValue}`,
          price: Number(variant.price),
          mrp: pricing.mrp,
          quantity: 1,
          stock: variant.stock,
          imageUrl: product.imageUrl
        }
      ];
    });
  };

  const handleUpdateQty = (variantId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.variantId === variantId) {
          if (newQty > item.stock) {
            toast.warning(`Only ${item.stock} units available in stock.`);
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: newQty };
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

    // Check exact barcode or SKU match across variants/products
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
      toast.success(`Added ${foundProduct.name} to bill.`);
    }
  };

  // Cart calculations
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const totalMrp = useMemo(() => cart.reduce((sum, item) => sum + item.mrp * item.quantity, 0), [cart]);
  const totalSavings = Math.max(0, totalMrp - subtotal);

  // Complete Order
  const handleCompleteSale = async (shouldPrint = false) => {
    if (cart.length === 0) {
      toast.warning('Cannot complete an empty bill. Add products first.');
      return;
    }

    if (!customerPhone || customerPhone.length < 7) {
      toast.warning('Please provide a valid customer phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        recipientName: customerName.trim() || 'Counter Sale',
        recipientPhone: customerPhone.trim() || '9999999999',
        deliveryAddress: counterNote.trim() || 'Counter Store Sale',
        paymentMethod,
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity
        }))
      };

      const res = await api.post('/api/admin/orders/manual', payload);

      if (res.data.success) {
        toast.success(`POS Sale Completed! Order #${res.data.order?.orderNumber || 'Success'}`);

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

        if (shouldPrint && res.data.order) {
          printInvoice(res.data.order);
        }

        // Reset Bill
        setCart([]);
        setCustomerName('Counter Sale');
        setCustomerPhone('9999999999');
        setPaymentMethod('CASH');
      }
    } catch (err) {
      console.error('POS Checkout Error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to complete POS sale.');
    } finally {
      setSubmitting(false);
    }
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

      {/* 2. MAIN POS WORKSPACE: 2-PANE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT / CENTER PANE: Product Catalog & Fast Filtering */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden border-r border-gray-200">
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
                className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-250 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-800 focus:bg-white transition"
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
                  ? 'bg-primary-900 text-white border-primary-900 shadow-xs'
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
                    ? 'bg-primary-900 text-white border-primary-900 shadow-xs'
                    : 'bg-gray-100 text-gray-650 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl bg-white animate-pulse border border-gray-200"></div>
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
                  const selectedVarId = selectedVariants[product.id] || variants[0]?.id;
                  const currentVariant = variants.find((v) => v.id === selectedVarId) || variants[0];
                  const pricing = currentVariant ? calculatePricing(currentVariant.price, currentVariant.mrp) : null;
                  const isOutOfStock = !currentVariant || currentVariant.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      className="flex flex-col bg-white border border-gray-200 rounded-2xl p-3 shadow-xs hover:border-emerald-300 hover:shadow-md transition group"
                    >
                      {/* Image & Stock */}
                      <div className="relative aspect-4/3 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 mb-2">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-103 transition duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-gray-300 text-xs">
                            {product.name.slice(0, 2)}
                          </div>
                        )}
                        <span
                          className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-md ${
                            isOutOfStock ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isOutOfStock ? '0 Left' : `${currentVariant?.stock} Left`}
                        </span>
                      </div>

                      {/* Info */}
                      <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider truncate">
                        {product.brand?.name || 'Local Fresh'}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1 leading-snug mt-0.5">
                        {product.name}
                      </h4>

                      {/* Variant Pack Selector Chips */}
                      {variants.length > 1 ? (
                        <div className="flex flex-wrap gap-1 my-2">
                          {variants.map((v) => {
                            const isSelected = v.id === currentVariant?.id;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() =>
                                  setSelectedVariants((prev) => ({
                                    ...prev,
                                    [product.id]: v.id
                                  }))
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                  isSelected
                                    ? 'bg-primary-900 text-white border-primary-900'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {v.attributeValue}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="my-1.5 text-[11px] text-gray-500 font-semibold">
                          {currentVariant?.attributeValue || 'Standard Pack'}
                        </div>
                      )}

                      {/* Price & Add Button */}
                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm sm:text-base font-black text-emerald-700 leading-none">
                              ₹{pricing ? pricing.price.toFixed(2) : '0.00'}
                            </span>
                            {pricing && pricing.mrp > pricing.price && (
                              <span className="text-[10px] text-gray-400 line-through">
                                ₹{pricing.mrp.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToBill(product, currentVariant)}
                          className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                            isOutOfStock
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                              : 'bg-primary-800 text-white hover:bg-primary-900 active:scale-95'
                          }`}
                        >
                          <Plus size={13} className="stroke-[3]" /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Multi-Product Active Bill Register */}
        <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col bg-white shadow-2xl border-l border-gray-200 shrink-0 h-full">
          {/* Register Top Bar */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary-800" />
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
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 focus:outline-none focus:border-primary-800"
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
                  placeholder="9999999999"
                  className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 focus:outline-none focus:border-primary-800"
                />
              </div>
            </div>
          </div>

          {/* Itemized Bill Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-300 mb-3">
                  <ShoppingCart size={28} />
                </div>
                <h4 className="text-sm font-bold text-gray-800">Your billing cart is empty</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Tap '+ Add' on any product from the catalog pane or scan barcode to add to bill.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <div key={item.variantId} className="flex items-center gap-3 p-2.5 hover:bg-gray-50/70 rounded-xl transition">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-bold text-[10px] text-gray-400">{item.name.slice(0, 2)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-xs text-gray-900 truncate">{item.name}</h5>
                      <span className="text-[10px] font-semibold text-gray-500 block">
                        {item.variantName} • ₹{item.price.toFixed(2)}
                      </span>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-gray-250 rounded-lg overflow-hidden bg-white shadow-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.variantId, item.quantity - 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 hover:text-red-600 transition"
                      >
                        <Minus size={12} className="stroke-[3]" />
                      </button>
                      <span className="px-2 text-xs font-black text-gray-900 select-none">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.variantId, item.quantity + 1)}
                        className="p-1 text-gray-600 hover:bg-gray-100 hover:text-emerald-700 transition"
                      >
                        <Plus size={12} className="stroke-[3]" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 w-16">
                      <span className="block font-black text-xs text-gray-900">
                        ₹{lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Delete item */}
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

          {/* Payment Method Selector */}
          <div className="p-3.5 bg-gray-50 border-t border-gray-200">
            <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Banknote size={15} /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <QrCode size={15} /> UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  paymentMethod === 'CARD'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <CreditCard size={15} /> Card
              </button>
            </div>
          </div>

          {/* Summary & Checkout Actions */}
          <div className="p-4 bg-white border-t border-gray-200 space-y-3">
            <div className="space-y-1.5 text-xs font-semibold text-gray-600">
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

            {/* Complete Sale Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={() => handleCompleteSale(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-900 hover:bg-black text-white py-3 px-3 text-xs font-bold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={15} /> Complete Sale
              </button>

              <button
                type="button"
                disabled={submitting || cart.length === 0}
                onClick={() => handleCompleteSale(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-3 text-xs font-bold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={15} /> Complete & Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
