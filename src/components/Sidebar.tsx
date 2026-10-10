import React from 'react';
import { useAuth } from '../AuthContext';
import { useLanguage } from '../LanguageContext';
import { 
  LayoutDashboard, 
  Pill, 
  FileText, 
  Stethoscope, 
  TestTube, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  Shield,
  Activity,
  Building,
  Truck,
  FlaskConical,
  Wallet,
  RefreshCcw,
  Package,
  MessageCircle,
  LogIn,
  DollarSign,
  Store,
  Heart,
  Apple,
  Sparkles,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const { user, logout, forceSync } = useAuth();
  const { t } = useLanguage();

  const getMenuItems = () => {
    const commonItems = [
      { id: 'profile', label: t('profile'), icon: UserIcon },
      { id: 'messages', label: t('messages'), icon: MessageCircle },
      { id: 'orders', label: t('my_orders'), icon: Package },
      { id: 'wallet', label: t('wallet'), icon: Wallet },
      { id: 'new-shop', label: t('shop'), icon: Store },
      { id: 'medicine', label: t('medicine_store'), icon: Pill },
      { id: 'prescriptions', label: t('prescriptions'), icon: FileText },
      { id: 'doctors', label: t('doctors'), icon: Stethoscope },
      { id: 'lab', label: t('lab_tests'), icon: TestTube },
      { id: 'physio', label: t('physio'), icon: Activity },
      { id: 'hospital', label: t('hospital'), icon: Building },
      { id: 'ambulance', label: t('ambulance'), icon: Truck },
      { id: 'nursing', label: t('nursing'), icon: Heart },
      { id: 'nutritionist', label: t('nutritionist'), icon: Apple },
      { id: 'about', label: t('about_us'), icon: Sparkles },
      { id: 'settings', label: t('settings'), icon: SettingsIcon },
      { id: 'privacy', label: t('privacy_policy'), icon: Shield },
    ];

    let dashboardItem = { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard };

    if (user?.role === 'admin') {
      dashboardItem = { id: 'dashboard', label: t('অ্যাডমিন প্যানেল', 'Admin Panel'), icon: Shield };
    } else if (user?.role === 'investor') {
      dashboardItem = { id: 'dashboard', label: t('ইনভেস্টর প্যানেল', 'Investor Panel'), icon: DollarSign };
    } else if (user?.role === 'manager') {
      dashboardItem = { id: 'dashboard', label: t('ম্যানেজার প্যানেল', 'Manager Panel'), icon: Shield };
    } else if (user?.role === 'doctor') {
      dashboardItem = { id: 'dashboard', label: t('ডাক্তার প্যানেল', 'Doctor Panel'), icon: Stethoscope };
    } else if (user?.role === 'pharmacy') {
      dashboardItem = { id: 'dashboard', label: t('স্টেট প্যানেল (State)', 'State Panel'), icon: Pill };
    } else if (user?.role === 'physio') {
      dashboardItem = { id: 'dashboard', label: t('ফিজিওথেরাপি প্যানেল', 'Physiotherapy Panel'), icon: Activity };
    } else if (user?.role === 'hospital') {
      dashboardItem = { id: 'dashboard', label: t('হাসপাতাল প্যানেল', 'Hospital Panel'), icon: Building };
    } else if (user?.role === 'ambulance') {
      dashboardItem = { id: 'dashboard', label: t('অ্যাম্বুলেন্স প্যানেল', 'Ambulance Panel'), icon: Truck };
    } else if (user?.role === 'lab') {
      dashboardItem = { id: 'dashboard', label: t('ল্যাব প্যানেল', 'Lab Panel'), icon: FlaskConical };
    } else if (user?.role === 'nursing') {
      dashboardItem = { id: 'dashboard', label: t('নার্সিং প্যানেল', 'Nursing Panel'), icon: Heart };
    } else if (user?.role === 'nutritionist') {
      dashboardItem = { id: 'dashboard', label: t('পুষ্টিবিদ প্যানেল', 'Nutritionist Panel'), icon: Apple };
    }

    return [dashboardItem, ...commonItems];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex flex-col items-center gap-4 mb-10 px-2 text-center">
            <div className="w-20 h-20 bg-white border border-slate-100 rounded-[24px] flex items-center justify-center overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
              <img 
                src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
                alt="Shusto Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Shusto</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100/50">
                  {user?.role === 'admin' ? 'অ্যাডমিন প্যানেল' : 
                   user?.role === 'investor' ? 'ইনভেস্টর' :
                   user?.role === 'manager' ? 'ম্যানেজার' :
                   user?.role === 'doctor' ? 'ডাক্তার প্যানেল' : 
                   user?.role === 'pharmacy' ? 'স্টেট (State)' : 
                   user?.role === 'physio' ? 'ফিজিওথেরাপি' : 
                   user?.role === 'hospital' ? 'হাসপাতাল' : 
                   user?.role === 'ambulance' ? 'অ্যাম্বুলেন্স' : 
                   user?.role === 'lab' ? 'ল্যাব প্যানেল' : 
                   user?.role === 'nursing' ? 'নার্সিং প্যানেল' : 
                   user?.role === 'nutritionist' ? 'পুষ্টিবিদ প্যানেল' : 'পেশেন্ট অ্যাপ'}
                </span>
                <button 
                  onClick={() => forceSync()}
                  className="p-1 text-slate-400 hover:text-sky-500 transition-colors"
                  title="Sync Role"
                >
                  <RefreshCcw size={10} />
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-hide py-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all",
                  activeTab === item.id 
                    ? "bg-sky-50 text-sky-600" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full border-2 border-sky-100 overflow-hidden bg-white shrink-0">
                <img 
                  src={user?.photoURL || "https://i.postimg.cc/HWMYLkGG/Image.jpg"} 
                  alt="Profile" 
                  className={cn("w-full h-full object-cover", !user?.photoURL && "p-1.5 opacity-60")}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <LogIn size={10} className="text-emerald-500" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Logged In</p>
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate">{(user as any)?.name || user?.displayName}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}
    </>
  );
}
