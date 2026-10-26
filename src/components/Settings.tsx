import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Smartphone, 
  Trash2, 
  RefreshCw, 
  Check, 
  HelpCircle, 
  Mail, 
  Phone, 
  Heart, 
  Info, 
  Sparkles, 
  LogOut, 
  ChevronRight,
  Database,
  Volume2,
  Lock
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { safeStorage } from '../utils/safeStorage';

interface SettingsProps {
  onBack?: () => void;
  onNavigate?: (tab: string) => void;
}

export function Settings({ onBack, onNavigate }: SettingsProps) {
  const { user, logout } = useAuth();

  // Language state
  const [lang, setLang] = useState<'bn' | 'en'>(() => {
    return (safeStorage.getItem('shusto_lang') as 'bn' | 'en') || 'bn';
  });

  // Brand Name state
  const [brandName, setBrandName] = useState<string>(() => {
    return safeStorage.getItem('shusto_brand_name') || 'Shusto';
  });

  // Notifications preferences
  const [notifications, setNotifications] = useState({
    medicineReminders: true,
    doctorAppointments: true,
    emergencyBlood: true,
    healthTips: false,
    soundVibrate: true
  });

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = safeStorage.getItem('shusto_notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleLanguageChange = (newLang: 'bn' | 'en') => {
    setLang(newLang);
    safeStorage.setItem('shusto_lang', newLang);
    // Dispatch custom event if other components listen for lang
    window.dispatchEvent(new CustomEvent('shusto_lang_change', { detail: newLang }));
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      safeStorage.setItem('shusto_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack || (() => { window.history.back(); })}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-extrabold text-slate-900">
              {lang === 'bn' ? 'অ্যাপ সেটিংস' : 'App Settings'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {lang === 'bn' ? 'Shusto BD' : 'Shusto BD'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* 1. Language Section (ভাষা নির্বাচন) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'ভাষা নির্বাচন (Language)' : 'App Language'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'অ্যাপটি আপনার পছন্দের ভাষায় ব্যবহার করুন' : 'Choose your preferred language'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleLanguageChange('bn')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                lang === 'bn' 
                  ? 'border-sky-500 bg-sky-50/50 text-sky-950 font-bold shadow-sm' 
                  : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-slate-50/50'
              }`}
            >
              <div className="space-y-0.5">
                <span className="block text-sm font-extrabold">বাংলা</span>
                <span className="block text-[11px] text-slate-500 font-normal">ডিফল্ট ভাষা</span>
              </div>
              {lang === 'bn' && (
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>

            <button
              onClick={() => handleLanguageChange('en')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                lang === 'en' 
                  ? 'border-sky-500 bg-sky-50/50 text-sky-950 font-bold shadow-sm' 
                  : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-slate-50/50'
              }`}
            >
              <div className="space-y-0.5">
                <span className="block text-sm font-extrabold">English</span>
                <span className="block text-[11px] text-slate-500 font-normal">English Language</span>
              </div>
              {lang === 'en' && (
                <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 1.5. App Name & Branding Selector (Shusto Official) */}
        <div className="bg-white rounded-3xl p-6 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'অ্যাপ নাম ও ব্র্যান্ডিং সিলেক্টর' : 'App Name & Branding'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'গুগল প্লে স্টোর পাবলিশিংয়ের জন্য সেরা নাম সিলেক্ট করুন' : 'Select official name for Play Store publishing'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { id: 'Shusto', title: 'Shusto (Recommended)', sub: 'Official Brand' },
              { id: 'Shusto Health', title: 'Shusto Health', sub: 'Medical Category' },
              { id: 'Shusto Care', title: 'Shusto Care', sub: 'Telehealth' },
              { id: 'Shusto Telehealth', title: 'Shusto Telehealth', sub: 'Full Suite' }
            ].map(b => (
              <button
                key={b.id}
                onClick={() => {
                  setBrandName(b.id);
                  safeStorage.setItem('shusto_brand_name', b.id);
                  alert(lang === 'bn' ? `অফিসিয়াল অ্যাপ নাম "${b.id}" সিলেক্ট করা হয়েছে!` : `Official app name set to "${b.id}"!`);
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                  brandName === b.id 
                    ? 'border-sky-500 bg-sky-50/60 text-sky-950 font-bold shadow-sm' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-700 bg-slate-50/50'
                }`}
              >
                <div>
                  <span className="block text-xs font-extrabold">{b.title}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">{b.sub}</span>
                </div>
                {brandName === b.id && (
                  <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Notification Preferences */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'নোটিফিকেশন ও অ্যালার্ট' : 'Notification Preferences'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'গুরুত্বপূর্ণ স্বাস্থ্য ও ওষুধ সংক্রান্ত অ্যালার্ট নিয়ন্ত্রণ করুন' : 'Control your medicine and health notifications'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 pt-1">
            {/* Medicine Reminder */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'bn' ? 'ঔষধ খাওয়ার রিমাইন্ডার' : 'Medication Reminders'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'প্রতিদিনের প্রেসক্রিপশনের ওষুধ সময়মতো খাওয়ার অ্যালার্ট' : 'Timely reminders for scheduled doses'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotification('medicineReminders')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.medicineReminders ? 'bg-sky-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.medicineReminders ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Doctor Appointment */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'bn' ? 'ডাক্তার অ্যাপয়েন্টমেন্ট অ্যালার্ট' : 'Doctor Appointment Alerts'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'সিরিয়াল ও কনসালটেশনের সময় সংক্রান্ত মেসেজ' : 'Notifies you before scheduled consultations'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotification('doctorAppointments')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.doctorAppointments ? 'bg-sky-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.doctorAppointments ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Blood Emergency */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'bn' ? 'জরুরি রক্তের আবেদন' : 'Emergency Blood Requests'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'আপনার এলাকায় জরুরি রক্তের প্রয়োজনে তাৎক্ষণিক নোটিফিকেশন' : 'Urgent donor alerts for your registered blood group'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotification('emergencyBlood')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.emergencyBlood ? 'bg-sky-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.emergencyBlood ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sound & Vibrate */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'bn' ? 'শব্দ ও ভাইব্রেশন' : 'Sound & Vibration'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'bn' ? 'অ্যালার্টের সময় রিংটোন ও কম্পন সক্রিয় রাখুন' : 'Play audio ringtone and vibration on incoming calls & alerts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotification('soundVibrate')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifications.soundVibrate ? 'bg-sky-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.soundVibrate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 4. About & Story Shortcut */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'আমাদের গল্প ও পরিচিতি' : 'About & Founder Story'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'Shusto প্ল্যাটফর্ম এবং এর নির্মাতার অনুপ্রেরণাদায়ক গল্প' : 'Learn about the journey and visionary founder'}
              </p>
            </div>
          </div>

          <div className="pt-1 space-y-2">
            <button
              onClick={() => onNavigate && onNavigate('about')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#BAE6FD]/40 to-sky-50 border border-sky-200/70 hover:from-[#BAE6FD]/60 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-sky-300 shrink-0 bg-white">
                  <img src="https://i.postimg.cc/FKT9skQV/Image-1.jpg" alt="Siam" className="w-full h-full object-cover object-top" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-slate-900">
                    {lang === 'bn' ? 'আমাদের গল্প ও সিইও (Siam)' : 'About Shusto & CEO Siam'}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {lang === 'bn' ? '২০১৮ থেকে ২০২৬: Shusto তৈরির সংগ্রামী গল্প পড়ুন' : 'Read the inspiring story behind Shusto'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => onNavigate && onNavigate('privacy')}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-bold text-slate-800">
                  {lang === 'bn' ? 'গোপনীয়তা নীতি ও শর্তাবলী (Privacy Policy)' : 'Privacy Policy & Terms'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 5. Support & Emergency Helpline */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'সহায়তা ও হটলাইন' : 'Support & Emergency'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'জরুরি চিকিৎসা হেল্পলাইন ও কাস্টমার কেয়ার' : 'Instant emergency assistance in Bangladesh'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <a
              href="tel:16263"
              className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/60 flex items-center gap-3 hover:bg-rose-100/60 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-rose-950">১৬২৬৩</span>
                <span className="block text-[11px] text-rose-600">স্বাস্থ্য বাতায়ন</span>
              </div>
            </a>

            <a
              href="tel:999"
              className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/60 flex items-center gap-3 hover:bg-sky-100/60 transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-sky-950">৯৯৯</span>
                <span className="block text-[11px] text-sky-600">জাতীয় জরুরি সেবা</span>
              </div>
            </a>
          </div>

          <div className="pt-2 text-center text-xs text-slate-400 space-y-1">
            <p>ইমেইল: <a href="mailto:shustobd@gmail.com" className="text-sky-600 font-semibold underline">shustobd@gmail.com</a></p>
            <p>অফিসিয়াল ওয়েবসাইট: <a href="https://shusto.com" target="_blank" rel="noreferrer" className="text-sky-600 font-semibold underline">shusto.com</a></p>
          </div>
        </div>

        {/* 6. Account Deletion & Data Removal (Google Play & User Policy) */}
        <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট ও ডেটা অপসারণ' : 'Account Deletion & Data'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'bn' ? 'স্থায়ীভাবে অ্যাকাউন্ট মুছে ফেলুন (৩১ দিনের রিস্টোর সময়)' : 'Permanently delete account (31 days restore window)'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'bn' 
              ? 'নিরাপত্তা ও পলিসি অনুযায়ী, আপনার অ্যাকাউন্টে ৯ টাকার বেশি ব্যালেন্স না থাকলে আপনি অ্যাকাউন্ট ডিলিট করতে পারবেন। ডিলিট করার পর ৩১ দিন পর্যন্ত রিস্টোর করার সুযোগ থাকবে।'
              : 'Per policy, you can delete your account if balance is between 0-9 BDT. 31 days restore window applies.'}
          </p>
          <button
            onClick={async () => {
              if (!user) return;
              try {
                let currentBalance = 0;
                try {
                  const cached = localStorage.getItem('cached_wallet_balance_' + user.uid);
                  if (cached !== null && !isNaN(Number(cached))) {
                    currentBalance = Number(cached);
                  }
                } catch(e) {}

                try {
                  const { doc, getDoc } = await import('firebase/firestore');
                  const { db } = await import('../firebase');
                  const wSnap = await getDoc(doc(db, 'wallets', user.uid));
                  if (wSnap.exists() && typeof wSnap.data().balance === 'number') {
                    currentBalance = wSnap.data().balance;
                  }
                } catch(e) {}

                if (currentBalance > 9) {
                  alert(lang === 'bn' 
                    ? 'অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স (' + currentBalance + ' টাকা) রয়েছে। অ্যাকাউন্ট ডিলিট করতে হলে ব্যালেন্স ০ থেকে ৯ টাকার মধ্যে থাকতে হবে। দয়া করে ব্যালেন্স উইথড্র বা শূন্য করুন।'
                    : 'Cannot delete account while balance is ' + currentBalance + ' BDT (must be 0-9 BDT).');
                  return;
                }

                const confirmed = window.confirm(lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টটি ডিলিটের জন্য শিডিউল করা হবে। আগামী ৩১ দিন পর্যন্ত আপনি লগইন করে অ্যাকাউন্ট রিস্টোর (পুনরুদ্ধার) করতে পারবেন। ৩১ দিন পর সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?'
                  : 'Your account will be scheduled for deletion with a 31-day restore window. Are you sure?');

                if (!confirmed) return;

                try {
                  const { doc, setDoc } = await import('firebase/firestore');
                  const { db } = await import('../firebase');
                  const now = new Date();
                  const restoreUntil = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
                  await setDoc(doc(db, 'users', user.uid), {
                    deletionRequestedAt: now.toISOString(),
                    restoreUntil: restoreUntil.toISOString(),
                    status: 'pending_deletion'
                  }, { merge: true });
                } catch(e) {
                  console.error("Deletion marking error:", e);
                }

                alert(lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টটি ডিলিটের জন্য সফলভাবে শিডিউল করা হয়েছে। ৩১ দিনের মধ্যে লগইন করলে এটি রিস্টোর করা যাবে।'
                  : 'Account scheduled for deletion successfully.');

                await logout();
              } catch (err) {
                console.error("Delete account error:", err);
                alert('অ্যাকাউন্ট ডিলিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট করুন (৩১ দিন রিস্টোর টাইম)' : 'Delete Account (31 Days Restore)'}
          </button>

          {/* Dedicated Logout Button */}
          <button
            onClick={async () => {
              if (window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে Shusto থেকে লগআউট করতে চান?' : 'Are you sure you want to log out from Shusto?')) {
                await logout();
              }
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 hover:text-red-600 font-bold text-sm border border-slate-200 hover:border-red-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-3"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            {lang === 'bn' ? 'লগআউট করুন (Log Out)' : 'Log Out'}
          </button>
        </div>

        {/* 6. Version & Legal */}
        <div className="text-center pt-2 space-y-1 text-slate-400">
          <p className="text-xs font-bold">
            Shusto BD • Version 1.0.1 (Build 2)
          </p>
          <p className="text-[11px]">
            © 2026 Shusto BD Ltd. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
