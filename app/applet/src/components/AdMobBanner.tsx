import React, { useEffect, useState } from 'react';
import { ExternalLink, ShieldCheck, Sparkles, ArrowRight, HeartPulse, Stethoscope, Award, Zap } from 'lucide-react';

interface AdMobBannerProps {
  className?: string;
  slot?: string;
  format?: 'banner' | 'leaderboard' | 'inline';
}

export const ADMOB_CONFIG = {
  appId: 'ca-app-pub-6924714223648831~1726254366',
  adUnitId: 'ca-app-pub-6924714223648831/8974188990',
  publisherId: 'ca-app-pub-6924714223648831'
};

const SPONSORED_ADS = [
  {
    id: 1,
    title: "Shusto Premium Health Card",
    desc: "Get up to 50% discount on tests, diagnostics & 24/7 doctor video consultation.",
    badge: "Featured Offer",
    cta: "Claim ৳500 Bonus",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    url: "#"
  },
  {
    id: 2,
    title: "24/7 Emergency Ambulance Service",
    desc: "Instant ICU & Oxygen ambulance dispatch across Bangladesh within 15 minutes.",
    badge: "Urgent Care",
    cta: "Call Now",
    gradient: "from-rose-600 via-red-600 to-orange-600",
    badgeBg: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    url: "#"
  },
  {
    id: 3,
    title: "Apollo Hospitals Dhaka",
    desc: "Book priority appointments with top specialists and surgeons with zero waiting time.",
    badge: "Top Partner",
    cta: "Book Appointment",
    gradient: "from-blue-600 via-indigo-600 to-violet-600",
    badgeBg: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    url: "#"
  }
];

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ 
  className = '', 
  slot = '8974188990', 
  format = 'banner' 
}) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Rotate ads every 5 seconds if not hovered
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % SPONSORED_ADS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered]);

  // Also try loading real AdMob script in background
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !(window as any).adsbygoogle) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_CONFIG.publisherId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch (e) {
      console.log('AdMob script note:', e);
    }
  }, []);

  const currentAd = SPONSORED_ADS[currentAdIndex];

  return (
    <div 
      className={`w-full overflow-hidden my-4 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative mx-auto max-w-4xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-xl border border-indigo-500/30 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-indigo-400/60">
        
        {/* Background glow & decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left info / badge */}
          <div className="flex items-start gap-3 w-full sm:w-auto">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${currentAd.gradient} shadow-lg shrink-0 flex items-center justify-center text-white animate-pulse`}>
              <HeartPulse size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentAd.badgeBg} flex items-center gap-1`}>
                  <Sparkles size={10} />
                  {currentAd.badge}
                </span>
                <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  Ad · Sponsored
                </span>
              </div>
              <h4 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                {currentAd.title}
              </h4>
              <p className="text-xs text-slate-300 line-clamp-1 sm:line-clamp-2 max-w-md mt-0.5">
                {currentAd.desc}
              </p>
            </div>
          </div>

          {/* Right action button & rotator indicators */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {SPONSORED_ADS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentAdIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === currentAdIndex ? 'w-6 bg-indigo-400' : 'w-1.5 bg-slate-600'}`}
                  title={`Go to ad ${idx + 1}`}
                />
              ))}
            </div>

            <button 
              onClick={() => {
                alert(`Redirecting to sponsor: ${currentAd.title}`);
              }}
              className={`px-4 py-2 bg-gradient-to-r ${currentAd.gradient} hover:opacity-90 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 group`}
            >
              <span>{currentAd.cta}</span>
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>

        {/* Hidden fallback / actual AdSense ins to keep Google publisher compliance active */}
        <div style={{ display: 'none' }}>
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={ADMOB_CONFIG.publisherId}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>

      </div>
    </div>
  );
};
