import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, LogOut } from 'lucide-react';
import { Button } from './button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]"
            onClick={() => close(false)}
          />
          <div className="relative z-10 bg-card border border-border rounded-md shadow-xl w-full max-w-sm overflow-hidden">
            <div className="h-0.5 bg-[#C4963A]" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                {dialog.type === 'delete'
                  ? <Trash2 size={20} className="text-destructive shrink-0" />
                  : dialog.type === 'logout'
                  ? <LogOut size={20} className="text-primary shrink-0" />
                  : <AlertTriangle size={20} className="text-[#A07830] shrink-0" />
                }
                <h2 className="font-bold text-foreground">{dialog.title}</h2>
              </div>
              {dialog.message && (
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{dialog.message}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => close(false)}>
                  {dialog.cancelLabel}
                </Button>
                <Button
                  variant={dialog.type === 'delete' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => close(true)}
                >
                  {dialog.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
