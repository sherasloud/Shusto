import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeStorage } from './utils/safeStorage';

export type Language = 'bn' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (bnOrKey: string, enFallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'bn',
  setLang: () => {},
  t: (bn) => bn,
});

// Comprehensive UI translations map
const TRANSLATIONS: Record<string, { bn: string; en: string }> = {
  // Navigation & Menu
  dashboard: { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  home: { bn: 'হোম', en: 'Home' },
  search: { bn: 'অনুসন্ধান', en: 'Search' },
  schedule: { bn: 'সময়সূচী', en: 'Schedule' },
  profile: { bn: 'প্রোফাইল', en: 'Profile' },
  my_orders: { bn: 'আমার অর্ডার', en: 'My Orders' },
  messages: { bn: 'মেসেজ', en: 'Messages' },
  wallet: { bn: 'ওয়ালেট', en: 'Wallet' },
  shop: { bn: 'শপ (Shop)', en: 'Shop' },
  medicine_store: { bn: 'ঔষধ স্টোর', en: 'Medicine Store' },
  prescriptions: { bn: 'প্রেসক্রিপশন', en: 'Prescriptions' },
  doctors: { bn: 'ডাক্তার', en: 'Doctors' },
  lab_tests: { bn: 'ল্যাব টেস্ট', en: 'Lab Tests' },
  physio: { bn: 'ফিজিওথেরাপি', en: 'Physiotherapy' },
  hospital: { bn: 'হাসপাতাল', en: 'Hospitals' },
  ambulance: { bn: 'অ্যাম্বুলেন্স', en: 'Ambulance' },
  nursing: { bn: 'নার্সিং সার্ভিস', en: 'Nursing Service' },
  nutritionist: { bn: 'পুষ্টিবিদ', en: 'Nutritionist' },
  about_us: { bn: 'আমাদের গল্প ও সিইও', en: 'About Us & CEO' },
  settings: { bn: 'সেটিংস', en: 'Settings' },
  privacy_policy: { bn: 'গোপনীয়তা ও শর্তাবলী', en: 'Privacy & Terms' },
  logout: { bn: 'লগআউট', en: 'Log Out' },

  // Common UI & Actions
  save: { bn: 'সেভ করুন', en: 'Save' },
  cancel: { bn: 'বাতিল করুন', en: 'Cancel' },
  back: { bn: 'ফিরে যান', en: 'Back' },
  edit: { bn: 'এডিট করুন', en: 'Edit' },
  delete: { bn: 'মুছে ফেলুন', en: 'Delete' },
  confirm: { bn: 'নিশ্চিত করুন', en: 'Confirm' },
  loading: { bn: 'লোড হচ্ছে...', en: 'Loading...' },
  book_now: { bn: 'সিরিয়াল বুক করুন', en: 'Book Now' },
  call_now: { bn: 'কল করুন', en: 'Call Now' },
  order_now: { bn: 'অর্ডার করুন', en: 'Order Now' },
  view_details: { bn: 'বিস্তারিত দেখুন', en: 'View Details' },
  success: { bn: 'সফল হয়েছে', en: 'Success' },
  error: { bn: 'ত্রুটি', en: 'Error' },

  // Headers & Search
  welcome: { bn: 'স্বাগতম', en: 'Welcome' },
  search_placeholder: { bn: 'ডাক্তার, ওষুধ বা হাসপাতাল খুঁজুন...', en: 'Search doctors, medicines or hospitals...' },
  emergency_helplines: { bn: 'জরুরি হেল্পলাইন', en: 'Emergency Helplines' },
  national_emergency: { bn: 'জাতীয় জরুরি সেবা', en: 'National Emergency Service' },
  health_call_center: { bn: 'স্বাস্থ্য বাতায়ন', en: 'Health Call Center' },

  // Settings
  app_settings: { bn: 'অ্যাপ সেটিংস', en: 'App Settings' },
  language_selection: { bn: 'ভাষা নির্বাচন (Language)', en: 'Language Selection' },
  notifications_alerts: { bn: 'নোটিফিকেশন ও অ্যালার্ট', en: 'Notifications & Alerts' },
  medicine_reminders: { bn: 'ঔষধ খাওয়ার রিমাইন্ডার', en: 'Medication Reminders' },
  appointment_alerts: { bn: 'ডাক্তার অ্যাপয়েন্টমেন্ট অ্যালার্ট', en: 'Doctor Appointment Alerts' },
  blood_requests: { bn: 'জরুরি রক্তের আবেদন', en: 'Emergency Blood Requests' },
  sound_vibrate: { bn: 'শব্দ ও ভাইব্রেশন', en: 'Sound & Vibration' },
  data_storage: { bn: 'ডাটা ও স্টোরেজ', en: 'Data & Storage' },
  clear_cache: { bn: 'ক্যাশ পরিষ্কার করুন', en: 'Clear Cache' },
  about_founder: { bn: 'আমাদের গল্প ও পরিচিতি', en: 'About Shusto & Founder' },
  support_help: { bn: 'সহায়তা ও হটলাইন', en: 'Support & Hotline' },
  version_info: { bn: 'ভার্সন', en: 'Version' },

  // Profile
  my_profile: { bn: 'আমার প্রোফাইল', en: 'My Profile' },
  edit_profile: { bn: 'প্রোফাইল এডিট করুন', en: 'Edit Profile' },
  email_address: { bn: 'ইমেইল ঠিকানা', en: 'Email Address' },
  division: { bn: 'বিভাগ (Division)', en: 'Division' },
  district: { bn: 'জেলা (District)', en: 'District' },
  area_location: { bn: 'এলাকা (Area / Location)', en: 'Area / Location' },
  current_address: { bn: 'বর্তমান ঠিকানা', en: 'Current Address' },
  delete_account: { bn: 'অ্যাকাউন্ট মুছে ফেলুন (Delete Account)', en: 'Delete Account' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    return (safeStorage.getItem('shusto_lang') as Language) || 'bn';
  });

  useEffect(() => {
    const handleCustomChange = (e: any) => {
      if (e.detail && (e.detail === 'bn' || e.detail === 'en')) {
        setLangState(e.detail);
      }
    };
    window.addEventListener('shusto_lang_change', handleCustomChange);
    return () => window.removeEventListener('shusto_lang_change', handleCustomChange);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    safeStorage.setItem('shusto_lang', newLang);
    window.dispatchEvent(new CustomEvent('shusto_lang_change', { detail: newLang }));
  };

  /**
   * Helper function t():
   * Usage 1: t('প্রোফাইল', 'Profile') -> returns 'Profile' if lang === 'en', else 'প্রোফাইল'
   * Usage 2: t('settings') -> looks up key 'settings' from TRANSLATIONS dictionary
   */
  const t = (bnOrKey: string, enFallback?: string): string => {
    // If enFallback is explicitly provided:
    if (enFallback !== undefined) {
      return lang === 'en' ? enFallback : bnOrKey;
    }

    // If key exists in dictionary:
    const item = TRANSLATIONS[bnOrKey];
    if (item) {
      return lang === 'en' ? item.en : item.bn;
    }

    // Default return
    return bnOrKey;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
