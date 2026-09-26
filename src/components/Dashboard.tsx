import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { 
  Bell, 
  ArrowUpRight, 
  Search, 
  Calendar, 
  Clock, 
  Phone, 
  MessageCircle, 
  Video, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Activity, 
  Stethoscope, 
  Heart, 
  Brain, 
  ShieldCheck, 
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ChatWindow } from './ChatWindow';

interface DoctorCardData {
  id: string;
  name: string;
  specialty: string;
  timeSlot: string;
  category: string;
  availableCount: number;
  rating: number;
  image: string;
  theme: 'blue' | 'white';
  recoveredPatients: number;
  inCare: number;
  fee: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorCardData | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(15);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:30');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);

  // Fetch real appointments for current user
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      setUpcomingAppointments(list);
      setLoadingAppts(false);
    }, (err) => {
      console.warn("Appointments listener error:", err);
      setLoadingAppts(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Categories matching the image theme
  const categories = ['All', 'Specialist', 'Surgeon', 'Treatment', 'Cardiology', 'Neurology', 'Pediatric'];

  // Doctor Data designed to match Image 1:1
  const doctorCards: DoctorCardData[] = [
    {
      id: 'doc-1',
      name: 'Dr. Marcus Hale',
      specialty: 'Neurosurgery Specialist',
      timeSlot: '10:50 - 02:40',
      category: 'Surgeon',
      availableCount: 12,
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
      theme: 'blue',
      recoveredPatients: 464,
      inCare: 12,
      fee: 1000
    },
    {
      id: 'doc-2',
      name: 'Dr. Nathana Roti',
      specialty: 'Vascular Surgery Specialist',
      timeSlot: '09:30 - 04:30',
      category: 'Specialist',
      availableCount: 18,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1594824813511-2e6504a9e52e?w=500&auto=format&fit=crop&q=80',
      theme: 'white',
      recoveredPatients: 382,
      inCare: 15,
      fee: 800
    },
    {
      id: 'doc-3',
      name: 'Dr. Merrill Kelvin',
      specialty: 'Cardiovascular Surgery',
      timeSlot: '05:25 - 06:48',
      category: 'Cardiology',
      availableCount: 9,
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=80',
      theme: 'white',
      recoveredPatients: 520,
      inCare: 8,
      fee: 1200
    }
  ];

  const filteredCards = doctorCards.filter(card => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Specialist') return card.category === 'Specialist' || card.category === 'Surgeon';
    if (selectedCategory === 'Surgeon') return card.category === 'Surgeon';
    if (selectedCategory === 'Cardiology') return card.category === 'Cardiology';
    return true;
  });

  // Calendar dates for the booking modal (matching middle screen)
  const calendarDays = [
    { day: 'Sun', date: 12 },
    { day: 'Mon', date: 13 },
    { day: 'Tue', date: 14 },
    { day: 'Wed', date: 15 },
    { day: 'Thu', date: 16 },
    { day: 'Fri', date: 17 },
    { day: 'Sat', date: 18 },
  ];

  const timeSlots = ['08:30', '09:30', '10:30', '11:30'];

  // Handle appointment booking
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !user) return;
    setIsBooking(true);

    try {
      const apptDate = new Date();
      apptDate.setDate(selectedDate);
      const [hours, mins] = selectedTimeSlot.split(':').map(Number);
      apptDate.setHours(hours || 10, mins || 0, 0, 0);

      await addDoc(collection(db, 'appointments'), {
        userId: user.uid,
        patientName: user.displayName || (user as any)?.name || 'Patient',
        patientPhone: (user as any)?.phone || '01700000000',
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        doctorId: selectedDoctor.id,
        date: apptDate.toISOString(),
        timeSlot: selectedTimeSlot,
        fee: selectedDoctor.fee,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedDoctor(null);
      }, 1500);
    } catch (e) {
      console.error("Booking error:", e);
    } finally {
      setIsBooking(false);
    }
  };

  const displayName = ((user as any)?.name || user?.displayName || 'Alex Morgan').split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F4F7FC] -m-4 md:-m-8 lg:-m-12 p-4 md:p-8 lg:p-10 text-slate-900 pb-28">
      <div className="max-w-6xl mx-auto space-y-7">
        
        {/* Top Header Bar (Matching Image: Left Profile + Right Bell) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" 
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 leading-tight">Good Morning!</p>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {user?.displayName || (user as any)?.name || 'Alex Morgan'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'doctors' }))}
              className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-center text-slate-700 shadow-xs transition-all"
              title="Search Doctors"
            >
              <Search size={18} />
            </button>
            <button 
              onClick={() => alert("আপাতত কোনো নতুন নোটিফিকেশন নেই।")}
              className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center justify-center text-slate-700 shadow-xs transition-all relative"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Display Hero Title: "Make an Appointment" */}
        <div className="pt-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-800 tracking-tight leading-none">
            Make an
          </h1>
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight block mt-1">
            Appointment
          </span>
        </div>

        {/* Horizontal Category Filter Pills (Matching Image 1:1) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                  isActive 
                    ? 'bg-[#121826] text-white shadow-md shadow-slate-950/15' 
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Featured Big Appointment Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCards.map((card) => {
            const isBlue = card.theme === 'blue';
            return (
              <div
                key={card.id}
                onClick={() => setSelectedDoctor(card)}
                className={`rounded-[36px] p-6 sm:p-7 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between min-h-[260px] ${
                  isBlue
                    ? 'bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] text-white shadow-xl shadow-blue-600/20'
                    : 'bg-white border border-slate-200/70 text-slate-900 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Top Row: Department Badge + Time Slot Pill */}
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md ${
                    isBlue 
                      ? 'bg-white/15 text-white border border-white/20' 
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {card.category === 'Surgeon' ? <Brain size={15} /> : <Heart size={15} />}
                    <span>{card.specialty.split(' ')[0]}</span>
                  </div>

                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight ${
                    isBlue ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {card.timeSlot}
                  </div>
                </div>

                {/* Middle Row: Doctor Avatars Pile + Available Count */}
                <div className="flex items-center gap-3 my-5 relative z-10">
                  <div className="flex -space-x-2.5 overflow-hidden">
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                      src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=80" 
                      alt="Doc 1" 
                    />
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                      src="https://images.unsplash.com/photo-1594824813511-2e6504a9e52e?w=120&auto=format&fit=crop&q=80" 
                      alt="Doc 2" 
                    />
                    <img 
                      className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80" 
                      alt="Doc 3" 
                    />
                  </div>
                  <span className={`text-xs font-bold ${isBlue ? 'text-blue-100' : 'text-slate-400'}`}>
                    +{card.availableCount} Doctor available
                  </span>
                </div>

                {/* Bottom Row: Doctor Title & Diagonal Arrow Button */}
                <div className="flex items-end justify-between gap-4 pt-2 relative z-10">
                  <div>
                    <h3 className={`text-xl sm:text-2xl font-black tracking-tight leading-tight ${isBlue ? 'text-white' : 'text-slate-900'}`}>
                      {card.specialty}
                    </h3>
                    <p className={`text-xs font-semibold mt-1 ${isBlue ? 'text-blue-100' : 'text-slate-500'}`}>
                      {card.name} • ৳{card.fee}
                    </p>
                  </div>

                  <button
                    aria-label="View doctor details"
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95 shadow-md ${
                      isBlue 
                        ? 'bg-white text-slate-900' 
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/80'
                    }`}
                  >
                    <ArrowUpRight size={22} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule & Appointments Timeline (Matching Right Screen from Image) */}
        <div className="bg-white rounded-[36px] border border-slate-200/70 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'doctors' }))}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-600/20 transition-all"
                title="Book New"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Active Appointments List */}
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appt) => (
                <div 
                  key={appt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/60 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-slate-400 w-16 shrink-0">
                      {appt.timeSlot || '10:30 AM'}
                    </span>
                    <img 
                      src="https://images.unsplash.com/photo-1594824813511-2e6504a9e52e?w=150&auto=format&fit=crop&q=80" 
                      alt="Doctor" 
                      className="w-12 h-12 rounded-2xl object-cover border border-white shadow-xs shrink-0"
                    />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{appt.doctorName || 'Dr. Specialist'}</h4>
                      <p className="text-xs text-slate-500 font-medium">{appt.doctorSpecialty || 'General Surgery'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      appt.status === 'confirmed' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700 animate-pulse'
                    }`}>
                      {appt.status === 'confirmed' ? 'নিশ্চিত' : 'অনুমোদন বাকি'}
                    </span>
                    <button 
                      onClick={() => setActiveChat({ id: appt.id, name: appt.doctorName })}
                      className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-700 transition-all"
                      title="Chat"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">আজকে কোনো শিডিউল বুকিং নেই</p>
              <p className="text-xs text-slate-400 mt-1">উপরের স্পেশালিস্ট কার্ড থেকে সহজে অ্যাপয়েন্টমেন্ট নিন</p>
            </div>
          )}
        </div>

        {/* Quick Medical Services Shortcuts */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-lg font-black text-slate-900">অন্যান্য স্বাস্থ্যসেবা</h3>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'medicine' }))}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              সব দেখুন
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: 'medicine', label: 'ওষুধ শপ', icon: '💊' },
              { id: 'ambulance', label: 'অ্যাম্বুলেন্স', icon: '🚑' },
              { id: 'lab', label: 'ল্যাব টেস্ট', icon: '🧪' },
              { id: 'hospital', label: 'হাসপাতাল', icon: '🏥' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: s.id }))}
                className="bg-white p-4 rounded-3xl border border-slate-200/60 hover:border-blue-300 shadow-xs hover:shadow-sm text-center flex flex-col items-center gap-1.5 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{s.icon}</span>
                <span className="text-[11px] font-extrabold text-slate-800">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Doctor Detail & Booking Modal (Middle Screen of the Image 1:1) */}
      <AnimatePresence>
        {selectedDoctor && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-200/80 overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between p-5 pb-0">
                <button 
                  onClick={() => setSelectedDoctor(null)}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-700 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => alert(`ডাক্তার হেল্পলাইন: 01700-000000`)}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <Phone size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setActiveChat({ id: selectedDoctor.id, name: selectedDoctor.name });
                    }}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-700 transition-colors"
                  >
                    <MessageCircle size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Doctor Photo & Rating */}
                <div className="text-center relative">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold mb-3 border border-amber-200/60">
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    <span>{selectedDoctor.rating.toFixed(1)} rating</span>
                  </div>

                  <div className="w-36 h-36 mx-auto rounded-[32px] overflow-hidden shadow-lg border-4 border-white mb-3">
                    <img 
                      src={selectedDoctor.image} 
                      alt={selectedDoctor.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDoctor.name}</h3>
                  <p className="text-sm font-bold text-slate-400 mt-0.5">{selectedDoctor.specialty}</p>
                </div>

                {/* Claim Status (Recovered, In Care, Free) - Matching Image */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-slate-900 tracking-tight">Claim Status</h4>
                    <span className="text-[11px] font-bold text-blue-600 cursor-pointer">View All</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-[#E0F2FE] p-3 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-sky-800">Recovered Patients</p>
                      <p className="text-base font-black text-sky-950 mt-1">{selectedDoctor.recoveredPatients}</p>
                    </div>
                    <div className="bg-slate-100/70 p-3 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-slate-500">In Care</p>
                      <p className="text-base font-black text-slate-900 mt-1">{selectedDoctor.inCare}</p>
                    </div>
                    <div className="bg-slate-100/70 p-3 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-slate-500">Free</p>
                      <p className="text-base font-black text-slate-900 mt-1">12</p>
                    </div>
                  </div>
                </div>

                {/* Select Date (Matching Middle Screen from Image) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black text-slate-900">Select Date</h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <ChevronLeft size={14} className="cursor-pointer" />
                      <span>{new Date().toLocaleString('en-US', { month: 'long' })}</span>
                      <ChevronRight size={14} className="cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                    {calendarDays.map((c) => {
                      const isSelected = selectedDate === c.date;
                      return (
                        <button
                          key={c.date}
                          onClick={() => setSelectedDate(c.date)}
                          className={`flex flex-col items-center py-3 px-2.5 rounded-2xl transition-all ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105' 
                              : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          <span className="text-[10px] font-semibold">{c.day}</span>
                          <span className="text-sm font-black mt-1">{c.date}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select Time Slots */}
                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((time) => {
                      const isSelected = selectedTimeSlot === time;
                      return (
                        <button
                          key={time}
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`py-2 rounded-2xl text-xs font-black transition-all ${
                            isSelected 
                              ? 'border-2 border-blue-600 text-blue-600 bg-blue-50/50' 
                              : 'bg-slate-100/60 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Book Appointment Action Button (Vibrant Royal Blue) */}
                <div className="pt-2">
                  <button
                    onClick={handleConfirmBooking}
                    disabled={isBooking || bookingSuccess}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isBooking ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : bookingSuccess ? (
                      <>
                        <CheckCircle2 size={18} /> বুকিং সম্পন্ন হয়েছে!
                      </>
                    ) : (
                      'Book Appointment'
                    )}
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
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
