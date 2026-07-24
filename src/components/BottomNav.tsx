import React from 'react';
import { 
  Home, 
  Package, 
  Wallet, 
  User,
  Menu,
  Shield,
  Stethoscope,
  Pill,
  Activity,
  Building,
  Truck,
  TestTube
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
  
  // Tabs that are most important for quick access
  const getDashboardInfo = () => {
    if (user?.role === 'admin') return { label: 'অ্যাডমিন', icon: Shield };
    if (user?.role === 'doctor') return { label: 'ডাক্তার', icon: Stethoscope };
    if (user?.role === 'pharmacy') return { label: 'স্টেট', icon: Pill };
    if (user?.role === 'physio') return { label: 'ফিজিওথেরাপি', icon: Activity };
    if (user?.role === 'hospital') return { label: 'হাসপাতাল', icon: Building };
    if (user?.role === 'ambulance') return { label: 'অ্যাম্বুলেন্স', icon: Truck };
    if (user?.role === 'lab') return { label: 'ল্যাব', icon: TestTube };
    return { label: 'হোম', icon: Home };
  };

  const dashInfo = getDashboardInfo();
  
  const tabs = [
    { id: 'dashboard', ...dashInfo },
    { id: 'orders', label: 'অর্ডার', icon: Package },
    { id: 'wallet', label: 'ওয়ালেট', icon: Wallet },
    { id: 'profile', label: 'প্রোফাইল', icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] px-6 py-4 z-50 flex items-center justify-between">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 relative"
          >
            <div className={cn(
              "p-2 rounded-2xl transition-all duration-300",
              isActive ? "bg-sky-500 text-white scale-110 shadow-lg shadow-sky-500/20" : "text-slate-400"
            )}>
              <tab.icon size={22} />
            </div>
            {isActive && (
              <span className="text-[10px] font-bold text-sky-600 mt-1">{tab.label}</span>
            )}
          </button>
        );
      })}
      
      {/* Menu Button to trigger the full sidebar */}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center gap-1 text-slate-400 p-2"
      >
        <Menu size={22} />
        <span className="text-[10px] font-medium opacity-0">মেনু</span>
      </button>
    </nav>
  );
}
