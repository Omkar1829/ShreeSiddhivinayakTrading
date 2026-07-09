import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setSettings } from '../store/storeSlice';
import api from '../services/api';
import { toast } from '../utils/toast';
import { Store, Loader2, ArrowLeft, Save, ShieldCheck, Users, Trash2, Plus, UserPlus, Bell } from 'lucide-react';

export default function AdminSettings() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const storeSettings = useSelector((state) => state.store.settings);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Store form states
  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [storeStatus, setStoreStatus] = useState('OPEN');
  const [testLoading, setTestLoading] = useState(false);

  // Staff registry states
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberRole, setMemberRole] = useState('DELIVERY'); // 'DELIVERY' | 'ADMIN'
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await api.get('/api/admin/team');
      if (res.data.success) {
        setTeam(res.data.team);
      }
    } catch (err) {
      console.error('Failed to load team registry:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/');
      return;
    }

    if (storeSettings) {
      setStoreName(storeSettings.store_name || 'SHRI SIDDHIVINAYAK TRADING');
      setLogoUrl(storeSettings.logo_url || '');
      setBannerUrl(storeSettings.banner_url || '');
      setPhone(storeSettings.phone_number || '+919876543210');
      setWhatsapp(storeSettings.whatsapp_number || '+919876543210');
      setAddress(storeSettings.address || 'Shop No. 4, Uran Naka, Panvel - 410206');
      setOpenTime(storeSettings.opening_time || '08:00');
      setCloseTime(storeSettings.closing_time || '21:00');
      setStoreStatus(storeSettings.store_status || 'OPEN');
    }

    loadTeam();
  }, [isAuthenticated, user, storeSettings, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      settings: [
        { key: 'store_name', value: storeName },
        { key: 'logo_url', value: logoUrl },
        { key: 'banner_url', value: bannerUrl },
        { key: 'phone_number', value: phone },
        { key: 'whatsapp_number', value: whatsapp },
        { key: 'address', value: address },
        { key: 'opening_time', value: openTime },
        { key: 'closing_time', value: closeTime },
        { key: 'store_status', value: storeStatus }
      ]
    };

    try {
      const res = await api.put('/api/store/settings', payload);
      if (res.data.success) {
        dispatch(setSettings(res.data.settings));
        toast.success('Store configurations saved successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update store settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestLoading(true);
    try {
      const res = await api.post('/api/notifications/test', {
        title: 'Test Notification Alert',
        message: 'This is a test push notification broadcasted to all active admin devices.',
        type: 'SYSTEM'
      });
      if (res.data.success) {
        toast.success('Test push alert triggered successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to trigger test notification.');
    } finally {
      setTestLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!memberName || !memberPhone) {
      setMemberError('Staff name and phone number are required.');
      return;
    }

    setMemberSubmitting(true);
    try {
      const res = await api.post('/api/admin/team', {
        name: memberName,
        phone: memberPhone,
        role: memberRole
      });

      if (res.data.success) {
        setMemberName('');
        setMemberPhone('');
        setMemberRole('DELIVERY');
        loadTeam();
        toast.success('Staff member registered successfully!');
      }
    } catch (err) {
      setMemberError(err.message || 'Failed to register team member.');
    } finally {
      setMemberSubmitting(false);
    }
  };

  const handleRemoveMember = async (id) => {
    if (!window.confirm('Remove this member from store staff? They will be downgraded to a standard customer account.')) return;
    try {
      const res = await api.delete(`/api/admin/team/${id}`);
      if (res.data.success) {
        loadTeam();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to remove member.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Store Settings</h1>
          <p className="text-xs text-gray-500 mt-1">Configure business operating timings, override statuses, and manage staff credentials.</p>
        </div>
      </div>

      {/* Box 1: Store timings settings */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-semibold text-gray-750">
          
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 border-b pb-3">
            <Store size={18} className="text-primary-850" /> Business Info
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Store Display Name *</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Emergency Override Status</label>
              <select
                value={storeStatus}
                onChange={(e) => setStoreStatus(e.target.value)}
                className={`w-full rounded-xl border py-3 px-4 text-xs font-bold focus:outline-none ${storeStatus === 'OPEN' ? 'border-emerald-250 bg-emerald-50 text-emerald-800' : 'border-red-250 bg-red-50 text-red-800'}`}
              >
                <option value="OPEN">🟢 STORE OPEN (Accept Online Checkouts)</option>
                <option value="CLOSED">🔴 FORCE CLOSED (Disable Checkouts)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Support Phone Number *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Store WhatsApp Number *</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Opening Time (24h format) *</label>
              <input
                type="text"
                placeholder="08:00"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs text-center focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-2">Closing Time (24h format) *</label>
              <input
                type="text"
                placeholder="21:00"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs text-center focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-450 uppercase mb-2">Physical Shop Address *</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-3 px-4 text-xs focus:outline-none"
              rows={3}
              required
            />
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testLoading}
              className="rounded-xl border border-primary-200 bg-primary-50 py-3 px-6 text-xs font-bold text-primary-800 hover:bg-primary-100 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {testLoading ? <Loader2 className="animate-spin" size={16} /> : <Bell size={16} />}
              Send Test Push Alert
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-primary-800 py-3 px-6 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1.5 shadow-md disabled:bg-gray-300"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Config Settings
            </button>
          </div>

        </form>
      </div>

      {/* Box 2: Staff Registry & Administration (Admins / Riders) */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
        
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 border-b pb-3">
          <Users size={18} className="text-primary-850" /> Staff & Team Registry
        </h3>

        {/* Add Team Member form */}
        <form onSubmit={handleAddMember} className="rounded-2xl border border-gray-150 p-4 bg-gray-50 space-y-4">
          <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1"><UserPlus size={14} /> Add Staff Account</h4>
          
          {memberError && (
            <div className="rounded-lg bg-red-50 p-2.5 text-[10px] text-red-650 border border-red-100 font-bold">{memberError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-gray-750">
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-1">Staff Name *</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white font-medium"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-1">Mobile Number *</label>
              <input
                type="tel"
                placeholder="e.g. 9876540000"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-450 uppercase mb-1">Select Role *</label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2 text-xs focus:outline-none bg-white font-bold"
              >
                <option value="DELIVERY">🛵 DELIVERY RIDER</option>
                <option value="ADMIN">👑 STORE ADMINISTRATOR</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={memberSubmitting}
              className="rounded-lg bg-primary-800 px-4 py-2 text-xs font-bold text-white hover:bg-primary-900 transition flex items-center gap-1 shadow-sm"
            >
              {memberSubmitting ? <Loader2 className="animate-spin" size={12} /> : <Plus size={14} />}
              Add Staff Member
            </button>
          </div>
        </form>

        {/* Staff Members List */}
        <div className="space-y-3">
          <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Active Staff ({team.length})</span>
          
          {teamLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-primary-850" size={20} />
            </div>
          ) : team.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">No other staff members added yet.</p>
          ) : (
            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                {team.map(member => (
                  <div key={member.id} className="flex justify-between items-center p-3.5 hover:bg-gray-50/50 transition">
                    <div>
                      <span className="font-extrabold text-gray-900 block">{member.name || 'Unnamed Staff'}</span>
                      <span className="text-[10px] text-gray-450 font-medium block mt-0.5">{member.phone}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase border ${
                        member.role === 'ADMIN' ? 'bg-purple-50 text-purple-750 border-purple-100' : 'bg-teal-50 text-teal-750 border-teal-100'
                      }`}>
                        {member.role}
                      </span>

                      {/* Prevent self removal */}
                      {member.id !== user.id ? (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="rounded-lg p-2 text-gray-450 hover:text-red-650 hover:bg-red-50 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400 italic px-2">You</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
