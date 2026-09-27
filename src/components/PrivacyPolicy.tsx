import React, { useState } from 'react';
import { ArrowLeft, Shield, FileText, RotateCcw, Youtube, Instagram, Facebook, CheckCircle2, AlertCircle, Phone, Mail, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'refund'>('privacy');

  const socialLinks = [
    { name: 'Youtube', icon: Youtube, url: 'https://youtube.com/@ShustoBD', color: 'text-red-600' },
    { name: 'Instagram', icon: Instagram, url: 'https://instagram.com/ShustoBD', color: 'text-pink-600' },
    { name: 'Facebook', icon: Facebook, url: 'https://facebook.com/ShustoBD', color: 'text-blue-600' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-10 bg-white rounded-[36px] shadow-sm border border-slate-100">
      {/* Back Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-medium text-sm md:text-base cursor-pointer"
      >
        <ArrowLeft size={20} />
        অ্যাপে ফিরে যান
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
            <Shield size={26} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">আইনি ও নীতিমালাসংশ্লিষ্ট তথ্যাবলী</h1>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">সুস্থ (Shusto) প্ল্যাটফর্মের গোপনীয়তা নীতি, ব্যবহারের শর্তাবলী এবং রিফান্ড পলিসি</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-2xl mb-8 border border-slate-100">
        <button
          onClick={() => setActiveTab('privacy')}
          className={cn(
            "flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer",
            activeTab === 'privacy' 
              ? "bg-white text-sky-600 shadow-sm border border-slate-200/60" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          )}
        >
          <Shield size={18} />
          গোপনীয়তা নীতি
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={cn(
            "flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer",
            activeTab === 'terms' 
              ? "bg-white text-sky-600 shadow-sm border border-slate-200/60" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          )}
        >
          <FileText size={18} />
          শর্তাবলী (Terms)
        </button>
        <button
          onClick={() => setActiveTab('refund')}
          className={cn(
            "flex-1 min-w-[130px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer",
            activeTab === 'refund' 
              ? "bg-white text-sky-600 shadow-sm border border-slate-200/60" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
          )}
        >
          <RotateCcw size={18} />
          রিফান্ড পলিসি (Refund)
        </button>
      </div>

      {/* Content Areas */}
      <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
        {/* ===================== TAB 1: PRIVACY POLICY ===================== */}
        {activeTab === 'privacy' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-5 text-sm text-sky-900 flex items-start gap-3">
              <CheckCircle2 size={22} className="text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">আপনার তথ্যের সর্বোচ্চ সুরক্ষা আমাদের অগ্রাধিকার</strong>
                সুস্থ (Shusto) বাংলাদেশ টেলিমেডিসিন নীতিমালা ও আন্তর্জাতিক ডেটা সুরক্ষার নিয়ম মেনে রোগীদের ব্যক্তিগত ও স্বাস্থ্য তথ্য নিরাপদ রাখে।
              </div>
            </div>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">১. ভূমিকা ও পরিচিতি</h2>
              <p>
                সুস্থ (Shusto) বাংলাদেশের একটি উদ্ভাবনী ডিজিটাল স্বাস্থ্যসেবা ও টেলিমেডিসিন প্ল্যাটফর্ম (ওয়েবসাইট: <a href="https://shusto.com" target="_blank" rel="noreferrer" className="text-sky-600 underline">https://shusto.com</a>)। 
                এই গোপনীয়তা নীতিমালায় স্পষ্ট করা হয়েছে যে আমরা কীভাবে আপনার ব্যক্তিগত এবং চিকিৎসা সংক্রান্ত তথ্য সংগ্রহ, সংরক্ষণ, প্রক্রিয়াকরণ ও সুরক্ষা করি।
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">২. আমরা যেসকল তথ্য সংগ্রহ করি</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>ব্যক্তিগত সনাক্তকরণ তথ্য:</strong> নাম, মোবাইল নম্বর, ইমেইল ঠিকানা, বয়স, লিঙ্গ ও বর্তমান ঠিকানা।</li>
                <li><strong>চিকিৎসা ও স্বাস্থ্য সংক্রান্ত তথ্য:</strong> উপসর্গের বিবরণ, পূর্ববর্তী প্রেসক্রিপশন, ল্যাব টেস্ট রিপোর্ট এবং স্বাস্থ্য প্রোফাইল।</li>
                <li><strong>অর্থনৈতিক ও লেনদেন তথ্য:</strong> ওয়ালেট রিচার্জের লেনদেন আইডি (Transaction ID), উত্তোলনের বিবরণ এবং পেমেন্ট সংক্রান্ত মেটাডাটা। <em>(উল্লেখ্য: ক্রেডিট/ডেবিট কার্ড বা মোবাইল ব্যাংকিং পিন/ওটিপি আমরা সরাসরি সংরক্ষণ করি না; এটি বাংলাদেশ ব্যাংক অনুমোদিত SSLCommerz দ্বারা সরাসরি পরিচালিত হয়)</em>।</li>
                <li><strong>ডিভাইস ও লগ তথ্য:</strong> অ্যাপ ব্যবহারের সুবিধার্থে আইপি এড্রেস, অপারেটিং সিস্টেম ও ডিভাইস শনাক্তকারী ডেটা।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৩. তথ্যের ব্যবহার ও উদ্দেশ্য</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>নিবন্ধিত বিএমডিসি (BMDC) চিকিৎসকের সাথে সরাসরি অডিও/ভিডিও কনসালটেশন ও প্রেসক্রিপশন সেবা প্রদান।</li>
                <li>হোম নার্সিং, ফিজিওথেরাপি, ল্যাব টেস্ট ও অ্যাম্বুলেন্স সেবা সমন্বয় সাধন।</li>
                <li>সুস্থ ওয়ালেট ব্যালেন্স সংরক্ষণ, লেনদেনের স্বচ্ছতা ও সেবা বিলিং নিশ্চিতকরণ।</li>
                <li>গুরুত্বপূর্ণ নোটিফিকেশন, অ্যাপয়েন্টমেন্ট রিমাইন্ডার এবং হেলথ আপডেট প্রেরণ।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৪. ডেটা গোপনীয়তা ও তৃতীয় পক্ষের শেয়ারিং</h2>
              <p>
                আমরা কোনো অবস্থাতেই আপনার সংবেদনশীল চিকিৎসা তথ্য বা ফোন নম্বর বিজ্ঞাপনী সংস্থা বা অপরিচিত তৃতীয় পক্ষের কাছে বিক্রয় বা লিজ দিই না। 
                শুধুমাত্র আপনার সম্মতিক্রমে সেবা নিশ্চিত করার উদ্দেশ্যে নির্ধারিত ডাক্তার বা স্বাস্থ্যকর্মীর সাথে সংশ্লিষ্ট তথ্য প্রদর্শন করা হয়।
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৫. অ্যাকাউন্ট ও তথ্য মুছে ফেলার অধিকার (Data Deletion)</h2>
              <p>
                গুগল প্লে স্টোর ও ব্যবহারকারীর অধিকার রক্ষার্থে, যেকোনো ইউজার চাইলে তার অ্যাকাউন্ট এবং ব্যক্তিগত সমস্ত তথ্য মুছে ফেলার অনুরোধ করতে পারেন। 
                প্রোফাইল সেটিংস থেকে অথবা <span className="font-semibold text-slate-900">support@shusto.com</span> ঠিকানায় ইমেইল করে তথ্য ডিলিটেশনের আবেদন করা যাবে।
              </p>
            </section>
          </div>
        )}

        {/* ===================== TAB 2: TERMS & CONDITIONS ===================== */}
        {activeTab === 'terms' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-5 text-sm text-amber-900 flex items-start gap-3">
              <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">টেলিমেডিসিন ডিসক্লেইমার ও জরুরি স্বাস্থ্যসেবা</strong>
                সুস্থ (Shusto) একটি ডিজিটাল সমন্বয়ক স্বাস্থ্যসেবা প্ল্যাটফর্ম। তাৎক্ষণিক জীবনহানির ঝুঁকি বা জরুরি মেডিকেল ইমার্জেন্সির ক্ষেত্রে অবিলম্বে নিকটস্থ হাসপাতালের জরুরি বিভাগে যোগাযোগ করুন।
              </div>
            </div>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">১. শর্তাবলীর গ্রহণযোগ্যতা</h2>
              <p>
                সুস্থ (Shusto) অ্যাপ বা ওয়েবসাইট (<a href="https://shusto.com" className="text-sky-600 underline">shusto.com</a>) ব্যবহার করার মাধ্যমে আপনি এই ব্যবহারের নিয়মাবলী এবং নির্দেশিকা মেনে চলার ব্যাপারে পূর্ণ সম্মতি প্রদান করছেন।
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">২. ব্যবহারকারীর অ্যাকাউন্ট ও দায়িত্ব</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>অ্যাপে নিবন্ধনের সময় সঠিক ও বাস্তবসম্মত নাম, মোবাইল নম্বর ও তথ্য প্রদান করা বাধ্যতামূলক।</li>
                <li>আপনার অ্যাকাউন্টের পাসওয়ার্ড ও ওটিপি (OTP) সর্বদা গোপন রাখার দায়িত্ব সম্পূর্ণ আপনার।</li>
                <li>মিথ্যা তথ্য প্রদান, অননুমোদিত ব্যক্তির পরিচয়ে সেবা গ্রহণ বা প্ল্যাটফর্মের অপব্যবহার আইনত দণ্ডনীয়।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৩. ডাক্তার কনসালটেশন ও পরামর্শ</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>সুস্থ প্ল্যাটফর্মে সেবা প্রদানকারী সকল চিকিৎসক বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল (BMDC) নিবন্ধিত।</li>
                <li>টেলিমেডিসিন পরামর্শ রোগীর বর্ণিত লক্ষণ, পূর্ববর্তী রিপোর্ট ও ভিডিও পর্যবেক্ষণের ওপর ভিত্তি করে প্রদত্ত হয়।</li>
                <li>রোগীর শারীরিক অবস্থার পূর্ণাঙ্গ মূল্যায়নের জন্য চিকিৎসক যদি সরাসরি ক্লিনিকে পরীক্ষা-নিরীক্ষার পরামর্শ দেন, তবে তা অনুসরণ করা শ্রেয়।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৪. ওয়ালেট ও আর্থিক লেনদেন</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>সুস্থ ওয়ালেটে যুক্ত অর্থ সরাসরি চিকিৎসা ফি, ঔষধ ক্রয়, ল্যাব টেস্ট এবং স্বাস্থ্যসেবা গ্রহণের জন্য ব্যবহারযোগ্য।</li>
                <li>পেমেন্ট প্রসেসিংয়ের ক্ষেত্রে বাংলাদেশ ব্যাংকের অনুমোদিত পেমেন্ট গেটওয়ে (SSLCommerz, bKash, Nagad, Visa, Mastercard) ব্যবহৃত হয়।</li>
                <li>লেনদেনের কোনো অসামঞ্জস্য বা প্রযুক্তিগত ত্রুটির ক্ষেত্রে ২৪ ঘণ্টার মধ্যে হেল্পলাইনে জানাতে হবে।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৫. মেধা স্বত্ব ও কপিরাইট</h2>
              <p>
                সুস্থ (Shusto) লোগো, ইন্টারফেস ডিজাইন, কনটেন্ট এবং ব্র্যান্ডিং সম্পূর্ণ সুরক্ষিত বুদ্ধিবৃত্তিক সম্পদ। অনুমতি ব্যতিরেকে কোনো তথ্য কপি, পুনঃব্যবহার বা রিভার্স-ইঞ্জিনিয়ারিং করা নিষিদ্ধ।
              </p>
            </section>
          </div>
        )}

        {/* ===================== TAB 3: REFUND & CANCELLATION POLICY ===================== */}
        {activeTab === 'refund' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 text-sm text-emerald-900 flex items-start gap-3">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">স্বচ্ছ ও ১০০% নিরাপদ রিফান্ড গ্যারান্টি</strong>
                অপ্রত্যাশিত সেবা বাতিলের ক্ষেত্রে সুস্থ (Shusto) গ্রাহকের অর্থ সম্পূর্ণ স্বচ্ছতা এবং দ্রুততার সাথে ফেরত প্রদানে অঙ্গীকারবদ্ধ।
              </div>
            </div>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">১. ডক্টরস অ্যাপয়েন্টমেন্ট বাতিল ও রিফান্ড</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>রোগীর পক্ষ থেকে বাতিল:</strong> অ্যাপয়েন্টমেন্টের নির্ধারিত সময়ের অন্তত <strong>২ ঘণ্টা পূর্বে</strong> রোগী অ্যাপয়েন্টমেন্ট বাতিল করলে পরিশোধিত ফি-এর <strong>১০০% সম্পূর্ণ টাকা</strong> রোগীর সুস্থ ওয়ালেটে তৎক্ষণাৎ ফেরত প্রদান করা হবে।
                </li>
                <li>
                  <strong>ডাক্তারের অনুপস্থিতি বা বাতিল:</strong> যদি কোনো অনিবার্য কারণে চিকিৎসক নির্ধারিত সময়ে উপস্থিত না হতে পারেন বা কনসালটেশন বাতিল করেন, তবে রোগী তাৎক্ষণিক সম্পূর্ণ রিফান্ড পাবেন অথবা সুবিধাজনক পরবর্তী স্লটে বিনা মূল্যে স্থানান্তর করতে পারবেন।
                </li>
                <li>
                  <strong>লেট ক্যানসেলেশন:</strong> নির্ধারিত সময়ের ২ ঘণ্টার কম সময়ে বাতিল করলে চিকিৎসকের সংরক্ষিত সময়ের ক্ষতিপূরণ হিসেবে আংশিক চার্জ প্রযোজ্য হতে পারে।
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">২. পেমেন্ট গেটওয়ে ফেইলুর ও দ্বৈত চার্জ (Failed/Duplicate Transactions)</h2>
              <p>
                পেমেন্ট করার সময় গ্রাহকের ব্যাংক অ্যাকাউন্ট বা মোবাইল ব্যাংকিং থেকে অর্থ কেটে নেওয়া হয়েছে কিন্তু ইন্টারনেট সংযোগ বিভ্রাটের কারণে তা সুস্থ ওয়ালেটে তৎক্ষণাৎ জমা না হলে:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>আমাদের ব্যাকএন্ড সিস্টেম ও SSLCommerz অটো-ভ্যালিডেশনের মাধ্যমে সাধারণত ৫-১৫ মিনিটের মধ্যে ওয়ালেটে ব্যালেন্স রিচার্জ সমন্বয় করে দেয়।</li>
                <li>যদি কোনো কারণে সিস্টেম লেনদেন সফল না করতে পারে, তবে ব্যাংক বিধিমালা অনুযায়ী <strong>৩ থেকে ৭ কার্যদিবসের মধ্যে</strong> অর্থ স্বয়ংক্রিয়ভাবে গ্রাহকের মূল অ্যাকাউন্ট বা কার্ডে রিভার্স/রিফান্ড হয়ে যাবে।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৩. ওয়ালেট ব্যালেন্স উত্তোলন (Wallet Withdrawal Policy)</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>ব্যবহারকারী বা ডাক্তার যেকোনো সময় তাদের ওয়ালেটের বৈধ ব্যালেন্স বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে উত্তোলনের আবেদন করতে পারেন।</li>
                <li>উত্তোলনের আবেদন গ্রহণের পর প্রয়োজনীয় ভেরিফিকেশন সাপেক্ষে <strong>২৪ থেকে ৭২ ঘণ্টার মধ্যে</strong> অর্থ স্থানান্তর সম্পন্ন করা হয়।</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">৪. ঔষধ ও অন্যান্য স্বাস্থ্যসেবার রিফান্ড</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>ভুল বা ক্ষতিগ্রস্ত ঔষধ সরবরাহ করা হলে গ্রহণের সাথে সাথে ডেলিভারি প্রতিনিধির মাধ্যমে ফেরত দিয়ে তাৎক্ষণিক রিফান্ড বা সঠিক ঔষধ গ্রহণ করা যাবে।</li>
                <li>হোম নার্সিং, ফিজিওথেরাপি বা অ্যাম্বুলেন্স সেবা কর্মী পৌঁছানোর পূর্বে বাতিল করলে নির্দিষ্ট শর্তানুযায়ী পূর্ণ রিফান্ড প্রযোজ্য হবে।</li>
              </ul>
            </section>
          </div>
        )}

        {/* Contact and Support Section */}
        <section className="pt-8 border-t border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">যোগাযোগ ও হেল্পডেস্ক</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <Mail className="text-sky-600 shrink-0" size={20} />
              <div>
                <span className="text-xs text-slate-400 block font-medium">অফিসিয়াল ইমেইল</span>
                <span className="text-sm font-bold text-slate-800">support@shusto.com</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <Globe className="text-sky-600 shrink-0" size={20} />
              <div>
                <span className="text-xs text-slate-400 block font-medium">অফিসিয়াল ওয়েবসাইট</span>
                <a href="https://shusto.com" target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-600 hover:underline">
                  shusto.com
                </a>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
              <Phone className="text-sky-600 shrink-0" size={20} />
              <div>
                <span className="text-xs text-slate-400 block font-medium">কাস্টমার কেয়ার হেল্পলাইন</span>
                <span className="text-sm font-bold text-slate-800">+880 1700-000000</span>
              </div>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-800 mb-3">আমাদের সামাজিক মাধ্যম</h3>
          <div className="flex flex-wrap gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all border border-transparent hover:border-slate-100 group"
              >
                <social.icon size={20} className={cn("transition-colors", social.color)} />
                <span className="font-bold text-slate-700 group-hover:text-slate-900">@ShustoBD</span>
              </a>
            ))}
          </div>
        </section>

        <p className="text-xs md:text-sm text-slate-400 pt-6">
          সর্বশেষ সংস্করণ ও অনুমোদন: সেপ্টেম্বর, ২০২৬ | সুস্থ (Shusto Health Technologies Ltd.)
        </p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
