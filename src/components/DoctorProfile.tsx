import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowLeft, Star, Clock, MapPin } from 'lucide-react';

export function DoctorProfile({ doctorId, onBack }: { doctorId: string, onBack: () => void }) {
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          setDoctor({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error("Error fetching doctor:", e);
      }
      setLoading(false);
    };
    fetchDoctor();
  }, [doctorId]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900">
        <ArrowLeft size={20} /> Back
      </button>
      
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-8">
        <img src={doctor.image || 'https://ui-avatars.com/api/?name=' + doctor.name} alt={doctor.name} className="w-48 h-48 rounded-3xl object-cover" />
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-900">{doctor.name}</h1>
          <p className="text-xl text-sky-600 font-bold">{doctor.specialty || 'General Physician'}</p>
          <div className="flex gap-4 text-slate-500 font-medium">
             <p>{doctor.degree}</p>
             <p>{doctor.experience}</p>
          </div>
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Star size={20} fill="currentColor" />
            <span>4.8 Rating</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4">About</h3>
        <p className="text-slate-600">Dr. {doctor.name} is a dedicated {doctor.specialty} with years of experience. Providing high-quality care to patients.</p>
      </div>
    </div>
  );
}
