import { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { setSettings } from '../store/storeSlice';
import { toast } from '../utils/toast';
import { compressImage } from '../utils/imageCompressor';
import { calculatePricing } from '../utils/pricing';
import {
  ShoppingBag,
  FolderTree,
  Layers,
  Plus,
  Edit2,
  Trash2,
  Search,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  RefreshCw,
  History,
  ArrowRight,
  Sparkles,
  PackageCheck,
  Percent,
  Check,
  Store
} from 'lucide-react';

export default function AdminCatalogHub({ defaultTab = 'products' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);

  // Active top-level tab: 'products' | 'categories' | 'inventory'
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync tab with URL if user navigated to /admin/catalog or /admin/inventory
  useEffect(() => {
    if (location.pathname.includes('/catalog')) {
      setActiveTab('categories');
    } else if (location.pathname.includes('/inventory')) {
      setActiveTab('inventory');
    } else {
      setActiveTab('products');
    }
  }, [location.pathname]);

  // Open Add Product modal if navigated from quick action
  useEffect(() => {
    if (location.state?.openAddProduct) {
      openAddProductModal();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Global Loading states
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------
  // DATA STATES
  // ----------------------------------------------------
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Store Variant Offers map: { [variantId]: { mrp, discountPercent, offerBadge } }
  const [variantOffersMap, setVariantOffersMap] = useState({});

  useEffect(() => {
    if (storeSettings?.store_variant_offers) {
      try {
        const parsed = typeof storeSettings.store_variant_offers === 'string'
          ? JSON.parse(storeSettings.store_variant_offers)
          : storeSettings.store_variant_offers;
        setVariantOffersMap(parsed || {});
      } catch (e) {
        setVariantOffersMap({});
      }
    }
  }, [storeSettings]);

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes, txRes] = await Promise.all([
        api.get('/api/products/admin/all?limit=250'),
        api.get('/api/categories/admin/all'),
        api.get('/api/brands/admin/all'),
        api.get('/api/admin/inventory/transactions')
      ]);

      if (prodRes.data.success) setProducts(prodRes.data.products || []);
      if (catRes.data.success) setCategories(catRes.data.categories || []);
      if (brandRes.data.success) setBrands(brandRes.data.brands || []);
      if (txRes.data.success) setTransactions(txRes.data.transactions || []);
    } catch (err) {
      console.error('Failed to load catalog hub data:', err);
      toast.error('Failed to load catalog data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      loadAllData();
    }
  }, [isAuthenticated, user]);

  // ----------------------------------------------------
  // TAB 1: PRODUCTS & VARIANTS STATES
  // ----------------------------------------------------
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('ALL');
  const [prodBrandFilter, setProdBrandFilter] = useState('ALL');
  const [prodStockFilter, setProdStockFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'OUT'
  const [expandedProductRow, setExpandedProductRow] = useState(null);

  // Add / Edit Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Product Form fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodSubCat, setProdSubCat] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodStatus, setProdStatus] = useState('ACTIVE');
  const [prodImage, setProdImage] = useState(null);
  const [prodOfferBadge, setProdOfferBadge] = useState('');

  // Variants list in form: { id, attributeName, attributeValue, price, mrp, stock, status, offerBadge }
  const [formVariants, setFormVariants] = useState([
    { id: 'var-1', attributeName: 'Weight', attributeValue: '1 Kg', price: '100', mrp: '110', stock: '50', status: 'ACTIVE', offerBadge: '' }
  ]);

  // CSV Import Modal
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);

  // ----------------------------------------------------
  // TAB 2: CATEGORIES & BRANDS STATES
  // ----------------------------------------------------
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('ACTIVE');

  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [targetCatIdForSub, setTargetCatIdForSub] = useState('');
  const [subName, setSubName] = useState('');
  const [subStatus, setSubStatus] = useState('ACTIVE');

  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [brandStatus, setBrandStatus] = useState('ACTIVE');

  // ----------------------------------------------------
  // TAB 3: INVENTORY STATES
  // ----------------------------------------------------
  const [inventorySubTab, setInventorySubTab] = useState('levels'); // 'levels' | 'history'
  const [invSearch, setInvSearch] = useState('');
  const [invFilter, setInvFilter] = useState('ALL'); // 'ALL' | 'LOW' | 'OUT'

  // Quick Stock Adjustment Drawer/Modal
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('STOCK_ADDITION');
  const [adjustReason, setAdjustReason] = useState('Restock / Supplier Delivery');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // ----------------------------------------------------
  // HELPER: SAVE VARIANT OFFERS MAP TO STORE SETTINGS
  // ----------------------------------------------------
  const saveVariantOffersMap = async (updatedOffers) => {
    try {
      const payload = {
        settings: [
          {
            key: 'store_variant_offers',
            value: JSON.stringify(updatedOffers)
          }
        ]
      };
      const res = await api.put('/api/store/settings', payload);
      if (res.data.success) {
        dispatch(setSettings(res.data.settings));
        setVariantOffersMap(updatedOffers);
      }
    } catch (e) {
      console.warn('Failed to sync variant offers map:', e);
    }
  };

  // ----------------------------------------------------
  // PRODUCT HANDLERS (WITH DIRECT PER-VARIANT OFFERS)
  // ----------------------------------------------------
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdSku('');
    setProdBarcode('');
    setProdCat(categories[0]?.id || '');
    setProdSubCat('');
    setProdBrand(brands[0]?.id || '');
    setProdStatus('ACTIVE');
    setProdImage(null);
    setProdOfferBadge('');
    setFormVariants([
      { id: 'var-1', attributeName: 'Weight', attributeValue: '1 Kg', price: '100', mrp: '110', stock: '50', status: 'ACTIVE', offerBadge: '' }
    ]);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setProdName(product.name || '');
    setProdDesc(product.description || '');
    setProdSku(product.sku || '');
    setProdBarcode(product.barcode || '');
    setProdCat(product.categoryId || '');
    setProdSubCat(product.subcategoryId || '');
    setProdBrand(product.brandId || '');
    setProdStatus(product.status || 'ACTIVE');
    setProdImage(null);

    // Populate variants with stored offer/MRP details
    const existingVariants = (product.variants || []).map((v) => {
      const offerData = variantOffersMap[v.id] || {};
      const sellingPrice = offerData.price !== undefined ? offerData.price : v.price;
      const mrpPrice = offerData.mrp !== undefined ? offerData.mrp : (v.mrp || sellingPrice);
      return {
        id: v.id,
        attributeName: v.attributeName || 'Weight',
        attributeValue: v.attributeValue || '',
        price: sellingPrice?.toString() || '0',
        mrp: mrpPrice?.toString() || '',
        stock: v.stock?.toString() || '0',
        status: v.status || 'ACTIVE',
        offerBadge: offerData.offerBadge || ''
      };
    });

    setFormVariants(
      existingVariants.length > 0
        ? existingVariants
        : [{ id: 'var-1', attributeName: 'Weight', attributeValue: '1 Kg', price: '100', mrp: '', stock: '50', status: 'ACTIVE', offerBadge: '' }]
    );

    setProdOfferBadge(variantOffersMap[product.id]?.offerBadge || '');
    setIsProductModalOpen(true);
  };

  // Add a variant row in form
  const handleAddFormVariant = () => {
    setFormVariants((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        attributeName: 'Weight',
        attributeValue: '',
        price: '',
        mrp: '',
        stock: '0',
        status: 'ACTIVE',
        offerBadge: ''
      }
    ]);
  };

  const handleRemoveFormVariant = (id) => {
    if (formVariants.length === 1) {
      toast.warning('A product must have at least one variant.');
      return;
    }
    setFormVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateFormVariant = (id, field, value) => {
    setFormVariants((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const updated = { ...v, [field]: value };
          return updated;
        }
        return v;
      })
    );
  };

  // Save Product (Add or Edit)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!prodName.trim()) {
      toast.warning('Product name is required.');
      return;
    }

    // Validate variant inputs
    for (const v of formVariants) {
      if (!v.attributeValue.trim()) {
        toast.warning('Every variant must have a pack size (e.g. 1 Kg).');
        return;
      }
      if (isNaN(parseFloat(v.price)) || parseFloat(v.price) < 0) {
        toast.warning(`Invalid selling price for ${v.attributeValue}`);
        return;
      }
    }

    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', prodName.trim());
      formData.append('description', prodDesc.trim());
      formData.append('sku', prodSku.trim());
      formData.append('barcode', prodBarcode.trim());
      if (prodCat) formData.append('categoryId', prodCat);
      if (prodSubCat) formData.append('subcategoryId', prodSubCat);
      if (prodBrand) formData.append('brandId', prodBrand);
      formData.append('status', prodStatus);

      if (prodImage) {
        formData.append('image', prodImage);
      }

      // Prepare variants payload
      formData.append(
        'variants',
        JSON.stringify(
          formVariants.map((v) => ({
            id: v.id && !v.id.toString().startsWith('temp-') && !v.id.toString().startsWith('var-') ? v.id : undefined,
            attributeName: v.attributeName || 'Weight',
            attributeValue: v.attributeValue.trim(),
            price: parseFloat(v.price),
            mrp: parseFloat(v.mrp) || parseFloat(v.price),
            stock: parseInt(v.stock, 10) || 0,
            status: v.status || 'ACTIVE'
          }))
        )
      );

      let savedProduct;
      if (editingProduct) {
        const res = await api.put(`/api/products/${editingProduct.id}`, formData);
        savedProduct = res.data.product;
        toast.success(`Updated "${prodName}" with variant offers!`);
      } else {
        const res = await api.post('/api/products', formData);
        savedProduct = res.data.product;
        toast.success(`Created "${prodName}" successfully!`);
      }

      // Update variant offers map in store settings
      if (savedProduct) {
        const newOffersMap = { ...variantOffersMap };

        // Save product offer badge
        if (prodOfferBadge.trim()) {
          newOffersMap[savedProduct.id] = { offerBadge: prodOfferBadge.trim() };
        } else {
          delete newOffersMap[savedProduct.id];
        }

        const returnedVariants = savedProduct.variants || [];

        // Map form variants to save offer details
        formVariants.forEach((fv) => {
          const matchingSaved = returnedVariants.find(
            (rv) => rv.id === fv.id || rv.attributeValue?.trim().toUpperCase() === fv.attributeValue.trim().toUpperCase()
          );
          const targetId = matchingSaved ? matchingSaved.id : fv.id;
          const priceNum = parseFloat(fv.price);
          const mrpNum = parseFloat(fv.mrp);

          if (targetId && !targetId.toString().startsWith('temp-') && !targetId.toString().startsWith('var-')) {
            if (mrpNum > priceNum) {
              const savings = mrpNum - priceNum;
              const discountPercent = Math.round((savings / mrpNum) * 100);
              newOffersMap[targetId] = {
                productId: savedProduct.id,
                price: priceNum,
                mrp: mrpNum,
                discountPercent,
                offerBadge: fv.offerBadge?.trim() || `${discountPercent}% OFF`
              };
            } else {
              delete newOffersMap[targetId];
            }
          }
        });

        await saveVariantOffersMap(newOffersMap);
      }

      setIsProductModalOpen(false);
      await loadAllData();
    } catch (err) {
      console.error('Save product error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to save product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle product status (ACTIVE / INACTIVE)
  const handleToggleProductStatus = async (product) => {
    const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await api.put(`/api/products/${product.id}`, { status: newStatus });
      if (res.data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
        );
        toast.success(`Product ${newStatus.toLowerCase()}!`);
      }
    } catch (err) {
      toast.error('Failed to change product status.');
    }
  };

  // Delete product
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await api.delete(`/api/products/${product.id}`);
      if (res.data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        toast.success(`Deleted "${product.name}".`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete product.');
    }
  };

  // Filtered products list for Tab 1
  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (prodCatFilter !== 'ALL' && p.categoryId !== prodCatFilter) return false;
      if (prodBrandFilter !== 'ALL' && p.brandId !== prodBrandFilter) return false;

      // Stock status filter
      if (prodStockFilter === 'LOW') {
        const hasLow = p.variants?.some((v) => v.stock > 0 && v.stock <= 10);
        if (!hasLow) return false;
      } else if (prodStockFilter === 'OUT') {
        const isOut = !p.variants || p.variants.every((v) => v.stock <= 0);
        if (!isOut) return false;
      }

      if (!q) return true;
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q) ||
        p.variants?.some((v) => v.attributeValue?.toLowerCase().includes(q))
      );
    });
  }, [products, prodSearch, prodCatFilter, prodBrandFilter, prodStockFilter]);

  // ----------------------------------------------------
  // CATEGORY & BRAND HANDLERS (TAB 2)
  // ----------------------------------------------------
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, { name: categoryName.trim(), status: categoryStatus });
        toast.success('Category updated!');
      } else {
        await api.post('/api/categories', { name: categoryName.trim(), status: categoryStatus });
        toast.success('Category created!');
      }
      setIsCategoryModalOpen(false);
      setCategoryName('');
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save category.');
    }
  };

  const handleSaveSubcategory = async (e) => {
    e.preventDefault();
    if (!subName.trim() || !targetCatIdForSub) return;
    try {
      if (editingSubcategory) {
        await api.put(`/api/categories/${targetCatIdForSub}/subcategories/${editingSubcategory.id}`, {
          name: subName.trim(),
          status: subStatus
        });
        toast.success('Subcategory updated!');
      } else {
        await api.post(`/api/categories/${targetCatIdForSub}/subcategories`, {
          name: subName.trim(),
          status: subStatus
        });
        toast.success('Subcategory added!');
      }
      setIsSubcategoryModalOpen(false);
      setSubName('');
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save subcategory.');
    }
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      if (editingBrand) {
        await api.put(`/api/brands/${editingBrand.id}`, { name: brandName.trim(), status: brandStatus });
        toast.success('Brand updated!');
      } else {
        await api.post('/api/brands', { name: brandName.trim(), status: brandStatus });
        toast.success('Brand added!');
      }
      setIsBrandModalOpen(false);
      setBrandName('');
      loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save brand.');
    }
  };

  // ----------------------------------------------------
  // INVENTORY QUICK ADJUSTMENT (TAB 3)
  // ----------------------------------------------------
  const handleExecuteStockAdjust = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) {
      toast.warning('Please enter a valid positive quantity.');
      return;
    }

    const finalQty = adjustType === 'STOCK_REDUCTION' ? -qty : qty;
    setAdjustSubmitting(true);
    try {
      const res = await api.post('/api/admin/inventory/adjust', {
        variantId: selectedVariantForAdjust.id,
        quantity: finalQty,
        transactionType: adjustType,
        reason: adjustReason.trim() || 'Manual stock update via Catalog Hub'
      });

      if (res.data.success) {
        toast.success(`Updated stock for ${selectedVariantForAdjust.productName} (${selectedVariantForAdjust.attributeValue})!`);
        setSelectedVariantForAdjust(null);
        setAdjustQty('');
        await loadAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to adjust stock.');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Flattened variants list for Tab 3
  const flattenedVariants = useMemo(() => {
    const list = [];
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        list.push({
          id: v.id,
          productId: p.id,
          productName: p.name,
          categoryName: p.category?.name || 'General',
          brandName: p.brand?.name || 'Local',
          attributeName: v.attributeName,
          attributeValue: v.attributeValue,
          price: v.price,
          stock: v.stock,
          status: v.status,
          imageUrl: p.imageUrl
        });
      });
    });

    const q = invSearch.trim().toLowerCase();
    return list.filter((item) => {
      if (invFilter === 'LOW' && (item.stock <= 0 || item.stock > 10)) return false;
      if (invFilter === 'OUT' && item.stock > 0) return false;
      if (!q) return true;
      return (
        item.productName.toLowerCase().includes(q) ||
        item.attributeValue.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q)
      );
    });
  }, [products, invSearch, invFilter]);

  const totalLowStockCount = useMemo(() => {
    let count = 0;
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        if (v.stock <= 10) count++;
      });
    });
    return count;
  }, [products]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
      {/* 1. TOP HUB BANNER & COMMAND BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Catalog & Stock Management Hub
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage your products, variant pack offers, categories, brands, and live stock from one unified command center.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openAddProductModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
          >
            <Plus size={15} /> Add New Product
          </button>
          <button
            type="button"
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 text-xs font-bold transition border border-gray-200"
          >
            <Upload size={14} /> Bulk CSV
          </button>
        </div>
      </div>

      {/* 2. UNIFIED 3-TAB SELECTOR STRIP */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1.5 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
            activeTab === 'products'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag size={15} />
          <span>Products & Offers</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${activeTab === 'products' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {products.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
            activeTab === 'categories'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <FolderTree size={15} />
          <span>Categories & Brands</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${activeTab === 'categories' ? 'bg-emerald-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {categories.length + brands.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition ${
            activeTab === 'inventory'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Layers size={15} />
          <span>Stock & Inventory</span>
          {totalLowStockCount > 0 && (
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-500 text-white animate-pulse">
              {totalLowStockCount} Low
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PRODUCTS & VARIANTS DIRECTORY */}
      {/* ==================================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, brand, or variant weight..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap">
              <select
                value={prodCatFilter}
                onChange={(e) => setProdCatFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-700"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={prodStockFilter}
                onChange={(e) => setProdStockFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-700"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="LOW">⚠️ Low Stock (≤10)</option>
                <option value="OUT">❌ Out of Stock (0)</option>
              </select>
            </div>
          </div>

          {/* Products Table with Expandable Variants Drawer */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                    <th className="p-3.5 w-10"></th>
                    <th className="p-3.5">Product & Brand</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Pack Variants</th>
                    <th className="p-3.5">Offer / MRP Comparison</th>
                    <th className="p-3.5">Total Stock</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400">
                        No products match the selected search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isExpanded = expandedProductRow === prod.id;
                      const variants = prod.variants || [];
                      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

                      // Check if any variant has an active offer
                      const variantsWithOffers = variants.filter(
                        (v) => variantOffersMap[v.id] && variantOffersMap[v.id].discountPercent > 0
                      );
                      const hasOffers = variantsWithOffers.length > 0;
                      const prodBadge = variantOffersMap[prod.id]?.offerBadge;

                      return (
                        <>
                          <tr
                            key={prod.id}
                            className={`hover:bg-gray-50/60 transition cursor-pointer select-none ${
                              isExpanded ? 'bg-emerald-50/20' : ''
                            }`}
                            onClick={() => setExpandedProductRow(isExpanded ? null : prod.id)}
                          >
                            {/* Expand Chevron */}
                            <td className="p-3 text-center text-gray-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>

                            {/* Product Info & Thumbnail */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center p-0.5 shrink-0">
                                  {prod.imageUrl ? (
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.name}
                                      className="h-full w-full max-h-full max-w-full object-contain"
                                    />
                                  ) : (
                                    <span className="font-black text-[9px] text-gray-400 uppercase">
                                      {prod.name.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold text-accent-700 uppercase tracking-wider block">
                                    {prod.brand?.name || 'Local'}
                                  </span>
                                  <span className="font-black text-xs text-gray-900 block truncate">
                                    {prod.name}
                                  </span>
                                  {prod.sku && (
                                    <span className="text-[10px] text-gray-400 font-mono block">
                                      SKU: {prod.sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Category */}
                            <td className="p-3">
                              <span className="inline-flex rounded-lg bg-gray-100 text-gray-700 px-2 py-0.5 text-[11px] font-bold">
                                {prod.category?.name || 'Uncategorized'}
                              </span>
                            </td>

                            {/* Variants Count */}
                            <td className="p-3">
                              <span className="font-bold text-gray-900 text-xs">
                                {variants.length} pack{variants.length === 1 ? '' : 's'}
                              </span>
                            </td>

                            {/* Offer Badge Display */}
                            <td className="p-3">
                              {hasOffers || prodBadge ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 border border-emerald-200 uppercase">
                                    <Tag size={11} className="text-emerald-600" />
                                    {prodBadge || `${variantsWithOffers[0]?.attributeValue}: ${variantOffersMap[variantsWithOffers[0]?.id]?.discountPercent}% OFF`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">Regular Price</span>
                              )}
                            </td>

                            {/* Total Stock */}
                            <td className="p-3">
                              <span
                                className={`font-black text-xs ${
                                  totalStock === 0
                                    ? 'text-red-600'
                                    : totalStock <= 10
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {totalStock} units
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleToggleProductStatus(prod)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black border transition ${
                                  prod.status === 'ACTIVE'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-gray-100 text-gray-500 border-gray-300'
                                }`}
                              >
                                {prod.status === 'ACTIVE' ? '● ACTIVE' : '○ INACTIVE'}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditProductModal(prod)}
                                  className="p-1.5 rounded-lg text-gray-600 hover:text-emerald-700 hover:bg-gray-100 transition"
                                  title="Edit Product & Offers"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(prod)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                                  title="Delete Product"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDABLE INLINE DRAWER: Showing all variants with prices, MRP & offer breakdown */}
                          {isExpanded && (
                            <tr key={`${prod.id}-expanded`} className="bg-gray-50/70 border-b border-gray-200">
                              <td colSpan={8} className="p-4 pl-14">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-black text-xs text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                                      <Tag size={13} className="text-emerald-700" />
                                      Pack Sizes & Live Pricing for "{prod.name}"
                                    </h5>
                                    <button
                                      type="button"
                                      onClick={() => openEditProductModal(prod)}
                                      className="text-xs font-bold text-emerald-700 hover:underline"
                                    >
                                      Edit Pack Offers →
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                    {variants.map((v) => {
                                      const offer = variantOffersMap[v.id];
                                      const hasDiscount = offer && offer.discountPercent > 0;
                                      return (
                                        <div
                                          key={v.id}
                                          className="bg-white rounded-xl border border-gray-200 p-2.5 flex flex-col justify-between shadow-xs"
                                        >
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="font-black text-xs text-gray-900">
                                                {v.attributeValue}
                                              </span>
                                              {hasDiscount && (
                                                <span className="rounded bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 border border-emerald-200">
                                                  {offer.discountPercent}% OFF
                                                </span>
                                              )}
                                            </div>

                                            <div className="mt-1 flex items-baseline gap-1.5">
                                              <span className="text-sm font-black text-emerald-700">
                                                ₹{Number(v.price).toFixed(2)}
                                              </span>
                                              {hasDiscount && (
                                                <span className="text-[10px] text-gray-400 line-through">
                                                  ₹{offer.mrp.toFixed(0)}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                                            <span>Stock: {v.stock} units</span>
                                            <span className={v.stock > 0 ? 'text-emerald-700 font-bold' : 'text-red-500 font-bold'}>
                                              {v.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CATEGORIES & BRANDS TAXONOMY */}
      {/* ==================================================================== */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Categories & Subcategories Tree */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <FolderTree size={18} className="text-emerald-700" />
                <h3 className="font-black text-sm text-gray-900">Categories & Subcategories</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryName('');
                  setCategoryStatus('ACTIVE');
                  setIsCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-xl transition"
              >
                <Plus size={13} /> Add Category
              </button>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => {
                const isExpanded = expandedCategories[cat.id];
                const subCount = cat.subcategories?.length || 0;
                return (
                  <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div
                      className="p-3 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between cursor-pointer transition select-none"
                      onClick={() =>
                        setExpandedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        <span className="font-black text-xs text-gray-900">{cat.name}</span>
                        <span className="rounded bg-gray-200 text-gray-700 text-[10px] font-bold px-1.5 py-0.2">
                          {subCount} subcategories
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCatIdForSub(cat.id);
                            setEditingSubcategory(null);
                            setSubName('');
                            setIsSubcategoryModalOpen(true);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                        >
                          + Subcategory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryName(cat.name);
                            setCategoryStatus(cat.status);
                            setIsCategoryModalOpen(true);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-900"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories list */}
                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-gray-150 space-y-1.5">
                        {subCount === 0 ? (
                          <span className="text-[11px] text-gray-400 italic">No subcategories created yet.</span>
                        ) : (
                          cat.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs font-semibold text-gray-800"
                            >
                              <span>{sub.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetCatIdForSub(cat.id);
                                    setEditingSubcategory(sub);
                                    setSubName(sub.name);
                                    setIsSubcategoryModalOpen(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-700"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Brands Management */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-emerald-700" />
                <h3 className="font-black text-sm text-gray-900">Brands Directory</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingBrand(null);
                  setBrandName('');
                  setBrandStatus('ACTIVE');
                  setIsBrandModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-xl transition"
              >
                <Plus size={13} /> Add Brand
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50"
                >
                  <div className="min-w-0">
                    <span className="font-black text-xs text-gray-900 block truncate">{b.name}</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{b.status}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBrand(b);
                      setBrandName(b.name);
                      setBrandStatus(b.status);
                      setIsBrandModalOpen(true);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-900"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: STOCK & INVENTORY MANAGER */}
      {/* ==================================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Sub-tab switcher: Live Levels vs Movement Audit Log */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInventorySubTab('levels')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  inventorySubTab === 'levels'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Live Stock Levels
              </button>
              <button
                type="button"
                onClick={() => setInventorySubTab('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  inventorySubTab === 'history'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Movement History ({transactions.length})
              </button>
            </div>

            {inventorySubTab === 'levels' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter stock by product name..."
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-700"
                />
                <select
                  value={invFilter}
                  onChange={(e) => setInvFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-700"
                >
                  <option value="ALL">All Levels</option>
                  <option value="LOW">⚠️ Low Stock (≤10)</option>
                  <option value="OUT">❌ Out of Stock (0)</option>
                </select>
              </div>
            )}
          </div>

          {/* Sub-view A: Live Stock Levels Table */}
          {inventorySubTab === 'levels' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      <th className="p-3.5">Product & Pack Size</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Unit Selling Price</th>
                      <th className="p-3.5">Current Stock</th>
                      <th className="p-3.5">Stock Health</th>
                      <th className="p-3.5 text-right">Quick Stock Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {flattenedVariants.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition">
                        <td className="p-3">
                          <div>
                            <span className="font-black text-xs text-gray-900 block truncate">
                              {item.productName}
                            </span>
                            <span className="text-[10px] font-bold text-accent-700 uppercase">
                              {item.attributeValue} • {item.brandName}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">{item.categoryName}</td>
                        <td className="p-3 font-bold text-emerald-800">₹{Number(item.price).toFixed(2)}</td>
                        <td className="p-3 font-black text-sm">{item.stock} units</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                              item.stock === 0
                                ? 'bg-red-100 text-red-800'
                                : item.stock <= 10
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.stock === 0 ? 'Out of Stock' : item.stock <= 10 ? 'Low Stock' : 'Good Stock'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVariantForAdjust(item);
                              setAdjustQty('');
                              setAdjustType('STOCK_ADDITION');
                              setAdjustReason('Restock / Supplier Delivery');
                            }}
                            className="inline-flex items-center gap-1 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-gray-700 px-3 py-1 text-xs font-bold transition border border-gray-200"
                          >
                            +/- Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-view B: Movement History Log */}
          {inventorySubTab === 'history' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Variant</th>
                      <th className="p-3.5">Quantity Change</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-gray-400">
                          No recent inventory adjustments recorded.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                          <td className="p-3 text-gray-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-gray-900">
                            {tx.variant?.product?.name || 'Item'} ({tx.variant?.attributeValue || ''})
                          </td>
                          <td className="p-3">
                            <span
                              className={`font-black text-xs ${
                                tx.quantity > 0 ? 'text-emerald-700' : 'text-red-600'
                              }`}
                            >
                              {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} units
                            </span>
                          </td>
                          <td className="p-3 text-[10px] font-mono text-gray-600">{tx.transactionType}</td>
                          <td className="p-3 text-gray-700">{tx.reason || 'None specified'}</td>
                          <td className="p-3 text-gray-500 font-semibold">{tx.adminUser?.name || 'System / POS'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT WITH INLINE VARIANT OFFERS */}
      {/* ==================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-700" />
                <h3 className="font-black text-base text-gray-900">
                  {editingProduct ? 'Edit Product & Variant Offers' : 'Add New Product & Variant Offers'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitProduct} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Product Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aishwarya Gold Wada Kolam Rice"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-700"
                  />
                </div>

                {/* Category, Subcategory, Brand Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Category *
                    </label>
                    <select
                      value={prodCat}
                      onChange={(e) => setProdCat(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Brand *
                    </label>
                    <select
                      value={prodBrand}
                      onChange={(e) => setProdBrand(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={prodStatus}
                      onChange={(e) => setProdStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>

                {/* Optional SKU, Barcode, Offer Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      SKU (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AG-WK-01"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Barcode (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8901234567890"
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                      Product Offer Badge (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Diwali Dhamaka, Special Deal"
                      value={prodOfferBadge}
                      onChange={(e) => setProdOfferBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                {/* Image Upload with Auto-compression */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                    Product Image (Auto-Compressed for Fast Load)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        toast.info('Compressing product image...');
                        const compressed = await compressImage(file);
                        setProdImage(compressed);
                        toast.success(`Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-emerald-700 file:text-white file:font-bold file:text-xs hover:file:bg-emerald-800 cursor-pointer"
                  />
                </div>

                {/* ---------------------------------------------------- */}
                {/* DIRECT PER-VARIANT OFFER & MRP CONFIGURATION */}
                {/* ---------------------------------------------------- */}
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                        <Tag size={14} className="text-emerald-700" />
                        Pack Variants, Selling Prices & MRP Offers
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Set the Selling Price and original MRP for each pack size. The discount % will calculate automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFormVariant}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
                    >
                      <Plus size={13} /> Add Pack Size
                    </button>
                  </div>

                  {/* Variants Grid */}
                  <div className="space-y-2.5">
                    {formVariants.map((v, index) => {
                      const priceNum = parseFloat(v.price) || 0;
                      const mrpNum = parseFloat(v.mrp) || 0;
                      const hasDiscount = mrpNum > priceNum && priceNum > 0;
                      const discountPct = hasDiscount ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
                      const savings = hasDiscount ? mrpNum - priceNum : 0;

                      return (
                        <div
                          key={v.id}
                          className="p-3 bg-gray-50/70 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                        >
                          {/* Pack Size */}
                          <div className="w-full sm:w-28 shrink-0">
                            <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">
                              Pack Weight/Size *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 1 Kg"
                              value={v.attributeValue}
                              onChange={(e) => handleUpdateFormVariant(v.id, 'attributeValue', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 focus:outline-none focus:border-emerald-700"
                            />
                          </div>

                          {/* Selling Price */}
                          <div className="w-full sm:w-24 shrink-0">
                            <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">
                              Selling Price (₹) *
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              required
                              placeholder="90"
                              value={v.price}
                              onChange={(e) => handleUpdateFormVariant(v.id, 'price', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-emerald-800 focus:outline-none focus:border-emerald-700"
                            />
                          </div>

                          {/* MRP */}
                          <div className="w-full sm:w-24 shrink-0">
                            <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">
                              MRP / Regular (₹)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              placeholder="100"
                              value={v.mrp}
                              onChange={(e) => handleUpdateFormVariant(v.id, 'mrp', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:border-emerald-700"
                            />
                          </div>

                          {/* Live Discount Calculation Badge */}
                          <div className="w-full sm:w-32 shrink-0 flex flex-col justify-center">
                            <span className="text-[9px] font-black uppercase text-gray-400 mb-0.5">
                              Calculated Offer
                            </span>
                            {hasDiscount ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-1 border border-emerald-300">
                                <Percent size={10} /> {discountPct}% OFF (Save ₹{savings.toFixed(0)})
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold">No Offer</span>
                            )}
                          </div>

                          {/* Stock */}
                          <div className="w-full sm:w-20 shrink-0">
                            <label className="block text-[9px] font-black uppercase text-gray-400 mb-0.5">
                              Stock Units
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="50"
                              value={v.stock}
                              onChange={(e) => handleUpdateFormVariant(v.id, 'stock', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                            />
                          </div>

                          {/* Remove button */}
                          <div className="sm:ml-auto flex items-center pt-2 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveFormVariant(v.id)}
                              className="p-1 text-gray-300 hover:text-red-600 transition"
                              title="Remove pack size"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving Product...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CATEGORY CREATE / EDIT */}
      {/* ==================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="font-black text-sm text-gray-900 mb-3">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rice & Grains"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: SUBCATEGORY CREATE / EDIT */}
      {/* ==================================================================== */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="font-black text-sm text-gray-900 mb-3">
              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </h3>
            <form onSubmit={handleSaveSubcategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  Save Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: BRAND CREATE / EDIT */}
      {/* ==================================================================== */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <h3 className="font-black text-sm text-gray-900 mb-3">
              {editingBrand ? 'Edit Brand' : 'Add New Brand'}
            </h3>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fortune, Aishwarya"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: QUICK STOCK ADJUSTMENT DRAWER */}
      {/* ==================================================================== */}
      {selectedVariantForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 block">
                  Quick Stock Adjustment
                </span>
                <h3 className="font-black text-sm text-gray-900">
                  {selectedVariantForAdjust.productName} ({selectedVariantForAdjust.attributeValue})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVariantForAdjust(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteStockAdjust} className="space-y-4 mt-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-semibold">Current Available Stock:</span>
                <span className="font-black text-base text-gray-900">
                  {selectedVariantForAdjust.stock} units
                </span>
              </div>

              {/* Adjust Type */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('STOCK_ADDITION')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    adjustType === 'STOCK_ADDITION'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('STOCK_REDUCTION')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    adjustType === 'STOCK_REDUCTION'
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  - Deduct Stock
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Quantity Units *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 25"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier delivery / physical count correction"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setSelectedVariantForAdjust(null)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {adjustSubmitting ? 'Updating...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
