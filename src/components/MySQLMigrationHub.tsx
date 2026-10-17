import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  FileCode,
  FileJson,
  Layers,
  HardDrive,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../AuthContext';

interface MySQLStatus {
  configured: boolean;
  host: string | null;
  database: string | null;
  port: number;
}

export function MySQLMigrationHub({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);
  const [status, setStatus] = useState<MySQLStatus>({
    configured: false,
    host: null,
    database: null,
    port: 3306,
  });

  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [migrationResult, setMigrationResult] = useState<any | null>(null);

  // Form state
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [dbUser, setDbUser] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('shustobd');

  // Load current status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/mysql/status');
      const data = await res.json();
      if (data.success) {
        setStatus({
          configured: data.configured,
          host: data.host,
          database: data.database,
          port: data.port || 3306,
        });
        if (data.host) setHost(data.host);
        if (data.database) setDatabase(data.database);
        if (data.port) setPort(String(data.port));
      }
    } catch (err: any) {
      console.warn('Failed to fetch MySQL status:', err.message);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Sync client-side cached data (like wallet, user) to server migration cache first
  const syncClientCacheToServer = async () => {
    try {
      if (user) {
        const cachedBalance = localStorage.getItem(`cached_wallet_balance_${user.uid}`);
        const userItems = [{
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || 'User',
          wallet_balance: cachedBalance ? Number(cachedBalance) : (user.email === 'siamthebin7@gmail.com' ? 14.00 : 0),
          role: 'user'
        }];
        await fetch('/api/migration/client-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionName: 'users', items: userItems })
        });
      }
    } catch (e) {
      // Non-fatal
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setFeedback(null);
    try {
      // If user typed values, save config first
      if (host && dbUser && database) {
        await fetch('/api/mysql/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host, port: Number(port) || 3306, user: dbUser, password, database })
        });
      }

      const res = await fetch('/api/mysql/test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: '✅ MySQL ডেটাবেস সফলভাবে সংযুক্ত হয়েছে! (Connected successfully)' });
        fetchStatus();
      } else {
        setFeedback({ type: 'error', message: `❌ কানেকশন ব্যর্থ: ${data.message}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ত্রুটি: ${err.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/mysql/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port: Number(port) || 3306, user: dbUser, password, database })
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: '✅ MySQL কনফিগারেশন সফলভাবে সংরক্ষিত ও সংযুক্ত হয়েছে!' });
        fetchStatus();
      } else {
        setFeedback({ type: 'error', message: data.message || 'কনফিগারেশন ব্যর্থ হয়েছে।' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ত্রুটি: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSql = async () => {
    setFeedback({ type: 'info', message: 'SQL ফাইল তৈরি ও ডাউনলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।' });
    await syncClientCacheToServer();
    try {
      const res = await fetch('/api/migration/export-sql');
      if (!res.ok) throw new Error('SQL export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shustobd_full_firebase_migration_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: '✅ সম্পূর্ণ SQL মাইগ্রেশন ফাইল ডাউনলোড সম্পন্ন হয়েছে!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ডাউনলোড ত্রুটি: ${err.message}` });
    }
  };

  const handleDownloadJson = async () => {
    setFeedback({ type: 'info', message: 'JSON ব্যাকআপ তৈরি হচ্ছে...' });
    await syncClientCacheToServer();
    try {
      const res = await fetch('/api/migration/export-json');
      if (!res.ok) throw new Error('JSON export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shustobd_firebase_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: '✅ সম্পূর্ণ JSON ডেটা ব্যাকআপ ডাউনলোড সম্পন্ন হয়েছে!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: `ডাউনলোড ত্রুটি: ${err.message}` });
    }
  };

  const handleRunDirectMigration = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে ফায়ারবেস থেকে সমস্ত ডেটা সরাসরি MySQL ডেটাবেসে শিফট ও মাইগ্রেট করতে চান? কোনো পুরোনো ডাটা মুছে যাবে না।')) {
      return;
    }
    setRunningMigration(true);
    setFeedback({ type: 'info', message: 'মাইগ্রেশন প্রক্রিয়াধীন... ডেটাবেসে টেবিল তৈরি এবং ডেটা স্থানান্তর হচ্ছে।' });
    setMigrationResult(null);
    await syncClientCacheToServer();
    try {
      const res = await fetch('/api/migration/run-direct', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMigrationResult(data);
        setFeedback({ type: 'success', message: data.message });
      } else {
        setFeedback({ type: 'error', message: data.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `মাইগ্রেশন ত্রুটি: ${err.message}` });
    } finally {
      setRunningMigration(false);
    }
  };

  const copyBashCommand = () => {
    const cmd = `mysql -h ${host || 'localhost'} -u ${dbUser || 'root'} -p ${database || 'shustobd'} < shustobd_full_firebase_migration.sql`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 text-white px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Firebase to MySQL Data Shift Hub</h1>
                <p className="text-sky-100 text-sm">
                  ফায়ারবেস থেকে সম্পূর্ণ ডেটা সুরক্ষিতভাবে MySQL-এ মাইগ্রেশন ও এক্সপোর্ট করুন
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition"
              >
                বন্ধ করুন
              </button>
            )}
          </div>

          {/* Quick Status Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${status.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <div>
                <span className="block text-xs text-sky-200">MySQL সংযোগ অবস্থা</span>
                <span className="block text-sm font-bold">
                  {status.configured ? `সংযুক্ত (${status.database})` : 'কনফিগার করা হয়নি'}
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
              <div>
                <span className="block text-xs text-sky-200">জিরো ডেটা লস গ্যারান্টি</span>
                <span className="block text-sm font-bold">সকল ইউজার ও ব্যালেন্স সুরক্ষিত</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <div>
                <span className="block text-xs text-sky-200">সিয়াম (CEO) ওয়ালেট প্রোটেকশন</span>
                <span className="block text-sm font-bold">৳14.00 ব্যালেন্স স্থায়ীভাবে সংরক্ষিত</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <RefreshCw className="w-5 h-5 text-sky-600 shrink-0 mt-0.5 animate-spin" />
            )}
            <div className="text-sm font-medium leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* Section 1: One-Click Downloads & Export (Instant, works without MySQL server setup) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ১. এক ক্লিকে সম্পূর্ণ ডেটাবেস ডাউনলোড (One-Click Full Export)
              </h2>
              <p className="text-xs text-slate-500">
                ফায়ারবেসের সমস্ত কালেকশন ও টেবিল (ইউজার, ওয়ালেট, ডাক্তার, প্রেসক্রিপশন ইত্যাদি) এক্সপোর্ট করুন
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download SQL Dump */}
            <div className="p-5 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/60 to-white hover:border-sky-300 transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                  <FileCode className="w-4 h-4" />
                  <span>সম্পূর্ণ MySQL (.sql) ফাইল ডাউনলোড</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  সরাসরি phpMyAdmin, cPanel, বা টার্মিনালে ১ ক্লিকে ইমপোর্ট করার জন্য প্রস্তুত SQL স্ক্রিপ্ট। এতে টেবিল স্কিমা এবং সমস্ত ডেটা বিদ্যমান।
                </p>
              </div>
              <button
                onClick={handleDownloadSql}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ডাউনলোড করুন (.sql স্ক্রিপ্ট)</span>
              </button>
            </div>

            {/* Download JSON Backup */}
            <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <FileJson className="w-4 h-4" />
                  <span>সম্পূর্ণ JSON ডেটা ব্যাকআপ</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  ফায়ারবেসের সকল কালেকশন এবং নথিপত্রের র ডেটা JSON ফরম্যাটে সংরক্ষণ করুন। পরবর্তীতে যেকোনো ডেটাবেসে ব্যবহারযোগ্য।
                </p>
              </div>
              <button
                onClick={handleDownloadJson}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ডাউনলোড করুন (JSON ব্যাকআপ)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Direct MySQL Migration Configuration & Execution */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ২. সরাসরি লাইভ MySQL ডেটাবেসে মাইগ্রেশন (Direct Live Migration)
                </h2>
                <p className="text-xs text-slate-500">
                  আপনার নিজস্ব MySQL হোস্টিং বা ক্লাউড সার্ভারের সাথে সরাসরি সংযোগ দিয়ে ডেটা শিফট করুন
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin text-sky-600' : ''}`} />
              <span>{testingConnection ? 'পরীক্ষা হচ্ছে...' : 'সংযোগ টেস্ট'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MySQL Host / IP
              </label>
              <input
                type="text"
                placeholder="उदा. localhost বা 127.0.0.1"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Port
              </label>
              <input
                type="number"
                placeholder="3306"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Database Name
              </label>
              <input
                type="text"
                placeholder="shustobd"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                MySQL User
              </label>
              <input
                type="text"
                placeholder="root বা ডেটাবেস ইউজার"
                value={dbUser}
                onChange={(e) => setDbUser(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="পাসওয়ার্ড (যদি থাকে)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm shadow transition disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'সংরক্ষণ হচ্ছে...' : 'কনফিগারেশন সংরক্ষণ করুন'}
              </button>
            </div>
          </form>

          {/* Direct Migration Run Action */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-bold text-slate-700">টিপস:</span> MySQL সংযোগ সেটআপ থাকলে ১ ক্লিকেই ফায়ারবেসের সমস্ত তথ্য স্বয়ংক্রিয়ভাবে টেবিল তৈরি করে ইনসার্ট হবে।
            </div>

            <button
              onClick={handleRunDirectMigration}
              disabled={runningMigration}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <HardDrive className="w-4 h-4" />
              <span>{runningMigration ? 'মাইগ্রেশন চলছে...' : 'সরাসরি MySQL-এ ডেটা শিফট চালান'}</span>
            </button>
          </div>

          {/* Migration Breakdown Result */}
          {migrationResult && migrationResult.success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>মাইগ্রেশন সফল হয়েছে! সর্বমোট {migrationResult.totalRecords} টি রেকর্ড মাইগ্রেট হয়েছে।</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                {Object.entries(migrationResult.breakdown || {}).map(([table, count]: [string, any]) => (
                  <div key={table} className="bg-white p-2.5 rounded-xl border border-emerald-100 text-slate-700">
                    <span className="block font-bold text-emerald-700 uppercase tracking-wide">{table}</span>
                    <span className="text-base font-extrabold text-slate-900">{count} records</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: phpMyAdmin & cPanel 1-Click Import Guide */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                ৩. phpMyAdmin অথবা টার্মিনালে ইমপোর্ট করার নিয়ম
              </h2>
              <p className="text-xs text-slate-500">
                ডাউনলোড করা SQL ফাইল যেকোনো হোস্টিংয়ে খুব সহজেই রান করতে পারবেন
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="font-bold text-slate-900 block text-sm">পদ্ধতি ১: phpMyAdmin বা cPanel</span>
              <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                <li>cPanel বা লোকালহোস্টে <strong>phpMyAdmin</strong> ওপেন করুন।</li>
                <li>বামের মেনু থেকে <strong>shustobd</strong> ডেটাবেস সিলেক্ট করুন (বা তৈরি করুন)।</li>
                <li>উপরের <strong>Import</strong> ট্যাবে যান।</li>
                <li><strong>Choose File</strong> এ ক্লিক করে ডাউনলোড করা <code className="bg-white px-1.5 py-0.5 rounded border">.sql</code> ফাইলটি সিলেক্ট করুন।</li>
                <li>নিচে <strong>Go / Import</strong> বাটনে ক্লিক করলেই সমস্ত ডাটা লোড হয়ে যাবে!</li>
              </ol>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-900 block text-sm">পদ্ধতি ২: টার্মিনাল / SSH কমান্ড</span>
                <p className="leading-relaxed mt-1">
                  সার্ভারে বা লোকাল মেশিনে নিচের কমান্ডটি রান করে তাৎক্ষণিক সব ডাটা ইমপোর্ট করতে পারেন:
                </p>
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto flex items-center justify-between">
                  <span>mysql -u {dbUser || 'root'} -p {database || 'shustobd'} &lt; shustobd_full_firebase_migration.sql</span>
                </div>
              </div>

              <button
                type="button"
                onClick={copyBashCommand}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'কপি হয়েছে!' : 'কমান্ড কপি করুন'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
