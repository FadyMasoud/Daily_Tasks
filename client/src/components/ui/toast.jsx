import { useState, createContext, useContext, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANTS = {
  default: {
    container: 'border-green-400/40 bg-green-500 text-white',
    icon: <CheckCircle size={18} className="text-white shrink-0 mt-0.5" />,
  },
  success: {
    container: 'border-green-400/40 bg-green-500 text-white',
    icon: <CheckCircle size={18} className="text-white shrink-0 mt-0.5" />,
  },
  destructive: {
    container: 'border-red-400/40 bg-red-500 text-white',
    icon: <XCircle size={18} className="text-white shrink-0 mt-0.5" />,
  },
  warning: {
    container: 'border-yellow-400/40 bg-yellow-400 text-yellow-900',
    icon: <AlertTriangle size={18} className="text-yellow-900 shrink-0 mt-0.5" />,
  },
  info: {
    container: 'border-blue-400/40 bg-blue-500 text-white',
    icon: <Info size={18} className="text-white shrink-0 mt-0.5" />,
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
                'relative flex items-start gap-3 rounded-xl border p-4 shadow-xl',
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
