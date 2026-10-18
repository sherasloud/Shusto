import React from 'react';
import { 
  Home, 
  Search, 
  Calendar, 
  User, 
  Menu,
  Shield,
  Stethoscope,
  Pill,
  Activity,
  Building,
  Truck,
  TestTube,
  Heart,
  Apple
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onMenuClick: () => void;
}

export function BottomNav({ activeTab, setActiveTab, onMenuClick }: BottomNavProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const getDashboardIcon = () => {
    if (user?.role === 'admin') return Shield;
    if (user?.role === 'doctor') return Stethoscope;
    if (user?.role === 'pharmacy') return Pill;
    return Home;
  };

  const DashIcon = getDashboardIcon();

  const navItems = [
    { id: 'dashboard', icon: DashIcon, label: t('home') },
    { id: 'doctors', icon: Search, label: t('search') },
    { id: 'prescriptions', icon: Calendar, label: t('schedule') },
    { id: 'profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50 flex items-center justify-center">
      <div className="bg-white border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] rounded-full px-6 py-4 flex items-center justify-between w-full max-w-md">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              className={cn(
                "transition-all duration-300 rounded-full p-3 flex items-center justify-center",
                isActive 
                  ? "bg-[#1DA1F2] text-white shadow-md shadow-[#1DA1F2]/30" 
                  : "text-slate-400 hover:text-[#1DA1F2]"
              )}
            >
              <item.icon size={22} />
            </button>
          );
        })}
        
        {/* Menu drawer button */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="text-slate-400 hover:text-[#1DA1F2] p-3 flex items-center justify-center transition-colors border-l border-slate-100 pl-4"
        >
          <Menu size={22} />
        </button>
      </div>
    </nav>
  );
}
