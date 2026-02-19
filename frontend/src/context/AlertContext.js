import React, { createContext, useContext, useState } from 'react';
import toast from 'react-hot-toast';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);

  const showAlert = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message, type }]);

    // Show toast
    switch (type) {
      case 'success':
        toast.success(message, { duration });
        break;
      case 'error':
        toast.error(message, { duration });
        break;
      case 'warning':
        toast(message, {
          duration,
          icon: '⚠️',
          style: { background: '#FEF3C7', color: '#92400E' },
        });
        break;
      default:
        toast(message, { duration });
    }

    // Auto remove after duration
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, duration);
  };

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, showAlert, removeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};