import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, increment } from 'firebase/firestore';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  Filter,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'payment' | 'add_money' | 'withdrawal' | 'affiliate_commission';
  status: 'pending' | 'success' | 'failed';
  method?: string;
  phoneNumber?: string;
  details?: string;
  createdAt: string;
  providerId?: string;
  providerShare?: number;
  shustoShare?: number;
}

export function TransactionsPanel({ isAdmin = false, currentUserId }: { isAdmin?: boolean, currentUserId?: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'payment' | 'add_money' | 'withdrawal' | 'affiliate_commission'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));

    if (!isAdmin && currentUserId) {
      q = query(
        collection(db, 'transactions'), 
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, currentUserId]);

  const handleApproveWithdrawal = async (tx: Transaction) => {
    if (!isAdmin) return;
    
    try {
      // 1. Mark transaction as success
      await updateDoc(doc(db, 'transactions', tx.id), { status: 'success' });
      
      // 2. Deduct from user's wallet
      await updateDoc(doc(db, 'wallets', tx.userId), {
        balance: increment(-tx.amount),
        updatedAt: new Date().toISOString()
      });

      alert('Withdrawal approved successfully');
    } catch (error) {
      console.error("Error approving withdrawal:", error);
    }
  };

  const filtered = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.type === filter;
    const matchesSearch = tx.id.toLowerCase().includes(search.toLowerCase()) || 
                          (tx.phoneNumber?.includes(search)) ||
                          (tx.userId.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="p-8 text-center text-slate-400">Loading transactions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Transactions</h2>
          <p className="text-slate-500 text-sm">Monitor and manage all financial records.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search TX ID or Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200">
            {(['all', 'payment', 'add_money', 'withdrawal', 'affiliate_commission'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap",
                  filter === f ? "bg-sky-500 text-white" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
                {isAdmin && <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(tx => {
                // Income (+) for recipient: topup/deposit, doctor earning, platform/service fee, commission
                // Expense (-) for payer: payment (spent by patient/user), withdrawal
                const isIncome = 
                  tx.type === 'add_money' || 
                  tx.type === 'appointment_earning' ||
                  (tx.type as string) === 'doctor_earning' ||
                  (tx.type as string) === 'earning' ||
                  (tx.type as string) === 'service_fee' || 
                  (tx.type as string) === 'platform_fee' || 
                  tx.type === 'affiliate_commission' ||
                  (tx.type as string) === 'refund' ||
                  (tx.type as string) === 'deposit' ||
                  tx.details?.toLowerCase().includes('topup') ||
                  tx.details?.toLowerCase().includes('earning') ||
                  tx.details?.toLowerCase().includes('fee') ||
                  tx.details?.toLowerCase().includes('platform') ||
                  tx.details?.toLowerCase().includes('profit') ||
                  tx.details?.toLowerCase().includes('commission');

                const isExpense = 
                  tx.type === 'payment' || 
                  tx.type === 'withdrawal' ||
                  (tx.type as string) === 'doctor_payout' ||
                  (tx.type as string) === 'payout';

                const finalIsIncome = isIncome && !isExpense;

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          finalIsIncome ? "bg-sky-100 text-sky-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {finalIsIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 capitalize text-sm">
                            {(tx.type as string) === 'service_fee' || (tx.type as string) === 'platform_fee' 
                              ? 'Platform Fee' 
                              : tx.type === 'appointment_earning' || (tx.type as string) === 'doctor_earning'
                              ? 'Doctor Earning'
                              : tx.type === 'payment'
                              ? 'Appointment Payment'
                              : tx.type.replace('_', ' ')}
                          </p>
                          {(tx.method || tx.details || tx.targetName) && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              {tx.method || tx.details || (tx.targetName ? `Target: ${tx.targetName}` : '')} {tx.phoneNumber && `- ${tx.phoneNumber}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn("font-bold text-sm", finalIsIncome ? "text-sky-600" : "text-rose-600")}>
                        {finalIsIncome ? '+' : '-'}৳{tx.amount}
                      </p>
                      {tx.providerShare !== undefined && (
                        <p className="text-[10px] text-slate-400 whitespace-nowrap">
                          P: ৳{tx.providerShare.toFixed(2)} | S: ৳{tx.shustoShare?.toFixed(2)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        tx.status === 'success' ? "bg-sky-100 text-sky-600" : 
                        tx.status === 'failed' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {tx.status === 'success' ? <CheckCircle2 size={12} /> : 
                         tx.status === 'failed' ? <XCircle size={12} /> : <Clock size={12} />}
                        {tx.status}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        {tx.type === 'withdrawal' && tx.status === 'pending' && (
                          <button 
                            onClick={() => handleApproveWithdrawal(tx)}
                            className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-600 shadow-sm"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <DollarSign size={48} className="text-slate-200" />
            <p>No transactions found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
