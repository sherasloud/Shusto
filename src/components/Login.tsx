import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';

export function Login() {
  const { login, loginWithTwitter, loginWithApple, error: contextError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'twitter' | 'apple' | null>(null);
  const [useRedirect, setUseRedirect] = useState(false);

  const error = localError || contextError;
  const isAnyLoading = loadingProvider !== null;

  const handleGoogleLogin = async () => {
    if (isAnyLoading) return;
    try {
      setLoadingProvider('google');
      setLocalError(null);
      await login();
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/invalid-continue-uri' || err?.message?.includes('invalid-continue-uri') || err?.code === 'auth/unauthorized-domain') {
        setLocalError("গুগল পপআপ ব্লকড বা ডোমেইন রিডাইরেক্ট সমস্যা। নিচে 'Direct Redirect' বাটন ব্যবহার করুন।");
        setUseRedirect(true);
      } else {
        setLocalError(err?.message || "গুগল লগইন সম্পন্ন করতে সমস্যা হয়েছে। নিচে Direct Redirect ব্যবহার করুন।");
        setUseRedirect(true);
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleTwitterLogin = async () => {
    if (isAnyLoading) return;
    try {
      setLoadingProvider('twitter');
      setLocalError(null);
      await loginWithTwitter();
    } catch (err: any) {
      console.error("Twitter login error:", err);
      setLocalError(err?.message || "টুইটার দিয়ে লগইন করতে সমস্যা হয়েছে।");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    if (isAnyLoading) return;
    try {
      setLoadingProvider('apple');
      setLocalError(null);
      await loginWithApple();
    } catch (err: any) {
      console.error("Apple login error:", err);
      setLocalError(err?.message || "অ্যাপল দিয়ে লগইন করতে সমস্যা হয়েছে।");
    } finally {
      setLoadingProvider(null);
    }
  };

  const isAuthDomain = window.location.hostname === 'auth.shusto.com';

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
          <p className="text-slate-500 mb-6 text-sm">আপনার হেলথকেয়ার ডিজিটাল সঙ্গী। নিরাপদে প্রবেশ করতে আপনার সোশ্যাল অ্যাকাউন্ট ব্যবহার করুন।</p>
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
        {/* 1. Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-70 text-white border border-slate-800 rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm"
        >
          {loadingProvider === 'google' ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          )}
          <span>{loadingProvider === 'google' ? 'সাইন ইন হচ্ছে...' : 'Continue with Google'}</span>
        </button>

        {/* 2. Apple Button */}
        <button
          onClick={handleAppleLogin}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-black hover:bg-neutral-900 disabled:opacity-70 text-white border border-neutral-800 rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm"
        >
          {loadingProvider === 'apple' ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.78 1.06-1.85.94-2.93-.93.04-2.02.63-2.67 1.39-.58.67-.99 1.76-.85 2.81 1.03.08 2.05-.56 2.58-1.27z"/>
            </svg>
          )}
          <span>{loadingProvider === 'apple' ? 'সাইন ইন হচ্ছে...' : 'Continue with Apple'}</span>
        </button>

        {/* 3. Twitter Button */}
        <button
          onClick={handleTwitterLogin}
          disabled={isAnyLoading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-[#1DA1F2] hover:bg-[#1a8cd8] disabled:opacity-70 text-white border border-[#1DA1F2] rounded-2xl font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-sm"
        >
          {loadingProvider === 'twitter' ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/>
            </svg>
          )}
          <span>{loadingProvider === 'twitter' ? 'সাইন ইন হচ্ছে...' : 'Continue with Twitter'}</span>
        </button>

        {useRedirect && (
          <button
            onClick={async () => {
              try {
                setLoadingProvider('google');
                const { signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth');
                const { auth } = await import('../firebase');
                await signInWithRedirect(auth, new GoogleAuthProvider());
              } catch (e: any) {
                setLocalError(e?.message || "Redirect error");
                setLoadingProvider(null);
              }
            }}
            disabled={isAnyLoading}
            className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-2"
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
