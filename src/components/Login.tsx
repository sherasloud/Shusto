import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ExternalLink, AlertTriangle, Copy, Check, UserCheck } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

export function Login() {
  const { login, instantLogin, error: contextError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const error = localError || contextError;
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = error?.includes('authorized') || error?.includes('অনুমোদিত') || error?.includes('unauthorized-domain');

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      setLocalError(null);
      await login();
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('authorized domain') || err?.message?.includes('unauthorized-domain')) {
        setLocalError(`এই ডোমেইনটি (${currentHostname}) Firebase Console-এ অনুমোদিত নয়। নিচের বাটনে ক্লিক করে ডোমেইনটি কপি করুন এবং Firebase Console-এ যুক্ত করুন।`);
      } else if (err?.code === 'auth/popup-blocked') {
        setLocalError("ব্রাউজার গুগল সাইন ইন পপআপ ব্লক করেছে। দয়া করে ব্রাউজার অ্যাড্রেস বারের পপআপ পারমিশন এলাও করুন।");
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setLocalError("সাইন ইন পপআপ বন্ধ করা হয়েছে। পুনরায় চেষ্টা করুন।");
      } else {
        setLocalError(err?.message || "গুগল লগইন সম্পন্ন করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const isAuthDomain = typeof window !== 'undefined' && window.location.hostname === 'auth.shusto.com';

  return (
    <div className="w-full text-center max-w-sm mx-auto">
      {!isAuthDomain && (
        <>
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl mb-6 overflow-hidden border border-slate-100 shadow-sm mx-auto">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Shusto</h1>
          <p className="text-slate-500 mb-6 text-sm">আপনার ডিজিটাল হেলথকেয়ার সঙ্গী। সহজে ও নিরাপদে প্রবেশ করতে আপনার গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।</p>
        </>
      )}
      
      {error && (
        <div className="mb-6 p-4 text-xs font-medium rounded-2xl border bg-rose-50 text-rose-700 border-rose-200 text-left space-y-2">
          <p className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </p>

          {isUnauthorizedDomain && (
            <div className="pt-2 border-t border-rose-200/70 space-y-2 text-[11px] text-rose-900">
              <p>
                <strong>Firebase Project:</strong> <code className="bg-white/80 px-1 py-0.5 rounded font-mono">{firebaseConfig.projectId}</code>
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span><strong>Domain:</strong> <code className="bg-white/80 px-1.5 py-0.5 rounded font-mono select-all text-slate-800">{currentHostname}</code></span>
                <button
                  onClick={handleCopyDomain}
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-200/80 hover:bg-rose-300 rounded font-semibold text-[10px] text-rose-900 transition-colors cursor-pointer"
                >
                  {copiedDomain ? <Check size={11} className="text-emerald-700" /> : <Copy size={11} />}
                  <span>{copiedDomain ? 'কপি হয়েছে' : 'Copy Domain'}</span>
                </button>
              </div>
              <a
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 underline font-semibold mt-1"
              >
                <span>Firebase Console Authorized Domains সেটিংস খুলুন</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white border border-slate-800 rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          )}
          <span>{isLoading ? 'সাইন ইন হচ্ছে...' : 'Continue with Google'}</span>
        </button>

        {/* Quick Demo Access button so users/testers are never locked out */}
        <button
          onClick={() => instantLogin('admin', 'Shusto Admin', 'shustobd@gmail.com')}
          disabled={isLoading}
          type="button"
          className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
        >
          <UserCheck size={14} className="text-emerald-600" />
          <span>অ্যাডমিন হিসেবে ডেমো প্রবেশ (Quick Demo Access)</span>
        </button>
      </div>

      <div className={`mt-8 pt-4 border-t flex items-center justify-center gap-2 text-xs ${isAuthDomain ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'}`}>
        <ShieldCheck size={14} className="text-sky-500" />
        <span>১০০% নিরাপদ ও বিশ্বস্ত গুগল অথেনটিকেশন</span>
      </div>
      <p className={`mt-4 text-[11px] ${isAuthDomain ? 'text-slate-400' : 'text-slate-400'}`}>
        By continuing, you agree to our{' '}
        <a 
          href="/Privacy" 
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/Privacy');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="text-sky-500 hover:underline font-semibold"
        >
          Terms of Service & Privacy Policy
        </a>.
      </p>
    </div>
  );
}
