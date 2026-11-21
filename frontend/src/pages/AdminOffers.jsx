import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { setSettings } from '../store/storeSlice';
import { toast } from '../utils/toast';
import {
  Tag,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  X,
  Search,
  Percent,
  Sparkles,
  Layers,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

export default function AdminOffers() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);

  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT or FLAT
  const [discountValue, setDiscountValue] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [productSearch, setProductSearch] = useState('');

  // Load existing offers from store settings
  useEffect(() => {
    if (storeSettings?.store_offers) {
      try {
        const parsed = typeof storeSettings.store_offers === 'string'
          ? JSON.parse(storeSettings.store_offers)
          : storeSettings.store_offers;
        setOffers(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Failed to parse store_offers:', err);
        setOffers([]);
      }
    } else {
      setOffers([]);
    }
  }, [storeSettings]);

  // Load products for multi-selection
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/products/admin/all?limit=200');
        if (res.data.success) {
          setProducts(res.data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products for offers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const openNewOfferModal = () => {
    setEditingOfferId(null);
    setTitle('');
    setDiscountType('PERCENT');
    setDiscountValue('10');
    setSelectedProductIds([]);
    setIsActive(true);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditOfferModal = (offer) => {
    setEditingOfferId(offer.id);
    setTitle(offer.title || '');
    setDiscountType(offer.discountType || 'PERCENT');
    setDiscountValue(offer.discountValue || offer.discountPercent || '');
    setSelectedProductIds(offer.productIds || []);
    setIsActive(offer.active !== false);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleSaveOffersToBackend = async (newOffersList) => {
    setSubmitting(true);
    try {
      const payload = {
        settings: [
          {
            key: 'store_offers',
            value: JSON.stringify(newOffersList)
          }
        ]
      };
      const res = await api.put('/api/store/settings', payload);
      if (res.data.success) {
        dispatch(setSettings(res.data.settings));
        setOffers(newOffersList);
        toast.success('Store offers updated successfully!');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Save offers error:', err);
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to save offers.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitOffer = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warning('Please enter an offer title.');
      return;
    }
    const numVal = Number(discountValue);
    if (!numVal || numVal <= 0) {
      toast.warning('Please enter a valid discount value greater than 0.');
      return;
    }
    if (selectedProductIds.length === 0) {
      toast.warning('Please select at least 1 product for this offer.');
      return;
    }

    const offerPayload = {
      id: editingOfferId || `offer_${Date.now()}`,
      title: title.trim(),
      discountType,
      discountPercent: discountType === 'PERCENT' ? numVal : 0,
      flatDiscount: discountType === 'FLAT' ? numVal : 0,
      discountValue: numVal,
      productIds: selectedProductIds,
      active: isActive,
      createdAt: new Date().toISOString()
    };

    let updatedList;
    if (editingOfferId) {
      updatedList = offers.map((o) => (o.id === editingOfferId ? offerPayload : o));
    } else {
      updatedList = [offerPayload, ...offers];
    }

    handleSaveOffersToBackend(updatedList);
  };

  const handleDeleteOffer = (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    const filtered = offers.filter((o) => o.id !== offerId);
    handleSaveOffersToBackend(filtered);
  };

  const handleToggleOfferStatus = (offer) => {
    const updated = offers.map((o) => (o.id === offer.id ? { ...o, active: !o.active } : o));
    handleSaveOffersToBackend(updated);
  };

  const filteredProductsForSelect = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredProductsForSelect.map((p) => p.id);
    const allSelected = filteredIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin')}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Tag className="text-emerald-600" size={26} />
              Store Offers & Deals Manager
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-7">
            Create promotional discounts and select exactly which products display Zepto-style savings pills on customer cards.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewOfferModal}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
        >
          <Plus size={16} /> Create New Offer
        </button>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-white border border-gray-200 animate-pulse"></div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center bg-white flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Sparkles size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-900">No active offers created yet</h3>
          <p className="text-xs text-gray-500 max-w-md mt-1 mb-5">
            Products currently display their real standard price without fake discounts. Click below to create your first promotion!
          </p>
          <button
            type="button"
            onClick={openNewOfferModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-850 hover:bg-primary-900 text-white px-4 py-2.5 text-xs font-bold transition"
          >
            <Plus size={15} /> Create Offer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => {
            const taggedCount = Array.isArray(offer.productIds) ? offer.productIds.length : 0;
            return (
              <div
                key={offer.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                  offer.active !== false ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black uppercase ${
                        offer.discountType === 'PERCENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <Percent size={12} />
                      {offer.discountType === 'PERCENT'
                        ? `${offer.discountPercent}% OFF`
                        : `₹${offer.flatDiscount} OFF`}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleOfferStatus(offer)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition ${
                        offer.active !== false
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                      }`}
                    >
                      {offer.active !== false ? '● ACTIVE' : '○ PAUSED'}
                    </button>
                  </div>

                  <h3 className="font-black text-base text-gray-900 mt-2.5 tracking-tight">
                    {offer.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-650">
                    <Layers size={14} className="text-gray-400" />
                    <span>
                      Applied to <strong className="text-gray-900">{taggedCount}</strong> products
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {new Date(offer.createdAt || Date.now()).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditOfferModal(offer)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
                      title="Edit offer"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                      title="Delete offer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT OFFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-emerald-700" />
                <h3 className="font-black text-base text-gray-900">
                  {editingOfferId ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitOffer} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                    Offer Title / Banner Text *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Dhamaka Special, Weekend Grocery Saver"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-600"
                    >
                      <option value="PERCENT">Percentage Discount (% OFF)</option>
                      <option value="FLAT">Flat Rupee Amount (₹ OFF)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      {discountType === 'PERCENT' ? 'Percentage Value (% OFF) *' : 'Flat Amount (₹ OFF) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={discountType === 'PERCENT' ? '90' : '5000'}
                      placeholder={discountType === 'PERCENT' ? '10' : '50'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Offer Active Status</span>
                    <span className="text-[11px] text-gray-500">Enable to display discount immediately on customer cards.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-5 w-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>

                {/* Tagged Products Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">
                      Select Products ({selectedProductIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-xs font-bold text-emerald-700 hover:underline"
                    >
                      Toggle All Shown ({filteredProductsForSelect.length})
                    </button>
                  </div>

                  {/* Search inside selector */}
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filter products by name, brand, or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Product Scroll List */}
                  <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100 bg-white">
                    {filteredProductsForSelect.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        No products match your search.
                      </div>
                    ) : (
                      filteredProductsForSelect.map((prod) => {
                        const isChecked = selectedProductIds.includes(prod.id);
                        return (
                          <label
                            key={prod.id}
                            className={`flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer transition select-none ${
                              isChecked ? 'bg-emerald-50/50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProductSelection(prod.id)}
                              className="h-4 w-4 accent-emerald-600 rounded"
                            />
                            <div className="h-8 w-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain" />
                              ) : (
                                <span className="text-[9px] font-bold text-gray-400">{prod.name.slice(0, 2)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-xs text-gray-900 truncate block">
                                {prod.name}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {prod.brand?.name || 'Local'} • {prod.variants?.length || 0} variants
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving Offer...' : editingOfferId ? 'Update Offer' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
