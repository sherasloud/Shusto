import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, limit, runTransaction, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { ArrowLeft, Star, Clock, Calendar, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
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
        let docRef = doc(db, 'doctors', doctorId);
        let snap = await getDoc(docRef);
        
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
            location: data.location || data.address || 'Dhaka, Bangladesh',
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

  // Load doctor slots
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
        const walletDoc = await transaction.get(walletRef);
        let currentBalance = 0;
        if (walletDoc.exists()) {
          currentBalance = walletDoc.data().balance || 0;
        }

        if (!isTestAccount && parsedFee > 0 && currentBalance < parsedFee) {
          throw new Error('insufficient_balance');
        }

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

        if (selectedSlot?.id) {
          const slotRef = doc(db, 'doctor_slots', selectedSlot.id);
          const currentCount = (selectedSlot.bookedCount || 0) + 1;
          const maxP = selectedSlot.maxPatients || 1;
          transaction.update(slotRef, {
            bookedCount: increment(1),
            status: currentCount >= maxP ? 'booked' : 'available'
          });
        }

        if (effectiveFee > 0) {
          transaction.update(walletRef, {
            balance: increment(-effectiveFee),
            updatedAt: new Date().toISOString()
          });

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
      }, 2000);

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

  if (loading) return <div className="p-10 text-center font-bold text-slate-500">Loading doctor details...</div>;
  if (!doctor) return <div className="p-10 text-center font-bold text-slate-500">Doctor not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors cursor-pointer">
        <ArrowLeft size={20} /> Back
      </button>
      
      {/* Doctor Card */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-8">
        <img src={doctor.image} alt={doctor.name} className="w-48 h-48 rounded-3xl object-cover shadow-sm shrink-0" referrerPolicy="no-referrer" />
        
        <div className="space-y-4 flex-1 text-center md:text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{doctor.name}</h1>
            <p className="text-xl text-sky-600 font-bold mt-1">{doctor.specialty}</p>
            <div className="flex items-center justify-center md:justify-start gap-4 text-slate-500 font-medium text-sm mt-2">
              <p>{doctor.degree}</p>
              <p>• {doctor.experience}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center md:items-start gap-4 pt-2">
            <div className="flex items-center gap-2 text-amber-500 font-bold">
              <Star size={20} fill="currentColor" />
              <span>4.8 Rating</span>
            </div>

            <div className="text-2xl font-black text-sky-600">
              ৳{parsedFee}
            </div>
          </div>

          <div className="pt-4 flex justify-center md:justify-start">
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-8 py-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Book Now (সিরিয়াল বুক করুন)
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 space-y-3">
        <h3 className="text-lg font-bold text-slate-900">About</h3>
        <p className="text-slate-600 leading-relaxed text-sm">
          {doctor.about || `Dr. ${doctor.name} is a dedicated ${doctor.specialty} with years of experience. Providing high-quality care to patients.`}
        </p>
      </div>

      {/* Functional Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            {bookingStatus === 'success' ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={36} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Booking Successful!</h2>
                <p className="text-slate-500 text-sm mb-6">Your appointment with {doctor.name} is confirmed.</p>
                <button 
                  onClick={() => { setShowBookingModal(false); setBookingStatus('idle'); }}
                  className="w-full py-3.5 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all cursor-pointer"
                >
                  Great, Thanks!
                </button>
              </div>
            ) : (
              <>
                {isTestAccount && (
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3 rounded-2xl text-xs font-bold mb-4 flex items-center justify-between">
                    <span>🧪 Test Account ({user?.email})</span>
                    <span className="bg-sky-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">Free (৳0)</span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Confirm Booking</h2>
                  <p className="text-slate-500 text-sm">Appointment with {doctor.name}</p>
                </div>

                {/* Slots selection */}
                <div className="mb-6 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    সময়সূচী নির্বাচন করুন (Select Time)
                  </label>
                  {loadingSlots ? (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">Loading slots...</div>
                  ) : doctorSlots.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {doctorSlots.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={slot.status !== 'available'}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all text-xs",
                            selectedSlot?.id === slot.id ? "bg-sky-50 border-sky-500 ring-2 ring-sky-500/20" : "bg-slate-50 border-slate-200",
                            slot.status !== 'available' && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div>
                            <span className="font-bold text-slate-900">{slot.date}</span> - <span className="font-black text-sky-600">{slot.timeSlot}</span>
                          </div>
                          <span className="font-bold text-sky-700 text-[10px]">
                            {slot.status === 'available' ? 'Available' : 'Booked'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-sky-50 rounded-2xl text-xs text-sky-800">
                      ইনস্ট্যান্ট সেশন (আজকের তারিখ)
                    </div>
                  )}
                </div>

                {/* Fee summary */}
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className={cn("font-bold", isTestAccount ? "line-through text-slate-400" : "text-slate-900")}>
                      ৳{parsedFee}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-base">
                    <span>Total Payable</span>
                    <span className="text-sky-600">৳{effectiveFee}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowBookingModal(false)}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBook}
                    disabled={bookingStatus === 'booking'}
                    className="flex-1 py-3.5 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
                  >
                    {bookingStatus === 'booking' ? 'Booking...' : 'Confirm'}
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
