import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Wallet, 
  CheckCircle2, 
  Search, 
  ArrowUpRight
} from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'payment' | 'add_money' | 'withdrawal' | 'affiliate_commission' | 'platform_commission' | 'admin_profit' | 'platform_fee';
  status: 'pending' | 'success' | 'failed';
  method?: string;
  phoneNumber?: string;
  details?: string;
  createdAt: string;
  providerShare?: number;
  shustoShare?: number;
}

interface ProfitsPanelProps {
  adminBalance: number;
  adminUid?: string;
}

export function ProfitsPanel({ adminBalance, adminUid }: ProfitsPanelProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem('shusto_admin_txns_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Listen to all transactions in real-time
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(list);
      try { localStorage.setItem('shusto_admin_txns_cache', JSON.stringify(list)); } catch (e) {}
      setLoading(false);
    }, (error) => {
      console.error("Error loading transactions for profits:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter profits & calculations
  const { todayProfit, weekProfit, monthProfit, totalProfit, incomeList } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    let today = 0;
    let week = 0;
    let month = 0;
    let total = 0;

    const incomes: Transaction[] = [];

    transactions.forEach(tx => {
      const txTime = new Date(tx.createdAt).getTime();

      // Check if it's admin income / commission / profit
      const isIncome = 
        tx.userId === adminUid || 
        tx.type === 'platform_commission' || 
        tx.type === 'admin_profit' || 
        tx.type === 'affiliate_commission' ||
        (tx.shustoShare && tx.shustoShare > 0);

      if (isIncome) {
        incomes.push(tx);
        const amount = tx.shustoShare !== undefined && tx.shustoShare > 0 ? tx.shustoShare : (tx.amount || 0);

        total += amount;

        if (txTime >= startOfToday) {
          today += amount;
        }
        if (txTime >= sevenDaysAgo) {
          week += amount;
        }
        if (txTime >= thirtyDaysAgo) {
          month += amount;
        }
      }
    });

    return {
      todayProfit: today,
      weekProfit: week,
      monthProfit: month,
      totalProfit: total > 0 ? total : adminBalance,
      incomeList: incomes
    };
  }, [transactions, adminUid, adminBalance]);

  const filteredDisplayList = useMemo(() => {
    if (!search.trim()) return incomeList;

    const term = search.toLowerCase();
    return incomeList.filter(tx => 
      tx.id.toLowerCase().includes(term) || 
      (tx.details && tx.details.toLowerCase().includes(term)) ||
      (tx.phoneNumber && tx.phoneNumber.includes(term)) ||
      (tx.method && tx.method.toLowerCase().includes(term))
    );
  }, [incomeList, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">লভ্যাংশ তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={180} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 font-bold text-xs uppercase tracking-widest mb-3">
              <Wallet size={14} /> Shusto Profit Hub
            </div>
            <h1 className="text-3xl lg:text-4xl font-black mb-2">প্ল্যাটফর্ম লভ্যাংশ (Profits Summary)</h1>
            <p className="text-slate-300 text-sm max-w-xl">
              প্ল্যাটফর্মের দৈনন্দিন, সাপ্তাহিক, মাসিক এবং সর্বমোট অর্জিত লভ্যাংশ রিয়েল-টাইমে পর্যবেক্ষণ করুন।
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl text-right">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">বর্তমান মোট অর্জিত লভ্যাংশ</p>
            <h2 className="text-4xl lg:text-5xl font-black text-sky-400 mt-1">৳{adminBalance.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Profits Breakdown Grid (Daily, Weekly, Monthly, Total) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today Profit */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-emerald-200 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100/60 text-emerald-700 rounded-full">
              আজকে
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">আজকের লভ্যাংশ (Daily)</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">৳{todayProfit.toLocaleString()}</h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} /> আজকের অর্জিত প্রফিট
          </p>
        </div>

        {/* Weekly Profit */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-sky-200 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-sky-100/60 text-sky-700 rounded-full">
              ৭ দিন
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">এই সপ্তাহের লভ্যাংশ (Weekly)</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">৳{weekProfit.toLocaleString()}</h3>
          <p className="text-[11px] text-sky-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} /> গত ৭ দিনের মোট প্রফিট
          </p>
        </div>

        {/* Monthly Profit */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-purple-200 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-purple-100/60 text-purple-700 rounded-full">
              ৩০ দিন
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">এই মাসের লভ্যাংশ (Monthly)</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">৳{monthProfit.toLocaleString()}</h3>
          <p className="text-[11px] text-purple-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} /> গত ৩০ দিনের মোট প্রফিট
          </p>
        </div>

        {/* Total Profit */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-blue-200 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-blue-100/60 text-blue-700 rounded-full">
              সর্বমোট
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">সর্বমোট অর্জিত লভ্যাংশ</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">৳{totalProfit.toLocaleString()}</h3>
          <p className="text-[11px] text-blue-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} /> মোট প্ল্যাটফর্ম ইনকাম
          </p>
        </div>
      </div>

      {/* Profit Income History Logs */}
      <div className="bg-white rounded-[36px] border border-slate-100 p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">আয় ও কমিশন হিসাবের তালিকা</h2>
            <p className="text-slate-500 text-xs">ডাক্তার, ফার্মেসি, সার্ভিস ও অ্যাপ কমার্শিয়াল প্রফিটের বিস্তারিত রেকর্ড।</p>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="সার্চ করুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-4 rounded-l-2xl">তারিখ ও সময়</th>
                <th className="py-4 px-4">বিবরণ / সেবার নাম</th>
                <th className="py-4 px-4">কমিশন টাইপ</th>
                <th className="py-4 px-4">অর্জিত লভ্যাংশ (৳)</th>
                <th className="py-4 px-4 rounded-r-2xl text-right">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredDisplayList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    কোনো লভ্যাংশ লেনদেন রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredDisplayList.map((tx) => {
                  const displayAmount = tx.shustoShare !== undefined && tx.shustoShare > 0 ? tx.shustoShare : tx.amount;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(tx.createdAt).toLocaleString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4 max-w-xs truncate font-semibold text-slate-900">
                        {tx.details || 'Service Commission Profit'}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-sky-100 text-sky-800">
                          প্ল্যাটফর্ম প্রফিট
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-sm text-sky-600">
                        + ৳{displayAmount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-sky-600 font-bold text-[11px] bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                          <CheckCircle2 size={12} /> যোগ হয়েছে
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

