import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  CreditCard, 
  Lock, 
  Clock, 
  HelpCircle, 
  Mail, 
  Phone, 
  Youtube, 
  Instagram, 
  Facebook,
  Stethoscope,
  Pill,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

type PolicyTab = 'all' | 'privacy' | 'terms' | 'refund';

export function PrivacyPolicy({ onBack, defaultTab = 'privacy' }: { onBack: () => void; defaultTab?: PolicyTab }) {
  const [activeTab, setActiveTab] = useState<PolicyTab>(defaultTab);

  const socialLinks = [
    { name: 'Youtube', icon: Youtube, url: 'https://youtube.com/@ShustoBD', color: 'text-red-600' },
    { name: 'Instagram', icon: Instagram, url: 'https://instagram.com/ShustoBD', color: 'text-pink-600' },
    { name: 'Facebook', icon: Facebook, url: 'https://facebook.com/ShustoBD', color: 'text-blue-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-50 rounded-full blur-3xl -z-0 opacity-70" />
        
        <div className="relative z-10">
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-medium text-sm px-3 py-1.5 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
            <span>অ্যাপে ফিরে যান (Back to App)</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-teal-400 text-white rounded-2xl flex items-center justify-center shadow-md shadow-sky-500/20">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  আইনি নীতিমালা ও শর্তাবলী
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Privacy Policy, Terms & Conditions and Refund Policies of Shusto BD
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-emerald-200/60 self-start md:self-auto">
              <CheckCircle2 size={15} />
              <span>সর্বশেষ আপডেট: সেপ্টেম্বর ২০২৬</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
            <button
              onClick={() => setActiveTab('privacy')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'privacy'
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Shield size={16} />
              <span>গোপনীয়তা নীতি (Privacy Policy)</span>
            </button>

            <button
              onClick={() => setActiveTab('terms')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'terms'
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <FileText size={16} />
              <span>ব্যবহারের শর্তাবলী (Terms & Conditions)</span>
            </button>

            <button
              onClick={() => setActiveTab('refund')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'refund'
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <RotateCcw size={16} />
              <span>রিফান্ড ও বাতিলের নীতি (Refund Policy)</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                activeTab === 'all'
                  ? "bg-slate-800 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <span>সকল নীতিমালা (View All)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">

        {/* 1. PRIVACY POLICY SECTION */}
        {(activeTab === 'privacy' || activeTab === 'all') && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  গোপনীয়তা নীতি (Privacy Policy)
                </h2>
                <p className="text-xs text-slate-500">আপনার ব্যক্তিগত ও স্বাস্থ্য তথ্যের পূর্ণ সুরক্ষা আমাদের সর্বোচ্চ অঙ্গীকার</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-sm md:text-base">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs">১</span>
                  ভূমিকা ও আওতা (Introduction)
                </h3>
                <p>
                  সুস্থ (Shusto / ShustoBD) স্বাস্থ্যসেবা প্ল্যাটফর্মে আপনাকে স্বাগতম। আমরা রোগীদের তথ্যের সম্পূর্ণ নিরাপত্তা ও গোপনীয়তা বজায় রাখতে প্রতিশ্রুতিবদ্ধ। 
                  এই নীতিমালায় ব্যাখ্যা করা হয়েছে যে আমরা কীভাবে আপনার তথ্য সংগ্রহ, সংরক্ষণ, প্রক্রিয়াকরণ ও সুরক্ষিত রাখি।
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs">২</span>
                  আমরা যেসকল তথ্য সংগ্রহ করি (Information We Collect)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm mb-1.5">ব্যক্তিগত ও যোগাযোগের তথ্য</h4>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                      <li>নাম, মোবাইল নম্বর ও ইমেইল ঠিকানা</li>
                      <li>বয়স, লিঙ্গ এবং ভৌগোলিক অবস্থান/ঠিকানা</li>
                      <li>প্রোফাইল ছবি ও জাতীয় পরিচয়পত্র (প্রয়োজন সাপেক্ষে)</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-sm mb-1.5">স্বাস্থ্য ও চিকিৎসা ডাটা</h4>
                    <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                      <li>প্রেসক্রিপশন ও আপলোডকৃত মেডিকেল টেস্ট রিপোর্ট</li>
                      <li>ডাক্তার কনসালটেশন হিস্ট্রি ও স্বাস্থ্য সংক্রান্ত লক্ষণসমূহ</li>
                      <li>ওষুধের তালিকা এবং অ্যালার্জি বা ক্রনিক ডিজিজ সম্পর্কিত তথ্য</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs">৩</span>
                  তথ্য ব্যবহারের উদ্দেশ্য (How We Use Your Data)
                </h3>
                <ul className="space-y-2 list-none">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>চিকিৎসা সেবা প্রদান:</strong> বিশেষজ্ঞ ডাক্তারের সাথে ভিডিও/অডিও পরামর্শ ও সঠিক প্রেসক্রিপশন প্রস্তুতি।</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>ওষুধ ও ল্যাব সার্ভিস ডেলিভারি:</strong> আপনার নির্ধারিত ঠিকানায় দ্রুত ঔষধ ডেলিভারি ও হোম স্যাম্পল কালেকশন নিশ্চিতকরণ।</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>জরুরি সহায়তা ও বিজ্ঞপ্তি:</strong> অ্যাপয়েন্টমেন্ট শিডিউল, পেমেন্ট রিসিট ও জরুরি স্বাস্থ্য আপডেট প্রদান।</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl flex items-start gap-3">
                <Lock size={20} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm text-sky-900 leading-relaxed">
                  <strong>ডেটা এনক্রিপশন ও অপ্রকাশ্যতা:</strong> আপনার কোনো ব্যক্তিগত বা মেডিকেল তথ্য বাণিজ্যিক বিজ্ঞাপন বা তৃতীয় পক্ষের কাছে বিক্রি করা হয় না। 
                  সকল ডেটা আন্তর্জাতিক স্ট্যান্ডার্ড এনক্রিপশন ও সুরক্ষিত ক্লাউড অবকাঠামোতে সংরক্ষিত থাকে।
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs">৪</span>
                  অ্যাকাউন্ট ও তথ্য অপসারণের অধিকার (Account & Data Deletion - Google Play Policy)
                </h3>
                <p className="mb-2">
                  গুগল প্লে স্টোর পলিসি (Google Play Policy) অনুযায়ী আপনার ব্যক্তিগত অ্যাকাউন্ট এবং এর সাথে সম্পর্কিত স্বাস্থ্য ডাটা সম্পূর্ণরূপে মুছে ফেলার অধিকার আপনার রয়েছে:
                </p>
                <ul className="space-y-1.5 list-disc pl-5 text-xs md:text-sm text-slate-600">
                  <li><strong>ইন-অ্যাপ ডিলিট:</strong> অ্যাপের <code>Profile (প্রোফাইল)</code> সেকশনে গিয়ে সহজেই "Delete Account & Data" বাটনে ক্লিক করে তাৎক্ষণিক অ্যাকাউন্ট বন্ধ করতে পারেন।</li>
                  <li><strong>ইমেইল সাপোর্ট:</strong> অথবা <code>shustobd@gmail.com</code> ঠিকানায় আপনার ইমেইল/নম্বর উল্লেখ করে ইমেইল পাঠাতে পারেন। আমাদের সিকিউরিটি টিম ২৪ ঘণ্টার মধ্যে সকল ডাটা সার্ভার থেকে স্থায়ীভাবে মুছে দেবে।</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 2. TERMS & CONDITIONS SECTION */}
        {(activeTab === 'terms' || activeTab === 'all') && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  ব্যবহারের শর্তাবলী (Terms & Conditions)
                </h2>
                <p className="text-xs text-slate-500">Shusto BD প্ল্যাটফর্ম ব্যবহারের নিয়মাবলী ও আইনি দায়বদ্ধতা</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-sm md:text-base">
              {/* Emergency Alert Box */}
              <div className="p-4 md:p-5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5">
                <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-rose-900 text-sm md:text-base">জরুরি চিকিৎসা সংক্রান্ত সতর্কতা (Emergency Medical Disclaimer)</h4>
                  <p className="text-xs md:text-sm text-rose-700 leading-relaxed">
                    সুস্থ অ্যাপ একটি অনলাইন স্বাস্থ্য ও টেলিমেডিসিন সহায়তা প্ল্যাটফর্ম। এটি কোনো জরুরি ট্রমা কেয়ার বা সরাসরি আইসিইউ বিকল্প নয়। 
                    রোগীর অবস্থা যদি অতি সংকটজনক বা জীবন-সংশয়ী হয়, তবে অবিলম্বে নিকটস্থ সরকারি/বেসরকারি হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন।
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">১</span>
                  অ্যাকাউন্ট তৈরি ও নিরাপত্তা
                </h3>
                <p>
                  অ্যাপের বিভিন্ন সেবা (যেমন: ডাক্তার পরামর্শ, ফার্মেসি, ওয়ালেট) ব্যবহারের জন্য সঠিক তথ্য দিয়ে অ্যাকাউন্ট নিবন্ধন করতে হবে। 
                  আপনার অ্যাকাউন্টের ওটিপি (OTP), পাসওয়ার্ড ও কার্যক্রমের নিরাপত্তার দায়িত্ব আপনার নিজের।
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">২</span>
                  ডাক্তার পরামর্শ ও প্রেসক্রিপশন নীতিমালা
                </h3>
                <ul className="space-y-2 list-none">
                  <li className="flex items-start gap-2 text-sm">
                    <ChevronRight size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>সুস্থ প্ল্যাটফর্মের সমস্ত চিকিৎসক BMDC (বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল) নিবন্ধিত। চিকিৎসকের পরামর্শ ও প্রেসক্রিপশন চিকিৎসকের নিজস্ব স্বাধীন পেশাদার সিদ্ধান্তের ভিত্তিতে প্রদত্ত।</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <ChevronRight size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>রোগীকে অবশ্যই সঠিক লক্ষণ, পূর্বে সেবনকৃত ওষুধ ও পূর্ববর্তী শারীরিক রোগের ইতিহাস নির্ভুলভাবে চিকিৎসকের নিকট প্রকাশ করতে হবে।</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <ChevronRight size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>প্রেসক্রিপশনে উল্লেখিত ডোজ ও সময়সীমা মেনে ওষুধ সেবন করা আবশ্যক। চিকিৎসকের পরামর্শ ব্যতীত প্রেসক্রিপশন শেয়ার বা অপব্যবহার আইনত নিষিদ্ধ।</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">৩</span>
                  ঔষধ ও প্রোডাক্ট অর্ডার শর্তাবলী
                </h3>
                <p>
                  Shusto প্ল্যাটফর্মে ডিসপ্লে করা সকল ওষুধ ও হেলথকেয়ার আইটেম অনুমোদিত ড্রাগ লাইসেন্সধারী ফার্মেসি ও প্রস্তুতকারক থেকে সরবরাহ করা হয়। 
                  কিছু নির্দিষ্ট ওষুধ (যেমন: অ্যান্টিবায়োটিক, সিডেটিভ বা নিয়ন্ত্রিত ড্রাগ) সংগ্রহের জন্য বৈধ ও সাম্প্রতিক প্রেসক্রিপশন আপলোড করা বাধ্যতামূলক।
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs">৪</span>
                  পেমেন্ট ও ওয়ালেট ব্যবহার বিধি
                </h3>
                <p>
                  বিকাশ, নগদ, রকেট, ডেবিট/ক্রেডিট কার্ড অথবা Shusto Wallet ব্যালেন্সের মাধ্যমে পেমেন্ট সম্পন্ন করা যাবে। 
                  কোনো অননুমোদিত পেমেন্ট ট্রানজ্যাকশন লক্ষ্য করলে অবিলম্বে আমাদের সাপোর্ট টিমকে অবহিত করতে হবে।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. REFUND POLICIES SECTION */}
        {(activeTab === 'refund' || activeTab === 'all') && (
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <RotateCcw size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                  রিফান্ড ও বাতিলের নীতি (Refund & Cancellation Policies)
                </h2>
                <p className="text-xs text-slate-500">স্বচ্ছ ও গ্রাহকবান্ধব রিফান্ড নিশ্চয়তা এবং বাতিলের নিয়মাবলী</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-sm md:text-base">
              <p>
                আমরা প্রতিটি ব্যবহারকারীর সন্তুষ্টি ও অধিকারকে সর্বাধিক অগ্রাধিকার দিই। কোনো কারণে আমাদের সেবায় কোনো অসঙ্গতি বা বিলম্ব ঘটলে 
                গ্রাহক নিচের শর্তানুযায়ী রিফান্ড বা বিকল্প সেবা গ্রহণের অধিকার রাখেন:
              </p>

              {/* Service Cards for Refund */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Consultation Refund */}
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                    <Stethoscope size={18} />
                    <span>১. ডাক্তার কনসালটেশন রিফান্ড</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>ডাক্তারের অনুপস্থিতি:</strong> চিকিৎসক নির্ধারিত সময়ে উপস্থিত হতে ব্যর্থ হলে বা কল সংযোগ না হলে <strong>১০০% রিফান্ড</strong> প্রযোজ্য।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>ব্যবহারকারী কর্তৃক বাতিল:</strong> অ্যাপয়েন্টমেন্ট সময়ের অন্তত ১ ঘণ্টা পূর্বে বাতিল করলে সম্পূর্ণ ফি কোনো কর্তন ছাড়াই রিফান্ড হবে।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">⚠</span>
                      <span>পরামর্শ সফলভাবে সম্পন্ন হওয়ার পর প্রেসক্রিপশন প্রদান করা হলে ফি রিফান্ডযোগ্য নয়।</span>
                    </li>
                  </ul>
                </div>

                {/* Medicine & Store Refund */}
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <Pill size={18} />
                    <span>২. ওষুধ ও প্রোডাক্ট রিটার্ন / রিফান্ড</span>
                  </div>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>ভুল বা ক্ষতিগ্রস্ত ওষুধ:</strong> ডেলিভারির সময় ভুল পণ্য, মেয়াদোত্তীর্ণ বা সিল ভাঙা পেলে অবিলম্বে ফেরত দিয়ে <strong>সম্পূর্ণ রিফান্ড বা রিপ্লেসমেন্ট</strong> নেওয়া যাবে।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>ডেলিভারি পাওয়ার ২৪ ঘণ্টার মধ্যে কাস্টমার কেয়ার বা ইন-অ্যাপ সাপোর্টে ছবিসহ অভিযোগ জানাতে হবে।</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-600 font-bold">⚠</span>
                      <span>কোল্ড-চেইন পণ্য (ইনসুলিন, ভ্যাকসিন) বিশেষ তাপমাত্রা সুরক্ষার জন্য ডেলিভারি পরবর্তী রিফান্ড প্রযোজ্য নয়, যদি না পণ্যটি ত্রুটিপূর্ণ হয়।</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Refund Timeline Table */}
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock size={18} className="text-emerald-600" />
                  রিফান্ড প্রসেসিং সময়সীমা (Processing Timeline)
                </h3>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-xs md:text-sm text-left">
                    <thead className="bg-slate-100/70 text-slate-700 font-bold">
                      <tr>
                        <th className="p-3">পেমেন্ট মাধ্যম</th>
                        <th className="p-3">প্রসেসিং সময়</th>
                        <th className="p-3">চার্জ / ফি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-medium text-slate-900 flex items-center gap-1.5">
                          <CreditCard size={14} className="text-sky-600" /> Shusto Wallet
                        </td>
                        <td className="p-3 text-emerald-600 font-bold">তাৎক্ষণিক (Instant)</td>
                        <td className="p-3 text-slate-500">বিনামূল্যে (০%)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-900">বিকাশ / নগদ / রকেট</td>
                        <td className="p-3 text-slate-700 font-medium">৩ – ৫ কার্যদিবস</td>
                        <td className="p-3 text-slate-500">গেটওয়ে ফি প্রযোজ্য হতে পারে</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-slate-900">ভিসা / মাস্টারকার্ড / ব্যাংক</td>
                        <td className="p-3 text-slate-700 font-medium">৫ – ৭ কার্যদিবস</td>
                        <td className="p-3 text-slate-500">ব্যাংক পলিসি অনুসারে</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* How to Claim Refund */}
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-2">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <HelpCircle size={16} className="text-sky-600" />
                  কীভাবে রিফান্ডের জন্য অনুরোধ করবেন?
                </h4>
                <p className="text-xs md:text-sm text-slate-600">
                  আপনার অর্ডারের ইনভয়েস আইডি অথবা বুকিং রেফারেন্স উল্লেখ করে আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন। 
                  আমাদের কাস্টমার সাপোর্ট টিম পর্যালোচনা করে ২৪ ঘণ্টার মধ্যে আপনার রিফান্ড অনুমোদন করবে।
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contact & Social Section */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">আমাদের সাথে যোগাযোগ ও সহায়তা</h3>
              <p className="text-xs text-slate-500">নীতিমালা বা রিফান্ড সম্পর্কিত যেকোনো তথ্যের জন্য সার্বক্ষণিক পাশে আছি</p>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href="mailto:shustobd@gmail.com" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold hover:bg-sky-100 transition-colors"
              >
                <Mail size={14} />
                shustobd@gmail.com
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700"
                >
                  <social.icon size={16} className={social.color} />
                  <span>@ShustoBD</span>
                </a>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">© 2026 Shusto BD. সর্বস্বত্ব সংরক্ষিত।</p>
          </div>
        </div>

      </div>
    </div>
  );
}
