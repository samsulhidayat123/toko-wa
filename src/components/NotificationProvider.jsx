import { useCallback, useMemo, useState } from "react";
import { NotificationContext } from "../utils/notification";

function createId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random());
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info") => {
      const id = createId();
      setToasts((currentToasts) => [...currentToasts, { id, message, type }]);
      window.setTimeout(() => removeToast(id), 3600);
    },
    [removeToast]
  );

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || "Konfirmasi",
        message: options.message,
        confirmText: options.confirmText || "Lanjutkan",
        cancelText: options.cancelText || "Batal",
        variant: options.variant || "danger",
        resolve,
      });
    });
  }, []);

  const closeDialog = useCallback(
    (result) => {
      dialog?.resolve(result);
      setDialog(null);
    },
    [dialog]
  );

  const value = useMemo(
    () => ({
      notify: {
        info: (message) => showToast(message, "info"),
        success: (message) => showToast(message, "success"),
        warning: (message) => showToast(message, "warning"),
        error: (message) => showToast(message, "error"),
      },
      confirm,
    }),
    [confirm, showToast]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.type}`} key={toast.id}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => removeToast(toast.id)}>
              Tutup
            </button>
          </div>
        ))}
      </div>

      {dialog ? (
        <div className="confirm-backdrop" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true">
            <h2>{dialog.title}</h2>
            <p>{dialog.message}</p>

            <div className="confirm-actions">
              <button type="button" className="secondary" onClick={() => closeDialog(false)}>
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={dialog.variant === "danger" ? "danger" : ""}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}
