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
} from "lucide-react";
import { cn } from "../lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: "payment" | "add_money" | "withdrawal" | "service_fee";
  status: "pending" | "success" | "failed";
  details?: string;
  createdAt: string;
}

export function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [amount, setAmount] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<"sheba">(
    "sheba",
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processing, setProcessing] = useState(false);
  const [creditSuccessMsg, setCreditSuccessMsg] = useState<string | null>(null);

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

        setLoading(true); // Show spinner while we guarantee the credit is synced
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
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      } else {
        setBalance(0);
      }
    }, (error) => {
      console.error("Wallet DB Error:", error);
      alert("ডেটাবেস এর সাথে কানেক্ট করতে সমস্যা হচ্ছে (হয়তো কোটা শেষ)। আপনার ব্যালেন্স সাময়িকভাবে দেখা যাচ্ছে না।");
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
      setTransactions(
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
      setLoading(false);
    }, (error) => {
      console.error("Transactions DB Error:", error);
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
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      alert("সঠিক পরিমাণ লিখুন।");
      return;
    }
    if (Number(amount) > balance) {
      alert("আপনার পর্যাপ্ত ব্যালেন্স নেই।");
      return;
    }
    if (!phoneNumber || phoneNumber.length < 11) {
      alert("সঠিক মোবাইল নম্বর লিখুন।");
      return;
    }

    setProcessing(true);
    try {
      // 1. First, perform a Firestore transaction to deduct balance and record transaction
      // This ensures "User Balance Update -> serviceProviders balance update -> transactions table record"
      const walletRef = doc(db, "wallets", user!.uid);
      const txRef = doc(collection(db, "transactions"));
      const notifRef = doc(collection(db, "notifications"));

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Wallet not found");
        
        const currentBalance = walletDoc.data().balance || 0;
        if (currentBalance < Number(amount)) throw new Error("Insufficient balance");

        // Update Wallet Balance
        transaction.update(walletRef, {
          balance: currentBalance - Number(amount),
          updatedAt: new Date().toISOString()
        });

        // Record Withdrawal Transaction
        transaction.set(txRef, {
          userId: user!.uid,
          amount: Number(amount),
          type: "withdrawal",
          status: "pending", // Mark as pending until API succeeds
          details: `Withdrawal to Sheba ID: ${phoneNumber}`,
          createdAt: new Date().toISOString()
        });

        // Add Notification
        transaction.set(notifRef, {
          userId: user!.uid,
          title: "Withdrawal Requested",
          message: `Your withdrawal of ৳${amount} is being processed.`,
          type: "wallet",
          read: false,
          createdAt: new Date().toISOString()
        });
      });

      // 2. Call the server API proxy which calls Sheba external API
      const response = await fetch(getApiUrl("/api/sheba/withdraw"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          amount: Number(amount),
          phone: phoneNumber,
          bankName: "Sheba Wallet"
        }),
      });

      let responseData;
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { error: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server returned ${response.status}`);
      }

      if (responseData.success) {
        // Update transaction status to success
        await setDoc(txRef, { status: "success" }, { merge: true });
        
        alert(responseData.message || "আপনার টাকা সফলভাবে পাঠানো হয়েছে।");
        setShowWithdraw(false);
        setAmount("");
        setPhoneNumber("");
      } else {
        // Detailed error for debugging
        const errorDetail = responseData.error || responseData.message || "অজানা সমস্যা";
        throw new Error(errorDetail);
      }
    } catch (error: any) {
      console.error("Withdrawal Error:", error);
      // Show exactly what went wrong
      alert("উত্তোলন ব্যর্থ হয়েছে!\nকারণ: " + error.message);
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
                {balance.toLocaleString()}
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
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      tx.type === "add_money" || tx.type === "payment"
                        ? "bg-sky-100 text-sky-600"
                        : tx.type === "withdrawal"
                        ? "bg-sky-50 text-sky-500"
                        : "bg-rose-100 text-rose-600",
                    )}
                  >
                    {tx.type === "add_money" || tx.type === "payment" ? (
                      <ArrowDownLeft size={24} />
                    ) : (
                      <ArrowUpRight size={24} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 capitalize">
                      {tx.type === "service_fee" ? "Shusto Service Fee" : tx.type.replace("_", " ")}
                    </p>
                    <p className="text-sm text-slate-400">
                      {tx.details || (tx.type === "add_money" ? "Wallet Topup" : "Transaction")}
                    </p>
                    <p className="text-[10px] text-slate-300">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-bold text-lg",
                      tx.type === "add_money" || tx.type === "payment"
                        ? "text-sky-600"
                        : "text-rose-600",
                    )}
                  >
                    {tx.type === "add_money" || tx.type === "payment" ? "+" : "-"}৳{tx.amount}
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
            ))
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
