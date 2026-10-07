import React, { useEffect, useRef } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

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

export const AdMobBanner: React.FC<AdMobBannerProps> = ({ 
  className = '',
  slot = '8974188990',
  format = 'banner' 
}) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Load Google AdSense / AdMob web script dynamically if not present
      if (typeof window !== 'undefined' && !(window as any).adsbygoogle) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADMOB_CONFIG.publisherId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      // Push ad to queue
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (e) {
      console.log('AdMob script initialization note:', e);
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden my-3 ${className}`}>
      <div className="relative mx-auto max-w-4xl bg-gradient-to-r from-slate-50 via-white to-sky-50 border border-slate-200/80 rounded-2xl p-2.5 shadow-sm transition-all hover:border-sky-300">
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-semibold">Ad</span>
            <span>Google AdMob Partner</span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck size={11} className="text-emerald-500" />
            Verified
          </span>
        </div>

        {/* Ad Container */}
        <div ref={adRef} className="flex justify-center items-center min-h-[60px] bg-slate-100/60 rounded-xl overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '60px', textAlign: 'center' }}
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
