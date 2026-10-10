import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private getReadableErrorMessage(): string {
    const err = this.state.error;
    if (!err) return 'একটি অপ্রত্যাশিত ত্রুটি দেখা দিয়েছে।';
    const msg = err.message || '';
    if (msg.trim().startsWith('{') && msg.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) return String(parsed.error);
      } catch (e) {
        // ignore
      }
    }
    if (msg.includes('client is offline') || msg.toLowerCase().includes('offline')) {
      return 'ইন্টারনেট সংযোগ বা সার্ভার যোগাযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন।';
    }
    return msg;
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">সাময়িক ত্রুটি ঘটেছে</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {this.getReadableErrorMessage()}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full py-3.5 bg-sky-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-sky-600 transition shadow-lg shadow-sky-500/20"
              >
                <RefreshCw size={18} />
                পেজ রিফ্রেশ করুন
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (window.location.pathname !== '/') {
                    window.location.href = '/';
                  }
                }}
                className="w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition text-sm"
              >
                হোম পেইজে ফিরে যান
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
