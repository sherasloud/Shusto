import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Shield, Search, Plus, X, Building, Pill, Activity, FlaskConical, Truck, Stethoscope } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
  createdAt?: string;
  managerId?: string;
  referredBy?: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  type: string;
  managerId?: string;
}

export function ManagerDashboard() {
  const { user: manager } = useAuth();
  const [states, setStates] = useState<UserProfile[]>(() => {
    if (!manager?.uid) return [];
    try {
      const cached = localStorage.getItem(`cached_manager_states_${manager.uid}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({ 
    name: '', 
    email: '', 
    role: 'pharmacy', 
    location: '', 
    contact: '', 
    division: '', 
    district: '', 
    thana: '' 
  });

  useEffect(() => {
    if (!manager) return;

    const fetchStates = async () => {
      setLoading(true);
      try {
        // Find users who have this manager as their manager or were referred by them
        const q = query(collection(db, 'users'), where('managerId', '==', manager.uid));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setStates(list);
        try { localStorage.setItem(`cached_manager_states_${manager.uid}`, JSON.stringify(list)); } catch (e) {}
      } catch (err) {
        console.error("Error fetching states:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, [manager?.uid]);

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manager) return;
    setLoading(true);
    
    try {
      const email = newProvider.email.toLowerCase().trim();
      const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
      const providerId = `state_${cleanEmail}`;
      
      // 1. Create specialized record in the correct collection
      const collectionName = newProvider.role === 'doctor' ? 'doctors' : 
                           newProvider.role === 'pharmacy' ? 'pharmacies' : 
                           newProvider.role === 'lab' ? 'labs' : 
                           newProvider.role === 'physio' ? 'physios' : 
                           newProvider.role === 'hospital' ? 'hospitals' : 'ambulances';

      await setDoc(doc(db, collectionName, providerId), {
        id: providerId,
        ...newProvider,
        managerId: manager.uid,
        investorId: (manager as any).investorId || '',
        createdAt: new Date().toISOString()
      });

      // 2. Create placeholder user doc
      await setDoc(doc(db, 'users', providerId), {
        uid: providerId,
        displayName: newProvider.name,
        name: newProvider.name,
        email: email,
        role: newProvider.role,
        managerId: manager.uid,
        investorId: (manager as any).investorId || '',
        ...newProvider,
        createdAt: new Date().toISOString()
      });

      alert("State (Provider) added successfully!");
      setShowAddModal(false);
      setStates(prev => [...prev, { uid: providerId, displayName: newProvider.name, email, role: newProvider.role, managerId: manager.uid }]);
    } catch (error) {
      console.error("Error adding state:", error);
      alert("Failed to add state.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-sky-500 rounded-[40px] p-8 text-white shadow-2xl shadow-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-lg text-sky-500">
             <Shield size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">Manager Dashboard</h2>
            <p className="text-sky-50 text-lg">Manage your assigned States (Pharmacies, Centers) and growth.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-8 py-4 bg-white text-sky-600 font-bold rounded-2xl shadow-xl hover:bg-sky-50 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> নতুন স্টেট যোগ করুন
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-xl font-bold text-slate-900">আপনার অধীনস্থ স্টেটবৃন্দ (Centers)</h3>
          <p className="text-sm text-slate-500">মোট সেন্টার: {states.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-sm font-bold text-slate-900">State / Center</th>
                <th className="px-8 py-4 text-sm font-bold text-slate-900">Type</th>
                <th className="px-8 py-4 text-sm font-bold text-slate-900">Location</th>
                <th className="px-8 py-4 text-sm font-bold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {states.map((s) => (
                <tr key={s.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{s.displayName}</span>
                      <span className="text-xs text-slate-400">{s.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="capitalize text-xs font-bold px-3 py-1 bg-sky-50 text-sky-600 rounded-full border border-sky-100">{s.role}</span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500">{(s as any).location || 'N/A'}</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full border border-emerald-100">Active</span>
                  </td>
                </tr>
              ))}
              {states.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">আপনার কোনো স্টেট যোগ করা নেই।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">নতুন স্টেট যোগ করুন</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddState} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Type</label>
                <select 
                  value={newProvider.role} 
                  onChange={e => setNewProvider({...newProvider, role: e.target.value})}
                  className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="pharmacy">Pharmacy</option>
                  <option value="lab">Lab</option>
                  <option value="physio">Physio</option>
                  <option value="hospital">Hospital</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              <input required type="text" placeholder="Name" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200" />
              <input required type="email" placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200" />
              
              <div className="grid grid-cols-2 gap-4">
                <select
                  required
                  value={newProvider.division}
                  onChange={(e) => setNewProvider({...newProvider, division: e.target.value, district: ''})}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">Division</option>
                  {BANGLADESH_LOCATIONS.map(l => (
                    <option key={l.division} value={l.division}>{l.division}</option>
                  ))}
                </select>
                <select
                  required
                  value={newProvider.district}
                  onChange={(e) => setNewProvider({...newProvider, district: e.target.value})}
                  disabled={!newProvider.division}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                >
                  <option value="">District</option>
                  {newProvider.division && BANGLADESH_LOCATIONS.find(l => l.division === newProvider.division)?.districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <input required type="text" placeholder="Location" value={newProvider.location} onChange={e => setNewProvider({...newProvider, location: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200" />
              <input required type="text" placeholder="Contact" value={newProvider.contact} onChange={e => setNewProvider({...newProvider, contact: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200" />
              
              <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20">
                {loading ? 'Processing...' : 'Confirm Addition'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
