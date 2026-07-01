import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, setAuthLoading, setAuthError } from '../store/authSlice';
import api from '../services/api';
import { X, Phone, ShieldCheck, Loader2 } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      dispatch(setAuthError('Please enter a valid 10-digit mobile number.'));
      return;
    }

    dispatch(setAuthLoading(true));
    dispatch(setAuthError(null));
    setMessage('');

    try {
      const res = await api.post('/api/auth/otp/request', { phone });
      if (res.data.success) {
        setStep(2);
        setMessage(res.data.message || 'OTP sent successfully.');
      }
    } catch (err) {
      dispatch(setAuthError(err.message || 'Failed to send verification code.'));
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      dispatch(setAuthError('Please enter a valid 6-digit verification code.'));
      return;
    }

    dispatch(setAuthLoading(true));
    dispatch(setAuthError(null));

    try {
      const res = await api.post('/api/auth/otp/verify', { phone, code });
      if (res.data.success) {
        dispatch(setCredentials({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
          user: res.data.user
        }));
        onClose();
        // Reset state
        setPhone('');
        setCode('');
        setStep(1);
      }
    } catch (err) {
      dispatch(setAuthError(err.message || 'Incorrect verification code.'));
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  const handleBack = () => {
    setStep(1);
    setCode('');
    dispatch(setAuthError(null));
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 transition-opacity">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {step === 1 ? 'Sign In / Sign Up' : 'Verify Mobile'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {step === 1 ? 'Enter phone to browse & checkout' : `Code sent to +91 ${phone}`}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 border border-emerald-100">
              {message}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-gray-400 border-r border-gray-100 pr-2 my-2">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-16 pr-4 text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-base"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-800 py-3 px-4 text-base font-bold text-white hover:bg-primary-900 transition shadow-md disabled:bg-gray-300"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Phone size={18} />}
                Get OTP Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-gray-200 py-3 px-4 text-center text-2xl font-bold tracking-widest text-gray-900 placeholder-gray-300 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-600 py-3 px-4 text-base font-bold text-white hover:bg-accent-700 transition shadow-md disabled:bg-gray-300"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={18} />}
                Confirm & Log In
              </button>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs font-semibold text-gray-500 hover:text-primary-800 transition"
                >
                  ← Change Phone Number
                </button>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-xs font-semibold text-primary-800 hover:underline transition"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
