import { useState, useEffect } from 'react';

export interface FirestoreStatus {
  hasError: boolean;
  isQuotaExceeded: boolean;
  isOffline: boolean;
  isPermissionDenied: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  lastChecked: Date | null;
}

let currentStatus: FirestoreStatus = {
  hasError: false,
  isQuotaExceeded: false,
  isOffline: false,
  isPermissionDenied: false,
  errorCode: null,
  errorMessage: null,
  lastChecked: null
};

const listeners = new Set<(status: FirestoreStatus) => void>();

export function reportFirestoreError(error: any) {
  const code = error?.code || error?.name || '';
  const message = error?.message || String(error);
  
  const isQuota = 
    code === 'resource-exhausted' || 
    code === 'quota-exceeded' || 
    message.toLowerCase().includes('quota') || 
    message.toLowerCase().includes('resource-exhausted') ||
    message.toLowerCase().includes('limit exceeded') ||
    message.includes('8 RESOURCE_EXHAUSTED');

  const isPermission = code === 'permission-denied' || message.toLowerCase().includes('permission-denied');
  const isOffline = code === 'unavailable' || message.toLowerCase().includes('offline') || message.includes('5 NOT_FOUND');

  currentStatus = {
    hasError: true,
    isQuotaExceeded: isQuota,
    isOffline: isOffline,
    isPermissionDenied: isPermission,
    errorCode: code || 'ERROR',
    errorMessage: message,
    lastChecked: new Date()
  };

  listeners.forEach(fn => fn(currentStatus));
}

export function clearFirestoreError() {
  currentStatus = {
    hasError: false,
    isQuotaExceeded: false,
    isOffline: false,
    isPermissionDenied: false,
    errorCode: null,
    errorMessage: null,
    lastChecked: new Date()
  };
  listeners.forEach(fn => fn(currentStatus));
}

export function getFirestoreStatus(): FirestoreStatus {
  return currentStatus;
}

export function useFirestoreStatus(): FirestoreStatus {
  const [status, setStatus] = useState<FirestoreStatus>(currentStatus);

  useEffect(() => {
    const handleChange = (newStatus: FirestoreStatus) => {
      setStatus({ ...newStatus });
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  return status;
}
