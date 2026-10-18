import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Bell, Search, MapPin, Calendar, Video } from 'lucide-react';
import { cn } from '../lib/utils';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FBFF] p-6 pb-24 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <MapPin className="text-[#1DA1F2]" />
          <div>
            <p className="text-[10px] text-slate-400">Current location</p>
            <p className="text-xs font-bold">Semarang, INA</p>
          </div>
        </div>
        <img 
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
          alt="Profile" 
          className="w-10 h-10 rounded-full object-cover" 
        />
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search a doctor or health issue" 
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-[#1DA1F2]/20 outline-none text-sm"
        />
      </div>

      {/* Upcoming Schedule */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">Upcoming Schedule</h2>
          <span className="text-xs text-[#1DA1F2] font-semibold">See all</span>
        </div>
        <div className="bg-[#1DA1F2] p-6 rounded-3xl text-white shadow-lg shadow-[#1DA1F2]/30">
          <div className="flex items-center gap-4 mb-4">
            <img 
              src="https://images.unsplash.com/photo-1594824813511-2e6504a9e52e?w=100&auto=format&fit=crop&q=80" 
              alt="Doctor" 
              className="w-12 h-12 rounded-full object-cover" 
            />
            <div>
              <p className="font-bold">Dr. Haley Lawrence</p>
              <p className="text-xs text-white/80">Dermatologists</p>
            </div>
            <Video className="ml-auto" />
          </div>
          <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Calendar size={14} />
            Sun, Jan 19, 08.00am - 10.00am
          </div>
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
