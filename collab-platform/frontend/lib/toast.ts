// Simple toast utility using browser notifications / console
type ToastType = 'info' | 'success' | 'error' | 'warning';

let toastContainer: HTMLElement | null = null;

function getContainer() {
  if (typeof window === 'undefined') return null;
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

function triggerToast(message: string, type: ToastType = 'info') {
  const container = getContainer();
  if (!container) return;

  const colors: Record<ToastType, string> = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    warning: 'bg-amber-500',
  };

  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl
    ${colors[type]} backdrop-blur-sm flex items-center gap-2 transform translate-x-full opacity-0
    transition-all duration-300`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.remove('translate-x-full', 'opacity-0');
    });
  });

  setTimeout(() => {
    el.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

export const toast = {
  info: (msg: string) => triggerToast(msg, 'info'),
  success: (msg: string) => triggerToast(msg, 'success'),
  error: (msg: string) => triggerToast(msg, 'error'),
  warning: (msg: string) => triggerToast(msg, 'warning'),
};

export const showToast = toast;
