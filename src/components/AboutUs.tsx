import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Heart, 
  ShieldCheck, 
  GraduationCap, 
  Laptop, 
  Calendar, 
  Compass, 
  Globe, 
  Share2, 
  CheckCircle2,
  Quote
} from 'lucide-react';

interface AboutUsProps {
  onBack?: () => void;
}

export function AboutUs({ onBack }: AboutUsProps) {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack || (() => { window.history.back(); })}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {lang === 'bn' ? 'ভাষা' : 'Language'}
            </span>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                onClick={() => setLang('bn')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  lang === 'bn' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                  lang === 'en' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-10">
        {/* Founder Hero Card in user's requested soft sky blue */}
        <div className="relative overflow-hidden rounded-3xl bg-[#BAE6FD] bg-gradient-to-br from-[#BAE6FD] via-[#C9EEFD] to-[#A2DCF8] text-slate-900 p-6 sm:p-10 shadow-xl shadow-sky-200/50 border border-sky-200">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-sky-300/30 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            {/* Founder Image */}
            <div className="relative shrink-0">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl bg-white/60">
                <img 
                  src="https://i.postimg.cc/FKT9skQV/Image-1.jpg" 
                  alt="Siam" 
                  className="w-full h-full object-cover object-top"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/siam.jpg";
                  }}
                />
              </div>
            </div>

            {/* Intro text */}
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Siam
              </h1>

              <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-normal">
                {lang === 'bn' 
                  ? 'উদ্যোক্তা, সফটওয়্যার নির্মাতা এবং ডিজিটাল স্বাস্থ্যসেবা প্ল্যাটফর্ম "সুস্থ (Shusto)" এর প্রতিষ্ঠাতা ও সিইও। চতুর্থ শ্রেণিতে পড়ার বয়স থেকে শুরু হওয়া এক অদম্য স্বপ্নের বাস্তব রূপ।'
                  : 'Entrepreneur, Software Engineer, and Founder & CEO of Shusto. An unyielding dream that began in Grade 4 to revolutionize healthcare access across Bangladesh.'}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-1.5 bg-white/80 border border-sky-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 shadow-sm">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>shusto.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Quote Banner */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <Quote className="w-12 h-12 text-amber-200 absolute -top-2 -left-2 rotate-180 pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {lang === 'bn' ? 'সিয়ামের মূল প্রত্যয়' : "Siam's Core Philosophy"}
            </h3>
            <p className="text-base sm:text-lg font-serif italic text-slate-800 leading-relaxed">
              {lang === 'bn' 
                ? '“যা পুড়ে চলে গেছে ওইটা নিয়ে বলে কিছু হবে না; সামনে এগিয়ে যেতে হবে। আমি কোনো দিন সেই পরিমাণ স্বাবলম্বী হতে পারলে—দেশের প্রয়োজনে কাজ করব, কোনো ভোট বা রাজনৈতিক স্বার্থ ছাড়া।”'
                : '“There is no point lamenting what burned away in the past; we must push forward. If I can ever become truly self-reliant, I will dedicate myself to serving my country and its people—without seeking votes or political gain.”'}
            </p>
          </div>
        </div>

        {/* Timeline Story Section */}
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <Compass className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'স্বপ্নের পথচলা' : 'The Journey of Shusto'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {lang === 'bn' ? '২০১৮ থেকে আজ: একটি রক্তবিন্দু ও স্বপ্নের উপাখ্যান' : '2018 to Present: A Story of Grit and Dreams'}
            </h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              {lang === 'bn' 
                ? 'শূন্য পকেটে ও সাধারণ একটি ফোনে ক্লাস ফোরে শুরু হওয়া স্বপ্নের গল্প' 
                : 'How a fourth-grade boy with only a basic phone dared to dream of a national healthcare app.'}
            </p>
          </div>

          <div className="relative border-l-2 border-emerald-200 ml-4 sm:ml-8 space-y-8 pl-6 sm:pl-8 py-2">
            {/* 2018 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-md flex items-center justify-center text-white" />
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    2018
                  </span>
                  <span className="text-xs text-slate-400 font-medium">The Spark</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'প্রথম চিন্তা ও উদ্যোগ' : 'The First Idea & Developer Hiring'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'ছোটবেলা থেকেই ইচ্ছা ছিল দেশের মানুষের চিকিৎসা সহজ করতে একটি হেলথকেয়ার অ্যাপ তৈরি করার। সেই সময় একজন ডেভেলপার হায়ার করা হয়েছিল, কিন্তু ব্যস্ততার কারণে তিনি কাজ চালিয়ে নিতে পারেননি।'
                    : 'The initial vision began: building an accessible healthcare application for Bangladesh. A developer was hired, but due to personal busyness, progress stalled.'}
                </p>
              </div>
            </div>

            {/* 2019 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-teal-500 border-4 border-white shadow-md" />
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
                    2019
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Easy online Hospital bd Ltd</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'পরিকল্পনা ও নামকরণ' : 'Planning & First Company Name'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'নতুন করে গুছিয়ে প্ল্যান করা হলো এবং নাম রাখা হলো "Easy online Hospital bd Ltd"। কিন্তু টেকনিক্যাল আপডেট না আসার কারণে অপেক্ষা দীর্ঘ থেকে দীর্ঘতর হতে থাকে।'
                    : 'A formal plan was designed under the name "Easy online Hospital bd Ltd". However, consistent technical updates were absent and the project faced setbacks.'}
                </p>
              </div>
            </div>

            {/* 2020 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-rose-500 border-4 border-white shadow-md" />
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                    2020 (COVID-19)
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Class 4 Student</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'লকডাউন, ক্লাস ফোর এবং তীব্র সংকল্প' : 'Lockdown, Grade 4 & An Unstoppable Will'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'হঠাৎ একদিন স্কুলে গিয়ে দেখেন নোটিশ বোর্ডে অনির্দিষ্টকালের জন্য স্কুল বন্ধের ঘোষণা। মহামারীর সেই দিনগুলোতে ঘরবন্দি হয়ে রাস্তায় বের হয়ে দেখেন শুনশান নীরবতা—মানুষ হাসপাতালে যেতে পারছে না, আতঙ্ক আর কষ্ট। তখন সিয়াম মাত্র ক্লাস ফোরের ছাত্র! নিজের কোনো কম্পিউটার ছিল না, ছিল কেবল অনলাইন ক্লাসের সাধারণ একটি মোবাইল ফোন। সেই ফোনেই দিনরাত ইউটিউবে সার্চ করতেন: "How to develop an app?"। বহু বাধা আর হতাশার মাঝেও স্বপ্ন ছাড়েননি।'
                    : 'One day at school, the notice board announced school closures indefinitely due to COVID-19. Seeing deserted streets and people struggling for medical help, Siam realized: if he could launch a healthcare app, he could save lives. At that time, he was only in Class 4! With no laptop—only a basic phone for school classes—he spent hours searching YouTube on how to code apps.'}
                </p>
              </div>
            </div>

            {/* 2021 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-sky-500 border-4 border-white shadow-md" />
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-100 text-sky-800">
                    2021
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Action Over Words</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'অ্যাকশন নেওয়ার মানসিকতা' : 'Taking Action'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'শুধু ইচ্ছা পোষণ করলেই কিছু হয় না; বাস্তব পদক্ষেপ না নিলে কিছুই অর্জন সম্ভব নয়—এই মানসিকতা নিয়ে কোডিং ও সফটওয়্যার তৈরির খুঁটিনাটি শেখায় গভীর মনোনিবেশ করেন।'
                    : 'Believing that dreams without action are meaningless, Siam pushed himself forward, studying development fundamentals relentlessly.'}
                </p>
              </div>
            </div>

            {/* 2025 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-indigo-500 border-4 border-white shadow-md" />
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                    2025
                  </span>
                  <span className="text-xs text-slate-400 font-medium">shusto.com</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? '"Shusto" এর নামকরণ ও ল্যাপটপ বিক্রির ত্যাগ' : 'Naming "Shusto" & The Sacrifice of Laptop'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? 'প্রথমে নাম ভেবেছিলেন "Shasto" (স্বাস্থ্য), কিন্তু পরবর্তীতে তার চেয়েও সুন্দর ও অর্থবহ নাম মাথায় আসে—"Shusto" (সুস্থ)। ২৬ অক্টোবর, ২০২৫ তারিখে কিনে নেন ডোমেইন shusto.com। একটি সাধারণ ল্যাপটপ দিয়ে অ্যাপ তৈরির কাজ শুরু করেন। কিন্তু পরিবারের চরম আর্থিক সংকটের সময় পরিবারের পাশে দাঁড়াতে নিজের একমাত্র ল্যাপটপটি মাত্র ৩৫,০০০ টাকায় বিক্রি করে দিতে হয়। দীর্ঘদিন কাজ থমকে ছিল।'
                    : 'Contemplating names, he initially considered "Shasto", but discovered a warmer, more hopeful name: "Shusto". On October 26, 2025, he acquired shusto.com. Development started on a laptop. However, during family financial hardship, he sacrificed his laptop—selling it for 35,000 BDT to help his family.'}
                </p>
              </div>
            </div>

            {/* 2026 */}
            <div className="relative group">
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full bg-emerald-600 border-4 border-white shadow-md" />
              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                    2026
                  </span>
                  <span className="text-xs text-emerald-600 font-bold">MacBook, Xcode & Launch</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'bn' ? 'ম্যাকবুক, রাতজাগা পরিশ্রম ও পূর্ণাঙ্গ সুস্থ অ্যাপ' : 'New MacBook, Sleepless Nights & Shusto Live'}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'bn'
                    ? '৫ মে, ২০২৬ পুরো পরিবার নিয়ে যমুনা ফিউচার পার্কে গিয়ে ৪৫,০০০ টাকায় ম্যাকবুক কেনেন। ৬ মে সেটি বদলে অ্যাপল ইকোসিস্টেমের উপযোগী করেন যাতে এক্সকোড (Xcode) ও অ্যান্ড্রয়েড স্টুডিও দিয়ে গুগল প্লে এবং অ্যাপ স্টোরে অ্যাপ দেওয়া যায়। প্রতিদিন রাত ১টা, ২টা, ভোর ৩টা পর্যন্ত একটানা কোডিং করে গড়ে তোলেন আজকের এই পূর্ণাঙ্গ "সুস্থ" হেলথকেয়ার অ্যাপ।'
                    : 'On May 5, 2026, the family visited Jamuna Future Park and purchased a MacBook for 45,000 BDT. On May 6, it was upgraded to support modern Xcode and Android builds. Coding through nights until 1 AM, 2 AM, and even 3 AM, Siam engineered Shusto into a production-grade healthcare suite.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {lang === 'bn' ? 'Time is Priceless' : 'Time is Priceless'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'bn'
                ? 'সময় অমূল্য। অতীতের আফসোস নয়, বর্তমানের প্রতিটি মুহূর্তকে কাজে লাগিয়ে মানুষের জীবনে ইতিবাচক পরিবর্তন আনা।'
                : 'Every second counts. Rather than regretting lost time, seize today to build meaningful impact.'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {lang === 'bn' ? 'নিঃস্বার্থ সেবা' : 'Selfless Service'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'bn'
                ? 'কোনো ভোট বা রাজনৈতিক উদ্দেশ্য ছাড়া কেবল দেশের সাধারণ মানুষের সুস্বাস্থ্যের প্রয়োজনে কাজ করা।'
                : 'Dedicated to serving the nation purely for public welfare, free from any political motives.'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {lang === 'bn' ? 'আর্থিক স্বাধীনতা ও সংগ্রাম' : 'Resilience & Freedom'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {lang === 'bn'
                ? 'মধ্যবিত্ত পরিবারের লড়াই থেকে উঠে এসে নিজের দক্ষতায় স্বাবলম্বী হওয়া এবং অন্যের পাশে দাঁড়ানো।'
                : 'Rising through financial hardships with grit, code, and relentless dedication.'}
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-4 pb-10 space-y-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400">
            Shusto Healthcare Platform • Founded by Siam
          </p>
          <p className="text-xs text-slate-400">
            © 2026 Shusto BD (shusto.com). All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
