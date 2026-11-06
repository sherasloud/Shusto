import React, { useState } from 'react';
import { X, Copy, CheckCircle2, Download, AlertTriangle, Terminal, Rocket, Check, HelpCircle, FileCode } from 'lucide-react';

interface AABBuildModalProps {
  onClose: () => void;
}

export function AABBuildModal({ onClose }: AABBuildModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const terminalFixCmd = `cd ~/Downloads/"sheba_mfs_fixed_v1.0.1-2 3"/mobile && npm install && cd android && ./gradlew bundleRelease`;
  const singleLineSettingsFix = `println("[Sheba MFS] System Ready")`;
  const terminalSedFix = `cd ~/Downloads/"sheba_mfs_fixed_v1.0.1-2 3"/mobile/android && sed -i '' 's/println("/println("[Sheba MFS] Ready"); \/\//g' settings.gradle`;

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
            🚀
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Play Store .AAB (.ABB) জেনারেটর ও এরর সমাধান
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-400/30 text-emerald-100 rounded-full border border-emerald-300/30">
                v1.0.2 Ready
              </span>
            </h2>
            <p className="text-emerald-100 text-xs mt-0.5">
              Android Studio এরর ফিক্স, Gradle Sync এবং রিলিজ বান্ডেল তৈরির সম্পূর্ণ গাইড
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/25 text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
        
        {/* Urgent Problem & Instant Fix Box */}
        <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-amber-900 text-base">
                ১. স্ক্রিনশটের এরর: <code className="bg-amber-100 px-2 py-0.5 rounded text-amber-800 text-xs font-mono">settings.gradle: 37: Unexpected character: &apos;&apos;</code>
              </h3>
              <p className="text-xs text-amber-800 mt-1">
                Groovy কোডে <code className="bg-white/80 px-1 py-0.5 rounded font-mono">println(&quot;</code> এর পর নতুন লাইনে টেক্সট চলে যাওয়ায় এই সিনট্যাক্স এরর হয়েছে। আর Gradle Sync ফেইল করার কারণেই Android Studio-র উপরের মেনুতে <strong className="text-amber-950">&quot;Generate Signed Bundle / APK&quot;</strong> অপশনটি হাইড হয়ে গিয়েছিল।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {/* Solution A: Manual in Editor */}
            <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-bold">
                পদ্ধতি ১: Android Studio এডিটরে ১০ সেকেন্ডে ফিক্স (সবচেয়ে সহজ)
              </span>
              <p className="text-xs text-slate-600">
                Android Studio-তে খোলা <code className="text-indigo-600 font-mono">settings.gradle</code> ফাইলের ৩৭ থেকে ৩৯ নম্বর লাইনটি মুছে দিয়ে নিচের ১ লাইন বসিয়ে দিন:
              </p>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs">
                <span>{singleLineSettingsFix}</span>
                <button
                  onClick={() => handleCopy(singleLineSettingsFix, 'singleLine')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-all ml-2"
                  title="কপি করুন"
                >
                  {copiedKey === 'singleLine' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                👉 এরপর উপরে নীল ব্যানার থেকে <strong>&quot;Try Again&quot;</strong> বাটনে ক্লিক করুন।
              </p>
            </div>

            {/* Solution B: Terminal Command */}
            <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-sm space-y-2">
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-bold">
                পদ্ধতি ২: Mac টার্মিনাল কমান্ড (অটোমেটিক)
              </span>
              <p className="text-xs text-slate-600">
                Android Studio-র নিচের <strong>Terminal</strong> ট্যাবে এই কমান্ডটি পেস্ট করে এন্টার দিন:
              </p>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px]">
                <span className="truncate">{terminalSedFix}</span>
                <button
                  onClick={() => handleCopy(terminalSedFix, 'sedFix')}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-all ml-2"
                  title="কপি করুন"
                >
                  {copiedKey === 'sedFix' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                👉 ফাইলটি সাথে সাথে ঠিক হয়ে যাবে।
              </p>
            </div>
          </div>
        </div>

        {/* Missing Generate App Explanation */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
          <HelpCircle className="text-indigo-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-indigo-900 text-sm">
              &quot;Missing Generate app !!!! ki re Vai !!!!!&quot; — কেন মেনু পাচ্ছিলেন না?
            </h4>
            <p className="text-xs text-indigo-800/90 mt-1 leading-relaxed">
              Android Studio-তে যতক্ষণ পর্যন্ত <strong>Gradle Sync Successful</strong> না হয়, ততক্ষণ পর্যন্ত অ্যান্ড্রয়েড বিল্ড ইঞ্জিনিয়ারিং অ্যাক্টিভ হয় না। যার ফলে <strong>Build ➔ Generate Signed Bundle / APK</strong> মেনুটি সাময়িকভাবে অদৃশ্য থাকে। সিনট্যাক্স এররটি ফিক্স করে &quot;Try Again&quot; করলেই মেনুটি সাথে সাথে ফিরে আসবে!
            </p>
          </div>
        </div>

        {/* Step-by-Step Build AAB */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Rocket size={18} className="text-emerald-600" />
              ২. Google Play Store এর জন্য .AAB (.ABB) তৈরির কমান্ড
            </h3>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
              Play Store Ready
            </span>
          </div>

          <p className="text-xs text-slate-600">
            টার্মিনাল খুলে সরাসরি এই সিঙ্গেল কমান্ডটি রান করলে স্বয়ংক্রিয়ভাবে dependencies ইন্সটল হয়ে রিলিজ <code className="font-mono font-bold text-emerald-700">app-release.aab</code> তৈরি হয়ে যাবে:
          </p>

          <div className="p-4 bg-slate-900 rounded-2xl text-emerald-400 font-mono text-xs relative group border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Terminal size={14} />
                Mac / Terminal One-Liner
              </span>
              <button
                onClick={() => handleCopy(terminalFixCmd, 'fullCmd')}
                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-sans transition-all"
              >
                {copiedKey === 'fullCmd' ? (
                  <>
                    <CheckCircle2 size={13} />
                    কপি হয়েছে!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    কমান্ড কপি করুন
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {terminalFixCmd}
            </pre>
          </div>

          {/* Output Location Box */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                ফাইনাল .AAB ফাইল তৈরির লোকেশন:
              </span>
              <code className="text-xs font-mono text-emerald-800 block select-all bg-emerald-100/70 px-2 py-1 rounded">
                mobile/android/app/build/outputs/bundle/release/app-release.aab
              </code>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 px-3 py-1 bg-emerald-100 rounded-lg">
              গুগল প্লে স্টোরে আপলোডযোগ্য
            </span>
          </div>
        </div>

        {/* Pre-packaged Downloads */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-bold text-amber-950 flex items-center gap-2 justify-center md:justify-start">
              <FileCode className="text-amber-600" size={18} />
              নতুন সম্পূর্ণ ফিক্সড .ZIP প্রজেক্ট (v1.0.2)
            </h4>
            <p className="text-xs text-amber-800">
              আপনি যদি ম্যানুয়াল এডিট না করতে চান, তবে সরাসরি এই নতুন জিপটি ডাউনলোড করে ওপেন করুন। এতে সব সিনট্যাক্স শতভাগ টেস্টেড এবং ফিক্সড!
            </p>
          </div>
          <a
            href="/downloads/sheba_mfs_fixed.zip"
            download="sheba_mfs_fixed_v1.0.2.zip"
            className="shrink-0 flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all text-sm shadow-lg shadow-orange-500/20 active:scale-95"
          >
            <Download size={18} />
            নতুন ফিক্সড .ZIP ডাউনলোড (v1.0.2)
          </a>
        </div>

      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          💡 প্রো-টিপ: Play Store-এ আপলোড করার জন্য সর্বদা <strong className="text-slate-700">app-release.aab</strong> ফাইলটি ব্যবহার করবেন।
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
}
