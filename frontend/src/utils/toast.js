/**
 * Global Toast Utility
 * Dispatches CustomEvents on the window object to display non-blocking notifications.
 * Can be imported and used anywhere (inside React components, helper functions, Redux slices, Axios configs).
 */
export const toast = {
  success: (message, duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent('sst-toast', {
        detail: { id: Math.random().toString(36).substring(2, 9), type: 'success', message, duration }
      })
    );
  },
  error: (message, duration = 4000) => {
    window.dispatchEvent(
      new CustomEvent('sst-toast', {
        detail: { id: Math.random().toString(36).substring(2, 9), type: 'error', message, duration }
      })
    );
  },
  warning: (message, duration = 4000) => {
    window.dispatchEvent(
      new CustomEvent('sst-toast', {
        detail: { id: Math.random().toString(36).substring(2, 9), type: 'warning', message, duration }
      })
    );
  },
  info: (message, duration = 3000) => {
    window.dispatchEvent(
      new CustomEvent('sst-toast', {
        detail: { id: Math.random().toString(36).substring(2, 9), type: 'info', message, duration }
      })
    );
  }
};
