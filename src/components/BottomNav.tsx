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

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onMenuClick: () => void;
}

export function BottomNav({ activeTab, setActiveTab, onMenuClick }: BottomNavProps) {
  const { user } = useAuth();
  
  const getDashboardIcon = () => {
    if (user?.role === 'admin') return Shield;
    if (user?.role === 'doctor') return Stethoscope;
    if (user?.role === 'pharmacy') return Pill;
    return Home;
  };

  const DashIcon = getDashboardIcon();

  const navItems = [
    { id: 'dashboard', icon: DashIcon, label: 'Home' },
    { id: 'doctors', icon: Search, label: 'Search' },
    { id: 'prescriptions', icon: Calendar, label: 'Schedule' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto">
      <div className="bg-[#121826] border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.35)] rounded-full px-3.5 py-2 flex items-center gap-3 sm:gap-5 backdrop-blur-md">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              className={cn(
                "transition-all duration-300 rounded-full flex items-center justify-center relative",
                isActive 
                  ? "w-11 h-11 bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-105" 
                  : "w-10 h-10 text-slate-400 hover:text-white"
              )}
            >
              <item.icon size={20} />
            </button>
          );
        })}
        
        {/* Menu drawer button */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="w-10 h-10 text-slate-400 hover:text-white flex items-center justify-center transition-colors border-l border-white/10 pl-2 ml-1"
        >
          <Menu size={20} />
        </button>
      </div>
    </nav>
  );
}
