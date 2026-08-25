import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MedicineStore } from './components/MedicineStore';
import { Prescriptions } from './components/Prescriptions';
import { DoctorDirectory } from './components/DoctorDirectory';
import { LabTests } from './components/LabTests';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PharmacyDashboard } from './components/PharmacyDashboard';
import { PhysioDashboard } from './components/PhysioDashboard';
import { HospitalDashboard } from './components/HospitalDashboard';
import { AmbulanceDashboard } from './components/AmbulanceDashboard';
import { LabDashboard } from './components/LabDashboard';
import { InvestorDashboard } from './components/InvestorDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { StateDashboard } from './components/StateDashboard';
import { ServiceDirectory } from './components/ServiceDirectory';
import { GenericProviderDashboard } from './components/GenericProviderDashboard';
import { Wallet } from './components/Wallet';
import { Profile } from './components/Profile';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { VideoCall } from './components/VideoCall';
import { MyOrders } from './components/MyOrders';
import { Messages } from './components/Messages';
import { BottomNav } from './components/BottomNav';
import { Welcome } from './components/Welcome';
import { ShopRegistration } from './components/ShopRegistration';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AlertCircle, Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  startIncomingCallAlert, 
  stopIncomingCallAlert, 
  requestCallNotificationPermission,
  showAppNotification
} from './utils/callNotification';

function AppContent() {
  const { user, loading, error } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment')) {
      return 'wallet';
    }
    return 'dashboard';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ 
    id: string; 
    channel: string; 
    doctorId: string; 
    doctorName?: string;
    appointmentId?: string;
  } | null>(null);
  const [activeCallSession, setActiveCallSession] = useState<{
    id: string;
    channel: string;
    doctorId: string;
    doctorName?: string;
    appointmentId?: string;
  } | null>(null);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => localStorage.getItem('hasSeenWelcome') === 'true');

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleSwitchTab);
    return () => window.removeEventListener('switchTab', handleSwitchTab);
  }, []);

  // Request browser push notification permission on login/mount
  useEffect(() => {
    if (user) {
      requestCallNotificationPermission().catch(() => {});
    }
  }, [user]);

  // Listen for incoming calls for patients
  useEffect(() => {
    if (!user || user.role !== 'user') return;

    const q = query(
      collection(db, 'callSessions'),
      where('patientId', '==', user.uid),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();
        const callObj = { 
          id: callDoc.id,
          channel: callData.channelName, 
          doctorId: callData.doctorId,
          doctorName: callData.doctorName,
          appointmentId: callData.appointmentId
        };
        setIncomingCall(callObj);
        startIncomingCallAlert(callData.doctorName);
      } else {
        setIncomingCall(null);
        stopIncomingCallAlert();
      }
    }, (err) => {
      console.error("[App] Incoming call snapshot error:", err);
    });

    return () => {
      unsubscribe();
      stopIncomingCallAlert();
    };
  }, [user]);

  // 1. Patient Notification: "Doctor Accepted your Appointment!"
  const initialPatientApptsLoaded = React.useRef(false);
  const knownConfirmedApptIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== 'user') return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialPatientApptsLoaded.current) {
        // Record existing confirmed appointments on initial load
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'confirmed') {
            knownConfirmedApptIds.current.add(docSnap.id);
          }
        });
        initialPatientApptsLoaded.current = true;
        return;
      }

      // Check doc changes for new confirmation
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const apptId = change.doc.id;

        if (data.status === 'confirmed' && !knownConfirmedApptIds.current.has(apptId)) {
          knownConfirmedApptIds.current.add(apptId);

          const docName = data.doctorName ? `Dr. ${data.doctorName}` : 'ডাক্তার';
          showAppNotification({
            title: '🎉 Doctor Accepted your Appointment!',
            body: `${docName} আপনার অ্যাপয়েন্টমেন্ট গ্রহণ করেছেন! ভিডিও কলের জন্য প্রস্তুত থাকুন।`,
            tag: `appt-confirmed-${apptId}`
          });
        }
      });
    }, (err) => {
      console.warn("Patient appointments notification listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Doctor Notification: "New Appointment Request!"
  const initialDoctorApptsLoaded = React.useRef(false);
  const knownPendingApptIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== 'doctor') return;

    const q = query(
      collection(db, 'appointments'),
      where('targetId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialDoctorApptsLoaded.current) {
        snapshot.docs.forEach((docSnap) => {
          knownPendingApptIds.current.add(docSnap.id);
        });
        initialDoctorApptsLoaded.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const apptId = change.doc.id;

          if (!knownPendingApptIds.current.has(apptId) && data.status === 'pending') {
            knownPendingApptIds.current.add(apptId);

            const patientName = data.userName || 'একজন রোগী';
            showAppNotification({
              title: '📋 New Appointment Request!',
              body: `${patientName} নতুন অ্যাপয়েন্টমেন্ট বুকিং অনুরোধ পাঠিয়েছেন। কনফার্ম করতে ক্লিক করুন।`,
              tag: `appt-new-${apptId}`
            });
          }
        }
      });
    }, (err) => {
      console.warn("Doctor appointments notification listener error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to active call session status to gracefully exit if doctor ends the call
  useEffect(() => {
    if (!activeCallSession) return;

    const unsubDoc = onSnapshot(doc(db, 'callSessions', activeCallSession.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'ended' || data.status === 'declined') {
          setActiveCallSession(null);
        }
      } else {
        setActiveCallSession(null);
      }
    }, (err) => {
      console.error("[App] Active call session listener error:", err);
    });

    return () => unsubDoc();
  }, [activeCallSession]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const callToJoin = { ...incomingCall };
    stopIncomingCallAlert();
    setIncomingCall(null);
    setActiveCallSession(callToJoin);

    try {
      await updateDoc(doc(db, 'callSessions', callToJoin.id), { 
        status: 'active',
        patientJoinedCall: true,
        joinedAt: new Date().toISOString()
      });

      if (callToJoin.appointmentId) {
        await updateDoc(doc(db, 'appointments', callToJoin.appointmentId), { 
          patientJoinedCall: true 
        });
      }
    } catch (e) {
      console.error("Error updating call session to active:", e);
    }
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    const callId = incomingCall.id;
    stopIncomingCallAlert();
    setIncomingCall(null);

    try {
      await updateDoc(doc(db, 'callSessions', callId), { 
        status: 'declined',
        declinedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error declining call session:", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Shusto App লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">সংযোগ সমস্যা</h2>
        <p className="text-slate-500 mb-6 max-w-xs">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20"
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    );
  }

  if (!hasSeenWelcome) {
    return (
      <Welcome 
        onFinish={() => {
          setHasSeenWelcome(true);
          localStorage.setItem('hasSeenWelcome', 'true');
        }} 
      />
    );
  }

  if (!user) {
    return <Login />;
  }

  // Active Video Call Room for Patient
  if (activeCallSession) {
    return (
      <VideoCall 
        channelName={activeCallSession.channel} 
        role="host" 
        patientId={user.uid}
        patientName={user.displayName || 'Patient'}
        onEnd={async () => {
          const callId = activeCallSession.id;
          setActiveCallSession(null);
          try {
            await updateDoc(doc(db, 'callSessions', callId), { status: 'ended' });
          } catch (e) {
            console.error("Error ending call session:", e);
          }
        }} 
      />
    );
  }

  const renderContent = () => {
    // If not on dashboard, show the selected tab for everyone
    if (activeTab !== 'dashboard') {
      switch (activeTab) {
        case 'profile': return <Profile />;
        case 'messages': return <Messages />;
        case 'orders': return <MyOrders />;
        case 'new-shop': return <ShopRegistration />;
        case 'privacy': return <PrivacyPolicy onBack={() => setActiveTab('dashboard')} />;
        case 'medicine': return <MedicineStore />;
        case 'prescriptions': return <Prescriptions />;
        case 'doctors': return <DoctorDirectory />;
        case 'lab': return <ServiceDirectory type="lab" title="ল্যাব টেস্ট ও সেন্টার" description="আপনার নিকটস্থ ডায়াগনস্টিক সেন্টার খুঁজুন এবং টেস্ট বুক করুন।" />;
        case 'wallet': return <Wallet />;
        case 'physio': return <ServiceDirectory type="physio" title="ফিজিওথেরাপি সেন্টার" description="আপনার সুস্থতার জন্য বিশেষজ্ঞ ফিজিওথেরাপিস্টদের সাথে যোগাযোগ করুন।" />;
        case 'hospital': return <ServiceDirectory type="hospital" title="হাসপাতাল" description="সেরা মানের হাসপাতাল এবং ক্লিনিকাল সেন্টার খুঁজুন।" />;
        case 'ambulance': return <ServiceDirectory type="ambulance" title="অ্যাম্বুলেন্স সার্ভিস" description="জরুরী অ্যাম্বুলেন্স সেবা ২৪/৭ পাওয়া যাচ্ছে।" />;
        case 'nursing': return <ServiceDirectory type="nursing" title="নার্সিং সার্ভিস" description="বিশেষজ্ঞ নার্স ও স্বাস্থ্যকর্মীদের সেবা নিন আপনার ঘরেই।" />;
        case 'nutritionist': return <ServiceDirectory type="nutritionist" title="পুষ্টিবিদ (Nutritionist)" description="বিশেষজ্ঞ পুষ্টিবিদদের পরামর্শ নিন এবং আপনার ডায়েট প্ল্যান তৈরি করুন।" />;
        default: break;
      }
    }

    // Role-based dashboard routing (when activeTab is 'dashboard')
    if (user.role === 'admin') return <AdminDashboard />;
    if (user.role === 'doctor') return <DoctorDashboard />;
    if (user.role === 'pharmacy') return <PharmacyDashboard />;
    if (user.role === 'physio') return <PhysioDashboard />;
    if (user.role === 'hospital') return <HospitalDashboard />;
    if (user.role === 'ambulance') return <AmbulanceDashboard />;
    if (user.role === 'lab') return <LabDashboard />;
    if (user.role === 'nursing') return <GenericProviderDashboard type="nursing" title="নার্সিং ড্যাশবোর্ড" description="আপনার নার্সিং সার্ভিসের অনুরোধ এবং প্রোফাইল ম্যানেজ করুন।" />;
    if (user.role === 'nutritionist') return <GenericProviderDashboard type="nutritionist" title="পুষ্টিবিদ ড্যাশবোর্ড" description="আপনার রোগীদের ডায়েট চার্ট এবং অ্যাপয়েন্টমেন্ট ম্যানেজ করুন।" />;
    if (user.role === 'investor') return <InvestorDashboard />;
    if (user.role === 'manager') return <ManagerDashboard />;
    if (user.role === 'state') return <StateDashboard />;
    
    // Default patient dashboard
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      {/* WhatsApp / Messenger Style Incoming Call Modal Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            {/* Backdrop with ripple glow */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-[40px] p-8 shadow-[0_0_60px_rgba(14,165,233,0.3)] border border-sky-500/30 overflow-hidden"
            >
              {/* Background ambient pulse circles */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

              <div className="flex flex-col items-center text-center relative z-10">
                {/* Pulsing Avatar with Waves */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-sky-500/30 animate-ping duration-1000 scale-125" />
                  <div className="absolute -inset-3 rounded-full bg-sky-500/20 animate-pulse" />
                  <div className="w-24 h-24 bg-gradient-to-tr from-sky-600 to-cyan-400 rounded-full flex items-center justify-center shadow-xl relative z-10 border-4 border-slate-900">
                    <Video size={42} className="text-white animate-pulse" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-slate-900 rounded-full z-20" />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full mb-3">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <p className="text-sky-400 text-[11px] font-bold uppercase tracking-widest">ইনকামিং ভিডিও কল...</p>
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white mb-1">
                  Dr. {incomingCall.doctorName || 'Consultant'}
                </h3>
                <p className="text-slate-400 text-sm font-medium mb-8">
                  ডাক্তার আপনার সাথে ভিডিও কনসালটেশনে কথা বলতে চাচ্ছেন
                </p>

                {/* Call Action Buttons */}
                <div className="flex items-center justify-between gap-6 w-full px-2">
                  {/* Decline Button */}
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={handleDeclineCall}
                      className="w-16 h-16 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
                      title="কেটে দিন"
                    >
                      <PhoneOff size={28} />
                    </button>
                    <span className="text-xs font-semibold text-rose-300">কেটে দিন</span>
                  </div>

                  {/* Accept Button */}
                  <div className="flex flex-col items-center gap-2">
                    <button 
                      onClick={handleAcceptCall}
                      className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-110 active:scale-95 transition-all animate-bounce"
                      title="কল ধরুন"
                    >
                      <Phone size={28} className="animate-pulse" />
                    </button>
                    <span className="text-xs font-bold text-emerald-400">কল রিসিভ করুন</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 lg:ml-72 p-4 md:p-8 lg:p-12 pb-32 lg:pb-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onMenuClick={() => setIsSidebarOpen(true)} 
      />
    </div>
  );
}

export default function App() {
  const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';

  useEffect(() => {
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const referralUID = params.get('ref');
    if (referralUID) {
      sessionStorage.setItem('shusto_referral', referralUID);
    }
  }, []);

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </APIProvider>
  );
}
