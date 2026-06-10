import { useState, createContext, useContext, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  default: {
    container: 'border-[#3D6B35]/40 bg-[#F0F5EF] text-[#1A3018]',
    icon: <CheckCircle size={18} className="text-[#3D6B35] shrink-0 mt-0.5" />,
  },
  success: {
    container: 'border-[#3D6B35]/40 bg-[#F0F5EF] text-[#1A3018]',
    icon: <CheckCircle size={18} className="text-[#3D6B35] shrink-0 mt-0.5" />,
  },
  destructive: {
    container: 'border-[#8B2020]/40 bg-[#FDF0F0] text-[#5C0D0D]',
    icon: <XCircle size={18} className="text-[#8B2020] shrink-0 mt-0.5" />,
  },
  warning: {
    container: 'border-[#A07830]/40 bg-[#FDF7E8] text-[#5C3A00]',
    icon: <AlertTriangle size={18} className="text-[#A07830] shrink-0 mt-0.5" />,
  },
  info: {
    container: 'border-primary/40 bg-card text-foreground',
    icon: <Info size={18} className="text-primary shrink-0 mt-0.5" />,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        {toasts.map(t => {
          const style = VARIANTS[t.variant] || VARIANTS.default;
          return (
            <div
              key={t.id}
              className={cn(
                'relative flex items-start gap-3 rounded-md border p-4 shadow-md',
                'animate-in slide-in-from-top-4 fade-in duration-300',
                style.container
              )}
            >
              {style.icon}
              <div className="flex-1 min-w-0">
                {t.title && <p className="font-semibold text-sm">{t.title}</p>}
                {t.description && <p className="text-sm opacity-90 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="opacity-60 hover:opacity-100 transition-opacity shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
