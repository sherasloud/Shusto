import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { LogIn } from 'lucide-react';

export function Login() {
  const { login, error: contextError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const error = localError || contextError;

  const handleLogin = async () => {
    if (isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      setLocalError(null);
      await login();
    } catch (err: any) {
      console.error("Login click error:", err);
      setLocalError(err.message || "Failed to login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div 
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl mb-6 overflow-hidden border border-slate-100 shadow-sm">
          <img 
            src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
            alt="Shusto Logo" 
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Shusto</h1>
        <p className="text-slate-500 mb-8">Your complete telehealth companion. Login to access doctors, medicines, and more.</p>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-sm font-medium rounded-2xl border border-rose-100">
            <p className="mb-2">{error}</p>
            <div className="text-xs text-rose-500 mt-2 space-y-1">
              {error.includes("Network error") && (
                <p>Tip: If you are using a VPN or Ad-blocker, try turning it off.</p>
              )}
              {error.includes("Popup blocked") && (
                <p>Tip: Please allow popups for this site in your browser settings.</p>
              )}
              <p className="pt-2 font-semibold">Still having trouble?</p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="text-sky-600 underline hover:text-sky-700"
              >
                Try opening Shusto in a new tab
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold transition-all ${
            isLoggingIn 
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
              : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
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
          {isLoggingIn ? 'Connecting...' : 'Continue with Google'}
        </button>
        
        <p className="mt-8 text-xs text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
