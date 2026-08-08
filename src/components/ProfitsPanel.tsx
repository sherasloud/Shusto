import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, doc, runTransaction } from 'firebase/firestore';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  CheckCircle2, 
  CreditCard, 
  Search, 
  Filter, 
  Clock, 
  X,
  Smartphone,
  Banknote
} from 'lucide-react';
import { cn } from '../lib/utils';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'income' | 'withdrawal'>('all');
  const [search, setSearch] = useState('');

  // Modal State for Bank Withdrawal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'bkash' | 'nagad' | 'rocket'>('bank');
  const [bankName, setBankName] = useState('Brac Bank');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    // Listen to all transactions in real-time
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading transactions for profits:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter profits & calculations
  const { todayProfit, weekProfit, monthProfit, totalWithdrawn, incomeList, withdrawalList } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    let today = 0;
    let week = 0;
    let month = 0;
    let withdrawn = 0;

    const incomes: Transaction[] = [];
    const withdrawals: Transaction[] = [];

    transactions.forEach(tx => {
      const txTime = new Date(tx.createdAt).getTime();

      // Check if it's a withdrawal
      if (tx.type === 'withdrawal' && (tx.userId === adminUid || tx.details?.toLowerCase().includes('admin') || tx.details?.toLowerCase().includes('bank'))) {
        withdrawals.push(tx);
        if (tx.status === 'success') {
          withdrawn += tx.amount || 0;
        }
        return;
      }

      // Check if it's admin income / commission
      const isIncome = 
        tx.userId === adminUid || 
        tx.type === 'platform_commission' || 
        tx.type === 'admin_profit' || 
        tx.type === 'affiliate_commission' ||
        (tx.shustoShare && tx.shustoShare > 0);

      if (isIncome) {
        incomes.push(tx);
        const amount = tx.shustoShare !== undefined && tx.shustoShare > 0 ? tx.shustoShare : (tx.amount || 0);

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
      totalWithdrawn: withdrawn,
      incomeList: incomes,
      withdrawalList: withdrawals
    };
  }, [transactions, adminUid]);

  // Handle Bank Cashout / Profit Withdrawal
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      alert("অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন।");
      return;
    }

    if (amountNum > adminBalance) {
      alert(`আপনার বর্তমান লভ্যাংশ ব্যালেন্স ৳${adminBalance.toLocaleString()} টাকা। এর থেকে বেশি টাকা উত্তোলন সম্ভব নয়।`);
      return;
    }

    if (!accountName.trim() || !accountNumber.trim()) {
      alert("অনুগ্রহ করে অ্যাকাউন্ট হোল্ডার নাম ও নম্বর প্রদান করুন।");
      return;
    }

    setIsSubmitting(true);

    try {
      const effectiveAdminId = adminUid || 'admin_placeholder';
      const adminWalletRef = doc(db, 'wallets', effectiveAdminId);
      const newTxRef = doc(collection(db, 'transactions'));

      const detailsString = withdrawMethod === 'bank' 
        ? `Bank Withdrawal to ${bankName} (${accountNumber}) - Holder: ${accountName}, Branch: ${branchName || 'N/A'}, Routing: ${routingNumber || 'N/A'}`
        : `${withdrawMethod.toUpperCase()} Withdrawal to ${accountNumber} - Holder: ${accountName}`;

      await runTransaction(db, async (txn) => {
        const walletSnap = await txn.get(adminWalletRef);
        const currentBal = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;

        if (currentBal < amountNum) {
          throw new Error("পর্যাপ্ত ব্যালেন্স নেই");
        }

        txn.set(adminWalletRef, {
          uid: effectiveAdminId,
          balance: currentBal - amountNum,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        txn.set(newTxRef, {
          userId: effectiveAdminId,
          amount: amountNum,
          type: 'withdrawal',
          status: 'success',
          method: withdrawMethod === 'bank' ? `Bank (${bankName})` : withdrawMethod.toUpperCase(),
          phoneNumber: accountNumber,
          details: detailsString,
          createdAt: new Date().toISOString()
        });
      });

      setSuccessToast(`৳${amountNum.toLocaleString()} টাকা উত্তোলন সফলভাবে প্রসেস করা হয়েছে!`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setAccountName('');
      setAccountNumber('');
      setBranchName('');
      setRoutingNumber('');
      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err: any) {
      console.error("Withdrawal failed:", err);
      alert(err.message || "উত্তোলন সম্পন্ন করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisplayList = useMemo(() => {
    let list = transactions;
    if (filter === 'income') {
      list = incomeList;
    } else if (filter === 'withdrawal') {
      list = withdrawalList;
    }

    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter(tx => 
      tx.id.toLowerCase().includes(term) || 
      (tx.details && tx.details.toLowerCase().includes(term)) ||
      (tx.phoneNumber && tx.phoneNumber.includes(term)) ||
      (tx.method && tx.method.toLowerCase().includes(term))
    );
  }, [transactions, incomeList, withdrawalList, filter, search]);

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
      {/* Toast message */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[250] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={24} />
          <span className="font-bold text-sm">{successToast}</span>
        </div>
      )}

      {/* Top Banner & Quick Withdraw Action */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Building2 size={180} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 font-bold text-xs uppercase tracking-widest mb-3">
              <Wallet size={14} /> Shusto Profit Hub
            </div>
            <h1 className="text-3xl lg:text-4xl font-black mb-2">লভ্যাংশ ও ব্যাংক উত্তোলন হিসাব</h1>
            <p className="text-slate-300 text-sm max-w-xl">
              প্ল্যাটফর্মের দৈনন্দিন, সাপ্তাহিক ও মাসিক অর্জিত লভ্যাংশ রিয়েল-টাইমে পর্যবেক্ষণ করুন এবং সরাসরি আপনার ব্যাংক অ্যাকাউন্টে ট্রান্সফার করুন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl text-right">
              <p className="text-xs font-medium text-slate-300">বর্তমান তুলযোগ্য লভ্যাংশ</p>
              <h2 className="text-3xl lg:text-4xl font-black text-sky-400 mt-0.5">৳{adminBalance.toLocaleString()}</h2>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="px-8 py-5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-black text-base rounded-3xl shadow-xl shadow-sky-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 border border-sky-300/40"
            >
              <Building2 size={22} />
              Bank থেকে তুলে নিব
            </button>
          </div>
        </div>
      </div>

      {/* Profits Breakdown Grid (Daily, Weekly, Monthly, Total Withdrawn) */}
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
            <CheckCircle2 size={12} /> আজকের অটোমেটিক ইনকাম
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

        {/* Total Withdrawn */}
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:border-blue-200 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight size={24} />
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-blue-100/60 text-blue-700 rounded-full">
              উত্তোলিত
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">মোট ব্যাংক উত্তোলন</p>
          <h3 className="text-3xl font-black text-slate-900 mt-1">৳{totalWithdrawn.toLocaleString()}</h3>
          <p className="text-[11px] text-blue-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} /> ব্যাংক/মোবাইলে গৃহীত টাকা
          </p>
        </div>
      </div>

      {/* Profit & Transaction History Logs */}
      <div className="bg-white rounded-[36px] border border-slate-100 p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">লভ্যাংশ ও লেনদেন ইতিহাস</h2>
            <p className="text-slate-500 text-xs">প্ল্যাটফর্মের আয় ও উত্তোলনের সার্বিক রেকর্ডসমূহ।</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="সার্চ করুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  filter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                সকল
              </button>
              <button
                onClick={() => setFilter('income')}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  filter === 'income' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                আয়/লভ্যাংশ
              </button>
              <button
                onClick={() => setFilter('withdrawal')}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                  filter === 'withdrawal' ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                উত্তোলন
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-4 rounded-l-2xl">তারিখ ও সময়</th>
                <th className="py-4 px-4">বিবরণ / উৎস</th>
                <th className="py-4 px-4">টাইপ</th>
                <th className="py-4 px-4">মাধ্যম / অ্যাকাউন্ট</th>
                <th className="py-4 px-4">পরিমাণ (৳)</th>
                <th className="py-4 px-4 rounded-r-2xl text-right">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredDisplayList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredDisplayList.map((tx) => {
                  const isWithdrawal = tx.type === 'withdrawal';
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
                        {tx.details || (isWithdrawal ? 'Bank Withdrawal' : 'Service Commission Profit')}
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide",
                          isWithdrawal 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-emerald-100 text-emerald-800"
                        )}>
                          {isWithdrawal ? 'ব্যাংক উত্তোলন' : 'লভ্যাংশ/আয়'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {tx.method || (isWithdrawal ? 'Bank Transfer' : 'Auto Commission')}
                        {tx.phoneNumber && <span className="block text-[10px] text-slate-400 font-mono">{tx.phoneNumber}</span>}
                      </td>
                      <td className="py-4 px-4 font-bold text-sm">
                        <span className={isWithdrawal ? "text-blue-600" : "text-emerald-600"}>
                          {isWithdrawal ? `- ৳${displayAmount.toLocaleString()}` : `+ ৳${displayAmount.toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                          <CheckCircle2 size={12} /> সফল
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

      {/* Modal: Withdraw Profit to Bank ("Bank থেকে তুলে নিব") */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-[220] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-[36px] max-w-lg w-full p-8 shadow-2xl relative border border-slate-100 my-8">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">ব্যাংকে টাকা উত্তোলন (Bank Cashout)</h2>
                <p className="text-slate-500 text-xs">আপনার অর্জিত লভ্যাংশ ব্যাংক অ্যাকাউন্টে ট্রান্সফার করুন</p>
              </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-5">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  উত্তোলনের মাধ্যম নির্বাচন করুন
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bank')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                      withdrawMethod === 'bank' 
                        ? "border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Building2 size={20} />
                    ব্যাংক ট্রান্সফার
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('bkash')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                      withdrawMethod === 'bkash' 
                        ? "border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-500/20" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Smartphone size={20} className="text-pink-600" />
                    বিকাশ (bKash)
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('nagad')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                      withdrawMethod === 'nagad' 
                        ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Smartphone size={20} className="text-orange-600" />
                    নগদ (Nagad)
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('rocket')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all",
                      withdrawMethod === 'rocket' 
                        ? "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Smartphone size={20} className="text-purple-600" />
                    রকেট (Rocket)
                  </button>
                </div>
              </div>

              {/* Bank Transfer Specific Fields */}
              {withdrawMethod === 'bank' && (
                <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ব্যাংকের নাম</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-sky-500"
                    >
                      <option value="Brac Bank">BRAC Bank Ltd.</option>
                      <option value="Dutch Bangla Bank">Dutch Bangla Bank (DBBL)</option>
                      <option value="Islami Bank">Islami Bank Bangladesh Ltd.</option>
                      <option value="The City Bank">The City Bank Ltd.</option>
                      <option value="Eastern Bank">Eastern Bank Ltd. (EBL)</option>
                      <option value="Sonali Bank">Sonali Bank Ltd.</option>
                      <option value="Bank Asia">Bank Asia Ltd.</option>
                      <option value="Mutual Trust Bank">Mutual Trust Bank Ltd.</option>
                      <option value="Other Bank">অন্যান্য ব্যাংক</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ব্রাঞ্চ (Branch)</label>
                      <input
                        type="text"
                        placeholder="যেমন: ধানমন্ডি ব্রাঞ্চ"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">রাউটিং নম্বর (ঐচ্ছিক)</label>
                      <input
                        type="text"
                        placeholder="Routing No."
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অ্যাকাউন্ট হোল্ডারের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: Shusto Admin / MD RAHIM"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Account / Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {withdrawMethod === 'bank' ? 'ব্যাংক অ্যাকাউন্ট নম্বর' : 'মোবাইল নম্বর'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={withdrawMethod === 'bank' ? 'যেমন: 1501201234567001' : '017XXXXXXXX'}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Withdraw Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    উত্তোলনের পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-sky-600">
                    সর্বোচ্চ: ৳{adminBalance.toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="100"
                  max={adminBalance}
                  placeholder="যেমন: 5000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:border-sky-500"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {[1000, 5000, 10000, 50000].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setWithdrawAmount(String(Math.min(chip, adminBalance)))}
                      className="px-3 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600 rounded-lg text-xs font-bold transition-all"
                    >
                      ৳{chip.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(adminBalance))}
                    className="px-3 py-1 bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-lg text-xs font-extrabold transition-all"
                  >
                    সব টাকা (৳{adminBalance.toLocaleString()})
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || adminBalance <= 0}
                  className="px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-2xl text-xs shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <Banknote size={18} />
                  {isSubmitting ? 'প্রসেস হচ্ছে...' : 'উত্তোলন কনফার্ম করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
