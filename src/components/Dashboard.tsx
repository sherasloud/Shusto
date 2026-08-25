import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Calendar, 
  Clock, 
  ArrowRight, 
  Activity, 
  Thermometer, 
  Droplets,
  TrendingUp,
  Stethoscope, 
  ChevronRight,
  Video,
  Truck,
  MessageCircle,
  Package,
  MapPin,
  MoreVertical,
  Store,
  Apple,
  Pill,
  Building,
  Heart,
  FlaskConical,
  UserCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { VideoCall } from './VideoCall';
import { ChatWindow } from './ChatWindow';
import { motion, AnimatePresence } from 'motion/react';

export function Dashboard() {
  const { user, forceSync } = useAuth();
  const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await forceSync();
    setSyncing(false);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
        setUpcomingAppointment(list[0]);
      } else {
        setUpcomingAppointment(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Appointments fetch error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setActiveRequests(list);
    }, (err) => console.error("Service requests error:", err));

    return () => unsubscribe();
  }, [user]);

  const stats = [
    { label: 'হার্ট রেট', value: '৭২ bpm', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
    { label: 'শরীরের তাপমাত্রা', value: '৩৬.৬ °C', icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'রক্তচাপ', value: '১২০/৮০', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">ড্যাশবোর্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome back, {((user as any)?.name || user?.displayName || 'User').split(' ')[0]}!</h1>
            <p className="text-slate-500 flex items-center gap-2">
              Here's what's happening with your health today.
              {user?.role === 'user' && (
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs text-sky-600 hover:underline flex items-center gap-1"
                >
                  {syncing ? 'Syncing...' : '(Not a Doctor? Sync Role)'}
                </button>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            <AnimatePresence>
              {showMoreMenu && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMoreMenu(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden"
                  >
                    <button 
                      onClick={() => {
                        // In a real app, this would use the navigation context or a custom hook
                        // For now, we'll assume the user can switch tabs via Sidebar or we can emit an event
                        window.dispatchEvent(new CustomEvent('switchTab', { detail: 'new-shop' }));
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Store size={18} className="text-sky-500" />
                      শপ (Shop)
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-5"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">আমাদের সেবাসমূহ (Our Services)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'doctors', name: 'ডাক্তার', desc: 'বিশেষজ্ঞ কনসালটেশন', icon: Stethoscope, color: 'text-sky-500', bg: 'bg-sky-50' },
            { id: 'medicine', name: 'ওষুধ শপ', desc: 'অনলাইন ফার্মেসি', icon: Pill, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { id: 'nutritionist', name: 'পুষ্টিবিদ', desc: 'ডায়েট প্ল্যান ও পরামর্শ', icon: Apple, color: 'text-rose-500', bg: 'bg-rose-50' },
            { id: 'hospital', name: 'হাসপাতাল', desc: 'সেরা ক্লিনিক ও হাসপাতাল', icon: Building, color: 'text-purple-500', bg: 'bg-purple-50' },
            { id: 'ambulance', name: 'অ্যাম্বুলেন্স', desc: '২৪/৭ জরুরী সেবা', icon: Truck, color: 'text-red-500', bg: 'bg-red-50' },
            { id: 'nursing', name: 'নার্সিং সেবা', desc: 'হোম নার্সিং কেয়ার', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
            { id: 'lab', name: 'ল্যাব টেস্ট', desc: 'ঘরে বসেই টেস্ট', icon: FlaskConical, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { id: 'physio', name: 'ফিজিওথেরাপি', desc: 'বিশেষজ্ঞ থেরাপিস্ট', icon: UserCheck, color: 'text-amber-500', bg: 'bg-amber-50' },
          ].map((srv) => (
            <button
              key={srv.id}
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: srv.id }))}
              className="bg-white p-5 rounded-3xl border border-slate-100 hover:border-sky-200 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between space-y-3 group"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", srv.bg, srv.color)}>
                <srv.icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{srv.name}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{srv.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeRequests.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Truck className="text-sky-500" /> সক্রিয় বুকিং ট্র্যাকিং
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeRequests.map((req) => (
              <div key={req.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      req.providerType === 'ambulance' ? "bg-rose-50 text-rose-500" : "bg-sky-50 text-sky-500"
                    )}>
                      {req.providerType === 'ambulance' ? <Truck size={24} /> : <Package size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 capitalize">{req.providerType} Request</h3>
                      <p className="text-xs text-slate-400 font-medium">#{req.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    req.status === 'confirmed' ? "bg-sky-100 text-sky-600" : "bg-amber-100 text-amber-600 animate-pulse"
                  )}>
                    {req.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {req.pickup && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin size={14} className="text-sky-500" />
                      <span className="font-bold text-xs uppercase">From:</span>
                      <span className="truncate">{req.pickup}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} className="text-rose-500" />
                    <span className="font-bold text-xs uppercase">{req.pickup ? 'To:' : 'Center:'}</span>
                    <span className="truncate">{req.destination || req.providerName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="text-lg font-black text-slate-900">৳{req.price || 0}</div>
                  <button 
                    onClick={() => setActiveChat({ id: req.id, name: req.providerName })}
                    className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                  >
                    <MessageCircle size={18} />
                    চ্যাট
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Appointment */}
        <div
          className="bg-sky-500 rounded-[40px] p-8 text-white relative overflow-hidden"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-medium opacity-80 mb-2">পরবর্তী অ্যাপয়েন্টমেন্ট</h3>
            
            {loading ? (
              <div className="h-32 flex items-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : upcomingAppointment ? (
              <>
                <h2 className="text-3xl font-bold mb-2">ডা. {upcomingAppointment.doctorName || 'বিশেষজ্ঞ'}</h2>
                <div className="flex items-center gap-4 mb-6 opacity-90">
                  <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    <Calendar size={14} />
                    {new Date(upcomingAppointment.date).toLocaleDateString('bn-BD')}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                    <Clock size={14} />
                    {new Date(upcomingAppointment.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-sky-50 mb-8 max-w-xs">
                  আপনার অ্যাপয়েন্টমেন্টটি {upcomingAppointment.status === 'confirmed' ? 'নিশ্চিত করা হয়েছে' : 'অনুমোদনের অপেক্ষায় আছে'}। 
                  অনুগ্রহ করে সময়ের ৫ মিনিট আগে প্রস্তুত থাকুন।
                </p>

                <div className="flex gap-3">
                  {upcomingAppointment?.status === 'confirmed' ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 px-6 py-3 bg-white/20 rounded-2xl font-bold text-sm text-white">
                        <Video size={18} />
                        ডাক্তারের ভিডিও কলের জন্য অপেক্ষা করা হচ্ছে...
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/10 rounded-2xl font-medium text-sm text-white/90">
                      অনুমোদনের অপেক্ষায়
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-6">কোনো অ্যাপয়েন্টমেন্ট নেই</h2>
                <p className="text-sky-50 mb-8">আজ আপনার কোনো অ্যাপয়েন্টমেন্ট নির্ধারিত নেই।</p>
                <button className="bg-white text-sky-600 px-8 py-4 rounded-2xl font-bold hover:bg-sky-50 transition-colors flex items-center gap-2">
                  অ্যাপয়েন্টমেন্ট বুক করুন
                  <ArrowRight size={20} />
                </button>
              </>
            )}
          </div>

          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
            <Stethoscope size={300} />
          </div>
        </div>

        {/* Health Activity */}
        <div className="bg-white rounded-[40px] border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900">Health Activity</h3>
            <button className="text-sky-600 font-bold text-sm">View All</button>
          </div>

          <div className="space-y-6">
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-100 rounded-3xl">
              No recent activity found.
            </div>
          </div>
        </div>
      </div>

      {activeChat && (
        <ChatWindow 
          orderId={activeChat.id} 
          recipientName={activeChat.name} 
          onClose={() => setActiveChat(null)} 
        />
      )}
    </div>
  );
}
