import { useContext } from "react";
import { ToastContext, type ToastItem, type ToastType } from "./ToastContext";

export interface UseToastReturn {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string) => void;
}

export function useToast(): UseToastReturn {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return {
    toasts: ctx.toasts,
    showToast: ctx.addToast,
  };
}
