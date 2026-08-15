import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Users, Copy, Check, TrendingUp, Wallet, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function StateDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(() => {
    if (!user?.uid) return null;
    try {
      const cached = localStorage.getItem(`cached_wallet_balance_${user.uid}`);
      if (cached !== null && cached !== undefined && !isNaN(Number(cached))) return Number(cached);
    } catch (e) {}
    return null;
  });

  const referralLink = `${window.location.origin}?ref=${user?.uid}`;

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Background fetch without blocking UI
      try {
        // Fetch referred patients
        const q = query(
          collection(db, 'users'), 
          where('referredBy', '==', user.uid),
          limit(50)
        );
        const snapshot = await getDocs(q);
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch wallet balance
        const walletSnap = await getDocs(query(collection(db, 'wallets'), where('uid', '==', user.uid), limit(1)));
        if (!walletSnap.empty) {
          const bal = walletSnap.docs[0].data().balance || 0;
          setBalance(bal);
          try { localStorage.setItem(`cached_wallet_balance_${user.uid}`, String(bal)); } catch (e) {}
        }
      } catch (err) {
        console.error("Error fetching state data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-sky-500 rounded-[40px] p-8 text-white shadow-2xl shadow-sky-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">স্টেট ড্যাশবোর্ড</h2>
            <p className="text-sky-50 text-lg mb-6">পেশেন্টদের সাথে আপনার রেফারেল লিঙ্ক শেয়ার করুন এবং ইনকাম শুরু করুন।</p>
            
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <p className="text-sm font-bold text-sky-100 uppercase tracking-widest mb-3">আপনার রেফারেল লিঙ্ক</p>
              <div className="flex items-center gap-3 bg-white/10 p-2 pl-4 rounded-2xl border border-white/10">
                <code className="flex-1 text-sm font-mono truncate">{referralLink}</code>
                <button 
                  onClick={copyToClipboard}
                  className="p-3 bg-white text-sky-600 rounded-xl hover:bg-sky-50 transition-all flex items-center gap-2 font-bold text-sm"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'কপি হয়েছে' : 'লিঙ্ক কপি করুন'}
                </button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
              <Wallet size={28} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">মোট ব্যালেন্স</p>
            <h3 className="text-4xl font-black text-slate-900">{balance === null ? <span className="animate-pulse opacity-70">৳---</span> : `৳${balance.toLocaleString()}`}</h3>
          </div>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <TrendingUp size={16} />
            <span>প্রতি ট্রানজেকশনে ১০% কমিশন</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">আপনার মাধ্যমে যুক্ত পেশেন্টবৃন্দ</h3>
              <p className="text-sm text-slate-500">মোট পেশেন্ট: {patients.length}</p>
            </div>
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">পেশেন্ট</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">ইমেইল</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">যোগদানের তারিখ</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={p.photoURL || `https://picsum.photos/seed/${p.id}/100/100`} 
                          className="w-10 h-10 rounded-xl border border-slate-100" 
                          alt="" 
                        />
                        <span className="font-bold text-slate-900">{p.displayName || 'User'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-500">{p.email}</td>
                    <td className="px-8 py-4 text-sm text-slate-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full border border-emerald-100">
                        সক্রিয়
                      </span>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto">
                        <p className="font-medium italic mb-4">আপনার মাধ্যমে কোনো পেশেন্ট এখনো যুক্ত হয়নি।</p>
                        <button 
                          onClick={copyToClipboard}
                          className="text-sky-500 font-bold flex items-center justify-center gap-2 mx-auto hover:underline"
                        >
                          <Copy size={16} /> লিঙ্ক কপি করে শেয়ার করুন
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
