import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { Search, MapPin, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';

export function Home() {
  const { user } = useAuth();
  const [featuredDoctors, setFeaturedDoctors] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'doctors'), where('isPinned', '==', true), limit(4));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setFeaturedDoctors(docs);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FBFF] p-6 pb-24 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
      <div className="relative mb-8 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1DA1F2] transition-colors duration-300" size={20} />
        <input 
          type="text" 
          placeholder="Search a doctor or health issue" 
          className="w-full pl-12 pr-4 py-4 bg-[#EBF5FF] rounded-2xl border border-transparent shadow-sm focus:bg-white focus:border-[#1DA1F2] focus:ring-2 focus:ring-[#1DA1F2]/20 outline-none transition-all duration-300 text-sm"
        />
      </div>

      {/* Featured Doctors */}
      <div className="mb-8">
        <h2 className="font-bold text-lg mb-4">Featured Doctors</h2>
        <div className="grid grid-cols-2 gap-4">
          {featuredDoctors.map((doc: any) => (
            <div 
              key={doc.id} 
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'doctorProfile', doctorId: doc.id } }))}
              className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all"
            >
              <img src={doc.image || 'https://ui-avatars.com/api/?name=' + doc.name} alt={doc.name} className="w-12 h-12 rounded-full mb-2 object-cover" />
              <p className="font-bold text-xs truncate">{doc.name}</p>
              <p className="text-[10px] text-slate-500">{doc.specialty}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Prescriptions */}
      <div className="mb-8">
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
