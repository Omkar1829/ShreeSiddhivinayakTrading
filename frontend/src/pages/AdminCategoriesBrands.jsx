import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../utils/toast';
import { 
  FolderTree, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  ArrowLeft,
  Settings,
  FolderOpen
} from 'lucide-react';

export default function AdminCategoriesBrands() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'brands'
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Accordion expanded category IDs
  const [expandedCategories, setExpandedCategories] = useState({});

  // Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('ACTIVE');

  // Subcategory Modal state
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryStatus, setSubcategoryStatus] = useState('ACTIVE');

  // Brand Modal state
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');
  const [brandStatus, setBrandStatus] = useState('ACTIVE');

  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const catRes = await api.get('/api/categories/admin/all');
      const brandRes = await api.get('/api/brands/admin/all');

      if (catRes.data.success) {
        setCategories(catRes.data.categories);
      }
      if (brandRes.data.success) {
        setBrands(brandRes.data.brands);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load catalog data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadCatalogData();
  }, [isAuthenticated, user, navigate]);

  const toggleCategoryExpand = (id) => {
    setExpandedCategories(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ----------------------------------------------------
  // Category Handlers
  // ----------------------------------------------------
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryName(cat.name);
      setCategoryStatus(cat.status);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      setCategoryStatus('ACTIVE');
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.warning('Category name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingCategory) {
        const res = await api.put(`/api/categories/${editingCategory.id}`, {
          name: categoryName,
          status: categoryStatus
        });
        if (res.data.success) {
          toast.success('Category updated successfully!');
          setIsCategoryModalOpen(false);
          loadCatalogData();
        }
      } else {
        const res = await api.post('/api/categories', {
          name: categoryName,
          status: categoryStatus
        });
        if (res.data.success) {
          toast.success('Category created successfully!');
          setIsCategoryModalOpen(false);
          loadCatalogData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Category action failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`⚠️ WARNING: Deleting category "${name}" will automatically delete ALL nested subcategories! Also, all products under this category will become "Uncategorized".\n\nAre you sure you want to proceed?`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/categories/${id}`);
      if (res.data.success) {
        toast.success(`Category "${name}" and all subcategories deleted.`);
        loadCatalogData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete category.');
    }
  };

  // ----------------------------------------------------
  // Subcategory Handlers
  // ----------------------------------------------------
  const openSubcategoryModal = (categoryId, subcat = null) => {
    setTargetCategoryId(categoryId);
    if (subcat) {
      setEditingSubcategory(subcat);
      setSubcategoryName(subcat.name);
      setSubcategoryStatus(subcat.status);
    } else {
      setEditingSubcategory(null);
      setSubcategoryName('');
      setSubcategoryStatus('ACTIVE');
    }
    setIsSubcategoryModalOpen(true);
  };

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault();
    if (!subcategoryName.trim()) {
      toast.warning('Subcategory name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingSubcategory) {
        const res = await api.put(`/api/categories/subcategories/${editingSubcategory.id}`, {
          name: subcategoryName,
          status: subcategoryStatus
        });
        if (res.data.success) {
          toast.success('Subcategory updated successfully!');
          setIsSubcategoryModalOpen(false);
          loadCatalogData();
        }
      } else {
        const res = await api.post(`/api/categories/${targetCategoryId}/subcategories`, {
          name: subcategoryName,
          status: subcategoryStatus
        });
        if (res.data.success) {
          toast.success('Subcategory created successfully!');
          setIsSubcategoryModalOpen(false);
          loadCatalogData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Subcategory action failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id, name) => {
    if (!window.confirm(`Delete subcategory "${name}"? Associated products will have their subcategory set to null.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/categories/subcategories/${id}`);
      if (res.data.success) {
        toast.success(`Subcategory "${name}" deleted.`);
        loadCatalogData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete subcategory.');
    }
  };

  // ----------------------------------------------------
  // Brand Handlers
  // ----------------------------------------------------
  const openBrandModal = (br = null) => {
    if (br) {
      setEditingBrand(br);
      setBrandName(br.name);
      setBrandLogo(br.logoUrl || '');
      setBrandStatus(br.status);
    } else {
      setEditingBrand(null);
      setBrandName('');
      setBrandLogo('');
      setBrandStatus('ACTIVE');
    }
    setIsBrandModalOpen(true);
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast.warning('Brand name is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: brandName,
        logoUrl: brandLogo.trim() || null,
        status: brandStatus
      };

      if (editingBrand) {
        const res = await api.put(`/api/brands/${editingBrand.id}`, payload);
        if (res.data.success) {
          toast.success('Brand updated successfully!');
          setIsBrandModalOpen(false);
          loadCatalogData();
        }
      } else {
        const res = await api.post('/api/brands', payload);
        if (res.data.success) {
          toast.success('Brand created successfully!');
          setIsBrandModalOpen(false);
          loadCatalogData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Brand action failed.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteBrand = async (id, name) => {
    if (!window.confirm(`Delete brand "${name}"? Associated products will remain in catalog without a brand.`)) {
      return;
    }

    try {
      const res = await api.delete(`/api/brands/${id}`);
      if (res.data.success) {
        toast.success(`Brand "${name}" deleted.`);
        loadCatalogData();
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete brand.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-primary-850" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Catalog Configuration</h1>
            <p className="text-xs text-gray-500 mt-1">Configure categories hierarchy, subcategories mapping, and product brands.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'categories'
              ? 'border-primary-800 text-primary-850'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <FolderTree size={16} />
          Categories & Subcategories
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'brands'
              ? 'border-primary-800 text-primary-850'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Tag size={16} />
          Brands Directory
        </button>
      </div>

      {/* CATEGORIES SECTION */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase">
              Total Categories: {categories.length}
            </div>
            <button
              onClick={() => openCategoryModal(null)}
              className="flex items-center gap-1.5 rounded-xl bg-primary-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
            >
              <Plus size={16} />
              Add Category
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {categories.map((cat) => {
              const isExpanded = !!expandedCategories[cat.id];
              return (
                <div key={cat.id} className="p-4 sm:p-6 space-y-4">
                  {/* Category Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleCategoryExpand(cat.id)}
                        className="text-gray-400 hover:text-gray-700 transition"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <div>
                        <span className="font-bold text-sm text-gray-900">{cat.name}</span>
                        <span className={`ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${
                          cat.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'
                        }`}>
                          {cat.status}
                        </span>
                        <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">
                          {cat.subcategories?.length || 0} subcategories
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSubcategoryModal(cat.id, null)}
                        className="rounded-lg bg-gray-50 p-2 text-xs font-bold text-primary-800 hover:bg-primary-50 transition"
                        title="Add Subcategory"
                      >
                        + Add Sub
                      </button>
                      <button
                        onClick={() => openCategoryModal(cat)}
                        className="rounded-lg bg-gray-50 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
                        title="Edit Category"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="rounded-lg bg-red-50 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 transition"
                        title="Delete Category"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Subcategories */}
                  {isExpanded && (
                    <div className="pl-6 border-l-2 border-gray-100 mt-4 space-y-2">
                      {(!cat.subcategories || cat.subcategories.length === 0) ? (
                        <div className="text-[11px] text-gray-400 font-medium py-1">
                          No subcategories added to this category yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cat.subcategories.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white transition"
                            >
                              <div>
                                <span className="font-semibold text-xs text-gray-850">{sub.name}</span>
                                <span className={`ml-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                  sub.status === 'ACTIVE' ? 'bg-emerald-100/50 text-emerald-800' : 'bg-red-100/50 text-red-800'
                                }`}>
                                  {sub.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openSubcategoryModal(cat.id, sub)}
                                  className="text-gray-400 hover:text-gray-650 transition"
                                  title="Edit Subcategory"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                                  className="text-red-400 hover:text-red-600 transition"
                                  title="Delete Subcategory"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {categories.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400 font-bold">
                No categories created yet. Click "Add Category" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* BRANDS SECTION */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="text-xs font-bold text-gray-500 uppercase">
              Total Brands: {brands.length}
            </div>
            <button
              onClick={() => openBrandModal(null)}
              className="flex items-center gap-1.5 rounded-xl bg-primary-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
            >
              <Plus size={16} />
              Add Brand
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {brands.map((br) => (
                <div
                  key={br.id}
                  className="flex flex-col justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md transition duration-200"
                >
                  <div className="flex items-center gap-3">
                    {br.logoUrl ? (
                      <img
                        src={br.logoUrl}
                        alt={br.name}
                        className="h-10 w-10 rounded-xl object-contain bg-white border border-gray-100 p-1"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/40x40?text=' + br.name[0];
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-primary-50 border border-primary-100 text-primary-850 flex items-center justify-center font-black text-sm uppercase">
                        {br.name[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-xs text-gray-850">{br.name}</h4>
                      <p className="text-[9px] text-gray-400 font-semibold mt-0.5">slug: {br.slug}</p>
                      <span className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                        br.status === 'ACTIVE' ? 'bg-emerald-100/50 text-emerald-800' : 'bg-red-100/50 text-red-800'
                      }`}>
                        {br.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-gray-100 mt-4 pt-3">
                    <button
                      onClick={() => openBrandModal(br)}
                      className="rounded-lg bg-gray-100/70 p-2 text-gray-500 hover:text-gray-850 hover:bg-gray-200 transition"
                      title="Edit Brand"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteBrand(br.id, br.name)}
                      className="rounded-lg bg-red-50 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 transition"
                      title="Delete Brand"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {brands.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-gray-400 font-bold">
                  No brands created yet. Click "Add Brand" to create one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODALS SECTION
          ---------------------------------------------------- */}

      {/* 1. Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsCategoryModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 animate-slide-in">
            <h3 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </h3>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                  placeholder="e.g. Kirana Staples"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Status</label>
                <select
                  value={categoryStatus}
                  onChange={(e) => setCategoryStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-gray-200 py-3 px-6 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-primary-800 py-3 px-6 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1.5 shadow-md disabled:bg-gray-300"
                >
                  {formSubmitting && <Loader2 className="animate-spin" size={14} />}
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Subcategory Modal */}
      {isSubcategoryModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsSubcategoryModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 animate-slide-in">
            <h3 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">
              {editingSubcategory ? 'Edit Subcategory' : 'Create Subcategory'}
            </h3>
            
            <form onSubmit={handleSubcategorySubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Subcategory Name *</label>
                <input
                  type="text"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                  placeholder="e.g. Wheat & Flour"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Status</label>
                <select
                  value={subcategoryStatus}
                  onChange={(e) => setSubcategoryStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="rounded-xl border border-gray-200 py-3 px-6 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-primary-800 py-3 px-6 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1.5 shadow-md disabled:bg-gray-300"
                >
                  {formSubmitting && <Loader2 className="animate-spin" size={14} />}
                  {editingSubcategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Brand Modal */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setIsBrandModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 animate-slide-in">
            <h3 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">
              {editingBrand ? 'Edit Brand' : 'Create Brand'}
            </h3>
            
            <form onSubmit={handleBrandSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Brand Name *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                  placeholder="e.g. Tata Consumer"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Logo URL (Optional)</label>
                <input
                  type="url"
                  value={brandLogo}
                  onChange={(e) => setBrandLogo(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                  placeholder="e.g. https://domain.com/logo.png"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-450 uppercase mb-2">Status</label>
                <select
                  value={brandStatus}
                  onChange={(e) => setBrandStatus(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs font-semibold text-gray-750 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="rounded-xl border border-gray-200 py-3 px-6 text-xs font-bold text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-primary-800 py-3 px-6 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1.5 shadow-md disabled:bg-gray-300"
                >
                  {formSubmitting && <Loader2 className="animate-spin" size={14} />}
                  {editingBrand ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
