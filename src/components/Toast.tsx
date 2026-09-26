import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message }]);
    
    // Play sound if possible (browser security might block it if not user-initiated)
    const audio = new Audio('https://actions.google.com/sounds/v1/notifications/beep_short.ogg');
    audio.play().catch(() => {});

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700"
          >
            <Bell className="text-sky-400" size={20} />
            <p className="font-bold">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { addToast, ToastContainer };
};
