import doctor1 from '../assets/images/doctor_1.jpg';
import doctor2 from '../assets/images/doctor_2.jpg';
import doctor3 from '../assets/images/doctor_3.jpg';
import doctor4 from '../assets/images/doctor_4.jpg';

const doctorImages = [doctor1, doctor2, doctor3, doctor4];

import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Banner } from './Banner';
import { Search, MapPin, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export function Home() {
  const { user } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, 'doctors'), where('isPinned', '==', true), limit(4));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeaturedDoctors(docs);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FBFF] p-6 pb-16 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#1DA1F2]">Shusto</h1>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="text-[#1DA1F2]" size={14} />
            <p className="text-xs font-bold text-slate-700">{user?.address || 'Set location'}</p>
          </div>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'profile' }))}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DA1F2]/50 cursor-pointer"
          title="প্রোফাইল ও সেটিংস"
        >
          <img 
            src={user?.photoURL || 'https://ui-avatars.com/api/?name=' + (user?.displayName || 'U')} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs hover:opacity-90 transition-opacity" 
          />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1DA1F2] transition-colors duration-300" size={20} />
        <input 
          type="text" 
          placeholder="Search a doctor or health issue" 
          className="w-full pl-12 pr-4 py-4 bg-[#EBF5FF] rounded-2xl border border-transparent shadow-sm focus:bg-white focus:border-[#1DA1F2] focus:ring-2 focus:ring-[#1DA1F2]/20 outline-none transition-all duration-300 text-sm"
        />
      </div>

      {/* Featured Doctors */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-4">Featured Doctors</h2>
        <div className="grid grid-cols-1 gap-4">
          {featuredDoctors.map((doc: any, index: number) => (
            <div 
              key={doc.id} 
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'doctorProfile', doctorId: doc.id } }))}
              className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-4"
            >
              <img src={doc.image || doctorImages[index % 4]} alt={doc.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
              <div>
                <p className="font-bold text-sm">{doc.name}</p>
                <p className="text-xs text-slate-500">{doc.specialty}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Banner />

      {/* Recent Prescriptions */}
      <div className="mb-6">
        <h2 className="font-bold text-lg mb-4">Recent Prescriptions</h2>
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
            <FileText className="text-sky-600" size={20} />
          </div>
          <div>
            <p className="font-bold text-sm">Recent View</p>
            <p className="text-xs text-slate-500">Latest Prescription</p>
          </div>
        </div>
      </div>
    </div>
  );
}
