import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { getApiUrl } from "../utils/api";
import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import {
  Wallet as WalletIcon,
  Plus,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "../lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  status: "pending" | "success" | "failed";
  details?: string;
  targetName?: string;
  targetId?: string;
  createdAt: string;
}

export function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(() => {
    if (!user) return null;
    try {
      const cached = localStorage.getItem(`cached_wallet_balance_${user.uid}`);
      if (cached !== null && cached !== undefined && !isNaN(Number(cached))) return Number(cached);
    } catch (e) {}
    return null;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_wallet_txns_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [walletLoaded, setWalletLoaded] = useState(true);
  const [transactionsLoaded, setTransactionsLoaded] = useState(true);
  const loading = !walletLoaded || !transactionsLoaded;
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<"sheba">(
    "sheba",
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [creditSuccessMsg, setCreditSuccessMsg] = useState<string | null>(null);
  const [withdrawErrorDetails, setWithdrawErrorDetails] = useState<{
    message: string;
    statusCode?: number;
    targetUrl?: string;
    rawShebaResponse?: any;
    secretUsed?: string;
    timestamp?: string;
  } | null>(null);
  const [withdrawSuccessDetails, setWithdrawSuccessDetails] = useState<string | null>(null);
  const [copiedError, setCopiedError] = useState(false);

  const isDevOrPreview = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.includes("run.app") ||
    window.location.hostname.includes("local")
  );

  useEffect(() => {
    if (!user) return;

    const handlePaymentRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const pm = urlParams.get("payment");
      const amtStr = urlParams.get("amount");
      const tid = urlParams.get("tran_id");

      if (pm === "success" && amtStr && tid) {
        const amt = Number(amtStr);
        if (isNaN(amt) || amt <= 0) return;

        setWalletLoaded(false);
        setTransactionsLoaded(false);
        setProcessing(true);
        try {
          // Check transaction document atomically using a read/write lock to avoid dual client-server credits
          const txDocRef = doc(db, "transactions", tid);

          await runTransaction(db, async (txn) => {
            const txDocSnap = await txn.get(txDocRef);
            if (txDocSnap.exists()) {
              console.log(
                `[Wallet Client] Transaction ${tid} was already credited.`,
              );
              return;
            }

            const walletRef = doc(db, "wallets", user.uid);
            const walletSnap = await txn.get(walletRef);
            let currentBalance = 0;
            if (walletSnap.exists()) {
              currentBalance = walletSnap.data().balance || 0;
            }

            txn.set(
              walletRef,
              {
                uid: user.uid,
                balance: currentBalance + amt,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );

            txn.set(txDocRef, {
              userId: user.uid,
              amount: amt,
              type: "add_money",
              status: "success",
              tran_id: tid,
              createdAt: new Date().toISOString(),
            });

            console.log(
              `[Wallet Client] Atomically credited ৳${amt} to user ${user.uid}. TxID: ${tid}`,
            );
          });

          // Force immediate update for UI consistency before the snapshot listener triggers
          const walletRef = doc(db, "wallets", user.uid);
          const walletDoc = await getDoc(walletRef);
          if (walletDoc.exists()) {
            setBalance(walletDoc.data().balance || 0);
          }

          setCreditSuccessMsg(
            `৳${amt} আপনার Shusto ওয়ালেটে সফলভাবে জমা করা হয়েছে!`,
          );
        } catch (err: any) {
          console.error(
            "[Wallet Client] Credit fallback transaction error:",
            err,
          );
          alert(`পেমেন্ট সফল হয়েছে কিন্তু ডেটাবেসে আপনার ব্যালেন্স যুক্ত করতে সমস্যা হয়েছে (হয়তো ডেটাবেস কোটা শেষ)। আপনার পেমেন্ট রেকর্ডটি আমাদের কাছে নিরাপদ রয়েছে, দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন। এরর: ${err.message}`);
        } finally {
          setProcessing(false);
          // Safely keep page state but wipe query parameters to prevent duplicate triggers on manual refresh
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }
      } else if (pm === "failed" || pm === "cancelled") {
        const reason = urlParams.get("reason");
        alert(
          `পেমেন্ট সম্পন্ন হতে পারেনি (${pm === "failed" ? "ব্যর্থ" : "বাতিল"} হয়েছে)।${reason ? `\nকারণ: ${reason}` : ""}`,
        );
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    };

    handlePaymentRedirect();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Listen to wallet balance
    const walletRef = doc(db, "wallets", user.uid);
    const unsubscribeWallet = onSnapshot(walletRef, (doc) => {
      const newBal = doc.exists() ? (doc.data().balance || 0) : 0;
      setBalance(newBal);
      try { localStorage.setItem(`cached_wallet_balance_${user.uid}`, String(newBal)); } catch (e) {}
      setWalletLoaded(true);
    }, (error) => {
      console.error("Wallet DB Error:", error);
      setWalletLoaded(true); // Don't block UI indefinitely on error
    });

    // Listen to transactions
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
    );
    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      const sorted = list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setTransactions(sorted);
      try { localStorage.setItem(`cached_wallet_txns_${user.uid}`, JSON.stringify(sorted)); } catch (e) {}
      setTransactionsLoaded(true);
    }, (error) => {
      console.error("Transactions DB Error:", error);
      setTransactionsLoaded(true);
    });

    return () => {
      unsubscribeWallet();
      unsubscribeTransactions();
    };
  }, [user]);

  const handleAddMoney = async (isRetry: boolean = false) => {
    if (!user) {
      alert("আপনার অ্যাকাউন্ট সেশন পাওয়া যায়নি। দয়া করে পুনরায় লগইন করুন।");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("সঠিক পরিমাণ লিখুন।");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(getApiUrl("/api/payment/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          userId: user?.uid,
          userName: user?.displayName,
          userEmail: user?.email,
          providerType: "add_money",
          clientBaseUrl: window.location.origin,
        }),
      });

      if (!response.ok) {
        if (response.status === 405 && !isRetry) {
          console.warn("Detected potential Service Worker interception/static routing failure on payment init (405). Self-healing active, clearing worker/cache and retrying...");
          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            } catch (e) {
              console.error("Failed to unregister SW:", e);
            }
          }
          try {
            const keys = await caches.keys();
            for (const key of keys) {
              await caches.delete(key);
            }
          } catch (e) {
            console.error("Failed to clear caches:", e);
          }

          // Wait a brief moment for service worker bypass to apply, then retry
          await new Promise(resolve => setTimeout(resolve, 800));
          setProcessing(false);
          await handleAddMoney(true);
          return;
        }

        const errorText = await response.text();
        console.error("Payment API Http Error:", response.status, errorText);
        let errorMsg = "";
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.error || parsed.message || errorText;
        } catch (e) {
          errorMsg = errorText;
        }
        alert(`পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে (ভুল কোড: ${response.status}).\nবিস্তারিত ভুল: ${errorMsg}`);
        setProcessing(false);
        return;
      }

      const data = await response.json();
      
      if (data.GatewayPageURL) {
        console.log("Redirecting directly to SSLCommerz:", data.GatewayPageURL);

        if (typeof window !== 'undefined' && window.self !== window.top) {
           console.log("In an iframe, attempting to open gateway in a new tab");
           // For better UX in AI Studio, try both
           const newWindow = window.open(data.GatewayPageURL, "_blank");
           if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
              // Pop-up blocked, fallback to same window
              window.location.href = data.GatewayPageURL;
           } else {
              setProcessing(false);
              setShowAddMoney(false);
              alert("পেমেন্ট গেটওয়ে নতুন ট্যাবে খোলা হয়েছে। পেমেন্ট সম্পন্ন করে এখানে ফিরে আসুন।");
           }
        } else {
           window.location.href = data.GatewayPageURL;
        }
      } else {
        alert("পেমেন্ট গেটওয়ে ক্যাটাগরী লিংক পাওয়া যায়নি। দয়া করে পরে আবার চেষ্টা করুন।");
        setProcessing(false);
      }
    } catch (error: any) {
      console.error("Payment Error Exception:", error);
      alert("পেমেন্ট প্রসেসিং ব্যর্থ হয়েছে। বিস্তারিত ভুল: " + error.message);
      setProcessing(false);
    }
  };

  const handleWithdraw = async (isRetry: boolean = false) => {
    setWithdrawErrorDetails(null);
    setWithdrawSuccessDetails(null);

    if (!user) {
      setWithdrawErrorDetails({
        message: "আপনার অ্যাকাউন্ট সেশন পাওয়া যায়নি। দয়া করে পুনরায় লগইন করুন।"
      });
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setWithdrawErrorDetails({
        message: "উত্তোলনের জন্য সঠিক পরিমাণ লিখুন (যেমন: ১০০, ৫০০)।"
      });
      return;
    }
    if (Number(amount) > (balance || 0)) {
      setWithdrawErrorDetails({
        message: `আপনার পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${balance || 0}`
      });
      return;
    }
    const cleanNumber = phoneNumber.trim().replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length < 11) {
      setWithdrawErrorDetails({
        message: "সঠিক ১১ ডিজিটের শেবা মোবাইল নম্বর লিখুন (যেমন: 01930314459)।"
      });
      return;
    }

    setProcessing(true);
    try {
      // Generate a unique idempotency key for this withdrawal attempt
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Call the server API endpoint which signs HMAC and atomically executes withdrawal
      const response = await fetch(getApiUrl("/api/shusto/withdraw"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shustoUserId: user.uid,
          userId: user.uid,
          shebaNumber: cleanNumber,
          phone: cleanNumber,
          amount: Number(amount),
          idempotencyKey: idempotencyKey
        }),
      });

      let responseData: any = {};
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { error: responseText };
      }

      if (!response.ok || responseData.success === false) {
        const errMsg = responseData.error || responseData.message || `সার্ভার এরর কোড: ${response.status}`;
        setWithdrawErrorDetails({
          message: errMsg,
          statusCode: response.status || responseData.statusCode,
          targetUrl: responseData.targetUrl || "https://shebabangladesh.vercel.app/api/shusto/withdraw",
          rawShebaResponse: responseData.rawShebaResponse || responseData,
          secretUsed: responseData.secretUsed,
          timestamp: new Date().toLocaleTimeString('bn-BD')
        });
        return;
      }

      if (responseData.success) {
        setWithdrawSuccessDetails(responseData.message || `৳${amount} টাকা সফলভাবে শেবা অ্যাকাউন্টে (${cleanNumber}) ক্রেডিট হয়েছে!`);
        setShowWithdraw(false);
        setAmount("");
        setPhoneNumber("");
      } else {
        const errorDetail = responseData.error || responseData.message || "অজানা সমস্যা";
        setWithdrawErrorDetails({
          message: errorDetail,
          statusCode: response.status,
          targetUrl: responseData.targetUrl,
          rawShebaResponse: responseData
        });
      }
    } catch (error: any) {
      console.error("Withdrawal Error:", error);
      setWithdrawErrorDetails({
        message: `রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে: ${error.message}`,
        timestamp: new Date().toLocaleTimeString('bn-BD')
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">ওয়ালেট লোড হচ্ছে...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* On-Screen Withdrawal Error Diagnostic Banner */}
      {withdrawErrorDetails && (
        <div className="bg-red-50 border-2 border-red-200 rounded-[32px] p-6 text-red-900 shadow-xl shadow-red-500/5 animate-in slide-in-from-top-4 duration-300 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <XCircle size={28} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-black text-red-950">
                    উত্তোলন ব্যর্থ হয়েছে (Withdrawal Error)
                  </h3>
                  {withdrawErrorDetails.statusCode && (
                    <span className="px-3 py-1 bg-red-200 text-red-900 text-xs font-black rounded-full">
                      HTTP {withdrawErrorDetails.statusCode}
                    </span>
                  )}
                  {withdrawErrorDetails.timestamp && (
                    <span className="text-xs text-red-500 font-medium">
                      {withdrawErrorDetails.timestamp}
                    </span>
                  )}
                </div>

                <p className="text-sm font-bold text-red-800 leading-relaxed">
                  {withdrawErrorDetails.message}
                </p>

                {withdrawErrorDetails.targetUrl && (
                  <div className="text-xs text-red-600/90 font-mono bg-red-100/60 p-2.5 rounded-xl break-all">
                    <span className="font-bold">Target URL:</span> {withdrawErrorDetails.targetUrl}
                  </div>
                )}

                {withdrawErrorDetails.rawShebaResponse && (
                  <div className="mt-2 text-xs bg-slate-900 text-red-200 p-3 rounded-xl font-mono overflow-x-auto max-h-36">
                    <p className="text-slate-400 font-bold mb-1">// Sheba Server Response:</p>
                    <pre>{typeof withdrawErrorDetails.rawShebaResponse === 'object' ? JSON.stringify(withdrawErrorDetails.rawShebaResponse, null, 2) : String(withdrawErrorDetails.rawShebaResponse)}</pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const errorText = `[Shusto Withdrawal Error]\nStatus: ${withdrawErrorDetails.statusCode || 'N/A'}\nMessage: ${withdrawErrorDetails.message}\nURL: ${withdrawErrorDetails.targetUrl || ''}\nResponse: ${JSON.stringify(withdrawErrorDetails.rawShebaResponse || {})}`;
                  navigator.clipboard.writeText(errorText);
                  setCopiedError(true);
                  setTimeout(() => setCopiedError(false), 2000);
                }}
                className="px-3 py-2 bg-white hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 transition-all shadow-sm"
              >
                {copiedError ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedError ? "কপি হয়েছে!" : "এরর কপি করুন"}</span>
              </button>
              <button
                onClick={() => setWithdrawErrorDetails(null)}
                className="p-2 text-red-400 hover:text-red-700 rounded-xl hover:bg-red-100 transition-all"
                title="বন্ধ করুন"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Success Banner */}
      {withdrawSuccessDetails && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-[32px] p-6 text-emerald-900 shadow-xl shadow-emerald-500/5 animate-in slide-in-from-top-4 duration-300 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-emerald-950">উত্তোলন সফল হয়েছে!</h3>
              <p className="text-sm font-semibold text-emerald-800">{withdrawSuccessDetails}</p>
            </div>
          </div>
          <button
            onClick={() => setWithdrawSuccessDetails(null)}
            className="p-2 text-emerald-500 hover:text-emerald-800 rounded-xl hover:bg-emerald-100 transition-all"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card - Main Focus */}
        <div className="lg:col-span-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-[48px] p-10 text-white shadow-2xl shadow-sky-500/30 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/20">
                <WalletIcon size={28} />
              </div>
              <div className="px-5 py-2 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center gap-3">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center p-1">
                  <img src="https://i.postimg.cc/HWMYLkGG/Image.jpg" alt="S" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-black tracking-widest uppercase">Shusto Gold</span>
              </div>
            </div>
            
            <div className="space-y-1 mb-10">
              <p className="text-sky-100 text-sm font-medium tracking-wide">Current Wallet Balance</p>
              <h2 className="text-6xl font-black flex items-baseline gap-2">
                <span className="text-3xl opacity-80">৳</span>
                {balance === null ? <span className="animate-pulse opacity-70">---</span> : balance.toLocaleString()}
              </h2>
            </div>

            <div className="flex flex-wrap gap-4">
              {user?.role === 'user' ? (
                <button
                  onClick={() => setShowAddMoney(true)}
                  className="flex items-center gap-3 px-8 py-4 bg-white text-blue-600 font-black rounded-3xl hover:bg-sky-50 transition-all active:scale-95 shadow-xl shadow-blue-900/10"
                >
                  <Plus size={20} strokeWidth={3} />
                  Add Money
                </button>
              ) : (
                <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 text-xs font-bold text-sky-100 flex items-center gap-2">
                  <span>⚠️ শুধুমাত্র পেশেন্টরা সরাসরি টাকা যোগ করতে পারেন</span>
                </div>
              )}
              <button
                onClick={() => setShowWithdraw(true)}
                className="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-3xl backdrop-blur-md transition-all border border-white/20 active:scale-95"
              >
                <CreditCard size={20} />
                Withdraw
              </button>
            </div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl group-hover:bg-blue-300/30 transition-colors duration-500" />
        </div>

        {/* Status / Quick Actions */}
        <div className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">সার্ভিস প্যানেল</h3>
            <p className="text-slate-400 text-sm font-medium mb-8">দ্রুত লেনদেন এবং হিস্ট্রি দেখুন</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowWithdraw(true)}
              className="p-6 bg-sky-50 hover:bg-sky-100 rounded-[32px] flex flex-col items-center gap-3 transition-all group active:scale-95"
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <ArrowUpRight className="text-sky-500" size={24} />
              </div>
              <span className="text-sm font-black text-sky-600">উইথড্র</span>
            </button>
            
            <button
              className="p-6 bg-slate-50 hover:bg-slate-100 rounded-[32px] flex flex-col items-center gap-3 transition-all group active:scale-95"
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <History className="text-slate-600" size={24} />
              </div>
              <span className="text-sm font-black text-slate-600">হিস্ট্রি</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            Recent Transactions
          </h2>
          <button className="text-sky-600 font-bold text-sm hover:underline">
            View All
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => {
              // Income (+) for user: topup/deposit, doctor earning, platform/service fee, commission, refund
              // Expense (-) for user: payment (spending on doctor/services), withdrawal
              const isIncome = 
                tx.type === "add_money" || 
                tx.type === "appointment_earning" ||
                (tx.type as string) === "doctor_earning" ||
                (tx.type as string) === "earning" ||
                tx.type === "service_fee" || 
                (tx.type as string) === "platform_fee" ||
                (tx.type as string) === "affiliate_commission" ||
                (tx.type as string) === "refund" ||
                (tx.type as string) === "deposit" ||
                tx.details?.toLowerCase().includes("topup") ||
                tx.details?.toLowerCase().includes("earning") ||
                tx.details?.toLowerCase().includes("profit") ||
                tx.details?.toLowerCase().includes("commission");

              const isExpense = 
                tx.type === "payment" || 
                tx.type === "withdrawal" ||
                (tx.type as string) === "doctor_payout" ||
                (tx.type as string) === "payout";

              const finalIsIncome = isIncome && !isExpense;

              return (
                <div
                  key={tx.id}
                  className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        finalIsIncome
                          ? "bg-sky-100 text-sky-600"
                          : "bg-rose-100 text-rose-600",
                      )}
                    >
                      {finalIsIncome ? (
                        <ArrowDownLeft size={24} />
                      ) : (
                        <ArrowUpRight size={24} />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 capitalize">
                        {tx.type === "service_fee" || (tx.type as string) === "platform_fee"
                          ? "Platform Fee"
                          : tx.type === "appointment_earning" || (tx.type as string) === "doctor_earning"
                          ? "Doctor Consultation Earning"
                          : tx.type === "payment"
                          ? "Appointment Payment"
                          : tx.type.replace("_", " ")}
                      </p>
                      <p className="text-sm text-slate-400">
                        {tx.details || (tx.targetName ? `To/From: ${tx.targetName}` : (tx.type === "add_money" ? "Wallet Topup" : "Transaction"))}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-lg font-bold tracking-tight",
                        finalIsIncome
                          ? "text-sky-600"
                          : "text-rose-600",
                      )}
                    >
                      {finalIsIncome ? "+" : "-"}৳{tx.amount}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                        tx.status === "success"
                          ? "bg-sky-100 text-sky-600"
                          : "bg-amber-100 text-amber-600",
                      )}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              টাকা যোগ করুন
            </h2>
            <p className="text-slate-500 mb-8">
              আপনার Shusto ওয়ালেটে কত টাকা যোগ করতে চান?
            </p>

            <div className="space-y-6">
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                  ৳
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-6 py-5 bg-slate-50 border-none rounded-3xl text-2xl font-bold focus:ring-2 focus:ring-sky-500/20"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[500, 1000, 2000].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition-all"
                  >
                    +৳{val}
                  </button>
                ))}
              </div>

              {typeof window !== 'undefined' && window.self !== window.top && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 text-xs text-amber-700 leading-relaxed shadow-sm">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                    <span>⚠️</span> আপনি প্রিভিউ ফ্রেমের ভেতরে আছেন!
                  </p>
                  পেমেন্ট গেটওয়ে রিডাইরেক্ট সাধারণত iframe-এর মধ্যে সিকিউরিটি কারণে ব্লক করা থাকে। দয়া করে অ্যাপটি <strong>"Open in new tab"</strong> বা নতুন ডোমেইনে ব্রাউজ করে ট্রাই করুন, তাহলে পেমেন্ট পেজটি লোড হবে।
                </div>
              )}

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowAddMoney(false);
                    setAmount("");
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => handleAddMoney(false)}
                  disabled={processing}
                  className={cn(
                    "flex-1 py-4 text-white font-bold rounded-2xl transition-all shadow-lg",
                    processing ? "bg-slate-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600 shadow-sky-500/20"
                  )}
                >
                  {processing ? "প্রসেস হচ্ছে..." : "এগিয়ে যান"}
                </button>
              </div>

              {/* Removed Mock Recharge button as requested */}
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
            {/* Header background accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-sky-500" />
            
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              টাকা উত্তোলন (Withdraw)
            </h2>
            <p className="text-slate-500 mb-8">
              অফিসিয়াল সেবা (Sheba) গেটওয়ের মাধ্যমে টাকা উত্তোলন করুন।
            </p>

            <div className="space-y-6">
              <div className="bg-sky-50 border-2 border-sky-500/20 p-5 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-sky-600 font-bold text-lg leading-tight">Sheba (সেবা)</p>
                  <p className="text-sky-400 text-xs font-semibold">অফিসিয়াল পেমেন্ট গেটওয়ে</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10 overflow-hidden">
                  <img 
                    src="https://i.postimg.cc/8cpNgrfB/Untitled-design-3.png" 
                    alt="Sheba Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 px-1">
                  পরিমাণ (Amount)
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 border-none rounded-[24px] text-2xl font-bold focus:ring-4 focus:ring-sky-500/10 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 px-1">
                  সেবা আইডি / নম্বর (Sheba ID/Phone)
                </label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[24px] text-lg font-bold focus:ring-4 focus:ring-sky-500/10 transition-all"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              {/* In-Modal Error Warning */}
              {withdrawErrorDetails && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-950">
                    <AlertCircle size={18} className="text-red-600 shrink-0" />
                    <span>উত্তোলনে সমস্যা হয়েছে {withdrawErrorDetails.statusCode ? `(${withdrawErrorDetails.statusCode})` : ''}</span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed pl-6">
                    {withdrawErrorDetails.message}
                  </p>
                </div>
              )}

              <div className="flex gap-4 mt-8 pt-2">
                <button
                  onClick={() => {
                    setShowWithdraw(false);
                    setAmount("");
                    setPhoneNumber("");
                  }}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-[24px] hover:bg-slate-200 transition-all active:scale-[0.98]"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => handleWithdraw(false)}
                  disabled={processing}
                  className="flex-1 py-5 bg-sky-500 text-white font-bold rounded-[24px] hover:bg-sky-600 transition-all shadow-xl shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>প্রসেসিং...</span>
                    </>
                  ) : "সাবমিট করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      {creditSuccessMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-50 text-center relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-950 mb-3">
              পেমেন্ট সফল!
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed font-semibold">
              {creditSuccessMsg}
            </p>
            <button
              onClick={() => setCreditSuccessMsg(null)}
              className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
            >
              ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
