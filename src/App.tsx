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
import { AlertCircle, Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [incomingCall, setIncomingCall] = useState<{ id: string; channel: string; doctorId: string; doctorName?: string } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => localStorage.getItem('hasSeenWelcome') === 'true');

  useEffect(() => {
    const handleSwitchTab = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switchTab', handleSwitchTab);
    return () => window.removeEventListener('switchTab', handleSwitchTab);
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'user') return;

    // Listen for incoming calls for patients
    const q = query(
      collection(db, 'callSessions'),
      where('patientId', '==', user.uid),
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("[App] Incoming call snapshot received. Empty?", snapshot.empty);
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data();
        console.log("[App] Call data received:", callData);
        setIncomingCall({ 
          id: snapshot.docs[0].id,
          channel: callData.channelName, 
          doctorId: callData.doctorId,
          doctorName: callData.doctorName 
        });
      } else {
        setIncomingCall(null);
        setCallAccepted(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

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

  if (incomingCall && callAccepted) {
    return (
      <VideoCall 
        channelName={incomingCall.channel} 
        role="host" 
        onEnd={async () => {
          setIncomingCall(null);
          setCallAccepted(false);
          // Update session status to ended
          try {
            await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'ended' });
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
      
      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && !callAccepted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-sm bg-slate-900 text-white rounded-[32px] p-8 shadow-2xl border border-slate-700/50 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-sky-500 rounded-full flex items-center justify-center animate-bounce mb-6">
                <Phone size={48} className="text-white" />
              </div>
              <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-2">ইনকামিং কল</p>
              <h3 className="text-2xl font-bold mb-6">Dr. {incomingCall.doctorName || 'Consultant'}</h3>
              <p className="text-slate-400 mb-8">ডাক্তার আপনার সাথে কথা বলতে চান। কলটি ধরুন এবং ভিডিও কলে সংযুক্ত হোন।</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'declined' });
                  } catch (e) {
                    console.error(e);
                  }
                  setIncomingCall(null);
                }}
                className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-all"
              >
                বাতিল
              </button>
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'callSessions', incomingCall.id), { status: 'active' });
                    setCallAccepted(true);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex-1 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
              >
                কল ধরুন
              </button>
            </div>
          </motion.div>
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
