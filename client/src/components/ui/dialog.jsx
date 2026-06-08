import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function Dialog({ open, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg mx-4">{children}</div>
    </div>
  );
}

export function DialogContent({ className, children, onClose }) {
  return (
    <div className={cn('relative bg-card rounded-xl border shadow-lg p-6', className)}>
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 opacity-70 hover:opacity-100">
          <X size={16} />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn('mb-4', className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}
