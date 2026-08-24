import React, { useEffect, useState } from 'react';
import { Star, Clock, Search, History, Calendar, FileText, X, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, addDoc, where, getDocs, doc, getDoc, updateDoc, increment, runTransaction, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { cn } from '../lib/utils';
import { distributeCommissions } from '../utils/commissions';
import { FALLBACK_PROVIDERS } from '../constants/fallbackProviders';

interface Appointment {
  id: string;
  doctorName: string;
  startTime?: string;
  endTime?: string;
  doctorEmail?: string;
  status: string;
  date: string;
  timeSlot?: string;
  fee: number;
  prescriptionUrl?: string;
  type?: string;
  createdAt?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  image?: string;
  rating?: number;
  bmdcNumber?: string;
  experience?: string;
  degree?: string;
  university?: string;
  userId?: string;
  email?: string;
  isOnline?: boolean;
}

export function DoctorDirectory() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    try {
      const cachedRaw = localStorage.getItem('admin_cached_doctors') || localStorage.getItem('cached_doctors');
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialty');
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [myAppointments, setMyAppointments] = useState<Appointment[]>(() => {
    if (!user) return [];
    try {
      const cached = localStorage.getItem(`cached_my_appts_${user.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [historySearch, setHistorySearch] = useState('');

  useEffect(() => {
    if (!bookingDoctor) {
      setDoctorSlots([]);
      setSelectedSlot(null);
      return;
    }

    setLoadingSlots(true);
    const docId = bookingDoctor.userId || bookingDoctor.id;
    const docEmail = bookingDoctor.email?.toLowerCase().trim() || '';

    const slotsRef = collection(db, 'doctor_slots');
    getDocs(query(slotsRef, limit(100))).then(snap => {
      const todayStr = new Date().toISOString().split('T')[0];
      const foundSlots: any[] = [];

      snap.forEach(d => {
        const data = d.data();
        if (
          data.doctorId === docId ||
          data.doctorId === bookingDoctor.id ||
          (docEmail && data.doctorEmail === docEmail)
        ) {
          let computedStatus = data.status || 'available';
          if (data.date < todayStr && computedStatus === 'available') {
            computedStatus = 'expired';
          }
          if (data.bookedCount >= (data.maxPatients || 1) && computedStatus === 'available') {
            computedStatus = 'booked';
          }
          foundSlots.push({ id: d.id, ...data, status: computedStatus });
        }
      });

      foundSlots.sort((a, b) => a.date.localeCompare(b.date));
      setDoctorSlots(foundSlots);

      const firstAvail = foundSlots.find(s => s.status === 'available');
      if (firstAvail) setSelectedSlot(firstAvail);

      setLoadingSlots(false);
    }).catch(err => {
      console.error("Error loading doctor slots:", err);
      setLoadingSlots(false);
    });
  }, [bookingDoctor]);

  const isTestAccount = user?.email?.toLowerCase().trim() === 'thesiambin@gmail.com' || user?.email?.toLowerCase().trim() === 'shustobd@gmail.com';
  const parsedDoctorFee = (() => {
    if (!bookingDoctor) return 0;
    const feeRaw = String(bookingDoctor.fee);
    const feeMatch = feeRaw.match(/\d+/);
    return feeMatch ? Number(feeMatch[0]) : 0;
  })();
  const effectiveFee = isTestAccount ? 0 : parsedDoctorFee;

  useEffect(() => {
    if (!user) return;
    const qApp = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(qApp, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      const sorted = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyAppointments(sorted);
      try { localStorage.setItem(`cached_my_appts_${user.uid}`, JSON.stringify(sorted)); } catch (e) {}
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    // Fetch directly from 'doctors' collection in Firestore
    const qDoctors = query(collection(db, 'doctors'), limit(100));
    const unsubDoctors = onSnapshot(qDoctors, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Doctor[];
      
      const validDocs = docs.filter(d => d.name && d.name.trim() !== '');
      
      // Sort: Online doctors first, then by name
      validDocs.sort((a, b) => {
        if (a.isOnline === b.isOnline) return (a.name || '').localeCompare(b.name || '');
        return a.isOnline ? -1 : 1;
      });

      setDoctors(validDocs);
      setLoading(false);
    }, (error: any) => {
      console.error("Doctors fetch error:", error);
      setLoading(false);
    });

    return () => unsubDoctors();
  }, []);

  const handleBook = async () => {
    if (!user || !bookingDoctor) {
      alert("Please login to book an appointment.");
      return;
    }
    
    setBookingStatus('booking');
    try {
      const fee = effectiveFee;

      const adminQuery = query(collection(db, 'users'), where('email', '==', 'shustobd@gmail.com'), limit(1));
      const adminSnap = await getDocs(adminQuery);
      const adminUid = !adminSnap.empty ? adminSnap.docs[0].id : 'admin_placeholder';

      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await transaction.get(walletRef);
        const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

        if (fee > 0 && balance < fee) {
          throw new Error('insufficient_balance');
        }

        // 1. Create Appointment
        const doctorUserId = bookingDoctor.userId || bookingDoctor.id;
        const appRef = doc(collection(db, 'appointments'));
        
        const appointmentDate = selectedSlot ? `${selectedSlot.date} ${selectedSlot.timeSlot}` : new Date().toISOString();

        transaction.set(appRef, {
          userId: user.uid,
          userName: user.displayName || 'Patient',
          targetId: doctorUserId,
          doctorName: bookingDoctor.name,
          doctorEmail: bookingDoctor.email?.toLowerCase().trim() || '',
          fee: fee,
          status: 'pending',
          date: appointmentDate,
          timeSlot: selectedSlot?.timeSlot || 'Standard Slot',
          slotId: selectedSlot?.id || null,
          createdAt: new Date().toISOString(),
          type: 'video'
        });

        // Update slot if real slot selected
        if (selectedSlot?.id) {
          const slotRef = doc(db, 'doctor_slots', selectedSlot.id);
          const currentCount = (selectedSlot.bookedCount || 0) + 1;
          const maxP = selectedSlot.maxPatients || 1;
          transaction.update(slotRef, {
            bookedCount: increment(1),
            status: currentCount >= maxP ? 'booked' : 'available'
          });
        }

        // 2. Deduct & Record Transaction (ONLY if fee > 0)
        if (fee > 0) {
          // Patient pays full fee
          transaction.update(walletRef, {
            balance: increment(-fee),
            updatedAt: new Date().toISOString()
          });

          // Record Patient Payment
          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: user.uid,
            amount: fee,
            type: 'payment',
            status: 'success',
            targetId: appRef.id,
            targetName: bookingDoctor.name,
            createdAt: new Date().toISOString()
          });
        }
      });

      setBookingStatus('success');
      
      setTimeout(() => {
        setBookingStatus('idle');
        setBookingDoctor(null);
      }, 2000);
    } catch (error: any) {
      console.error("Booking error:", error);
      if (error.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
      } else {
        alert("বুকিং করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
      setBookingStatus('idle');
    }
  };

  const specialties = ['All Specialty', ...new Set(doctors.map(d => d.specialty || 'General'))];

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (doc.specialty || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All Specialty' || (doc.specialty || 'General') === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="space-y-8">
      {/* Header Section with Appointments Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full lg:w-auto">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              ডাক্তার খুঁজুন ({doctors.length})
            </h1>
            <p className="text-slate-500 text-xs md:text-sm">সেরা বিশেষজ্ঞ ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট বুক করুন।</p>
          </div>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-sky-500/20 text-xs shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Clock size={18} />
            <span>আমার অ্যাপয়েন্টমেন্ট (Appointments)</span>
            <span className="bg-white text-sky-600 px-2 py-0.5 rounded-full text-[11px] font-black ml-1">
              {myAppointments.length}
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="নাম বা স্পেশালিটি খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full text-xs font-bold text-slate-800"
            />
          </div>
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full sm:w-auto text-xs font-bold text-slate-700 cursor-pointer"
          >
            {specialties.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading doctors...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
            {searchQuery ? 'No doctors match your search.' : 'No doctors found. Please add some from the Admin Panel.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="relative mb-6">
                  <img 
                    src={doc.image || `https://picsum.photos/seed/${doc.id}/400/400`} 
                    alt={doc.name} 
                    className="w-full aspect-square object-cover rounded-3xl"
                    referrerPolicy="no-referrer"
                  />
                  {doc.isOnline && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-sky-500 text-white px-2.5 py-1 rounded-full shadow-lg shadow-sky-500/40 border-2 border-white animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Online</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star size={14} fill="currentColor" />
                    {doc.rating || 5.0}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-slate-900">{doc.name}</h3>
                      {doc.bmdcNumber && (
                        <div className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                          Verified
                        </div>
                      )}
                    </div>
                    <p className="text-sky-600 font-medium text-sm mb-1">{doc.specialty}</p>
                    {(doc.degree || doc.university) && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2">
                        {[doc.degree, doc.university].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">BMDC Reg</p>
                      <p className="text-xs font-bold text-slate-700">{doc.bmdcNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Experience</p>
                      <p className="text-xs font-bold text-slate-700">{doc.experience || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>Available Today</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Consultation Fee</p>
                      <p className="text-lg font-bold text-slate-900">৳{doc.fee}</p>
                    </div>
                    <button 
                      onClick={() => setBookingDoctor(doc)}
                      className="px-6 py-3 bg-sky-500 text-white text-sm font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Booking Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            {bookingStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Star size={40} fill="currentColor" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Success!</h2>
                <p className="text-slate-500 mb-8">Your appointment with {bookingDoctor.name} has been booked successfully.</p>
                <button 
                  onClick={() => { setBookingDoctor(null); setBookingStatus('idle'); }}
                  className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all"
                >
                  Great, Thanks!
                </button>
              </div>
            ) : (
              <>
                {isTestAccount && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between">
                    <span className="truncate">🧪 Test Account ({user?.email})</span>
                    <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">Free Booking (৳0)</span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Confirm Booking</h2>
                  <p className="text-slate-500 text-sm">Appointment with {bookingDoctor.name}</p>
                </div>

                {/* Appointment Slots Selection */}
                <div className="mb-6 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    উপলব্ধ সময় নির্বাচন করুন (Select Available Time)
                  </label>
                  
                  {loadingSlots ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                      সময়সূচী লোড হচ্ছে...
                    </div>
                  ) : doctorSlots.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {doctorSlots.map((slot) => {
                        const isSelected = selectedSlot?.id === slot.id;
                        const isAvail = slot.status === 'available';

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all",
                              isSelected ? "bg-sky-50 border-sky-500 ring-2 ring-sky-500/20" : "bg-slate-50 border-slate-200",
                              !isAvail && "opacity-50 cursor-not-allowed bg-slate-100"
                            )}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">{slot.date}</p>
                              <p className="text-sm font-black text-sky-600">{slot.timeSlot}</p>
                            </div>
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                              slot.status === 'available' ? "bg-emerald-100 text-emerald-700" :
                              slot.status === 'booked' ? "bg-amber-100 text-amber-700" :
                              slot.status === 'completed' ? "bg-sky-100 text-sky-700" :
                              "bg-slate-200 text-slate-600"
                            )}>
                              {slot.status === 'available' ? "🟢 Available" :
                               slot.status === 'booked' ? "🔴 Booked" :
                               slot.status === 'completed' ? "✔️ Done" :
                               "🕰️ Expired"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-sky-50/50 border border-sky-100 rounded-2xl text-xs text-sky-800">
                      <p className="font-bold">আজকের ইনস্ট্যান্ট অ্যাপয়েন্টমেন্ট (Instant Session)</p>
                      <p className="text-[11px] opacity-80">ডাক্তারের নির্দিষ্ট সময়সূচী নির্ধারিত না থাকায় সাথে সাথে সরাসরি কলিং এর জন্য বুকিং প্রসেস হবে।</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl space-y-2.5 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className={cn("font-bold", isTestAccount ? "line-through text-slate-400" : "text-slate-900")}>
                      ৳{parsedDoctorFee}
                    </span>
                  </div>
                  {isTestAccount && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold">
                      <span>Test Discount</span>
                      <span>-৳{parsedDoctorFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Service Charge</span>
                    <span className="font-bold text-slate-900">৳0</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-base">
                    <span className="text-slate-900">Total Payable</span>
                    <span className="text-sky-600">৳{effectiveFee}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setBookingDoctor(null)}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBook}
                    disabled={bookingStatus !== 'idle'}
                    className="flex-1 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                  >
                    {bookingStatus === 'booking' ? 'Booking...' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Appointment History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[36px] p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-sky-500/20">
                  <History size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    অ্যাপয়েন্টমেন্ট হিস্ট্রি (Appointment History)
                    <span className="px-2.5 py-0.5 bg-sky-100 text-sky-700 text-xs rounded-full font-black">
                      {myAppointments.length}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">আপনার সমস্ত রিকোয়েস্ট ও অ্যাপয়েন্টমেন্টের ইতিহাস</p>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Filters & Search */}
            <div className="py-4 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(tab => {
                    const count = tab === 'all' ? myAppointments.length : myAppointments.filter(a => a.status === tab).length;
                    return (
                      <button
                        key={tab}
                        onClick={() => setHistoryFilter(tab)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                          historyFilter === tab 
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        <span className="capitalize">{tab === 'all' ? 'সব (All)' : tab === 'pending' ? 'অপেক্ষমান' : tab === 'confirmed' ? 'অনুমোদিত' : tab === 'completed' ? 'সম্পন্ন' : 'বাতিল'}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px]",
                          historyFilter === tab ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        )}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="ডাক্তার বা তারিখ দিয়ে খুঁজুন..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Modal Appointments List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {myAppointments.filter(a => {
                const matchesFilter = historyFilter === 'all' || a.status === historyFilter;
                const matchesSearch = a.doctorName?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                      a.date?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                      (a.timeSlot && a.timeSlot.toLowerCase().includes(historySearch.toLowerCase()));
                return matchesFilter && matchesSearch;
              }).length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  কোনো অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myAppointments.filter(a => {
                    const matchesFilter = historyFilter === 'all' || a.status === historyFilter;
                    const matchesSearch = a.doctorName?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                          a.date?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                          (a.timeSlot && a.timeSlot.toLowerCase().includes(historySearch.toLowerCase()));
                    return matchesFilter && matchesSearch;
                  }).map(app => (
                    <div 
                      key={app.id} 
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-sky-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{app.doctorName}</p>
                          <p className="text-[11px] text-slate-500">{app.doctorEmail || 'Doctor'}</p>
                        </div>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          app.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" : 
                          app.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                        )}>
                          {app.status === 'confirmed' ? 'অনুমোদিত' : app.status === 'cancelled' ? 'বাতিল' : 'অপেক্ষমান'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-sky-500" />
                          <span>{app.timeSlot || new Date(app.date).toLocaleDateString()}</span>
                        </div>
                        <span className="font-bold text-slate-900">৳{app.fee}</span>
                      </div>

                      {app.prescriptionUrl && (
                        <a 
                          href={app.prescriptionUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 w-full py-2 bg-sky-50 text-sky-600 font-bold rounded-xl hover:bg-sky-100 text-xs transition-all"
                        >
                          <FileText size={14} />
                          <span>প্রেসক্রিপশন ডাউনলোড (Prescription)</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
