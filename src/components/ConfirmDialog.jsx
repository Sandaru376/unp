import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

/*
 * Lightweight confirmation dialog used by Organization Setup
 * before any record is deleted.
 */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    cancelRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dr confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <section
        className="confirm-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-icon">
          <AlertTriangle size={22} aria-hidden="true" />
        </div>

        <div className="confirm-body">
          <h2 id="confirm-title">{title}</h2>
          {message && <p className="mu">{message}</p>}
        </div>

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn o"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn confirm-danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>

        <button
          type="button"
          className="icon-btn confirm-close"
          aria-label="Close dialog"
          onClick={onCancel}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
