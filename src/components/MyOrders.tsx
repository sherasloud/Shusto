import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { collection, query, where, onSnapshot, orderBy, runTransaction, getDocs, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Calendar, Clock, MapPin, MessageCircle, Truck, Building, Activity, FlaskConical, Stethoscope, Filter, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatWindow } from './ChatWindow';
import { VideoCall } from './VideoCall';

export function MyOrders() {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<any[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_my_reqs_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [appointments, setAppointments] = useState<any[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_my_appts_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [productOrders, setProductOrders] = useState<any[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_my_products_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [labOrders, setLabOrders] = useState<any[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_my_labs_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const joinCall = async (appt: any) => {
    try {
      const docRef = doc(db, 'appointments', appt.id);
      await updateDoc(docRef, { patientJoinedCall: true });
    } catch (e) {
      console.error("Error updating patientJoinedCall:", e);
    }
    setActiveChannel(`call_${appt.doctorId}_${user?.uid}`);
  };

  const releasePayment = async (order: any, type: 'request' | 'appointment') => {

    if (!user) return;
    const confirmRelease = window.confirm('আপনি কি এই পেমেন্ট রিলিজ করতে চান? এর পর টাকা প্রোভাইডারের কাছে চলে যাবে।');
    if (!confirmRelease) return;

    setProcessingId(order.id);
    try {
      const q = query(collection(db, 'users'), where('email', '==', 'shustobd@gmail.com'));
      const adminDocs = await getDocs(q);
      const adminId = !adminDocs.empty ? adminDocs.docs[0].id : null;

      await runTransaction(db, async (transaction) => {
        const buyerWalletRef = doc(db, 'wallets', user.uid);
        const buyerWalletSnap = await transaction.get(buyerWalletRef);
        const buyerBalance = buyerWalletSnap.exists() ? buyerWalletSnap.data().balance || 0 : 0;
        
        const price = Number(order.price || order.fee || 0);

        if (price > 0 && buyerBalance < price) {
            throw new Error('insufficient_balance');
        }

        const providerId = type === 'request' ? (order.providerId || order.targetId || order.userId) : order.targetId;

        const feePercentage = 0.10; // 10% Platform fee
        const platformFee = Math.round(price * feePercentage);
        const providerAmount = Math.max(0, price - platformFee);

        if (price > 0) {
            transaction.update(buyerWalletRef, {
                balance: increment(-price),
                updatedAt: new Date().toISOString()
            });
            
            const buyerTxnRef = doc(collection(db, 'transactions'));
            transaction.set(buyerTxnRef, {
                userId: user.uid,
                amount: price,
                type: 'payment',
                status: 'success',
                targetId: order.id,
                targetName: order.providerName || order.doctorName || 'Provider',
                createdAt: new Date().toISOString()
            });

            if (providerId) {
                const providerWalletRef = doc(db, 'wallets', providerId);
                const providerWalletSnap = await transaction.get(providerWalletRef);
                if (!providerWalletSnap.exists()) {
                    transaction.set(providerWalletRef, { uid: providerId, balance: providerAmount, updatedAt: new Date().toISOString() });
                } else {
                    transaction.update(providerWalletRef, {
                        balance: increment(providerAmount),
                        updatedAt: new Date().toISOString()
                    });
                }

                const providerTxnRef = doc(collection(db, 'transactions'));
                transaction.set(providerTxnRef, {
                    userId: providerId,
                    amount: providerAmount,
                    type: 'payment_received',
                    status: 'success',
                    targetId: order.id,
                    targetName: user.displayName || 'Patient',
                    createdAt: new Date().toISOString()
                });
            }

            if (adminId && platformFee > 0) {
                const adminWalletRef = doc(db, 'wallets', adminId);
                const adminWalletSnap = await transaction.get(adminWalletRef);
                if (!adminWalletSnap.exists()) {
                    transaction.set(adminWalletRef, { uid: adminId, balance: platformFee, updatedAt: new Date().toISOString() });
                } else {
                    transaction.update(adminWalletRef, {
                        balance: increment(platformFee),
                        updatedAt: new Date().toISOString()
                    });
                }

                const adminTxnRef = doc(collection(db, 'transactions'));
                transaction.set(adminTxnRef, {
                    userId: adminId,
                    amount: platformFee,
                    type: 'fee_received',
                    status: 'success',
                    targetId: order.id,
                    targetName: `Fee from ${user.displayName || 'Patient'}`,
                    createdAt: new Date().toISOString()
                });
            }
        }

        const collectionName = 
          type === 'appointment' ? 'appointments' : 
          (order.providerType === 'pharmacy' || order._type === 'pharmacy') ? 'orders' : 
          (order.providerType === 'lab' || order._type === 'lab') ? (order.testId || order.serviceType === 'lab' ? 'serviceRequests' : 'labOrders') :
          'serviceRequests';

        const orderRef = doc(db, collectionName, order.id);
        transaction.update(orderRef, {
            status: 'completed',
            paymentStatus: 'released',
            releasedAt: new Date().toISOString()
        });
      });

      alert('পেমেন্ট সফলভাবে রিলিজ হয়েছে।');

    } catch (error: any) {
        console.error('Release payment error:', error);
        if (error.message === 'insufficient_balance') {
            alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
        } else {
            alert('পেমেন্ট রিলিজ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
        }
    } finally {
        setProcessingId(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Service Requests
    const qRequests = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', user.uid)
    );

    const unsubscribeReqs = onSnapshot(qRequests, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setActiveRequests(list);
      try { localStorage.setItem(`cached_my_reqs_${user.uid}`, JSON.stringify(list)); } catch (e) {}
    }, (err) => console.error("Reqs snapshot error:", err));

    // Appointments
    const qAppts = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );

    const unsubscribeAppts = onSnapshot(qAppts, (snapshot) => {
      const appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      appts.sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
      setAppointments(appts);
      try { localStorage.setItem(`cached_my_appts_${user.uid}`, JSON.stringify(appts)); } catch (e) {}
    }, (err) => console.error("Appts snapshot error:", err));

    // Product Orders (Medicine)
    const qProducts = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setProductOrders(list);
      try { localStorage.setItem(`cached_my_products_${user.uid}`, JSON.stringify(list)); } catch (e) {}
    }, (err) => console.error("Products snapshot error:", err));

    // Lab Orders
    const qLabs = query(
      collection(db, 'labOrders'),
      where('userId', '==', user.uid)
    );
    const unsubscribeLabs = onSnapshot(qLabs, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLabOrders(list);
      try { localStorage.setItem(`cached_my_labs_${user.uid}`, JSON.stringify(list)); } catch (e) {}
    }, (err) => console.error("Labs snapshot error:", err));

    // Call Sessions
    // Removed duplicate listener - handled in App.tsx

    return () => {
      unsubscribeReqs();
      unsubscribeAppts();
      unsubscribeProducts();
      unsubscribeLabs();
    };
  }, [user]);

  const getProviderIcon = (type: string) => {
    switch(type) {
      case 'ambulance': return <Truck size={24} />;
      case 'hospital': return <Building size={24} />;
      case 'physio': return <Activity size={24} />;
      case 'lab': return <FlaskConical size={24} />;
      case 'pharmacy': return <Package size={24} />;
      default: return <Package size={24} />;
    }
  };

  const getProviderColor = (type: string) => {
    switch(type) {
      case 'ambulance': return 'bg-rose-50 text-rose-500';
      case 'hospital': return 'bg-sky-50 text-sky-500';
      case 'physio': return 'bg-sky-50 text-sky-500';
      case 'lab': return 'bg-purple-50 text-purple-500';
      case 'pharmacy': return 'bg-indigo-50 text-indigo-500';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const allOrders = [
    ...(filter === 'all' || filter === 'doctor' ? appointments.map(a => ({ ...a, _type: 'appointment', _date: new Date(a.createdAt || a.date || Date.now()).getTime() })) : []),
    ...(filter === 'all' || filter === 'pharmacy' ? productOrders.map(p => ({ ...p, _type: 'pharmacy', _date: new Date(p.createdAt || Date.now()).getTime() })) : []),
    ...(filter === 'all' || filter === 'lab' ? labOrders.map(l => ({ ...l, _type: 'lab', _date: new Date(l.createdAt || Date.now()).getTime() })) : []),
    ...activeRequests
        .filter(r => filter === 'all' || r.providerType === filter)
        .map(r => ({ ...r, _type: 'request', _date: new Date(r.createdAt || Date.now()).getTime() }))
  ].sort((a, b) => b._date - a._date);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">আমার অর্ডার</h1>
        <p className="text-slate-500">আপনার সমস্ত সার্ভিস রিকোয়েস্ট এবং অ্যাপয়েন্টমেন্ট লিস্ট।</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar scroll-smooth">
        {[
          { id: 'all', label: 'সবগুলো', icon: null },
          { id: 'doctor', label: 'ডাক্তার', icon: Stethoscope },
          { id: 'pharmacy', label: 'ফার্মেসি', icon: Package },
          { id: 'lab', label: 'ল্যাব', icon: FlaskConical },
          { id: 'physio', label: 'ফিজিওথেরাপি', icon: Activity },
          { id: 'hospital', label: 'হাসপাতাল', icon: Building },
          { id: 'ambulance', label: 'অ্যাম্বুলেন্স', icon: Truck },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl text-sm transition-all whitespace-nowrap border",
              filter === cat.id 
                ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20" 
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            {cat.icon && <cat.icon size={16} />}
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allOrders.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
            <Package className="mx-auto mb-4 text-slate-300" size={48} />
            <p className="text-xl font-bold text-slate-900 mb-2">কোনো অর্ডার নেই</p>
            <p className="text-slate-500">এই ক্যাটাগরিতে আপনার কোনো অর্ডার বা অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।</p>
          </div>
        ) : (
          allOrders.map((order) => {
            if (order._type === 'appointment') {
              const appt = order;
              return (
              <div key={appt.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Stethoscope size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">ডা. {appt.doctorName}</h3>
                      <p className="text-xs text-slate-400 font-medium">Appt #{appt.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    appt.status === 'confirmed' ? "bg-sky-50 text-sky-600 border-sky-100" : 
                    appt.status === 'completed' ? "bg-sky-50 text-sky-600 border-sky-100" :
                    appt.status === 'cancelled' || appt.status === 'declined' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                    "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                  )}>
                    {appt.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                       <Calendar size={14} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
                       <p className="text-sm font-bold text-slate-700">{new Date(appt.date).toLocaleDateString('bn-BD', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                       <Clock size={14} />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                       <p className="text-sm font-bold text-slate-700">{new Date(appt.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>
                </div>

                 <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Pay</span>
                      <div className="text-xl font-black text-slate-900">৳{appt.fee || 0}</div>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setActiveChat({ id: appt.id, name: appt.doctorName || 'Doctor' })}
                       className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 transition-all shadow-sm"
                     >
                       <MessageCircle size={18} />
                       চ্যাট
                     </button>
                     {appt.status === 'confirmed' && (
                       <button 
                         onClick={() => joinCall(appt)}
                         className="flex items-center gap-2 px-4 py-3 bg-indigo-500 text-white font-bold rounded-2xl hover:bg-indigo-600 transition-all shadow-sm"
                       >
                         <Phone size={18} />
                         ভিডিও কলে যোগ দিন
                       </button>
                     )}
                     {appt.status === 'confirmed' && appt.paymentStatus !== 'released' && (
                       <button 
                         onClick={() => releasePayment(appt, 'appointment')}
                         disabled={processingId === appt.id}
                         className="flex items-center gap-2 px-4 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-sm disabled:opacity-50"
                       >
                         {processingId === appt.id ? 'Processing...' : 'Released'}
                       </button>
                     )}
                   </div>
                 </div>
              </div>
            );
            } else if (order._type === 'pharmacy') {
              const p = order;
              return (
              <div key={p.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Package size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">ফার্মেসি অর্ডার</h3>
                      <p className="text-xs text-slate-400 font-medium">Order #{p.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    p.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                    p.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    p.status === 'cancelled' || p.status === 'declined' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                    "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                  )}>
                    {p.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-col gap-3">
                  <div className="font-medium text-slate-800 text-sm mb-1 leading-relaxed border-b border-slate-200 pb-2">
                     <span className="font-bold text-emerald-600 block mb-1">Items:</span>
                     <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                        {p.items?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                     </ul>
                  </div>
                  {p.createdAt && (
                     <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                       <Clock size={12} />
                       {new Date(p.createdAt).toLocaleString('bn-BD')}
                     </div>
                  )}
                </div>

                 <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Pay</span>
                      <div className="text-xl font-black text-slate-900">৳{p.total || 0}</div>
                   </div>
                   <button 
                     onClick={() => setActiveChat({ id: p.id, name: 'Pharmacy Support' })}
                     className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                   >
                     <MessageCircle size={18} />
                     চ্যাট
                   </button>
                 </div>
              </div>
              );
            } else if (order._type === 'lab') {
              const l = order;
              return (
              <div key={l.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <FlaskConical size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">ল্যাব টেস্ট</h3>
                      <p className="text-xs text-slate-400 font-medium">Order #{l.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    l.status === 'confirmed' ? "bg-purple-50 text-purple-600 border-purple-100" : 
                    l.status === 'completed' ? "bg-purple-50 text-purple-600 border-purple-100" :
                    l.status === 'cancelled' || l.status === 'declined' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                    "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                  )}>
                    {l.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-col gap-3">
                  <div className="font-medium text-slate-800 text-sm mb-1 leading-relaxed border-b border-slate-200 pb-2">
                     <span className="font-bold text-purple-600 block mb-1">Test Details:</span>
                     {l.testName}
                  </div>
                  {l.createdAt && (
                     <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                       <Clock size={12} />
                       {new Date(l.createdAt).toLocaleString('bn-BD')}
                     </div>
                  )}
                </div>

                 <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                   <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Pay</span>
                      <div className="text-xl font-black text-slate-900">৳{l.price || 0}</div>
                   </div>
                   <button 
                     onClick={() => setActiveChat({ id: l.id, name: 'Lab Support' })}
                     className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm"
                   >
                     <MessageCircle size={18} />
                     চ্যাট
                   </button>
                 </div>
              </div>
              );
            } else {
              const req = order;
              const isLab = req.providerType === 'lab' || req.serviceType === 'lab';
              return (
              <div key={req.id} className={cn(
                "bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                isLab && "border-purple-100 bg-purple-50/10"
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      isLab ? "bg-purple-100 text-purple-600" : getProviderColor(req.providerType)
                    )}>
                      {isLab ? <FlaskConical size={24} /> : getProviderIcon(req.providerType)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 capitalize">
                        {isLab ? (req.postTitle || req.details || 'Lab Test') : (req.providerName || req.providerType)}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">Order #{req.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    req.status === 'confirmed' ? "bg-sky-50 text-sky-600 border-sky-100" : 
                    req.status === 'completed' ? "bg-sky-50 text-sky-600 border-sky-100" :
                    req.status === 'cancelled' || req.status === 'declined' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                    "bg-amber-50 text-amber-600 border-amber-100 animate-pulse"
                  )}>
                    {req.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {(req.postTitle || req.details) && (
                    <div className="font-medium text-slate-800 text-sm mb-1 leading-relaxed border-b border-slate-200 pb-2">
                       <span className="font-bold text-sky-600 block mb-1">Service Details:</span>
                       {req.postTitle || req.details}
                    </div>
                  )}
                  {req.pickup && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-sky-500" />
                      <span className="font-bold text-xs uppercase">From:</span>
                      <span className="truncate">{req.pickup}</span>
                    </div>
                  )}
                  {req.destination && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-rose-500" />
                      <span className="font-bold text-xs uppercase">To:</span>
                      <span className="truncate">{req.destination}</span>
                    </div>
                  )}
                  {req.userLocation && !req.pickup && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-slate-400" />
                      <span className="truncate">{req.userLocation}</span>
                    </div>
                  )}
                  
                  {req.createdAt && (
                     <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                       <Clock size={12} />
                       {new Date(req.createdAt).toLocaleString('bn-BD')}
                     </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Pay</span>
                    <div className="text-xl font-black text-slate-900">৳{req.price || 0}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveChat({ id: req.id, name: req.providerName || 'Provider' })}
                      className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-slate-100 text-slate-700 font-bold rounded-2xl hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 transition-all shadow-sm"
                    >
                      <MessageCircle size={18} />
                      চ্যাট
                    </button>
                    {req.status === 'confirmed' && req.paymentStatus !== 'released' && (
                      <button 
                        onClick={() => releasePayment(req, 'request')}
                        disabled={processingId === req.id}
                        className="flex items-center gap-2 px-4 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-sm disabled:opacity-50"
                      >
                        {processingId === req.id ? 'Processing...' : 'Released'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            }
          })
        )}
      </div>

      {activeChat && (
        <ChatWindow 
          orderId={activeChat.id} 
          recipientName={activeChat.name} 
          onClose={() => setActiveChat(null)} 
        />
      )}

      {activeChannel && (
        <VideoCall
          channelName={activeChannel}
          role="audience"
          onEnd={() => setActiveChannel(null)}
          patientId={user?.uid}
          patientName={user?.displayName || 'Patient'}
        />
      )}
    </div>
  );
}
