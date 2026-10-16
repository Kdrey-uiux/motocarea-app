/**
 * Lightweight toast notifications for the workshop console.
 * Call toast.error/success/info from anywhere; <ToastViewport /> (mounted in the
 * console) shows them. Replaces blocking browser alert() popups.
 */
export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

export const TOAST_EVENT = 'motocare_toast';

let nextId = 1;

function show(type: ToastType, message: string): void {
  if (typeof window === 'undefined') return;
  const detail: ToastMessage = { id: nextId++, type, message };
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail }));
}

export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
};
