import React from 'react';
import { AlertOctagon, RefreshCw, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useFirestoreStatus, clearFirestoreError } from '../utils/firestoreStatus';

export const DatabaseQuotaAlert: React.FC = () => {
  const status = useFirestoreStatus();

  if (!status.hasError) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`p-4 md:p-5 rounded-2xl shadow-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        status.isQuotaExceeded 
          ? 'bg-amber-950/95 border-amber-500/50 text-amber-100 backdrop-blur-xl' 
          : status.isPermissionDenied
          ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 backdrop-blur-xl'
          : 'bg-slate-900/95 border-slate-700 text-slate-100 backdrop-blur-xl'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            status.isQuotaExceeded 
              ? 'bg-amber-500/20 text-amber-400' 
              : status.isPermissionDenied
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-sky-500/20 text-sky-400'
          }`}>
            {status.isQuotaExceeded ? (
              <AlertOctagon size={24} />
            ) : status.isPermissionDenied ? (
              <ShieldAlert size={24} />
            ) : (
              <AlertTriangle size={24} />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm md:text-base tracking-wide">
                {status.isQuotaExceeded 
                  ? '⚠️ ফায়ারবেস কোটা লিমিট শেষ হয়েছে (Firebase Quota Exceeded)'
                  : status.isPermissionDenied
                  ? '🔒 পারমিশন সংক্রান্ত ত্রুটি (Permission Denied)'
                  : '📡 ডেটাবেস সংযোগে সমস্যা (Database Connection)'}
              </h4>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {status.isQuotaExceeded
                ? 'আপনার Firebase Firestore প্রজেক্টের দৈনিক রিড/রাইট কোটা লিমিট শেষ হয়েছে। কোটা রিসেট বা আপগ্রেড না হওয়া পর্যন্ত ডেটা রিয়েল-টাইমে শো করতে বিলম্ব হতে পারে।'
                : status.isPermissionDenied
                ? 'ফায়ারবেস সিকিউরিটি রুলস অনুযায়ী ডেটা পড়ার অনুমতি পাওয়া যায়নি।'
                : 'ফায়ারবেস সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে। নেটওয়ার্ক চেক করুন।'}
            </p>
            {status.errorMessage && (
              <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                Error: {status.errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => {
              clearFirestoreError();
              window.location.reload();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all"
          >
            <RefreshCw size={14} /> রিফ্রেশ করুন
          </button>
          <button
            onClick={clearFirestoreError}
            className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
