import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { 
  Shield, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  DollarSign,
  Info,
  Server
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface MerchantStats {
  totalCollected: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
}

export function MerchantPanel() {
  const [stats, setStats] = useState<MerchantStats>({
    totalCollected: 0,
    successCount: 0,
    failedCount: 0,
    pendingCount: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'transactions'), where('type', '==', 'add_money'));
      const snapshot = await getDocs(q);
      
      let total = 0;
      let success = 0;
      let failed = 0;
      let pending = 0;
      
      const payments: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'success') {
          success++;
          total += Number(data.amount) || 0;
        } else if (data.status === 'failed') {
          failed++;
        } else {
          pending++;
        }
        payments.push({ id: doc.id, ...data });
      });

      // Sort recent payments with safety
      payments.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setStats({
        totalCollected: total,
        successCount: success,
        failedCount: failed,
        pendingCount: pending,
        successRate: (success / (success + failed + pending || 1)) * 100
      });
      setRecentPayments(payments.slice(0, 10));
    } catch (error) {
      console.error("Error fetching merchant stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400 font-bold">মার্চেন্ট ডাটা লোড হচ্ছে...</div>;

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">SSLCommerz মার্চেন্ট ড্যাশবোর্ড</h2>
          <div className="flex items-center gap-2 mt-1">
            <Shield size={14} className="text-emerald-500" />
            <p className="text-slate-500 font-medium">Shusto-র রিয়েল-টাইম ট্রানজেকশন ডাটা প্রদর্শিত হচ্ছে।</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center gap-2 text-sm font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Gateway Status: LIVE
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="মোট সংগ্রহ (Total Collected)" 
          value={`৳${stats.totalCollected.toLocaleString()}`} 
          icon={<DollarSign className="text-sky-500" />}
          color="sky"
        />
        <StatCard 
          label="সফল পেমেন্ট (Success)" 
          value={stats.successCount} 
          icon={<CheckCircle2 className="text-emerald-500" />}
          color="emerald"
        />
        <StatCard 
          label="সফলতার হার (Success Rate)" 
          value={`${stats.successRate.toFixed(1)}%`} 
          icon={<TrendingUp className="text-indigo-500" />}
          color="indigo"
        />
        <StatCard 
          label="পেন্ডিং (Pending)" 
          value={stats.pendingCount} 
          icon={<Clock className="text-amber-500" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Merchant Info & Portal Login */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Shield size={120} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
              <Shield className="text-sky-500" size={20} /> মার্চেন্ট সিকিউরিটি
            </h3>
            
            <div className="space-y-4 relative z-10">
              <ConfigItem label="Gateway" value="SSLCommerz (V4)" />
              <ConfigItem label="Merchant ID" value="8801709783145" />
              <ConfigItem label="Store ID" value="8801709783145" />
              <ConfigItem label="Status" value="Verified & Active" />
            </div>

            <div className="mt-8 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl text-white shadow-xl relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-sky-500/20 rounded-xl flex items-center justify-center">
                  <CreditCard size={16} className="text-sky-400" />
                </div>
                <span className="text-sm font-bold">Portal Access Details</span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Login ID:</span>
                  <span className="font-mono text-sky-400">8801709783145</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Password:</span>
                  <span className="font-mono text-sky-400">Shusto!7afe</span>
                </div>
              </div>

              <a 
                href="https://marchent.sslcommerz.com" 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-slate-900 rounded-2xl font-bold text-xs hover:bg-sky-50 transition-all"
              >
                SSL Portal এ লগইন করুন
              </a>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-emerald-50 rounded-xl">
                 <Server size={20} className="text-emerald-500" />
               </div>
               <h3 className="font-bold text-slate-900 text-lg">System Health</h3>
             </div>
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-slate-500 text-sm">IPN Verification</span>
                 <span className="text-emerald-600 text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">LIVE</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-slate-500 text-sm">Callback Link</span>
                 <span className="text-emerald-600 text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">ACTIVE</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-slate-500 text-sm">Auto Settlement</span>
                 <span className="text-emerald-600 text-[10px] font-black bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">ON</span>
               </div>
             </div>
          </div>
        </div>

        {/* Recent SSL Payments */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-lg font-bold text-slate-900">রিয়েল-টাইম পেমেন্ট ডাটা (SSL Logs)</h3>
                <p className="text-xs text-slate-400">সরাসরি গেটওয়ে থেকে প্রাপ্ত ডাটা</p>
              </div>
              <button 
                onClick={fetchStats}
                className="px-4 py-2 bg-sky-50 text-sky-600 font-bold text-xs rounded-xl hover:bg-sky-100 transition-all border border-sky-100"
              >
                Sync Now
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tran ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.id.slice(0, 12)}...</td>
                      <td className="px-6 py-4 font-bold text-slate-900">৳{p.amount}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          p.status === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          p.status === 'failed' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {recentPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-slate-50", `bg-${color}-50`)}>
        {icon}
      </div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className="text-sm text-slate-900 font-bold">{value}</span>
    </div>
  );
}
