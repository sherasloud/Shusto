import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Send, CheckCircle2, AlertCircle, ShoppingBag, MapPin, Phone, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export function ShopRegistration() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    shopName: '',
    category: 'Pharmacy',
    address: '',
    phone: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await addDoc(collection(db, 'shop_requests'), {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
    } catch (err) {
      console.error("Error submitting shop request:", err);
      setError("আবেদনটি জমা দেওয়া সম্ভব হয়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="text-emerald-500" size={40} />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900">আবেদন সফল হয়েছে!</h2>
        <p className="text-slate-500">আপনার শপ রেজিস্ট্রেশন আবেদনটি আমাদের কাছে পৌঁছেছে। অ্যাডমিন যাচাই করার পর আপনাকে জানানো হবে।</p>
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'dashboard' }))}
          className="px-8 py-3 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-200"
        >
          ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Store className="text-sky-500" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">নতুন শপ রেজিস্ট্রেশন</h2>
        <p className="text-slate-500">আপনার শপের তথ্য দিয়ে Shusto-র মার্চেন্ট হিসেবে যাত্রা শুরু করুন।</p>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ShoppingBag size={16} className="text-slate-400" /> শপের নাম (Shop Name)
              </label>
              <input 
                required
                type="text"
                placeholder="আপনার শপের নাম লিখুন"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Info size={16} className="text-slate-400" /> শপের ক্যাটাগরি
              </label>
              <select 
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Pharmacy">ফার্মেসি (Pharmacy)</option>
                <option value="Diagnostic">ডায়াগনস্টিক সেন্টার</option>
                <option value="Ambulance">অ্যাম্বুলেন্স সার্ভিস</option>
                <option value="Clinic">ক্লিনিক/হাসপাতাল</option>
                <option value="Other">অন্যান্য</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Phone size={16} className="text-slate-400" /> ফোন নম্বর
              </label>
              <input 
                required
                type="tel"
                placeholder="০১৭XXXXXXXX"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" /> ঠিকানা
              </label>
              <input 
                required
                type="text"
                placeholder="শপের পূর্ণ ঠিকানা"
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-medium transition-all"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">শপ সম্পর্কে কিছু লিখুন (ঐচ্ছিক)</label>
            <textarea 
              rows={3}
              placeholder="আপনার শপের সেবা সম্পর্কে সংক্ষিপ্ত বর্ণনা"
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sky-500 font-medium transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 text-sm font-bold"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-5 bg-sky-500 text-white rounded-[24px] font-bold hover:bg-sky-600 disabled:opacity-50 transition-all shadow-xl shadow-sky-200"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                আবেদন জমা দিন <Send size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
