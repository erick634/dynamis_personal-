import { useEffect, useId, useRef } from 'react';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) {
      return;
    }
    cancelButtonRef.current?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  const confirmButtonClass = destructive
    ? 'rounded-full bg-red px-5 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-red-deep'
    : 'rounded-full bg-blue px-5 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-blue-accent';

  return (
    <div
      className="confirm-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="confirm-dialog-card w-full max-w-md rounded-2xl bg-white p-6 shadow-soft"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 font-body text-sm leading-relaxed text-ink-2">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-line-soft bg-transparent px-5 py-2 font-body text-sm font-medium text-ink transition-colors hover:bg-bg"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirm-dialog-backdrop-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes confirm-dialog-card-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .confirm-dialog-backdrop {
          animation: confirm-dialog-backdrop-in 150ms ease-out both;
        }
        .confirm-dialog-card {
          animation: confirm-dialog-card-in 150ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .confirm-dialog-backdrop,
          .confirm-dialog-card {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
