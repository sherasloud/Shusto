import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn, ExternalLink, UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';

export function Login() {
  const { login, demoLogin, error: contextError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  const error = localError || contextError;

  const handleLogin = async () => {
    if (isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      setLocalError(null);
      await login();
    } catch (err: any) {
      console.error("Login click error:", err);
      setLocalError(err.message || "লগইন করতে ব্যর্থ হয়েছে।");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl mb-6 overflow-hidden border border-slate-100 shadow-sm">
          <img 
            src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
            alt="Shusto Logo" 
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Shusto</h1>
        <p className="text-slate-500 mb-6">আপনার হেলথকেয়ার ডিজিটাল সঙ্গী। ডাক্তার, ফার্মেসি ও ডিজিটাল সেবায় যুক্ত হতে লগইন করুন।</p>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 text-sm font-medium rounded-2xl border border-rose-100 text-left">
            <div className="flex items-center gap-2 mb-2 text-rose-800 font-bold">
              <AlertTriangle size={18} className="shrink-0" />
              <span>লগইন সমস্যা সমাধান নির্দেশিকা:</span>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-rose-900">{error}</p>

            <div className="text-xs space-y-2 border-t border-rose-200/80 pt-3 text-slate-700">
              <p className="font-semibold text-rose-800">গুগল লগইন চালু করার ৩টি সহজ উপায়:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                <li><strong className="text-sky-700">নতুন ট্যাবে অ্যাপ খুলুন:</strong> AI Studio আইফ্রেম পপ-আপ ব্লক করতে পারে। নিচে <span className="font-bold">"নতুন ট্যাবে খুলুন"</span> বাটনে চাপ দিন।</li>
                <li><strong className="text-slate-800">Firebase Console Google Auth:</strong> আপনার ফায়ারবেস প্রজেক্টে <code className="bg-rose-100 px-1 rounded text-rose-900">Authentication &gt; Sign-in method</code> এ <strong>Google</strong> Provider টি Enable করুন।</li>
                <li><strong className="text-slate-800">Authorized Domains:</strong> <code className="bg-rose-100 px-1 rounded text-rose-900">Authentication &gt; Settings &gt; Authorized domains</code> এ বর্তমান ডোমেইন (<code className="text-rose-900">{window.location.hostname}</code>) এড করুন।</li>
              </ol>
              
              <button 
                onClick={handleOpenNewTab}
                className="mt-3 w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all text-xs"
              >
                <ExternalLink size={14} />
                নতুন ট্যাবে অ্যাপ খুলুন (Open in New Tab)
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold transition-all ${
              isLoggingIn 
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] shadow-lg shadow-slate-900/10'
            }`}
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            )}
            {isLoggingIn ? 'গুগলের সাথে সংযুক্ত হচ্ছে...' : 'Continue with Google'}
          </button>

          <button
            onClick={handleOpenNewTab}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-50 font-medium text-xs transition-all"
          >
            <ExternalLink size={14} />
            পপ-আপ সমস্যা হলে নতুন ট্যাবে খুলুন
          </button>
        </div>

        {/* Quick Demo Access for instant testing */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={() => setShowDemoOptions(!showDemoOptions)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1.5 mx-auto"
          >
            <UserCheck size={14} />
            {showDemoOptions ? 'ডেমো অপশন লুকান' : 'প্রিভিউ / টেস্টের জন্য ডেমো লগইন করুন'}
          </button>

          {showDemoOptions && (
            <div className="mt-3 grid grid-cols-2 gap-2 animate-fadeIn">
              <button
                onClick={() => demoLogin('user')}
                className="py-2 px-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-medium border border-emerald-200 transition"
              >
                👤 রোগী (Patient)
              </button>
              <button
                onClick={() => demoLogin('doctor')}
                className="py-2 px-3 text-xs bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl font-medium border border-sky-200 transition"
              >
                👨‍⚕️ ডাক্তার (Doctor)
              </button>
              <button
                onClick={() => demoLogin('pharmacy')}
                className="py-2 px-3 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-medium border border-amber-200 transition"
              >
                💊 ফার্মেসি (Pharmacy)
              </button>
              <button
                onClick={() => demoLogin('admin')}
                className="py-2 px-3 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl font-medium border border-purple-200 transition"
              >
                ⚡ এডমিন (Admin)
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-[11px] text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

