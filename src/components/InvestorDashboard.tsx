import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, doc, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Shield, Search, X, User as UserIcon, RefreshCcw, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt?: string;
  investorId?: string;
}

export function InvestorDashboard() {
  const { user: investor } = useAuth();
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!investor) return;

    const fetchManagers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'users'), where('investorId', '==', investor.uid), where('role', '==', 'manager'));
        const snapshot = await getDocs(q);
        setManagers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (err) {
        console.error("Error fetching managers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
  }, [investor?.uid]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        setAllUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (err) {
        console.error("Error fetching all users:", err);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phoneNumber || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      
      const matchesSearch = name.includes(term) || email.includes(term) || phone.includes(term);
      // Can't promote admins or people who are already managers for SOMEONE
      // Actually, let's just exclude admins and current managers of this investor
      return matchesSearch && u.role !== 'admin' && u.role !== 'investor' && u.investorId !== investor?.uid;
    });
  }, [allUsers, searchTerm, investor?.uid]);

  const handlePromoteToManager = async (targetUser: UserProfile) => {
    if (!investor) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: 'manager',
        investorId: investor.uid,
        roleUpdatedAt: new Date().toISOString(),
        displayName: (targetUser.displayName || targetUser.email || 'User').trim()
      });
      
      const updatedUser = { 
        ...targetUser, 
        role: 'manager', 
        investorId: investor.uid,
        displayName: (targetUser.displayName || targetUser.email || 'User').trim()
      };
      
      setManagers(prev => [...prev.filter(m => m.uid !== targetUser.uid), updatedUser]);
      setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? updatedUser : u));
      setShowPromoteModal(null);
      setSearchTerm('');
      alert(`${updatedUser.displayName} is now your Manager!`);
    } catch (error) {
      console.error("Promotion error:", error);
      alert("Failed to promote user.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && managers.length === 0) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-sky-500 rounded-[40px] p-8 text-white shadow-2xl shadow-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-lg text-sky-500">
             <Shield size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">Investor Dashboard</h2>
            <p className="text-sky-50 text-lg">Manage your business managers and overview their operations.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const el = document.getElementById('add-manager-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="px-8 py-4 bg-white text-sky-600 font-bold rounded-2xl shadow-xl hover:bg-sky-50 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> নতুন ম্যানেজার যোগ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Managers List */}
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">আপনার ম্যানেজারবৃন্দ</h3>
              <p className="text-sm text-slate-500">মোট ম্যানেজার: {managers.length}</p>
            </div>
            <button 
              onClick={() => setSearchTerm('')}
              className="px-6 py-2.5 bg-sky-50 text-sky-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-sky-100 transition-all border border-sky-100"
            >
              <RefreshCcw size={18} /> রিফ্রেশ করুন
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">Manager</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">Email</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">Status</th>
                  <th className="px-8 py-4 text-sm font-bold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {managers.map((m) => (
                  <tr key={m.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={m.photoURL || `https://picsum.photos/seed/${m.uid}/100/100`} 
                          className="w-10 h-10 rounded-2xl border border-slate-100" 
                          alt="" 
                        />
                        <span className="font-bold text-slate-900">{m.displayName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-500">{m.email}</td>
                    <td className="px-8 py-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full border border-emerald-100">Active</span>
                    </td>
                    <td className="px-8 py-4">
                       <button className="text-xs font-bold text-sky-500 hover:underline">View Reports</button>
                    </td>
                  </tr>
                ))}
                {managers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 italic">আপনার কোনো ম্যানেজার যোগ করা নেই। নিচে ইউজার সার্চ করে ম্যানেজার যোগ করুন।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Manager Section */}
        <div id="add-manager-section" className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 mb-6">নতুন ম্যানেজার যোগ করুন</h3>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="ইউজার বা ইমেইল দিয়ে সার্চ করুন..." 
              className="flex-1 bg-transparent border-none focus:ring-0 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm && (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div key={user.uid} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-sky-200 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-full" alt="" />
                    <div>
                      <p className="font-bold text-slate-900">{user.displayName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handlePromoteToManager(user)}
                    className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20"
                  >
                    ম্যানেজার হিসেবে যুক্ত করুন
                  </button>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-4">কোনো ইউজার পাওয়া যায়নি।</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
