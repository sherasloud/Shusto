import React, { useEffect, useState } from 'react';
import { Search, ShoppingCart, Filter, X, Plus, Loader2, ChevronRight, Truck, GripVertical, Save, Camera } from 'lucide-react';
import { collection, query, addDoc, where, getDocs, limit, startAfter, orderBy, QueryDocumentSnapshot, DocumentData, doc, getDoc, updateDoc, increment, runTransaction, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { MEDICINE_PRESETS } from '../constants/medicinesData';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { distributeCommissions } from '../utils/commissions';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  generic?: string;
  company?: string;
}

interface CartItem extends Medicine {
  quantity: number;
}

function SortableMedicineCard({ med, isReordering, addToCart, isAdmin }: { med: Medicine, isReordering: boolean, addToCart: (m: Medicine) => void, isAdmin: boolean, key?: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: med.id, disabled: !isReordering });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpdateImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 1MB for Firestore field limit and performance)
    if (file.size > 1024 * 1024) {
      alert('ইমেজ সাইজ ১এমবি এর নিচে হতে হবে। (Image must be under 1MB)');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        const medRef = doc(db, 'medicines', med.id);
        await updateDoc(medRef, { 
          image: base64String,
          updatedAt: new Date().toISOString()
        });
        alert('ইমেজ আপডেট সফল হয়েছে!');
        window.location.reload(); 
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error updating image:", error);
      alert('ইমেজ আপডেট করতে সমস্যা হয়েছে।');
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-3xl border border-slate-100 overflow-hidden group transition-all h-full flex flex-col",
        isReordering ? "cursor-grab active:cursor-grabbing border-amber-200 ring-2 ring-amber-100" : "hover:shadow-xl hover:shadow-slate-200/50"
      )}
    >
      <div className="aspect-square overflow-hidden relative bg-slate-50 flex items-center justify-center p-2">
        {isReordering && (
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <GripVertical size={16} />
          </div>
        )}
        
        {isAdmin && !isReordering && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleUpdateImage} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 text-sky-500 hover:text-sky-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Change Image"
            >
              <Camera size={16} />
            </button>
          </>
        )}

        <img 
          src={med.image || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800`} 
          alt={med.name} 
          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800';
          }}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <span className="px-2 py-0.5 bg-sky-500 text-white text-[10px] font-bold rounded-md shadow-sm uppercase tracking-tighter">
            {med.category}
          </span>
          {med.company && (
            <span className="px-2 py-0.5 bg-slate-900/5 backdrop-blur-md text-slate-900 text-[9px] font-black rounded-md uppercase tracking-tighter border border-slate-900/5">
              {med.company}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{med.name}</h3>
        <div className="flex flex-col gap-0.5 mb-4 flex-1">
          <p className="text-xs font-medium text-sky-600 line-clamp-1">{med.generic}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider line-clamp-1">{med.company}</p>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xl font-bold text-sky-600">৳{med.price}</span>
          <button 
            onClick={() => !isReordering && addToCart(med)}
            disabled={isReordering}
            className={cn(
              "px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap",
              isReordering ? "bg-slate-200 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            কার্টে যোগ করুন
          </button>
        </div>
      </div>
    </div>
  );
}

export function MedicineStore() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [nearestPharmacy, setNearestPharmacy] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMedicines((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const findNearestPharmacy = async () => {
      const pharmaciesQuery = query(collection(db, 'pharmacies'), limit(20));
      const snapshot = await getDocs(pharmaciesQuery);
      const providers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      const userLoc = {
        division: (user as any).division || '',
        district: (user as any).district || '',
        thana: (user as any).thana || ''
      };

      const scored = providers.map(p => {
        let score = 0;
        if (p.division === userLoc.division) {
          score += 1;
          if (p.district === userLoc.district) {
            score += 2;
            if (p.thana === userLoc.thana) {
              score += 4;
            }
          }
        }
        return { ...p, score };
      }).sort((a, b) => b.score - a.score);

      if (scored.length > 0 && scored[0].score > 0) {
        setNearestPharmacy(scored[0]);
      } else {
        setNearestPharmacy(providers[0] || null);
      }
    };

    findNearestPharmacy();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'medicines'), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Medicine));
      setMedicines(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore medicines error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (medicine: Medicine) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      if (existing) {
        return prev.map(item => item.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...medicine, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const categories = ['All', 'Fever & Pain', 'Gastric', 'Allergy', 'Antibiotic', 'Diabetes', 'Blood Pressure', 'Asthma', 'Anxiety', 'Supplements', 'Nutrition'];

  const total = cart.reduce((sum, item) => {
    const p = String(item.price).match(/\d+/) ? Number(String(item.price).match(/\d+/)![0]) : 0;
    return sum + (p * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    if (total <= 0) {
      alert("অর্ডার করার মতো কোনো পণ্য নেই।");
      return;
    }

    setOrderStatus('ordering');
    try {
      const adminQuery = query(collection(db, 'users'), where('email', '==', 'shustobd@gmail.com'), limit(1));
      const adminSnap = await getDocs(adminQuery);
      if (adminSnap.empty) throw new Error('admin_not_found');
      const adminUid = adminSnap.docs[0].id;
      
      await runTransaction(db, async (transaction) => {
        const walletRef = doc(db, 'wallets', user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        
        const [walletSnap, userDoc] = await Promise.all([
          transaction.get(walletRef),
          transaction.get(userDocRef)
        ]);

        const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;
        const userData = userDoc.data();

        if (balance < total) {
          throw new Error('insufficient_balance');
        }

        const adminWalletRef = doc(db, 'wallets', adminUid);

        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          userId: user.uid,
          userName: user.displayName || user.email,
          userLocation: (user as any).location || 'Unknown',
          items: cart.map(item => `${item.name} x${item.quantity}`),
          total,
          status: 'pending',
          providerId: nearestPharmacy?.userId || nearestPharmacy?.id || 'admin',
          providerName: nearestPharmacy?.name || 'Main Store',
          providerEmail: nearestPharmacy?.email?.toLowerCase().trim() || 'shustobd@gmail.com',
          providerType: 'pharmacy',
          createdAt: new Date().toISOString()
        });

        transaction.update(walletRef, {
          balance: increment(-total),
          updatedAt: new Date().toISOString()
        });

        let adminBonus = total;
        
        // Distribute multi-level commissions
        adminBonus = await distributeCommissions(
          transaction,
          user.uid,
          total,
          adminUid,
          `Medicine Order ${orderRef.id}`
        );

        transaction.set(adminWalletRef, {
          uid: adminUid,
          balance: increment(adminBonus),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: user.uid,
          amount: total,
          type: 'payment',
          status: 'success',
          targetId: orderRef.id,
          targetName: 'Medicine Order',
          details: cart.map(item => `${item.name} x${item.quantity}`).join(', '),
          createdAt: new Date().toISOString()
        });
      });

      setOrderStatus('success');
      setTimeout(() => {
        setCart([]);
        setShowCart(false);
        setOrderStatus('idle');
        alert(`অর্ডার সফল হয়েছে! আপনার অর্ডারটি ${nearestPharmacy?.name || 'Main Store'} এ পাঠানো হয়েছে।`);
      }, 2000);
    } catch (error: any) {
      console.error("Order error:", error);
      if (error.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
      } else if (error.message === 'admin_not_found') {
        alert('অ্যাডমিন পাওয়া যায়নি।');
      }
    }
  };

  const handleSaveNewOrder = async () => {
    if (!user || user.email !== 'shustobd@gmail.com') return;
    setIsSavingOrder(true);
    try {
      const batch = writeBatch(db);
      medicines.forEach((med, index) => {
        const medRef = doc(db, 'medicines', med.id);
        batch.update(medRef, { orderIndex: index });
      });
      await batch.commit();
      setIsReordering(false);
      alert('নতুন সাজানো সফলভাবে সেভ হয়েছে!');
    } catch (error) {
      console.error("Error saving new order:", error);
      alert('সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSavingOrder(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ঔষধ শপ (Medicine Store)</h1>
            <p className="text-slate-500">আপনার প্রয়োজনীয় ঔষধ জেনুইন প্রাইসে সরাসরি হোম ডেলিভারি নিন।</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user?.email === 'shustobd@gmail.com' && (
            <div className="flex items-center gap-2">
              {!isReordering ? (
                <button 
                  onClick={() => setIsReordering(true)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-all flex items-center gap-2"
                >
                  <GripVertical size={14} />
                  সাজানো পরিবর্তন
                </button>
              ) : (
                <button 
                  onClick={handleSaveNewOrder}
                  disabled={isSavingOrder}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-xs hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingOrder ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  সেভ করুন
                </button>
              )}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search medicines..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full md:w-64"
            />
          </div>
          <div className="relative group">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-600 font-medium cursor-pointer"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <button 
            onClick={() => setShowCart(true)}
            className="p-2 bg-sky-500 text-white rounded-xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 relative"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading && medicines.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-sky-500" size={40} />
          <p className="text-slate-500 font-medium">লোড হচ্ছে...</p>
        </div>
      ) : medicines.length === 0 && !loading ? (
        <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
          কোনো ঔষধ পাওয়া যায়নি।
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            const filteredMedicines = medicines.filter(med => {
              const matchesQuery = !searchQuery || 
                (med.name && med.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (med.generic && med.generic.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (med.company && med.company.toLowerCase().includes(searchQuery.toLowerCase()));
              const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
              return matchesQuery && matchesCategory;
            });

            if (filteredMedicines.length === 0) {
              return (
                <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
                  খোঁজ অনুযায়ী কোনো ঔষধ পাওয়া যায়নি।
                </div>
              );
            }

            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={filteredMedicines.map(m => m.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMedicines.map((med) => (
                      <SortableMedicineCard 
                        key={med.id} 
                        med={med} 
                        isReordering={isReordering} 
                        addToCart={addToCart} 
                        isAdmin={user?.email === 'shustobd@gmail.com'}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            );
          })()}
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">আপনার কার্ট</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {nearestPharmacy && cart.length > 0 && (
                <div className="mb-4 p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center">
                    <Truck size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-sky-600 font-bold uppercase tracking-widest">Receiving Pharmacy</p>
                    <p className="text-sm font-bold text-slate-900">{nearestPharmacy.name}</p>
                  </div>
                </div>
              )}
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                  <ShoppingCart size={64} className="opacity-20" />
                  <p>আপনার কার্ট খালি</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                    <img src={item.image || `https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=100`} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-sm text-slate-500">৳{item.price} x {item.quantity}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 space-y-4">
                {nearestPharmacy && (
                  <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mb-4 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">আপনার নিকটবর্তী ফার্মেসি</p>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900">{nearestPharmacy.name}</div>
                      <div className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full">Nearest</div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{nearestPharmacy.thana}, {nearestPharmacy.district}</p>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-slate-500">মোট পরিমাণ</span>
                  <span className="text-sky-600 text-2xl">৳{total}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={orderStatus !== 'idle'}
                  className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                >
                  {orderStatus === 'ordering' ? 'অর্ডার করা হচ্ছে...' : orderStatus === 'success' ? 'অর্ডার সফল হয়েছে!' : 'চেকআউট করুন'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
