import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ArrowRight, Activity } from 'lucide-react';

interface WelcomeProps {
  onFinish: () => void;
}

export function Welcome({ onFinish }: WelcomeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const SLIDES = [
    {
      image: "https://i.postimg.cc/HWMYLkGG/Image.jpg",
      title: "সহজ স্বাস্থ্যসেবা",
      description: "আপনার দোরগোড়ায় সম্পূর্ণ ডিজিটাল চিকিৎসাসেবা ও পরামর্শ পৌঁছে দিতে Shusto সদা প্রস্তুত।",
      bg: "bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-teal-500/10"
    },
    {
      image: "https://i.postimg.cc/HWMYLkGG/Image.jpg",
      title: "অভিজ্ঞ ডাক্তার ও পরামর্শ",
      description: "বাংলাদেশর যেকোনো প্রান্ত থেকে অভিজ্ঞ ডাক্তারদের সাথে সরাসরি ভিডিও কলে কনসালটেশন নিন ও ডিজিটাল প্রেসক্রিপশন পান।",
      bg: "bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-sky-500/10"
    }
  ];

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageLoaded(false);
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFinish();
  };

  const slide = SLIDES[currentSlide];

  return (
    <div 
      className={`fixed inset-0 z-[1000] bg-white flex flex-col select-none cursor-pointer overflow-hidden w-full h-full`}
      onClick={() => handleNext()}
    >
      {/* Absolute Top Bar */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">Shusto</span>
        </div>
        <button 
          onClick={handleSkip}
          className="px-4 py-2 bg-slate-100/80 backdrop-blur hover:bg-slate-200/90 text-slate-600 hover:text-slate-800 font-semibold text-sm rounded-full transition-all border border-slate-200/50"
        >
          এড়িয়ে যান
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={`relative w-full h-full flex flex-col justify-between ${slide.bg} p-6 pt-24 pb-32`}
          style={{ transform: 'translateZ(0)' }}
        >
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center gap-8">
            {/* Onboarding Image Container */}
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border border-white bg-slate-50 flex items-center justify-center">
              {/* Fallback Loader Graphic */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 p-6 text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-xs font-medium">ছবি লোড হচ্ছে...</p>
              </div>

              <img 
                src={slide.image} 
                alt={slide.title} 
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ 
                  imageRendering: '-webkit-optimize-contrast',
                  WebkitFontSmoothing: 'antialiased',
                }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Slide Title and Description */}
            <div className="space-y-3 px-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug">
                {slide.title}
              </h2>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-sm mx-auto">
                {slide.description}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Absolute Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 z-50 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 pb-8 px-6 flex flex-col items-center gap-6">
        {/* Progress dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-200'}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full max-w-md flex justify-between items-center gap-4">
          <p className="text-xs text-slate-400 font-medium animate-pulse hidden sm:block">
            যেকোনো জায়গায় ট্যাপ করে সামনে যান
          </p>
          
          <button 
            onClick={handleNext}
            className="w-full sm:w-auto ml-auto px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            {currentSlide === SLIDES.length - 1 ? (
              <>
                <span>শুরু করুন</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>পরবর্তী</span>
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

