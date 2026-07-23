import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

// Tooltip Component using React Portal to prevent layout clipping and scroll inheritance
export function Tooltip({ children, content }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8, // 8px spacing above target element
      left: rect.left + window.scrollX + rect.width / 2
    });
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  if (!content) return children;

  return (
    <>
      <div
        className="inline-flex items-center justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {show &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="px-2.5 py-1 text-[10px] font-bold text-white bg-slate-900 rounded shadow-md whitespace-nowrap z-[99999] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
          </div>,
          document.body
        )}
    </>
  );
}

// Confirmation Dialog Component
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger"
}) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl max-w-sm w-full relative z-10 border border-slate-200 overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-2.5 rounded-full shrink-0 ${
                  type === "danger"
                    ? "bg-red-50 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">{title}</h3>
                <p className="text-xs text-slate-505 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
            <button
              onClick={onCancel}
              className="px-4 py-2 hover:bg-slate-100 text-slate-650 rounded-xl font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                type === "danger"
                  ? "bg-red-600 hover:bg-red-500 shadow-sm shadow-red-600/10"
                  : "bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-600/10"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Badge component for Status indicator
export function StatusBadge({ type, label }) {
  let styles = "bg-slate-100 text-slate-700 border-slate-200";
  if (type === "admin") {
    styles = "bg-blue-50 text-blue-700 border-blue-200/60";
  } else if (type === "blocked") {
    styles = "bg-rose-50 text-rose-700 border-rose-200/60";
  } else if (type === "active") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  } else if (type === "member") {
    styles = "bg-slate-50 text-slate-600 border-slate-200/60";
  }

  return (
    <span
      className={`px-2 py-0.5 border rounded-md font-bold text-[9px] uppercase tracking-wider ${styles}`}
    >
      {label}
    </span>
  );
}

// Date formatter helper in dd-mm-yy format
export function formatDate(dateString) {
  if (!dateString) return "Never";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

// Global lightweight Toast system
let toastListeners = [];

export const toast = {
  success: (message) => {
    toastListeners.forEach((listener) =>
      listener({ id: Date.now() + Math.random(), type: "success", message })
    );
  },
  error: (message) => {
    toastListeners.forEach((listener) =>
      listener({ id: Date.now() + Math.random(), type: "error", message })
    );
  },
  info: (message) => {
    toastListeners.forEach((listener) =>
      listener({ id: Date.now() + Math.random(), type: "info", message })
    );
  }
};

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };
    toastListeners.push(handleToast);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== handleToast);
    };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-bold pointer-events-auto flex items-center gap-2.5 max-w-sm border-slate-200 ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : t.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-blue-50 text-blue-800 border-blue-100"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                t.type === "success"
                  ? "bg-emerald-500"
                  : t.type === "error"
                  ? "bg-rose-500"
                  : "bg-blue-500"
              }`}
            ></div>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
