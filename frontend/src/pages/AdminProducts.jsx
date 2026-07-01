import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

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

  const loadData = async () => {
    setLoading(true);
    try {
      const prodRes = await api.get('/api/products/admin/all');
      const catRes = await api.get('/api/categories/admin/all');
      const brandRes = await api.get('/api/brands/admin/all');

      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (catRes.data.success) setCategories(catRes.data.categories);
      if (brandRes.data.success) setBrands(brandRes.data.brands);
    } catch (err) {
      console.error('Failed to load admin catalog details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [isAuthenticated, user, navigate]);

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
      alert(err.message || 'Product save failed.');
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
      alert(err.message || 'Failed to add variant.');
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
      alert(err.message || 'Delete failed.');
    }
  };

  const handleDeleteVariant = async (id) => {
    if (!window.confirm('Delete this variant option?')) return;
    try {
      const res = await api.delete(`/api/products/variants/${id}`);
      if (res.data.success) loadData();
    } catch (err) {
      alert(err.message || 'Delete failed.');
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
        <button
          onClick={() => setIsProductModalOpen(true)}
          className="flex items-center gap-1 rounded-xl bg-primary-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
        >
          <Plus size={16} /> Add Product
        </button>
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
                        onClick={() => openVariantModal(prod.id)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 transition"
                      >
                        + Variant
                      </button>
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

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Category</label>
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
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Subcategory</label>
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
                  <label className="block text-[10px] text-gray-450 uppercase mb-1">Brand</label>
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

    </div>
  );
}
