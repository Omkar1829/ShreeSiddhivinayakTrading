import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile, clearCredentials } from '../store/authSlice';
import api from '../services/api';
import { User, MapPin, Plus, Trash2, CheckCircle, Loader2, LogOut, Camera, ShieldCheck } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user, loading } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);

  // Address forms state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // Initialize profile values
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    if (user) {
      setName(user.name || '');
      setProfilePicPreview(user.avatarUrl || null);
    }
  }, [isAuthenticated, user, navigate]);

  const loadAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await api.get('/api/addresses');
      if (res.data.success) {
        setAddresses(res.data.addresses);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    if (profilePic) {
      formData.append('avatar', profilePic);
    }

    dispatch(updateProfile({ name })); // Optimistic update
    try {
      const res = await api.put('/api/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        dispatch(updateProfile(res.data.user));
        alert('Profile updated successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to update profile settings.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setAddressError('');
    if (!recipientName || !recipientPhone || !addressLine1 || !postalCode) {
      setAddressError('All starred fields are required.');
      return;
    }

    setAddressSubmitting(true);
    try {
      const res = await api.post('/api/addresses', {
        recipientName,
        recipientPhone,
        addressLine1,
        addressLine2,
        landmark,
        city: 'Panvel',
        state: 'Maharashtra',
        postalCode,
        isDefault: addresses.length === 0
      });

      if (res.data.success) {
        await loadAddresses();
        setShowAddressForm(false);
        setRecipientName('');
        setRecipientPhone('');
        setAddressLine1('');
        setAddressLine2('');
        setLandmark('');
        setPostalCode('');
      }
    } catch (err) {
      setAddressError(err.message || 'Failed to save address.');
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const res = await api.delete(`/api/addresses/${id}`);
      if (res.data.success) {
        loadAddresses();
      }
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await api.patch(`/api/addresses/${id}/default`);
      if (res.data.success) {
        loadAddresses();
      }
    } catch (err) {
      alert(err.message || 'Failed to set default.');
    }
  };

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card Form */}
        <div className="md:col-span-1 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center space-y-6">
          <form onSubmit={handleProfileSubmit} className="w-full flex flex-col items-center space-y-5">
            {/* Avatar picker */}
            <div className="relative group">
              {profilePicPreview ? (
                <img src={profilePicPreview} alt="Avatar" className="h-28 w-28 rounded-full object-cover border-2 border-primary-100" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-100 text-primary-800 font-extrabold text-3xl border-2 border-primary-50">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-primary-850 rounded-full text-white cursor-pointer hover:bg-primary-900 transition shadow-md border border-white">
                <Camera size={14} />
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {/* Profile info inputs */}
            <div className="w-full space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={user?.phone || ''}
                  disabled
                  className="w-full rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-xs text-gray-500 cursor-not-allowed font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary-800 py-2.5 px-4 text-xs font-bold text-white hover:bg-primary-900 transition shadow-sm"
            >
              Update Settings
            </button>
          </form>

          <hr className="w-full border-gray-100" />

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 px-4 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-sm"
          >
            <LogOut size={14} /> Log Out Account
          </button>
        </div>

        {/* Right Column: Saved Address Book */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <MapPin size={18} className="text-primary-850" /> Address Book
            </h3>
            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="text-xs font-bold text-primary-800 hover:text-primary-900 transition flex items-center gap-0.5"
              >
                <Plus size={14} /> Add Address
              </button>
            )}
          </div>

          {showAddressForm ? (
            <form onSubmit={handleAddAddress} className="rounded-xl border border-gray-150 p-4 space-y-4 bg-gray-50">
              <h4 className="text-xs font-bold text-gray-800">Add New Shipping Address</h4>
              {addressError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-650 border border-red-100">{addressError}</div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Recipient Phone *</label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Street Address Details *</label>
                <input
                  type="text"
                  placeholder="Flat/House No, Building, Area details..."
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Landmark</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Pincode *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-center bg-white"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="rounded-lg bg-primary-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1"
                >
                  {addressSubmitting && <Loader2 className="animate-spin" size={12} />}
                  Add Address
                </button>
              </div>
            </form>
          ) : addressesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary-850" size={24} />
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-150 rounded-2xl bg-gray-50">
              <MapPin className="mx-auto text-gray-300 mb-2" size={28} />
              <p className="text-xs text-gray-500">Your address book is empty. Click "+ Add Address" to save.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`border rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition ${addr.isDefault ? 'border-primary-800 bg-primary-50' : 'border-gray-150 bg-white'}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-gray-900">{addr.recipientName}</span>
                      <span className="text-[10px] font-bold text-accent-700">{addr.recipientPhone}</span>
                      {addr.isDefault && (
                        <span className="rounded-full bg-primary-800 px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">
                      {addr.addressLine1}, {addr.addressLine2 ? addr.addressLine2 + ', ' : ''}{addr.landmark ? addr.landmark + ', ' : ''}{addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end mt-2 sm:mt-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 transition"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="rounded-lg p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
