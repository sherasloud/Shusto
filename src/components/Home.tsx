import React from 'react';
import { useAuth } from '../AuthContext';
import { Search, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

export function Home() {
  const { user } = useAuth();

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

      {/* Upcoming Schedule */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Upcoming Schedule</h2>
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-100 text-center text-slate-400 text-sm">
          No upcoming appointments
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="font-bold text-lg mb-4">Let's find your doctor</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {['Heart surgeon', 'Psychologist', 'Dentist'].map(cat => (
            <button key={cat} className="px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-xs font-semibold whitespace-nowrap">
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
