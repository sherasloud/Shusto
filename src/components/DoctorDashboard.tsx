import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc, setDoc, increment, limit, getDocs, orderBy, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Calendar, Clock, User, Video, CheckCircle, XCircle, FileText, Plus, Trash2, CreditCard, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { VideoCall } from './VideoCall';
import { useToast } from './Toast';
import { Wallet } from './Wallet';

interface Appointment {
  id: string;
  userId: string;
  userName: string;
  date: string;
  status: string;
}

interface PrescriptionItem {
  medicine: string;
  dosage: string;
  duration: string;
}

export function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const prevAppointmentsRef = useRef<Appointment[]>([]);
  const { addToast, ToastContainer } = useToast();
  const [activeCall, setActiveCall] = useState<{ id: string; channel: string; patientId: string; appointmentId: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, today: 0, completed: 0 });
  const [writingPrescription, setWritingPrescription] = useState<Appointment | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState<{ sessionId: string; appointmentId: string } | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([{ medicine: '', dosage: '', duration: '' }]);
  const [savingPrescription, setSavingPrescription] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'doctor') return;
    
    // Find doctor profile by matching email (most reliable for linked accounts) or userId
    const qByEmail = query(collection(db, 'doctors'), where('email', '==', user.email));
    
    const unsub = onSnapshot(qByEmail, (snap) => {
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setIsOnline(docData.isOnline || false);
        
        // Auto-fix: if userId is missing in the doctors collection, add it
        if (!docData.userId && user.uid) {
          updateDoc(doc(db, 'doctors', snap.docs[0].id), { userId: user.uid }).catch(console.error);
        }
      } else {
        // Falling back to search by userId if email doesn't match
        const qByUid = query(collection(db, 'doctors'), where('userId', '==', user.uid));
        getDocs(qByUid).then(uidSnap => {
          if (!uidSnap.empty) {
             const docData = uidSnap.docs[0].data();
             setIsOnline(docData.isOnline || false);
          }
        });
      }
    });

    return () => unsub();
  }, [user]);

  const toggleOnlineStatus = async () => {
    if (!user || togglingOnline) return;
    setTogglingOnline(true);
    try {
      // Find the doctor doc again to be safe
      let snap = await getDocs(query(collection(db, 'doctors'), where('email', '==', user.email)));
      if (snap.empty) {
        snap = await getDocs(query(collection(db, 'doctors'), where('userId', '==', user.uid)));
      }

      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, 'doctors', docId), {
          isOnline: !isOnline,
          userId: user.uid 
        });
      } else {
        console.warn("Doctor record not found for toggle");
      }
    } catch (e) {
      console.error("Error toggling online status:", e);
    } finally {
      setTogglingOnline(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const appointmentsRef = collection(db, 'appointments');
    const qApp = query(appointmentsRef, where('targetId', '==', user.uid), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(qApp, (snapshot) => {
      const list: Appointment[] = [];
      let todayCount = 0;
      let completedCount = 0;
      const today = new Date().toISOString().split('T')[0];

      snapshot.forEach((doc) => {
        const data = doc.data() as Appointment;
        list.push({ id: doc.id, ...data });
        if (data.date.startsWith(today)) todayCount++;
        if (data.status === 'completed') completedCount++;
      });
      
      // Check for new appointments
      if (prevAppointmentsRef.current.length > 0 && list.length > prevAppointmentsRef.current.length) {
        addToast("নতুন অ্যাপয়েন্টমেন্ট বুক করা হয়েছে!");
      }
      prevAppointmentsRef.current = list;
      
      setAppointments(list);
      setStats({ total: list.length, today: todayCount, completed: completedCount });
    });

    return () => unsubscribe();
  }, [user]);

  const [balance, setBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"sheba">("sheba");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const walletRef = doc(db, 'wallets', user.uid);
    const unsubscribe = onSnapshot(walletRef, (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const docRef = doc(db, 'appointments', id);
      if (status === 'completed') {
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          if (!docSnap.exists()) throw new Error("Document does not exist!");
          const data = docSnap.data();
          if (data.status === 'completed') return;

          const price = data.fee || 0;
          if (price > 0) {
            const commissionRate = 0.10;
            const commission = price * commissionRate;
            const doctorShare = price - commission;

            const drWalletRef = doc(db, 'wallets', user.uid);
            const drWalletSnap = await transaction.get(drWalletRef);
            const currentBalance = drWalletSnap.exists() ? drWalletSnap.data().balance || 0 : 0;

            transaction.update(docRef, { 
              status: 'completed',
              completedAt: new Date().toISOString(),
              commission,
              doctorShare
            });

            transaction.set(drWalletRef, {
              uid: user.uid,
              balance: currentBalance + doctorShare,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            const txPaymentRef = doc(collection(db, 'transactions'));
            transaction.set(txPaymentRef, {
              userId: user.uid,
              amount: price,
              type: 'payment',
              status: 'success',
              details: `Payment for Appointment (ID: ${id})`,
              appointmentId: id,
              createdAt: new Date().toISOString()
            });

            const txFeeRef = doc(collection(db, 'transactions'));
            transaction.set(txFeeRef, {
              userId: user.uid,
              amount: commission,
              type: 'service_fee',
              status: 'success',
              details: `Shusto Service Fee (10%) for Appointment ${id}`,
              appointmentId: id,
              createdAt: new Date().toISOString()
            });

            const commRef = doc(collection(db, 'commissions'));
            transaction.set(commRef, {
              orderId: id,
              amount: commission,
              providerId: user.uid,
              providerType: 'doctor',
              createdAt: new Date().toISOString()
            });
          } else {
            transaction.update(docRef, { status: 'completed' });
          }
        });
        addToast("অ্যাপয়েন্টমেন্ট সম্পন্ন হয়েছে এবং ব্যালেন্স যোগ হয়েছে!");
      } else {
        await updateDoc(docRef, { status });
      }
    } catch (e) {
      console.error(e);
      addToast("ত্রুটি হয়েছে।");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      alert("সঠিক পরিমাণ লিখুন।");
      return;
    }
    if (Number(withdrawAmount) > balance) {
      alert("আপনার পর্যাপ্ত ব্যালেন্স নেই।");
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 11) {
      alert("সঠিক মোবাইল নম্বর লিখুন।");
      return;
    }

    setIsWithdrawing(true);
    try {
      await fetch('/api/withdraw/automatic', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          amount: Number(withdrawAmount),
          method: withdrawMethod,
          phoneNumber: withdrawPhone,
        }),
      });

      await addDoc(collection(db, 'withdrawRequests'), {
        userId: user.uid,
        userName: user.displayName,
        amount: Number(withdrawAmount),
        method: withdrawMethod,
        phoneNumber: withdrawPhone,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      await runTransaction(db, async (tx) => {
        const walletRef = doc(db, 'wallets', user.uid);
        const snap = await tx.get(walletRef);
        const current = snap.exists() ? snap.data().balance || 0 : 0;
        tx.update(walletRef, { balance: current - Number(withdrawAmount) });
      });

      alert("আপনার টাকা উত্তোলনের অনুরোধ সফলভাবে গ্রহণ করা হয়েছে।");
      setShowWithdraw(false);
      setWithdrawAmount("");
    } catch (error) {
      console.error(error);
      alert("টাকা উত্তোলন করতে সমস্যা হয়েছে।");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const startCall = async (appointment: Appointment) => {
    console.log("Starting call for:", appointment);
    const channelName = `call_${user?.uid}_${appointment.userId}`;
    
    try {
      const sessionRef = await addDoc(collection(db, 'callSessions'), {
        channelName,
        doctorId: user?.uid,
        doctorName: user?.displayName,
        patientId: appointment.userId,
        patientName: appointment.userName,
        status: 'waiting',
        createdAt: new Date().toISOString()
      });
      console.log("Call session created with ID:", sessionRef.id);
      setActiveCall({ id: sessionRef.id, channel: channelName, patientId: appointment.userId, appointmentId: appointment.id });
    } catch (e) {
      console.error("Error creating call session:", e);
      alert("Failed to start call. Please try again.");
    }
  };

  const endCall = async () => {
    if (activeCall) {
      const { id, appointmentId } = activeCall;
      setActiveCall(null);
      setShowResolutionModal({ sessionId: id, appointmentId });
    }
  };

  const handleResolveAppointment = async (confirmed: boolean) => {
    if (!showResolutionModal || !user) return;
    
    const { sessionId, appointmentId } = showResolutionModal;
    
    try {
      if (confirmed) {
        // Use updateStatus with 'completed' to trigger commission logic
        await updateStatus(appointmentId, 'completed');
      }
      await updateDoc(doc(db, 'callSessions', sessionId), { status: 'ended' });
    } catch (e) {
      console.error(e);
      alert("Failed to process appointment completion.");
    }
    
    setShowResolutionModal(null);
  };

  const handleSavePrescription = async () => {
    if (!writingPrescription || !user) return;
    setSavingPrescription(true);
    try {
      await addDoc(collection(db, 'prescriptions'), {
        userId: writingPrescription.userId,
        userName: writingPrescription.userName,
        doctorId: user.uid,
        doctorName: user.displayName,
        specialty: (user as any).specialty || 'Specialist',
        date: new Date().toISOString(),
        items: prescriptionItems.filter(item => item.medicine),
        status: 'Active'
      });
      setWritingPrescription(null);
      setPrescriptionItems([{ medicine: '', dosage: '', duration: '' }]);
    } catch (error) {
      console.error("Error saving prescription:", error);
    } finally {
      setSavingPrescription(false);
    }
  };

  const addPrescriptionItem = () => {
    setPrescriptionItems([...prescriptionItems, { medicine: '', dosage: '', duration: '' }]);
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...prescriptionItems];
    newItems[index][field] = value;
    setPrescriptionItems(newItems);
  };

  if (activeCall) {
    return (
      <VideoCall 
        channelName={activeCall.channel} 
        role="host" 
        onEnd={endCall} 
        patientId={activeCall.patientId}
        patientName={appointments.find(a => a.userId === activeCall.patientId)?.userName || 'Patient'}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ডাক্তার প্যানেল</h1>
          <p className="text-slate-500">আপনার রোগী এবং পরামর্শগুলো পরিচালনা করুন।</p>
        </div>
        
        <button 
          onClick={toggleOnlineStatus}
          disabled={togglingOnline}
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all font-bold disabled:opacity-50",
            isOnline 
              ? "bg-sky-50 border-sky-200 text-sky-600 shadow-lg shadow-sky-500/10" 
              : "bg-slate-50 border-slate-200 text-slate-400"
          )}
        >
          <div className={cn(
            "w-3 h-3 rounded-full",
            isOnline ? "bg-sky-500 animate-pulse" : "bg-slate-300"
          )} />
          {togglingOnline ? 'প্রসেসিং...' : (isOnline ? 'আপনি এখন Online আছেন' : 'আপনি এখন Offline আছেন')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900">আজকের অ্যাপয়েন্টমেন্ট</h2>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
                আজ কোনো অ্যাপয়েন্টমেন্ট নির্ধারিত নেই।
              </div>
            ) : (
              appointments.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{app.userName || 'রোগী'}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(app.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          app.status === 'confirmed' ? "bg-sky-100 text-sky-600" : 
                          app.status === 'completed' ? "bg-blue-100 text-blue-600" :
                          "bg-amber-100 text-amber-600"
                        )}>
                          {app.status === 'confirmed' ? 'নিশ্চিত' : 
                           app.status === 'completed' ? 'সম্পন্ন' : 
                           'অপেক্ষমান'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(app.id, 'confirmed')} className="p-2 text-sky-600 hover:bg-sky-50 rounded-xl transition-colors">
                          <CheckCircle size={20} />
                        </button>
                      </>
                    )}
                    {app.status === 'confirmed' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startCall(app)}
                          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-600 transition-all"
                        >
                          <Video size={18} />
                          কল শুরু করুন
                        </button>
                        <button 
                          onClick={() => setWritingPrescription(app)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all"
                        >
                          <FileText size={18} />
                          প্রেসক্রিপশন
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'completed')}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          title="Mark as Completed"
                        >
                          <CheckCircle size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">পরিসংখ্যান</h2>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
            <div className="bg-sky-500 p-6 rounded-2xl text-white shadow-lg shadow-sky-500/20 mb-4">
              <p className="text-[10px] font-bold uppercase opacity-80 mb-1">আপনার ব্যালেন্স</p>
              <p className="text-2xl font-black mb-3">৳{balance.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowWalletModal(true)}
                  className="w-full py-2 bg-white text-sky-600 font-bold rounded-xl text-xs hover:bg-sky-50 transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  টাকা যোগ করুন
                </button>
                <button 
                  onClick={() => setShowWithdraw(true)}
                  className="w-full py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-700 transition-all border border-sky-400/50"
                >
                  উইথড্র করুন
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">মোট রোগী</span>
              <span className="font-bold text-slate-900">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">আজকের অ্যাপয়েন্টমেন্ট</span>
              <span className="font-bold text-sky-600">{stats.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">সম্পন্ন হয়েছে</span>
              <span className="font-bold text-blue-600">{stats.completed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
               <CheckCircle size={48} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 leading-tight">আমি পেশেন্টের সমস্যা সমাধান করেছি ✅</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed px-4">আপনার পরামর্শ কি সম্পন্ন হয়েছে? এটি নিশ্চিত করলে অ্যাপয়েন্টমেন্টটি রেকর্ড হিসেবে জমা থাকবে।</p>
            
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleResolveAppointment(true)}
                  className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-600 shadow-xl shadow-sky-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  🆗 কনফার্ম
                </button>
                <button 
                  onClick={() => handleResolveAppointment(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  এখন না
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {writingPrescription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[32px] p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">প্রেসক্রিপশন লিখুন</h2>
                <p className="text-slate-500">রোগী: {writingPrescription.userName}</p>
              </div>
              <button onClick={() => setWritingPrescription(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {prescriptionItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl relative">
                  {prescriptionItems.length > 1 && (
                    <button 
                      onClick={() => removePrescriptionItem(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ঔষধের নাম</label>
                    <input 
                      type="text" 
                      value={item.medicine}
                      onChange={(e) => updatePrescriptionItem(index, 'medicine', e.target.value)}
                      placeholder="Napa Extend"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ডোজ</label>
                    <input 
                      type="text" 
                      value={item.dosage}
                      onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                      placeholder="১+০+১"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">সময়কাল</label>
                    <input 
                      type="text" 
                      value={item.duration}
                      onChange={(e) => updatePrescriptionItem(index, 'duration', e.target.value)}
                      placeholder="৭ দিন"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={addPrescriptionItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-sky-500 hover:text-sky-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                ঔষধ যোগ করুন
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setWritingPrescription(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                বাতিল
              </button>
              <button 
                onClick={handleSavePrescription}
                disabled={savingPrescription}
                className="flex-1 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {savingPrescription ? 'পাঠানো হচ্ছে...' : 'প্রেসক্রিপশন পাঠান'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">টাকা উত্তোলন (Withdraw)</h2>
              <button onClick={() => setShowWithdraw(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-orange-50 border-2 border-orange-500 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-orange-600 font-bold text-lg">Sheba (সেবা)</p>
                  <p className="text-orange-400 text-xs">অফিসিয়াল পেমেন্ট গেটওয়ে</p>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/10 overflow-hidden">
                  <img 
                    src="https://i.postimg.cc/8cpNgrfB/Untitled-design-3.png" 
                    alt="Sheba Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">পরিমাণ (Amount)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xl font-bold focus:ring-2 focus:ring-sky-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">মোবাইল নম্বর (Phone)</label>
                <input
                  type="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-lg font-bold focus:ring-2 focus:ring-sky-500/20"
                  placeholder="01XXXXXXXXX"
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                >
                  {isWithdrawing ? "প্রসেসিং..." : "সাবমিট করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">ওয়ালেট ম্যানেজমেন্ট</h2>
                  <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Shusto Wallet Service</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl flex items-center justify-center transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <Wallet />
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
