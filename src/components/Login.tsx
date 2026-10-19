import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';

export function Login() {
  const { login, error: contextError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useRedirect, setUseRedirect] = useState(false);

  const error = localError || contextError;

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      setLocalError(null);
      await login();
    } catch (err: any) {
      console.error("Google login error:", err);
      if (
        err?.code === 'auth/popup-blocked' || 
        err?.code === 'auth/popup-closed-by-user' || 
        err?.code === 'auth/invalid-continue-uri' || 
        err?.message?.includes('invalid-continue-uri') || 
        err?.code === 'auth/unauthorized-domain'
      ) {
        setLocalError("গুগল পপআপ ব্লকড বা ডোমেইন রিডাইরেক্ট সমস্যা। নিচে 'Direct Redirect' বাটন ব্যবহার করুন।");
        setUseRedirect(true);
      } else {
        setLocalError(err?.message || "গুগল লগইন সম্পন্ন করতে সমস্যা হয়েছে। নিচে Direct Redirect ব্যবহার করুন।");
        setUseRedirect(true);
      }
    } finally {
      setIsLoading(false);
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
        <div className="mb-6 p-4 text-xs font-medium rounded-2xl border bg-rose-50 text-rose-700 border-rose-100 text-left">
          <p className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </p>
        </div>
      )}

      <div className="space-y-3.5">
        {/* Google Authentication Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white border border-slate-800 rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm cursor-pointer"
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

        {useRedirect && (
          <button
            onClick={async () => {
              try {
                setIsLoading(true);
                const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
                const { auth } = await import('../firebase');
                await signInWithRedirect(auth, new GoogleAuthProvider());
              } catch (e: any) {
                setLocalError(e?.message || "Redirect error");
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink size={14} />
            <span>Direct Redirect দিয়ে লগইন করুন</span>
          </button>
        )}
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
