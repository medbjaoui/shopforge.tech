'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckIcon, XIcon, AlertIcon } from './AdminIcons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_STYLES: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckIcon size={16} className="text-emerald-500" />,
  },
  error: {
    bg: 'bg-red-50 border-red-200 text-red-800',
    icon: <XIcon size={16} className="text-red-500" />,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <AlertIcon size={16} className="text-blue-500" />,
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const style = TOAST_STYLES[toast.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-lg border backdrop-blur-sm text-sm font-medium shadow-lg transition-all duration-300 ${style.bg} ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      {style.icon}
      <span>{toast.message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <XIcon size={14} />
      </button>
    </div>
  );
}
