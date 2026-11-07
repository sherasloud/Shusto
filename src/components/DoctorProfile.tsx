import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, limit, runTransaction, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, Clock, MapPin, Calendar, CheckCircle, ShieldCheck, Video, UserCheck, AlertCircle, Sparkles, Building, Award } from 'lucide-react';
import { cn } from '../lib/utils';

export function DoctorProfile({ doctorId, onBack }: { doctorId: string, onBack: () => void }) {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');

  const isTestAccount = user?.email?.toLowerCase().includes('test') || 
                        user?.email?.toLowerCase().includes('demo') || 
                        user?.email === 'shustobd@gmail.com';

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      try {
        // Try doctors collection first
        let docRef = doc(db, 'doctors', doctorId);
        let snap = await getDoc(docRef);
        
        // If not found, try users collection (if docId was a userId)
        if (!snap.exists()) {
          docRef = doc(db, 'users', doctorId);
          snap = await getDoc(docRef);
        }
        
        if (snap.exists()) {
          const data = snap.data();
          setDoctor({
            id: snap.id,
            userId: data.userId || snap.id,
            name: data.name || data.displayName || 'Doctor',
            specialty: data.specialty || 'General Physician',
            fee: data.fee || 500,
            experience: data.experience || '5+ Years',
            degree: data.degree || 'MBBS',
            bmdcNumber: data.bmdcNumber || 'Verified',
            image: data.image || data.photoURL || `https://picsum.photos/seed/${snap.id}/400/400`,
            hospitalName: data.hospitalName || data.chamberLocation || 'Dhaka Medical College & Hospital',
            location: data.location || data.address || 'Dhanmondi, Dhaka',
            isOnline: true,
            rating: 4.8,
            ...data
          });
        }
      } catch (e) {
        console.error("Error fetching doctor:", e);
      }
      setLoading(false);
    };
    fetchDoctor();
  }, [doctorId]);

  // Load doctor slots when doctor is fetched
  useEffect(() => {
    if (!doctor) return;

    setLoadingSlots(true);
    const docId = doctor.userId || doctor.id;
    const docEmail = doctor.email?.toLowerCase().trim() || '';

    const slotsRef = collection(db, 'doctor_slots');
    getDocs(query(slotsRef, limit(100))).then(snap => {
      const todayStr = new Date().toISOString().split('T')[0];
      const foundSlots: any[] = [];

      snap.forEach(d => {
        const data = d.data();
        if (
          data.doctorId === docId ||
          data.doctorId === doctor.id ||
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
      setLoadingSlots(false);
    }).catch(err => {
      console.warn("Slots load error:", err);
      setDoctorSlots([]);
      setLoadingSlots(false);
    });
  }, [doctor]);

  const getDocFeeNum = () => {
    if (!doctor || !doctor.fee) return 500;
    const match = String(doctor.fee).match(/\d+/);
    return match ? Number(match[0]) : 500;
  };

  const parsedFee = getDocFeeNum();
  const effectiveFee = isTestAccount ? 0 : parsedFee;

  const handleBook = async () => {
    if (!user) {
      alert("সিরিয়াল বুকিং করতে দয়া করে সাইন ইন করুন।");
      return;
    }
    if (!doctor) return;

    setBookingStatus('booking');

    try {
      const walletRef = doc(db, 'wallets', user.uid);
      const doctorUserId = doctor.userId || doctor.id;
      const appointmentDate = selectedSlot?.date || new Date().toISOString().split('T')[0];

      await runTransaction(db, async (transaction) => {
        // Check Patient Wallet (if not test account and fee > 0)
        const walletDoc = await transaction.get(walletRef);
        let currentBalance = 0;
        if (walletDoc.exists()) {
          currentBalance = walletDoc.data().balance || 0;
        }

        if (!isTestAccount && parsedFee > 0 && currentBalance < parsedFee) {
          throw new Error('insufficient_balance');
        }

        // 1. Create Appointment Record
        const appRef = doc(collection(db, 'appointments'));
        transaction.set(appRef, {
          userId: user.uid,
          userName: user.displayName || 'Patient',
          userEmail: user.email || '',
          targetId: doctorUserId,
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorEmail: doctor.email?.toLowerCase().trim() || '',
          fee: effectiveFee,
          status: 'pending',
          date: appointmentDate,
          timeSlot: selectedSlot?.timeSlot || 'Standard Instant Session',
          slotId: selectedSlot?.id || null,
          createdAt: new Date().toISOString(),
          type: 'video'
        });

        // 2. Update Slot Status if real slot selected
        if (selectedSlot?.id) {
          const slotRef = doc(db, 'doctor_slots', selectedSlot.id);
          const currentCount = (selectedSlot.bookedCount || 0) + 1;
          const maxP = selectedSlot.maxPatients || 1;
          transaction.update(slotRef, {
            bookedCount: increment(1),
            status: currentCount >= maxP ? 'booked' : 'available'
          });
        }

        // 3. Deduct Wallet Balance (if not test account and fee > 0)
        if (effectiveFee > 0) {
          transaction.update(walletRef, {
            balance: increment(-effectiveFee),
            updatedAt: new Date().toISOString()
          });

          // Record Patient Payment Transaction
          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: user.uid,
            amount: effectiveFee,
            type: 'payment',
            status: 'success',
            targetId: appRef.id,
            targetName: doctor.name,
            createdAt: new Date().toISOString()
          });
        }
      });

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setShowBookingModal(false);
      }, 2500);

    } catch (error: any) {
      console.error("Doctor profile booking error:", error);
      if (error?.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা রিচার্জ করুন।');
      } else {
        alert("সিরিয়াল বুকিং করতে সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।");
      }
      setBookingStatus('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">ডাক্তার প্রোফাইল লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="p-12 text-center bg-white rounded-[32px] border border-slate-100 max-w-md mx-auto space-y-4">
        <AlertCircle size={48} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-bold text-slate-900">ডাক্তার তথ্য পাওয়া যায়নি</h2>
        <p className="text-slate-500 text-sm">নির্দিষ্ট ডাক্তারের প্রোফাইল এই মুহূর্তে উপলব্ধ নেই।</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl">
          ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto pb-12">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-xl border border-slate-200 transition-all shadow-sm cursor-pointer"
      >
        <ArrowLeft size={18} />
        <span>পূর্ববর্তী পেজে ফিরে যান</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-[36px] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="relative shrink-0">
          <img 
            src={doctor.image} 
            alt={doctor.name} 
            className="w-44 h-44 md:w-52 md:h-52 rounded-3xl object-cover shadow-md border-4 border-slate-50" 
            referrerPolicy="no-referrer"
          />
          {doctor.isOnline && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white animate-pulse text-[11px] font-black uppercase">
              <div className="w-2 h-2 bg-white rounded-full" />
              <span>অনলাইন</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">{doctor.name}</h1>
              {doctor.bmdcNumber && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full border border-sky-200">
                  <ShieldCheck size={14} className="text-sky-600" />
                  <span>BMDC ভেরিফায়েড ({doctor.bmdcNumber})</span>
                </span>
              )}
            </div>

            <p className="text-lg text-sky-600 font-bold">{doctor.specialty}</p>
            <p className="text-sm text-slate-500 font-medium">
              {[doctor.degree, doctor.experience ? `${doctor.experience} অভিজ্ঞতা` : null].filter(Boolean).join(' • ')}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 max-w-lg">
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[11px] text-slate-400 font-bold uppercase">রেটিং</p>
              <p className="text-base font-black text-amber-500 flex items-center justify-center gap-1">
                <Star size={16} fill="currentColor" />
                <span>{doctor.rating || '4.8'}</span>
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[11px] text-slate-400 font-bold uppercase">অভিজ্ঞতা</p>
              <p className="text-sm font-black text-slate-800">{doctor.experience || '5+ Years'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl text-center">
              <p className="text-[11px] text-slate-400 font-bold uppercase">ফি</p>
              <p className="text-base font-black text-sky-600">৳{parsedFee}</p>
            </div>
          </div>

          {/* Location & Chamber */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-sky-500 shrink-0" />
              <span>{doctor.location || 'ঢাকা, বাংলাদেশ'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building size={15} className="text-sky-500 shrink-0" />
              <span>{doctor.hospitalName || 'চেম্বার ও হাসপাতাল'}</span>
            </div>
          </div>

          {/* Primary Action Call-to-Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full sm:w-auto px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-sky-600/30 hover:shadow-sky-600/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar size={18} />
              <span>সিরিয়াল বুক করুন (Book Now)</span>
            </button>

            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm rounded-2xl border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Video size={18} className="text-emerald-600" />
              <span>ইনস্ট্যান্ট ভিডিও কন্সাল্টেশন (৳{parsedFee})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid: About & Slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: About & Qualifications */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award size={20} className="text-sky-600" />
              <span>ডাক্তার সম্পর্কিত বিস্তারিত (About Doctor)</span>
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {doctor.about || `Dr. ${doctor.name} একজন অভিজ্ঞ ${doctor.specialty} বিশেষজ্ঞ। উনি দীর্ঘ দিন যাবত ডিজিটাল স্বাস্থ্যসেবায় রোগীদের সেবা প্রদান করে আসছেন। রোগীর যথাযথ শারীরিক পরীক্ষা এবং আধুনিক চিকিৎসা প্রদান উনার মূল লক্ষ্য।`}
            </p>
          </div>

          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={20} className="text-sky-600" />
              <span>ডিগ্রী ও অভিজ্ঞতা (Qualification & Experience)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold uppercase">শিক্ষাগত যোগ্যতা</p>
                <p className="font-bold text-slate-800 text-sm">{doctor.degree || 'MBBS, FCPS'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
                <p className="text-slate-400 font-semibold uppercase">বিএমডিসি নম্বর</p>
                <p className="font-bold text-slate-800 text-sm">{doctor.bmdcNumber || 'Verified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Time Slots & Booking Box */}
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-sky-600" />
                <span>উপলব্ধ সময়সূচী (Slots)</span>
              </h3>
              <span className="text-xs text-sky-600 font-bold">{doctorSlots.length} টি স্লট</span>
            </div>

            {loadingSlots ? (
              <div className="p-6 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 animate-pulse">
                সময়সূচী লোড হচ্ছে...
              </div>
            ) : doctorSlots.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {doctorSlots.map(slot => (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (slot.status === 'available') {
                        setSelectedSlot(slot);
                        setShowBookingModal(true);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer",
                      slot.status === 'available' ? "bg-slate-50 hover:bg-sky-50 hover:border-sky-300 border-slate-200" : "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{slot.date}</p>
                      <p className="text-sm font-black text-sky-600">{slot.timeSlot}</p>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                      slot.status === 'available' ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"
                    )}>
                      {slot.status === 'available' ? '🟢 Available' : '🔴 Booked'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl text-xs text-sky-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-sky-800">
                  <Sparkles size={14} className="text-sky-600" />
                  <span>ইনস্ট্যান্ট কন্সাল্টেশন বুকিং</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  ডাক্তারের নির্দিষ্ট সময়সূচী সেট করা না থাকলে সাথে সাথে সরাসরি ভিডিও কলের জন্য অ্যাপয়েন্টমেন্ট বুকিং হবে।
                </p>
              </div>
            )}

            <button
              onClick={() => setShowBookingModal(true)}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
            >
              এখনই বুক করুন (৳{parsedFee})
            </button>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-100">
            {bookingStatus === 'success' ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <CheckCircle size={44} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">বুকিং সফল হয়েছে!</h2>
                <p className="text-slate-500 text-xs mb-8">
                  ডা. {doctor.name}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট বুকিং সম্পন্ন হয়েছে।
                </p>
                <button 
                  onClick={() => { setShowBookingModal(false); setBookingStatus('idle'); }}
                  className="w-full py-3.5 bg-sky-600 text-white font-bold text-xs rounded-2xl hover:bg-sky-700 transition-all cursor-pointer"
                >
                  ধন্যবাদ!
                </button>
              </div>
            ) : (
              <>
                {isTestAccount && (
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between">
                    <span className="truncate">🧪 Test Account ({user?.email})</span>
                    <span className="bg-sky-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">Free Booking (৳0)</span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar size={28} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">অ্যাপয়েন্টমেন্ট কনফার্ম করুন</h2>
                  <p className="text-slate-500 text-xs mt-1">ডা. {doctor.name}</p>
                </div>

                {/* Slots selection in modal */}
                <div className="mb-5 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    সময়সূচী নির্বাচন করুন
                  </label>
                  {doctorSlots.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                      {doctorSlots.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={slot.status !== 'available'}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all",
                            selectedSlot?.id === slot.id ? "bg-sky-50 border-sky-500 ring-2 ring-sky-500/20" : "bg-slate-50 border-slate-200",
                            slot.status !== 'available' && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div>
                            <span className="font-bold text-slate-800">{slot.date}</span> - <span className="font-black text-sky-600">{slot.timeSlot}</span>
                          </div>
                          <span className="text-[10px] font-bold text-sky-700">
                            {slot.status === 'available' ? 'Available' : 'Booked'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                      ইনস্ট্যান্ট সেশন (আজকের তারিখ)
                    </div>
                  )}
                </div>

                {/* Fee summary */}
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 mb-6 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">কনসালটেশন ফি</span>
                    <span className={cn("font-bold", isTestAccount ? "line-through text-slate-400" : "text-slate-900")}>
                      ৳{parsedFee}
                    </span>
                  </div>
                  {isTestAccount && (
                    <div className="flex justify-between text-sky-600 font-bold">
                      <span>টেস্ট ছাড়</span>
                      <span>-৳{parsedFee}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                    <span className="text-slate-900">সর্বমোট প্রদেয়</span>
                    <span className="text-sky-600">৳{effectiveFee}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBookingModal(false)}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button 
                    onClick={handleBook}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-3 bg-sky-600 text-white font-bold text-xs rounded-xl hover:bg-sky-700 shadow-md transition-all cursor-pointer"
                  >
                    {bookingStatus === 'booking' ? 'বুকিং হচ্ছে...' : 'কনফার্ম করুন'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
