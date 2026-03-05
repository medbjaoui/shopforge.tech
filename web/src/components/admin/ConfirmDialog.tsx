'use client';
import { AlertIcon, XIcon } from './AdminIcons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'success' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  default: 'bg-indigo-600 hover:bg-indigo-700 text-white',
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className={`flex-shrink-0 mt-0.5 ${variant === 'danger' ? 'text-red-500' : variant === 'success' ? 'text-emerald-500' : 'text-indigo-500'}`}>
            <AlertIcon size={20} />
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold text-sm">{title}</h3>
            <p className="text-gray-500 text-sm mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="ml-auto text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${VARIANT_STYLES[variant]}`}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
