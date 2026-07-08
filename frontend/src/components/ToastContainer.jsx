import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { id, type, message, duration } = e.detail;
      
      // Add new toast to list
      setToasts((prev) => [...prev, { id, type, message }]);

      // Remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener('sst-toast', handleToastEvent);
    return () => window.removeEventListener('sst-toast', handleToastEvent);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        let bgColor = 'bg-white border-gray-150 text-gray-800';
        let Icon = Info;
        let iconColor = 'text-blue-500';

        if (t.type === 'success') {
          bgColor = 'bg-emerald-50 border-emerald-100 text-emerald-950';
          Icon = CheckCircle;
          iconColor = 'text-emerald-500';
        } else if (t.type === 'error') {
          bgColor = 'bg-red-50 border-red-100 text-red-950';
          Icon = AlertCircle;
          iconColor = 'text-red-500';
        } else if (t.type === 'warning') {
          bgColor = 'bg-amber-50 border-amber-100 text-amber-950';
          Icon = AlertTriangle;
          iconColor = 'text-amber-500';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl animate-slide-in transition-all duration-300 ${bgColor}`}
          >
            <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-gray-400 hover:text-gray-650 transition shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
