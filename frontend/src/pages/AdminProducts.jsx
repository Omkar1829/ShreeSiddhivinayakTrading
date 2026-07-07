import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../utils/toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, ArrowLeft, Search, Upload, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (location.state?.openAddProduct) {
      setIsProductModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [selectedProductIdForVariant, setSelectedProductIdForVariant] = useState('');

  // Product Form values
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodSubCat, setProdSubCat] = useState('');
  const [prodBrand, setProdBrand] = useState('');
  const [prodStatus, setProdStatus] = useState('ACTIVE');
  const [prodImage, setProdImage] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Variant Form values
  const [varAttr, setVarAttr] = useState('Weight');
  const [varVal, setVarVal] = useState('');
  const [varPrice, setVarPrice] = useState('');
  const [varStock, setVarStock] = useState('');
  const [varStatus, setVarStatus] = useState('ACTIVE');

  // Search, Pagination, Filter states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalProducts, setTotalProducts] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Category Creation Modal state
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Subcategory Creation Modal state
  const [isNewSubcategoryModalOpen, setIsNewSubcategoryModalOpen] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  // Brand Creation Modal state
  const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Inline variants for ADD product form
  const [tempVariants, setTempVariants] = useState([
    { id: 'initial-1', attributeName: 'Weight', attributeValue: '', price: '', stock: '', status: 'ACTIVE' }
  ]);

  // Inline variant edit states (for existing variants in EDIT mode)
  const [editingVariantId, setEditingVariantId] = useState('');
  const [editVarAttr, setEditVarAttr] = useState('Weight');
  const [editVarVal, setEditVarVal] = useState('');
  const [editVarPrice, setEditVarPrice] = useState('');
  const [editVarStock, setEditVarStock] = useState('');
  const [editVarStatus, setEditVarStatus] = useState('ACTIVE');

  // Inline new variant fields for EDIT mode
  const [newVarAttr, setNewVarAttr] = useState('Weight');
  const [newVarVal, setNewVarVal] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  // CSV Import state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvErrors, setCsvErrors] = useState([]);
  const [csvSummary, setCsvSummary] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const loadData = async (showLoader = true, searchStr = debouncedSearch, pageNum = page, catF = categoryFilter, brandF = brandFilter) => {
    if (showLoader) setLoading(true);
    try {
      const offset = (pageNum - 1) * limit;
      const prodRes = await api.get(`/api/products/admin/all?search=${encodeURIComponent(searchStr)}&limit=${limit}&offset=${offset}&categoryId=${catF}&brandId=${brandF}`);
      const catRes = await api.get('/api/categories/admin/all');
      const brandRes = await api.get('/api/brands/admin/all');

      if (prodRes.data.success) {
        setProducts(prodRes.data.products);
        if (prodRes.data.pagination) {
          setTotalProducts(prodRes.data.pagination.total);
        } else {
          setTotalProducts(prodRes.data.products.length);
        }
      }
      if (catRes.data.success) setCategories(catRes.data.categories);
      if (brandRes.data.success) setBrands(brandRes.data.brands);
    } catch (err) {
      console.error('Failed to load admin catalog details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      loadData(true, debouncedSearch, page, categoryFilter, brandFilter);
    }
  }, [isAuthenticated, user, debouncedSearch, page, categoryFilter, brandFilter]);

  const handleCategoryCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post('/api/categories', { name: newCategoryName, status: 'ACTIVE' });
      if (res.data.success) {
        await loadData(false);
        setProdCat(res.data.category.id);
        setIsNewCategoryModalOpen(false);
        setNewCategoryName('');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create category.');
    }
  };

  const handleSubcategoryCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newSubcategoryName.trim() || !prodCat) return;
    try {
      const res = await api.post(`/api/categories/${prodCat}/subcategories`, { name: newSubcategoryName, status: 'ACTIVE' });
      if (res.data.success) {
        await loadData(false);
        setProdSubCat(res.data.subcategory.id);
        setIsNewSubcategoryModalOpen(false);
        setNewSubcategoryName('');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create subcategory.');
    }
  };

  const handleBrandCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const res = await api.post('/api/brands', { name: newBrandName, status: 'ACTIVE' });
      if (res.data.success) {
        await loadData(false);
        setProdBrand(res.data.brand.id);
        setIsNewBrandModalOpen(false);
        setNewBrandName('');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create brand.');
    }
  };

  const handleInlineAddVariant = async (e) => {
    e.preventDefault();
    if (!newVarVal.trim() || !newVarPrice || !newVarStock) {
      toast.warning('Please fill out all variant fields.');
      return;
    }
    try {
      const payload = {
        attributeName: newVarAttr,
        attributeValue: newVarVal,
        price: parseFloat(newVarPrice),
        stock: parseInt(newVarStock),
        status: 'ACTIVE'
      };
      const res = await api.post(`/api/products/${editingProduct.id}/variants`, payload);
      if (res.data.success) {
        // Reset inputs
        setNewVarVal('');
        setNewVarPrice('');
        setNewVarStock('');
        // Refresh data
        const prodRes = await api.get(`/api/products/admin/all?search=${encodeURIComponent(debouncedSearch)}&limit=${limit}&offset=${(page - 1) * limit}&categoryId=${categoryFilter}&brandId=${brandFilter}`);
        if (prodRes.data.success) {
          setProducts(prodRes.data.products);
          const updatedP = prodRes.data.products.find(p => p.id === editingProduct.id);
          if (updatedP) setEditingProduct(updatedP);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add variant.');
    }
  };

  const handleInlineUpdateVariant = async (vId) => {
    try {
      const res = await api.put(`/api/products/variants/${vId}`, {
        attributeName: editVarAttr,
        attributeValue: editVarVal,
        price: parseFloat(editVarPrice),
        stock: parseInt(editVarStock),
        status: editVarStatus
      });
      if (res.data.success) {
        setEditingVariantId('');
        // Refresh data
        const prodRes = await api.get(`/api/products/admin/all?search=${encodeURIComponent(debouncedSearch)}&limit=${limit}&offset=${(page - 1) * limit}&categoryId=${categoryFilter}&brandId=${brandFilter}`);
        if (prodRes.data.success) {
          setProducts(prodRes.data.products);
          const updatedP = prodRes.data.products.find(p => p.id === editingProduct.id);
          if (updatedP) setEditingProduct(updatedP);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Variant update failed.');
    }
  };

  const handleInlineDeleteVariant = async (vId) => {
    if (!window.confirm('Delete this variant option?')) return;
    try {
      const res = await api.delete(`/api/products/variants/${vId}`);
      if (res.data.success) {
        // Refresh data
        const prodRes = await api.get(`/api/products/admin/all?search=${encodeURIComponent(debouncedSearch)}&limit=${limit}&offset=${(page - 1) * limit}&categoryId=${categoryFilter}&brandId=${brandFilter}`);
        if (prodRes.data.success) {
          setProducts(prodRes.data.products);
          const updatedP = prodRes.data.products.find(p => p.id === editingProduct.id);
          if (updatedP) setEditingProduct(updatedP);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const downloadDummyCsv = () => {
    const csvContent = "Product Name,Description,Category,Brand,SKU,Price,Sale Price,Stock,Weight,Variant Name,Variant Value,Image URL\n" +
      "Tata Dal Premium,High protein unpolished pigeon peas,Groceries,Tata,TATA-DAL-1KG,180.00,,50,1 Kg,Weight,1 Kg,https://picsum.photos/200\n" +
      "Tata Dal Premium,High protein unpolished pigeon peas,Groceries,Tata,TATA-DAL-2KG,350.00,,30,2 Kg,Weight,2 Kg,https://picsum.photos/200\n" +
      "Amul Gold Fresh Milk,Full cream fresh dairy milk,Dairy,Amul,AMUL-GOLD-1L,66.00,,100,1 L,Volume,1 L,https://picsum.photos/200";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "siddhivinayak_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUploadSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.warning('Please select a CSV file first.');
      return;
    }

    setCsvUploading(true);
    setCsvErrors([]);
    setCsvSummary(null);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await api.post('/api/products/admin/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setCsvSummary(res.data.summary);
        setCsvFile(null);
        await loadData(false);
      } else {
        setCsvSummary(res.data.summary);
        setCsvErrors(res.data.errors || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to import CSV.');
    } finally {
      setCsvUploading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    const formData = new FormData();
    formData.append('name', prodName);
    formData.append('description', prodDesc);
    formData.append('sku', prodSku);
    formData.append('barcode', prodBarcode);
    formData.append('categoryId', prodCat);
    formData.append('subcategoryId', prodSubCat);
    formData.append('brandId', prodBrand);
    formData.append('status', prodStatus);
    if (prodImage) {
      formData.append('image', prodImage);
    }
    if (!editingProduct) {
      formData.append('variants', JSON.stringify(tempVariants));
    }

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/api/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      loadData();
      closeProductModal();
    } catch (err) {
      toast.error(err.message || 'Product save failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const payload = {
        attributeName: varAttr,
        attributeValue: varVal,
        price: parseFloat(varPrice),
        stock: parseInt(varStock),
        status: varStatus
      };

      const res = await api.post(`/api/products/${selectedProductIdForVariant}/variants`, payload);
      if (res.data.success) {
        loadData();
        closeVariantModal();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to add variant.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? All variants will be deleted.')) return;
    try {
      const res = await api.delete(`/api/products/${id}`);
      if (res.data.success) loadData();
    } catch (err) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const handleDeleteVariant = async (id) => {
    if (!window.confirm('Delete this variant option?')) return;
    try {
      const res = await api.delete(`/api/products/variants/${id}`);
      if (res.data.success) loadData();
    } catch (err) {
      toast.error(err.message || 'Delete failed.');
    }
  };

  const openProductModalForEdit = (prod) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdDesc(prod.description || '');
    setProdSku(prod.sku || '');
    setProdBarcode(prod.barcode || '');
    setProdCat(prod.categoryId || '');
    setProdSubCat(prod.subcategoryId || '');
    setProdBrand(prod.brandId || '');
    setProdStatus(prod.status);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdSku('');
    setProdBarcode('');
    setProdCat('');
    setProdSubCat('');
    setProdBrand('');
    setProdStatus('ACTIVE');
    setProdImage(null);
    setTempVariants([
      { id: 'initial-1', attributeName: 'Weight', attributeValue: '', price: '', stock: '', status: 'ACTIVE' }
    ]);
    setEditingVariantId('');
    setNewVarVal('');
    setNewVarPrice('');
    setNewVarStock('');
    setIsProductModalOpen(false);
  };

  const openVariantModal = (productId) => {
    setSelectedProductIdForVariant(productId);
    setIsVariantModalOpen(true);
  };

  const closeVariantModal = () => {
    setSelectedProductIdForVariant('');
    setVarVal('');
    setVarPrice('');
    setVarStock('');
    setVarStatus('ACTIVE');
    setIsVariantModalOpen(false);
  };

  // Find subcategories based on chosen category
  const activeSubcategories = categories.find(c => c.id === prodCat)?.subcategories || [];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manage Catalog Products</h1>
            <p className="text-xs text-gray-500 mt-1">Configure products, variants, brands, and categories.</p>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-primary-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, SKUs, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-250 py-2 pl-9 pr-4 text-xs text-gray-950 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-250 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-250 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                <th className="p-4">Item Details</th>
                <th className="p-4">SKU / Barcode</th>
                <th className="p-4">Category / Brand</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-50 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-gray-400 font-bold uppercase text-[9px]">{prod.name.slice(0, 2)}</span>
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-gray-900 block">{prod.name}</span>
                        <span className="text-[10px] text-gray-400 block font-semibold">{prod.variants?.length || 0} variant options</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="block font-bold text-gray-700">{prod.sku || 'No SKU'}</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">{prod.barcode || 'No Barcode'}</span>
                  </td>
                  <td className="p-4">
                    <span className="block font-bold text-gray-750">{prod.category?.name || '-'}</span>
                    <span className="block text-[10px] text-accent-700 font-bold mt-0.5">{prod.brand?.name || '-'}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${prod.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {prod.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openProductModalForEdit(prod)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-primary-850 hover:bg-primary-50 transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalProducts > limit && (
        <div className="flex items-center justify-between border border-gray-100 rounded-2xl bg-white p-4 shadow-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold text-gray-500">
            Page {page} of {Math.ceil(totalProducts / limit)}
          </span>
          <button
            disabled={page * limit >= totalProducts}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            Next →
          </button>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="border-b border-gray-150 p-5 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                {editingProduct ? 'Edit Catalog Product' : 'Add Catalog Product'}
              </h3>
              <button onClick={closeProductModal} className="text-gray-400 hover:text-gray-600 font-bold">Close</button>
            </div>
            
            <form onSubmit={handleProductSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-gray-700 flex-1">
              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-1">Product Description</label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Barcode</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-450 uppercase">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsNewCategoryModalOpen(true)}
                      className="text-[9px] text-primary-855 font-bold hover:underline"
                    >
                      + Create New
                    </button>
                  </div>
                  <select
                    value={prodCat}
                    onChange={(e) => {
                      setProdCat(e.target.value);
                      setProdSubCat(''); // Reset subcat
                    }}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-450 uppercase">Subcategory</label>
                    {prodCat && (
                      <button
                        type="button"
                        onClick={() => setIsNewSubcategoryModalOpen(true)}
                        className="text-[9px] text-primary-855 font-bold hover:underline"
                      >
                        + Create New
                      </button>
                    )}
                  </div>
                  <select
                    value={prodSubCat}
                    onChange={(e) => setProdSubCat(e.target.value)}
                    disabled={!prodCat}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none disabled:bg-gray-50"
                  >
                    <option value="">Select Subcategory</option>
                    {activeSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-450 uppercase">Brand</label>
                    <button
                      type="button"
                      onClick={() => setIsNewBrandModalOpen(true)}
                      className="text-[9px] text-primary-855 font-bold hover:underline"
                    >
                      + Create New
                    </button>
                  </div>
                  <select
                    value={prodBrand}
                    onChange={(e) => setProdBrand(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  >
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Product Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProdImage(e.target.files[0])}
                    className="w-full text-xs text-gray-400 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Product Status</label>
                  <select
                    value={prodStatus}
                    onChange={(e) => setProdStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Variant Options Section */}
              <div className="border-t border-gray-150 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Variant Options</h4>
                  {!editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempVariants([
                          ...tempVariants,
                          { id: Math.random().toString(), attributeName: 'Weight', attributeValue: '', price: '', stock: '', status: 'ACTIVE' }
                        ]);
                      }}
                      className="rounded-lg bg-primary-50 px-2.5 py-1.5 text-[10px] font-bold text-primary-800 hover:bg-primary-100 transition"
                    >
                      + Add Variant Option
                    </button>
                  )}
                </div>

                {/* 1. Add Product Mode: Render tempVariants */}
                {!editingProduct && (
                  <div className="space-y-3 overflow-x-auto pb-2">
                    <div className="min-w-[600px] space-y-3">
                      {tempVariants.map((v, index) => (
                        <div key={v.id} className="grid grid-cols-5 gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Attribute</label>
                            <select
                              value={v.attributeName}
                              onChange={(e) => {
                                const updated = [...tempVariants];
                                updated[index].attributeName = e.target.value;
                                setTempVariants(updated);
                              }}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white text-gray-750 font-bold"
                            >
                              <option value="Weight">Weight</option>
                              <option value="Volume">Volume</option>
                              <option value="Pack">Pack</option>
                              <option value="Size">Size</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Value *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 500g, 1L"
                              value={v.attributeValue}
                              onChange={(e) => {
                                const updated = [...tempVariants];
                                updated[index].attributeValue = e.target.value;
                                setTempVariants(updated);
                              }}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white text-gray-750 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Price *</label>
                            <input
                              type="number"
                              required
                              step="0.01"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...tempVariants];
                                updated[index].price = e.target.value;
                                setTempVariants(updated);
                              }}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white text-gray-750 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Stock *</label>
                            <input
                              type="number"
                              required
                              placeholder="Stock"
                              value={v.stock}
                              onChange={(e) => {
                                const updated = [...tempVariants];
                                updated[index].stock = e.target.value;
                                setTempVariants(updated);
                              }}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white text-gray-750 font-bold"
                            />
                          </div>
                          <div className="flex items-end justify-between gap-1 h-full pt-4">
                            <div className="flex-1">
                              <select
                                value={v.status}
                                onChange={(e) => {
                                  const updated = [...tempVariants];
                                  updated[index].status = e.target.value;
                                  setTempVariants(updated);
                                }}
                                className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white text-gray-750 font-bold"
                              >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                              </select>
                            </div>
                            {tempVariants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTempVariants(tempVariants.filter(item => item.id !== v.id));
                                }}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Edit Product Mode: Render existing variants and inline add row */}
                {editingProduct && (
                  <div className="space-y-3">
                    {/* Existing saved variants */}
                    <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white max-h-[220px] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px] min-w-[550px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-gray-450 uppercase font-black tracking-wider">
                            <th className="p-2.5">Attribute</th>
                            <th className="p-2.5">Value</th>
                            <th className="p-2.5">Price</th>
                            <th className="p-2.5">Stock</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editingProduct.variants || []).map((v) => {
                            const isEditing = editingVariantId === v.id;
                            if (isEditing) {
                              return (
                                <tr key={v.id} className="border-b border-gray-100 bg-primary-50/10">
                                  <td className="p-2">
                                    <select
                                      value={editVarAttr}
                                      onChange={(e) => setEditVarAttr(e.target.value)}
                                      className="rounded-lg border border-gray-200 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                                    >
                                      <option value="Weight">Weight</option>
                                      <option value="Volume">Volume</option>
                                      <option value="Pack">Pack</option>
                                      <option value="Size">Size</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={editVarVal}
                                      onChange={(e) => setEditVarVal(e.target.value)}
                                      className="rounded-lg border border-gray-200 p-1 w-full text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editVarPrice}
                                      onChange={(e) => setEditVarPrice(e.target.value)}
                                      className="rounded-lg border border-gray-200 p-1 w-20 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={editVarStock}
                                      onChange={(e) => setEditVarStock(e.target.value)}
                                      className="rounded-lg border border-gray-200 p-1 w-16 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={editVarStatus}
                                      onChange={(e) => setEditVarStatus(e.target.value)}
                                      className="rounded-lg border border-gray-200 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                                    >
                                      <option value="ACTIVE">ACTIVE</option>
                                      <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                  </td>
                                  <td className="p-2 text-right space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleInlineUpdateVariant(v.id)}
                                      className="text-emerald-650 font-black hover:underline"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingVariantId('')}
                                      className="text-gray-400 font-bold hover:underline"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={v.id} className="border-b border-gray-100 text-gray-700 hover:bg-gray-50">
                                <td className="p-2.5 font-bold text-gray-900">{v.attributeName}</td>
                                <td className="p-2.5">{v.attributeValue}</td>
                                <td className="p-2.5 font-bold text-gray-800">₹{parseFloat(v.price).toFixed(2)}</td>
                                <td className="p-2.5">{v.stock} units</td>
                                <td className="p-2.5">
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${v.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {v.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingVariantId(v.id);
                                      setEditVarAttr(v.attributeName);
                                      setEditVarVal(v.attributeValue);
                                      setEditVarPrice(v.price);
                                      setEditVarStock(v.stock);
                                      setEditVarStatus(v.status);
                                    }}
                                    className="text-primary-855 font-bold hover:underline"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInlineDeleteVariant(v.id)}
                                    className="text-red-500 font-bold hover:underline"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Inline Form to add variant to existing product */}
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-150 space-y-2.5">
                      <span className="block text-[10px] text-gray-450 uppercase font-black">Add Variant Option</span>
                      <div className="overflow-x-auto pb-2">
                        <div className="grid grid-cols-4 gap-2 items-center min-w-[500px]">
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Attribute</label>
                            <select
                              value={newVarAttr}
                              onChange={(e) => setNewVarAttr(e.target.value)}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                            >
                              <option value="Weight">Weight</option>
                              <option value="Volume">Volume</option>
                              <option value="Pack">Pack</option>
                              <option value="Size">Size</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Value *</label>
                            <input
                              type="text"
                              placeholder="e.g. 5kg, 2L"
                              value={newVarVal}
                              onChange={(e) => setNewVarVal(e.target.value)}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Price *</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={newVarPrice}
                              onChange={(e) => setNewVarPrice(e.target.value)}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-400 uppercase mb-0.5 font-bold">Stock *</label>
                            <input
                              type="number"
                              placeholder="Stock"
                              value={newVarStock}
                              onChange={(e) => setNewVarStock(e.target.value)}
                              className="w-full rounded-lg border border-gray-250 p-1 text-[11px] focus:outline-none bg-white font-bold text-gray-750"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleInlineAddVariant}
                          className="rounded-lg bg-primary-800 px-3.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-primary-900 transition shadow-sm"
                        >
                          + Save Variant Option
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4 flex gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-lg bg-primary-800 px-5 py-2 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm"
                >
                  {formSubmitting && <Loader2 className="animate-spin" size={12} />}
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Add Product Variant Option</h3>
            
            <form onSubmit={handleVariantSubmit} className="space-y-4 text-xs font-semibold text-gray-750">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Attribute Name</label>
                  <select
                    value={varAttr}
                    onChange={(e) => setVarAttr(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                  >
                    <option value="Weight">Weight</option>
                    <option value="Volume">Volume</option>
                    <option value="Pack">Pack</option>
                    <option value="Size">Size</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Value (e.g. 5 Kg) *</label>
                  <input
                    type="text"
                    value={varVal}
                    onChange={(e) => setVarVal(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                    placeholder="e.g. 5 Kg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={varPrice}
                    onChange={(e) => setVarPrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                    placeholder="150"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    value={varStock}
                    onChange={(e) => setVarStock(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                    placeholder="25"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-1">Status</label>
                <select
                  value={varStatus}
                  onChange={(e) => setVarStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={closeVariantModal}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-lg bg-primary-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm"
                >
                  {formSubmitting && <Loader2 className="animate-spin" size={12} />}
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      {isNewCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-gray-900">Create New Category</h3>
            <form onSubmit={handleCategoryCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1 font-bold">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beverages, Spices"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-gray-250 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewCategoryModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Creation Modal */}
      {isNewSubcategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-gray-900">Create New Subcategory</h3>
            <form onSubmit={handleSubcategoryCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1 font-bold">Subcategory Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Juices, Milk Products"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  className="w-full rounded-xl border border-gray-250 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewSubcategoryModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Creation Modal */}
      {isNewBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-gray-900">Create New Brand</h3>
            <form onSubmit={handleBrandCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1 font-bold">Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata, Amul, Wow"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full rounded-xl border border-gray-250 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsNewBrandModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5">
                <Upload size={18} className="text-primary-805" /> Import Catalog CSV
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvFile(null);
                  setCsvErrors([]);
                  setCsvSummary(null);
                }}
                className="text-gray-400 hover:text-gray-750"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCsvUploadSubmit} className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 flex flex-col gap-2.5">
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                  Select a product catalog CSV file. If you do not have one, download our template dummy file first.
                </p>
                <button
                  type="button"
                  onClick={downloadDummyCsv}
                  className="w-full rounded-xl border border-gray-250 bg-white py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-1"
                >
                  <Download size={14} /> Download Template CSV
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase mb-1 font-bold">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-800"
                />
              </div>

              {csvUploading && (
                <div className="flex items-center gap-2 justify-center py-2 text-xs font-bold text-primary-800">
                  <Loader2 className="animate-spin" size={16} /> Parsing rows and uploading images...
                </div>
              )}

              {/* Import Summary */}
              {csvSummary && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2 text-xs font-semibold text-emerald-800">
                  <div className="flex items-center gap-1">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <h4 className="font-bold text-emerald-900">Import Summary Completed</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>Total Rows: <span className="font-extrabold text-gray-900">{csvSummary.totalRows}</span></div>
                    <div>Failed Rows: <span className="font-extrabold text-gray-900">{csvSummary.failedRowsCount}</span></div>
                    <div>Products Created: <span className="font-extrabold text-gray-900">{csvSummary.importedProducts}</span></div>
                    <div>Variants Created: <span className="font-extrabold text-gray-900">{csvSummary.importedVariants}</span></div>
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {csvErrors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4 space-y-2 text-xs font-semibold text-red-800">
                  <div className="flex items-center gap-1">
                    <AlertTriangle size={16} className="text-red-650" />
                    <h4 className="font-bold text-red-900">Import Validation Errors ({csvErrors.length})</h4>
                  </div>
                  <div className="max-h-45 overflow-y-auto space-y-1.5 divide-y divide-red-100 text-[10px] leading-relaxed pt-1">
                    {csvErrors.map((err, idx) => (
                      <div key={idx} className="pt-1">
                        Row {err.row}: <span className="text-red-650 font-bold">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvErrors([]);
                    setCsvSummary(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvUploading}
                  className="rounded-xl bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900 disabled:opacity-50"
                >
                  Start Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
