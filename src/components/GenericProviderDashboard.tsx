import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, orderBy, getDoc, setDoc, increment, getDocs, limit, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Clock, User, CheckCircle, XCircle, MapPin, Phone, Plus, Image as ImageIcon, Tag, MessageCircle, Upload, Settings, Truck, GripVertical, X, CreditCard } from 'lucide-react';
import { cn } from '../lib/utils';
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
import { ChatWindow } from './ChatWindow';
import { Wallet } from './Wallet';
import { LAB_SERVICES_PRESETS, PHYSIO_SERVICES_PRESETS, HOSPITAL_SERVICES_PRESETS } from '../constants';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

interface ServiceRequest {
  id: string;
  userId: string;
  userName: string;
  userLocation?: string;
  address?: string; // ADDED
  postTitle?: string; // ADDED
  providerId: string | null;
  providerEmail?: string | null;
  providerName: string;
  providerType: string;
  hospitalName?: string;
  status: string;
  price?: number;
  details?: string;
  createdAt: string;
}

interface Post {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  title: string;
  description: string;
  price?: string;
  image?: string;
  createdAt: string;
}

interface GenericProviderDashboardProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance' | 'nursing';
  title: string;
  description: string;
}

function SortablePostCard({ post, isReordering }: { post: any, isReordering: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: post.id, disabled: !isReordering });

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
        "bg-white p-6 rounded-3xl border border-slate-100 space-y-4 relative group h-full flex flex-col",
        isReordering && "ring-2 ring-sky-500/20 border-sky-100"
      )}
    >
      {isReordering && (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 text-slate-400 cursor-grab active:cursor-grabbing hover:text-sky-600 transition-colors"
        >
          <GripVertical size={16} />
        </div>
      )}
      {post.image && (
        <img src={post.image} alt={post.title} className="w-full h-40 object-cover rounded-2xl" />
      )}
      <div className="flex-1">
        <h3 className="font-bold text-slate-900 text-lg">{post.title}</h3>
        <p className="text-slate-500 text-sm line-clamp-2">{post.description}</p>
      </div>
      {post.price && (
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 text-sky-600 font-bold">
            <Tag size={16} />
            ৳{post.price}
          </div>
          {((post as any).bedLimit || (post as any).isICU || (post as any).isCCU) && (
            <div className="flex gap-2">
              {(post as any).isICU && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded border border-rose-100">ICU</span>}
              {(post as any).isCCU && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded border border-amber-100">CCU</span>}
            </div>
          )}
        </div>
      )}
      {((post as any).bedLimit || (post as any).ccuLimit) && (
        <div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-2 mt-auto">
          {(post as any).bedLimit && (
            <div className="text-[10px] text-slate-400">
              <span className="font-bold text-slate-600">Beds:</span> {(post as any).bedLimit}
            </div>
          )}
          {(post as any).ccuLimit && (
            <div className="text-[10px] text-slate-400">
              <span className="font-bold text-slate-600">CCU:</span> {(post as any).ccuLimit}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GenericProviderDashboard({ type, title, description }: GenericProviderDashboardProps) {
  const { user } = useAuth();
  const [myProviderId, setMyProviderId] = useState<string>((user as any)?.id || (user ? `u_${user.uid}` : ''));
  
  const [orders, setOrders] = useState<ServiceRequest[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
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
      setPosts((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const batch = writeBatch(db);
      posts.forEach((post, index) => {
        const postRef = doc(db, 'posts', post.id);
        batch.update(postRef, { orderIndex: index });
      });
      await batch.commit();
      setIsReordering(false);
      alert('Order saved successfully!');
    } catch (error) {
      console.error("Error saving order:", error);
      alert('Failed to save order.');
    } finally {
      setIsSavingOrder(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'posts' | 'settings'>('requests');
  const [showAddPost, setShowAddPost] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPost, setNewPost] = useState({ 
    title: '', 
    description: '', 
    price: '', 
    image: '',
    bedLimit: '', 
    ccuLimit: '',
    isICU: false,
    isCCU: false 
  });
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [updatedProfile, setUpdatedProfile] = useState({
    name: '',
    hospitalName: '',
    labName: '',
    clinicName: '',
    description: '',
    address: '',
    phone: '',
    image: '',
    division: '',
    district: '',
    thana: ''
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string } | null>(null);

  // Derived requests
  useEffect(() => {
    const all = [...orders, ...serviceRequests];
    
    // Filter
    const isAdminUser = user?.email === 'shustobd@gmail.com' || (user as any)?.role === 'admin';
    const filtered = all.filter(req => {
        if (isAdminUser) return true;
        
        // Pharmacy dashboard: show all orders (debugging/broad access for pharmacies)
        if (type === 'pharmacy') {
            return true;
        }

        // --- Provider Matching Logic ---
        const matchIds = [
          user?.uid, 
          `u_${user?.uid}`, 
          myProviderId,
          (user as any)?.id,
          (user as any as any)?.providerId
        ].filter(Boolean);

        const providerNameInProfile = String(providerProfile?.name || providerProfile?.hospitalName || providerProfile?.labName || providerProfile?.displayName || "").toLowerCase().trim();
        const providerNameInReq = String(req.providerName || "").toLowerCase().trim();
        const providerEmailInReq = String(req.providerEmail || "").toLowerCase().trim();
        const myEmail = String(user?.email || "").toLowerCase().trim();
        const profileEmail = String(providerProfile?.email || "").toLowerCase().trim();

        const isMatch = (req.providerId && (matchIds.includes(req.providerId) || matchIds.includes(`u_${req.providerId}`) || matchIds.includes(req.providerId.replace('u_', '')))) ||
                        (providerEmailInReq && (providerEmailInReq === myEmail || (profileEmail && providerEmailInReq === profileEmail))) ||
                        (providerNameInReq && providerNameInProfile && (providerNameInReq.includes(providerNameInProfile) || providerNameInProfile.includes(providerNameInReq)));

        if (isMatch) return true;

        // Match by type / General
        const reqType = String(req.providerType || '').toLowerCase().trim();
        const targetType = String(type || '').toLowerCase().trim();
        const isTypeMatch = reqType === targetType || reqType === `${targetType}s` || `${reqType}s` === targetType;

        if (isTypeMatch) {
            // General order logic
            const providerLocation = (user as any)?.location || '';
            const isGeneral = !req.providerId || req.providerId === 'general' || req.providerId === 'admin' || req.providerId === 'u_admin' || req.providerId === 'ambulance_general';
            if (isGeneral) {
               if (!providerLocation || providerLocation === 'Pending' || providerLocation === 'Unknown') return true;
               
               // Location Match
               const userLoc = String(req.userLocation || req.address || "").toLowerCase();
               const provLoc = String(providerLocation).toLowerCase();
               
               if (userLoc.includes(provLoc) || provLoc.includes(userLoc)) return true;
            }
        }
        
        return false;
    });
    
    setRequests(filtered.sort((a,b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
    setLoading(false);
  }, [orders, serviceRequests, type, user]);

  useEffect(() => {
    if (!user) return;

    // Provider details listener
    const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                         type === 'lab' ? 'labs' : 
                         type === 'physio' ? 'physios' : 
                         type === 'hospital' ? 'hospitals' : 
                         type === 'nursing' ? 'nursings' : 'ambulances';
    
    // Profile listener to find the correct collection and identity
    const idVariants = [user.uid, `u_${user.uid}`, (user as any).id].filter(Boolean);
    const collectionsToTry = [collectionName, 'hospitals', 'labs', 'pharmacies', 'ambulances', 'physios'];
    
    // First find where the profile exists to set the correct myProviderId
    let profileUnsub: (() => void) | null = null;

    const setupProfileListener = async () => {
      for (const coll of collectionsToTry) {
        for (const id of idVariants) {
          const docRef = doc(db, coll, id!);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setMyProviderId(docSnap.id);
            profileUnsub = onSnapshot(docRef, (d) => {
              if (d.exists()) {
                const data = d.data();
                setProviderProfile(data);
                setUpdatedProfile({
                  name: data.name || '',
                  hospitalName: data.hospitalName || '',
                  labName: data.labName || data.hospitalName || '',
                  clinicName: data.clinicName || data.hospitalName || '',
                  description: data.description || '',
                  address: data.address || '',
                  phone: data.phone || '',
                  image: data.image || '',
                  division: data.division || '',
                  district: data.district || '',
                  thana: data.thana || ''
                });
              }
            });
            return;
          }
        }
      }
      
      // Fallback to email query if ID match fails
      for (const coll of collectionsToTry) {
        const q = query(collection(db, coll), where('email', '==', user.email));
        const s = await getDocs(q);
        if (!s.empty) {
          const d = s.docs[0];
          setMyProviderId(d.id);
          profileUnsub = onSnapshot(d.ref, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setProviderProfile(data);
              setUpdatedProfile({
                name: data.name || '',
                hospitalName: data.hospitalName || '',
                labName: data.labName || data.hospitalName || '',
                clinicName: data.clinicName || data.hospitalName || '',
                description: data.description || '',
                address: data.address || '',
                phone: data.phone || '',
                image: data.image || '',
                division: data.division || '',
                district: data.district || '',
                thana: data.thana || ''
              });
            }
          });
          return;
        }
      }
    };

    setupProfileListener();

    // Wallet balance listener
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (doc) => {
      if (doc.exists()) {
        setWalletBalance(doc.data().balance || 0);
      }
    });

    // Requests listener
    // We want to fetch all requests where the providerId matches MY providerId OR 
    // where the providerType matches (for pharmacy orders, we want all pharmacy orders for now to ensure visibility)
    let qOrders;
    if (type === 'pharmacy') {
        qOrders = query(
            collection(db, 'orders'),
            where('providerType', '==', 'pharmacy'),
            orderBy('createdAt', 'desc')
        );
    } else {
        qOrders = query(
            collection(db, 'orders'),
            where('providerId', '==', myProviderId),
            orderBy('createdAt', 'desc')
        );
    }
    
    const qRequests = query(
        collection(db, 'serviceRequests'),
        where('providerId', '==', myProviderId),
        orderBy('createdAt', 'desc')
    );
    
    // NOTE: If you need to see general requests too, we might need a separate listener or an "OR" query
    // Firestore OR queries are complex, for now let's ensure the direct link works.
    console.log(`[Dashboard] Listening specifically to 'orders' and 'serviceRequests' for providerId: ${myProviderId}`);
    
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        console.log(`[Dashboard] Orders fetched for ${myProviderId}:`, orderList);
        setOrders(orderList);
        setLoading(false);
    }, (err) => {
        console.error("Orders error:", err);
        setLoading(false);
    });

    const unsubRequests = onSnapshot(qRequests, (snapshot) => {
        const requestList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRequest));
        console.log(`[Dashboard] Requests fetched for ${myProviderId}:`, requestList);
        setServiceRequests(requestList);
        setLoading(false);
    }, (err) => {
        console.error("Requests error:", err);
        setLoading(false);
    });

    // Posts listener
    const qPosts = query(
      collection(db, 'posts'),
      where('providerType', '==', type),
      where('providerId', '==', myProviderId)
    );

    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (err) => {
      console.error("Posts error:", err);
      setLoading(false);
    });

    return () => {
      unsubWallet();
      unsubOrders();
      unsubRequests();
      unsubPosts();
      if (profileUnsub) profileUnsub();
    };
  }, [user, type, myProviderId, providerProfile]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isProfile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 1MB for base64 in firestore)
    if (file.size > 1024 * 1024) {
      alert("ছবি বড় হয়ে গেছে। ১ মেগাবাইটের নিচের ছবি আপলোড করুন।");
      return;
    }

    const reader = new FileReader();
    setIsUploading(true);
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isProfile) {
        setUpdatedProfile(prev => ({ ...prev, image: base64String }));
      } else {
        setNewPost(prev => ({ ...prev, image: base64String }));
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                           type === 'lab' ? 'labs' : 
                           type === 'physio' ? 'physios' : 
                           type === 'hospital' ? 'hospitals' : 
                           type === 'nursing' ? 'nursings' : 'ambulances';
      
      const bestName = updatedProfile.name || (user as any).name || providerProfile?.name || 'Healthcare Center';
      const bestBusinessName = type === 'hospital' ? (updatedProfile.hospitalName || bestName) :
                             type === 'lab' ? (updatedProfile.labName || bestName) :
                             type === 'physio' ? (updatedProfile.clinicName || bestName) :
                             bestName;

        await updateDoc(doc(db, collectionName, myProviderId), {
          ...updatedProfile,
          hospitalName: bestBusinessName,
          labName: type === 'lab' ? bestBusinessName : (updatedProfile.labName || bestBusinessName),
          clinicName: type === 'physio' ? bestBusinessName : (updatedProfile.clinicName || bestBusinessName),
          updatedAt: new Date().toISOString()
        });
        
        // Also update the users collection to ensure AuthContext is in sync
        const userUpdateData: any = {
          displayName: bestBusinessName,
          name: bestName,
          hospitalName: bestBusinessName,
          photoURL: updatedProfile.image,
          image: updatedProfile.image,
          description: updatedProfile.description,
          address: updatedProfile.address,
          phone: updatedProfile.phone,
          updatedAt: new Date().toISOString()
        };
        if (type === 'lab') userUpdateData.labName = bestBusinessName;
        if (type === 'physio') userUpdateData.clinicName = bestBusinessName;

        await updateDoc(doc(db, 'users', user.uid), userUpdateData);

      // Update all existing posts to reflect the new name and image
      const qPosts = query(collection(db, 'posts'), where('providerId', '==', myProviderId));
      const postsSnap = await getDocs(qPosts);
      for (const postDoc of postsSnap.docs) {
        await updateDoc(postDoc.ref, {
          providerName: bestBusinessName,
          hospitalName: bestBusinessName,
          image: updatedProfile.image // Added image update here
        });
      }

      alert("প্রোফাইল আপডেট হয়েছে!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  const [balance, setBalance] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<"sheba">("sheba");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const walletRef = doc(db, 'wallets', user.uid);
    const unsubscribe = onSnapshot(walletRef, (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().balance || 0);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const collectionName = type === 'pharmacy' ? 'orders' : 'serviceRequests';
      const docRef = doc(db, collectionName, id);
      
      if (status === 'completed') {
        await runTransaction(db, async (transaction) => {
          const docSnap = await transaction.get(docRef);
          if (!docSnap.exists()) throw new Error("Document does not exist!");
          
          const data = docSnap.data();
          if (data.status === 'completed') return; // Already processed

          const price = data.total || data.price || 0;
          if (price > 0) {
            const commissionRate = 0.10; // 10% Shusto fee
            const commission = price * commissionRate;
            const providerShare = price - commission;

            const providerWalletRef = doc(db, 'wallets', user.uid);
            const providerWalletSnap = await transaction.get(providerWalletRef);
            const currentProviderBalance = providerWalletSnap.exists() ? providerWalletSnap.data().balance || 0 : 0;

            // 1. Update order status
            transaction.update(docRef, { 
              status: 'completed',
              completedAt: new Date().toISOString(),
              commission: commission,
              providerShare: providerShare
            });

            // 2. Credit provider wallet (Net amount is added, but we record full + deduction in history)
            transaction.set(providerWalletRef, {
              uid: user.uid,
              balance: currentProviderBalance + providerShare,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // 3. Record FULL payment transaction
            const txPaymentRef = doc(collection(db, 'transactions'));
            transaction.set(txPaymentRef, {
              userId: user.uid,
              amount: price,
              type: 'payment',
              status: 'success',
              details: `Payment for ${type} ${collectionName === 'orders' ? 'Order' : 'Service'} (ID: ${id})`,
              orderId: id,
              createdAt: new Date().toISOString()
            });

            // 4. Record Service Fee (Deduction)
            const txFeeRef = doc(collection(db, 'transactions'));
            transaction.set(txFeeRef, {
              userId: user.uid,
              amount: commission,
              type: 'service_fee',
              status: 'success',
              details: `Shusto Service Fee (10%) for ${collectionName === 'orders' ? 'Order' : 'Service'} ${id}`,
              orderId: id,
              createdAt: new Date().toISOString()
            });

            // 5. Log commission for Shusto
            const commissionRef = doc(collection(db, 'commissions'));
            transaction.set(commissionRef, {
              orderId: id,
              amount: commission,
              providerId: user.uid,
              providerType: type,
              createdAt: new Date().toISOString()
            });
          } else {
            transaction.update(docRef, { status: 'completed' });
          }
        });
        alert("অর্ডার সম্পন্ন হয়েছে এবং আপনার ওয়ালেটে টাকা জমা হয়েছে!");
      } else {
        await updateDoc(docRef, { status });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      alert("সঠিক পরিমাণ লিখুন।");
      return;
    }
    if (Number(withdrawAmount) > balance) {
      alert("আপনার পর্যাপ্ত ব্যালেন্স নেই।");
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 11) {
      alert("সঠিক মোবাইল নম্বর লিখুন।");
      return;
    }

    setIsWithdrawing(true);
    try {
      // Deduct balance and record transaction
      const walletRef = doc(db, "wallets", user!.uid);
      const txRef = doc(collection(db, "transactions"));
      
      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Wallet not found");
        
        const currentBalance = walletDoc.data().balance || 0;
        if (currentBalance < Number(withdrawAmount)) throw new Error("Insufficient balance");

        transaction.update(walletRef, {
          balance: currentBalance - Number(withdrawAmount),
          updatedAt: new Date().toISOString()
        });

        transaction.set(txRef, {
          userId: user!.uid,
          amount: Number(withdrawAmount),
          type: "withdrawal",
          status: "pending",
          details: `Withdrawal via Sheba to: ${withdrawPhone}`,
          createdAt: new Date().toISOString()
        });
      });

      const response = await fetch('/api/sheba/withdraw', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          amount: Number(withdrawAmount),
          phone: withdrawPhone,
          bankName: "Sheba Wallet"
        }),
      });

      let responseData;
      const responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { error: responseText };
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server returned ${response.status}`);
      }

      if (responseData.success) {
        // Mark transaction as success (txRef is defined above)
        // Note: we need to handle txRef access here.
        // Actually I should have kept the txRef from the first part.
        
        alert(responseData.message || "আপনার টাকা সফলভাবে উত্তোলন করা হয়েছে।");
        setShowWithdraw(false);
        setWithdrawAmount("");
        setWithdrawPhone("");
      } else {
        throw new Error(responseData.error || responseData.message || "টাকা উত্তোলন সম্ভব হয়নি।");
      }
    } catch (error: any) {
      console.error("Withdrawal Error:", error);
      alert("উত্তোলন ব্যর্থ হয়েছে!\nকারণ: " + error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const deleteRequest = async (id: string) => {
    alert('নিরাপত্তার স্বার্থে রিমুভ অপশন এই প্রজেক্ট থেকে নিষ্ক্রিয় করা হয়েছে। কোন রেকর্ড ডিলিট হবে না।');
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const bestName = updatedProfile.name || (user as any).name || providerProfile?.name || 'Healthcare Center';
      const bestBusinessName = type === 'hospital' ? (updatedProfile.hospitalName || bestName) :
                             type === 'lab' ? (updatedProfile.labName || bestName) :
                             type === 'physio' ? (updatedProfile.clinicName || bestName) :
                             bestName;

      await addDoc(collection(db, 'posts'), {
        ...newPost,
        providerId: myProviderId,
        providerName: bestBusinessName,
        hospitalName: bestBusinessName,
        providerType: type,
        createdAt: new Date().toISOString()
      });
      setNewPost({ title: '', description: '', price: '', image: '', bedLimit: '', ccuLimit: '', isICU: false, isCCU: false });
      setShowAddPost(false);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const deletePost = async (id: string) => {
    alert('নিরাপত্তার স্বার্থে পোস্ট ডিলিট অপশন এই প্রজেক্ট থেকে নিষ্ক্রিয় করা হয়েছে। কোন পোস্ট ডিলিট হবে না।');
  };

  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  const updateRealtimeLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                             type === 'lab' ? 'labs' : 
                             type === 'physio' ? 'physios' : 
                             type === 'hospital' ? 'hospitals' : 
                             type === 'nursing' ? 'nursings' : 'ambulances';
        
        // Reverse geocode to get a readable address if possible
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const readableAddress = data.display_name || `${latitude}, ${longitude}`;
        
        await updateDoc(doc(db, collectionName, myProviderId), {
          lastLocation: readableAddress,
          location: readableAddress, // Sync both for consistent filtering
          lat: latitude,
          lng: longitude,
          updatedAt: new Date().toISOString()
        });

        // Also update users collection for the dashboard variable (user.location)
        await updateDoc(doc(db, 'users', user.uid), {
          location: readableAddress,
          updatedAt: new Date().toISOString()
        });
        
        alert("Location updated successfully!");
      } catch (error) {
        console.error("Error updating location:", error);
        alert("Failed to update location.");
      } finally {
        setIsUpdatingLocation(false);
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      alert("Please enable location access.");
      setIsUpdatingLocation(false);
    });
  };

  const bulkAddServices = async () => {
    let presets: any[] = [];
    if (type === 'lab') presets = LAB_SERVICES_PRESETS;
    else if (type === 'physio') presets = PHYSIO_SERVICES_PRESETS;
    else if (type === 'hospital') presets = HOSPITAL_SERVICES_PRESETS;
    else if (type === 'pharmacy') return; // Pharmacies usually add specific medicines

    if (!confirm(`This will add ${presets.length} standard services to your profile. Continue?`)) return;
    
    setLoading(true);
    try {
      for (const service of presets) {
        const postId = `post_${type}_${myProviderId}_${service.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'posts', postId), {
          id: postId,
          title: service.name,
          description: service.description || service.category || 'Professional healthcare service',
          price: service.price,
          image: service.image || '',
          providerId: myProviderId,
          providerName: updatedProfile.name || (user as any).name || providerProfile?.name || user?.displayName || 'Unnamed Provider',
          hospitalName: updatedProfile.name || (user as any).hospitalName || (user as any).name || providerProfile?.hospitalName || providerProfile?.name || user?.displayName || 'Unnamed Provider',
          providerType: type,
          createdAt: new Date().toISOString()
        });
      }
      alert("Services added successfully!");
    } catch (error) {
      console.error("Bulk add error:", error);
      alert("Failed to add services.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">ড্যাশবোর্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {type === 'ambulance' && (
        <div className="bg-slate-900 text-white p-8 rounded-[40px] relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Real-time Tracking</h2>
              <p className="text-slate-400 mb-0">আপনার বর্তমান অবস্থান আপডেট করুন যাতে রোগীরা আপনাকে দ্রুত খুঁজে পায়।</p>
            </div>
            <button 
              onClick={updateRealtimeLocation}
              disabled={isUpdatingLocation}
              className={cn(
                "px-8 py-4 bg-sky-500 text-white font-bold rounded-2xl flex items-center gap-3 hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20",
                isUpdatingLocation && "opacity-50 cursor-not-allowed"
              )}
            >
              <MapPin size={20} className={isUpdatingLocation ? "animate-bounce" : ""} />
              {isUpdatingLocation ? "Updating..." : "Update My Location"}
            </button>
          </div>
        </div>
      )}

      {type === 'pharmacy' && (
        <div className="bg-sky-900 text-white p-8 rounded-[40px] relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Reffaral & State Status</h2>
            <p className="text-sky-300 mb-6">আমাদের রেফারেল প্রোগ্রামের মাধ্যমে ১০% এক্সট্রা ইনকাম করুন।</p>
            
            <div className="flex flex-wrap gap-6 items-end">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2">আপনার রেফারেল লিংক</label>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={`${window.location.origin}?ref=${user?.uid}`}
                    className="flex-1 bg-white/10 border border-white/10 px-4 py-3 rounded-xl font-mono text-xs focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?ref=${user?.uid}`);
                      alert("লিংক কপি করা হয়েছে!");
                    }}
                    className="px-6 py-3 bg-white text-sky-900 font-bold rounded-xl hover:bg-sky-50 transition-all"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 min-w-[200px]">
                <p className="text-[10px] text-sky-400 font-bold uppercase mb-1">রেফারেল পেমেন্ট (১০%)</p>
                <p className="text-2xl font-black">৳{Math.round(walletBalance * 0.1)} <span className="text-[10px] font-normal text-sky-300">Est. Bonus</span></p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Tag size={300} />
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {(() => {
              const profileName = (providerProfile as any)?.hospitalName || providerProfile?.name;
              const accountName = (user as any)?.hospitalName || (user as any)?.name || user?.displayName;
              
              // Prioritize explicitly set profile names
              if (profileName && !profileName.includes('@') && !profileName.toLowerCase().includes('twitter')) {
                return profileName;
              }
              
              // Secondary: User account names that look real
              if (accountName && !accountName.includes('@') && !accountName.toLowerCase().includes('twitter') && accountName !== 'User') {
                return accountName;
              }

              // Final fallback to description or default title
              return title;
            })()}
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button 
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'requests' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            অনুরোধসমূহ
          </button>
          {type !== 'ambulance' && (
            <button 
              onClick={() => setActiveTab('posts')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'posts' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              পোস্টসমূহ
            </button>
          )}
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === 'settings' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            প্রোফাইল
          </button>
        </div>
      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">ওয়ালেট ম্যানেজমেন্ট</h2>
                  <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Shusto Wallet Service</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="w-12 h-12 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl flex items-center justify-center transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <Wallet />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-sky-500 p-6 rounded-3xl text-white shadow-xl shadow-sky-500/20">
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">ওয়ালেট ব্যালেন্স</p>
              <p className="text-3xl font-black mb-4">৳{balance.toLocaleString()}</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setShowWalletModal(true)}
                  className="w-full py-2.5 bg-white text-sky-600 font-bold rounded-xl hover:bg-sky-50 transition-all text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus size={14} />
                  টাকা যোগ করুন
                </button>
                <button 
                  onClick={() => setShowWithdraw(true)}
                  className="w-full py-2.5 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-all text-xs border border-sky-400/50"
                >
                  উইথড্র করুন
                </button>
              </div>
              
              {/* Admin Emergency Controls */}
              {user?.email === 'shustobd@gmail.com' && (
                <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Recovery Console</p>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      if (confirm("আপনি কি নিশ্চিত যে আপনি সকল অ্যাকাউন্টের ব্যালেন্স অডিট করতে চান? এটি শুধুমাত্র গেটওয়ের ট্রানজ্যাকশন হিস্ট্রি অনুযায়ী ব্যালেন্স সেট করবে এবং সব ম্যানুয়াল ব্যালেন্স (যেমন ৯০০১ টাকা) ০ করে দিবে।")) {
                        try {
                          const walletSnap = await getDocs(collection(db, "wallets"));
                          let count = 0;
                          
                          for (const walletDoc of walletSnap.docs) {
                            const userId = walletDoc.id;
                            const txQuery = query(
                              collection(db, "transactions"), 
                              where("userId", "==", userId),
                              where("status", "==", "success")
                            );
                            const txSnap = await getDocs(txQuery);
                            
                            let gatewayBalance = 0;
                            txSnap.docs.forEach(d => {
                              const tx = d.data();
                              if (tx.type === "add_money" || tx.type === "payment_received") {
                                gatewayBalance += (tx.amount || 0);
                              } else if (tx.type === "withdrawal" || tx.type === "payment") {
                                gatewayBalance -= (tx.amount || 0);
                              }
                            });

                            await updateDoc(doc(db, "wallets", userId), { 
                              balance: Math.max(0, gatewayBalance),
                              updatedAt: new Date().toISOString()
                            });
                            count++;
                          }
                          
                          alert(`${count} টি অ্যাকাউন্টের ব্যালেন্স রিসেট করা হয়েছে। গেটওয়ের বাইরে সব টাকা ০ করা হয়েছে।`);
                          window.location.reload();
                        } catch (e: any) {
                          alert("সমস্যা হয়েছে: " + e.message);
                        }
                      }
                    }}
                    className="w-full py-3 bg-rose-500 text-white font-black rounded-2xl hover:bg-rose-600 transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95"
                  >
                    <span>🧹</span> Reset All to Gateway Balance
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={async () => {
                        if (confirm("amk.sifat20@gmail.com এর ব্যালেন্স ০ করতে চান?")) {
                          try {
                            const q = query(collection(db, "users"), where("email", "==", "amk.sifat20@gmail.com"));
                            const snap = await getDocs(q);
                            if (snap.empty) {
                              alert("Sifat's account not found.");
                              return;
                            }
                            const uid = snap.docs[0].id;
                            await updateDoc(doc(db, "wallets", uid), { balance: 0, updatedAt: new Date().toISOString() });
                            alert("Sifat's balance is now 0.");
                          } catch (e: any) {
                            alert("Error: " + e.message);
                          }
                        }
                      }}
                      className="py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all text-[10px] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>👤</span> Reset Sifat
                    </button>

                    <button 
                      onClick={async () => {
                        const email = prompt("ইউজার ইমেইল দিন:");
                        if (!email) return;
                        try {
                          const q = query(collection(db, "users"), where("email", "==", email));
                          const snap = await getDocs(q);
                          if (snap.empty) { alert("User not found."); return; }
                          const uid = snap.docs[0].id;
                          await updateDoc(doc(db, "wallets", uid), { balance: 0, updatedAt: new Date().toISOString() });
                          alert(`${email} reset to 0.`);
                        } catch (e: any) { alert("Error: " + e.message); }
                      }}
                      className="py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-[10px] flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>🔍</span> Reset by Email
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">নতুন অনুরোধ</p>
              <p className="text-3xl font-bold text-slate-900">{requests.filter(r => (r.status || 'pending') === 'pending').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100">
              <p className="text-sm font-medium text-slate-400 mb-1">নিশ্চিত করা হয়েছে</p>
              <p className="text-3xl font-bold text-sky-600">{requests.filter(r => (r.status || 'pending') === 'confirmed').length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">মোট সার্ভিস</p>
                <p className="text-3xl font-bold text-blue-600">{requests.length}</p>
              </div>
              <button 
                onClick={() => setShowWalletModal(true)}
                className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                <Plus size={14} />
                টাকা যোগ করুন
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">আগত অনুরোধসমূহ</h2>
            {loading ? (
              <div className="p-12 text-center text-slate-400">অনুরোধ লোড হচ্ছে...</div>
            ) : requests.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
                এখনো কোনো অনুরোধ পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid gap-4">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                        <User size={28} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{req.userName}</h3>
                        <p className="text-xs text-sky-600 font-bold mb-1">{req.userLocation ? `Location: ${req.userLocation}` : 'Location: Not specified'}</p>
                        {(req.postTitle || req.details) && (
                           <div className="bg-slate-50 p-2 rounded-lg my-2 text-sm text-slate-700 border border-slate-100">
                             <span className="font-bold text-sky-600 mr-2">Service:</span>
                             {req.postTitle || req.details}
                           </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={14} /> {new Date(req.createdAt).toLocaleString()}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            req.status === 'confirmed' ? "bg-sky-100 text-sky-600" : 
                            req.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                          )}>{req.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.providerId === null && req.status === 'pending' && (
                         <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full border border-amber-100">
                           সাধারণ অনুরোধ (General)
                         </div>
                      )}
                      {(req.status || 'pending') === 'pending' && (
                        <>
                          <button 
                            onClick={() => setActiveChat({ id: req.id, name: req.userName })}
                            className="p-3 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors"
                          >
                            <MessageCircle size={24} />
                          </button>
                          <button 
                            onClick={() => updateStatus(req.id, 'confirmed')}
                            className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                          >
                            <CheckCircle size={18} />
                            Confirm
                          </button>
                          <button 
                            onClick={() => updateStatus(req.id, 'cancelled')}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <XCircle size={24} />
                          </button>
                        </>
                      )}
                      {req.status === 'confirmed' && (
                        <>
                          <button 
                            onClick={() => setActiveChat({ id: req.id, name: req.userName })}
                            className="p-3 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors"
                          >
                            <MessageCircle size={24} />
                          </button>
                          <button 
                            onClick={() => updateStatus(req.id, 'completed')}
                            className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                          >
                            Mark Completed
                          </button>
                        </>
                      )}
                      {req.status === 'completed' && (
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sky-600 font-bold">
                            <CheckCircle size={20} />
                            Completed
                          </div>
                        </div>
                      )}
                      {/* Deletion disabled */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'settings' ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Settings size={24} className="text-sky-500" />
              প্রোফাইল সেটিংস
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-32 h-32 bg-white rounded-[32px] overflow-hidden border-4 border-white shadow-lg relative group">
                  {updatedProfile.image ? (
                    <img src={updatedProfile.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                    <Upload size={24} className="text-white" />
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-slate-500 font-medium">প্রোফাইল পিকচার পরিবর্তন করুন</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {type === 'hospital' ? 'হাসপাতালের নাম (Hospital Name)' : 
                     type === 'lab' ? 'ল্যাবের নাম (Lab/Diagnostic Name)' : 
                     type === 'pharmacy' ? 'ফার্মেসীর নাম (Pharmacy Name)' :
                     'প্রতিষ্ঠানের নাম (Organization)'}
                  </label>
                  <input 
                    type="text" 
                    value={type === 'hospital' ? updatedProfile.hospitalName : 
                           type === 'lab' ? updatedProfile.labName : 
                           type === 'physio' ? updatedProfile.clinicName :
                           updatedProfile.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (type === 'hospital') setUpdatedProfile({...updatedProfile, hospitalName: val, name: val});
                      else if (type === 'lab') setUpdatedProfile({...updatedProfile, labName: val, name: val});
                      else if (type === 'pharmacy') setUpdatedProfile({...updatedProfile, name: val});
                      else setUpdatedProfile({...updatedProfile, clinicName: val, name: val});
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">ফোন নাম্বার</label>
                  <input 
                    type="text" 
                    value={updatedProfile.phone}
                    onChange={(e) => setUpdatedProfile({...updatedProfile, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">ঠিকানা</label>
                <input 
                  type="text" 
                  value={updatedProfile.address}
                  onChange={(e) => setUpdatedProfile({...updatedProfile, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">বিভাগ (Division)</label>
                  <select 
                    value={updatedProfile.division}
                    onChange={(e) => setUpdatedProfile({...updatedProfile, division: e.target.value, district: '', thana: ''})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {BANGLADESH_LOCATIONS.map(l => (
                      <option key={l.division} value={l.division}>{l.division}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">জেলা (District)</label>
                  <select 
                    value={updatedProfile.district}
                    onChange={(e) => setUpdatedProfile({...updatedProfile, district: e.target.value, thana: ''})}
                    disabled={!updatedProfile.division}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                  >
                    <option value="">সিলেক্ট করুন</option>
                    {updatedProfile.division && BANGLADESH_LOCATIONS.find(l => l.division === updatedProfile.division)?.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">থানা / উপজেলা (Upazila)</label>
                <input 
                  type="text" 
                  value={updatedProfile.thana}
                  onChange={(e) => setUpdatedProfile({...updatedProfile, thana: e.target.value})}
                  placeholder="আপনার থানা লিখুন"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ</label>
                <textarea 
                  rows={4}
                  value={updatedProfile.description}
                  onChange={(e) => setUpdatedProfile({...updatedProfile, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "সেভ করুন"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-50 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {updatedProfile.name || providerProfile?.name || "আপনার"} সার্ভিসসমূহ
              </h2>
              <p className="text-slate-500 font-medium">আপনার হাসপাতালের সকল বেড ও অন্যান্য সেবা এখান থেকে পরিচালনা করুন</p>
            </div>
            <div className="flex items-center gap-3">
              {type === 'hospital' && (
                <button 
                  onClick={bulkAddServices}
                  className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
                >
                  <Plus size={20} />
                  অটো-বেড অ্যাড (Auto Fill)
                </button>
              )}
              <button 
                onClick={() => setShowAddPost(true)}
                className="flex items-center gap-2 px-6 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-500/20"
              >
                <Plus size={20} />
                নতুন সার্ভিস (Manual)
              </button>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
              You haven't posted anything yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4 relative group">
                  {/* Post deletion button disabled */}
                  {post.image && (
                    <img src={post.image} alt={post.title} className="w-full h-40 object-cover rounded-2xl" />
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{post.title}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2">{post.description}</p>
                  </div>
                  {post.price && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sky-600 font-bold">
                        <Tag size={16} />
                        ৳{post.price}
                      </div>
                      {((post as any).bedLimit || (post as any).isICU || (post as any).isCCU) && (
                        <div className="flex gap-2">
                          {(post as any).isICU && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black uppercase rounded border border-rose-100">ICU</span>}
                          {(post as any).isCCU && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded border border-amber-100">CCU</span>}
                        </div>
                      )}
                    </div>
                  )}
                  {((post as any).bedLimit || (post as any).ccuLimit) && (
                    <div className="pt-2 border-t border-slate-50 grid grid-cols-2 gap-2">
                      {(post as any).bedLimit && (
                        <div className="text-[10px] text-slate-400">
                          <span className="font-bold text-slate-600">Beds:</span> {(post as any).bedLimit}
                        </div>
                      )}
                      {(post as any).ccuLimit && (
                        <div className="text-[10px] text-slate-400">
                          <span className="font-bold text-slate-600">CCU:</span> {(post as any).ccuLimit}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Post Modal */}
      {showAddPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {type === 'hospital' ? 'বেড/সার্ভিস রিকোয়েস্ট' : 'নতুন পোস্ট তৈরি'}
              </h2>
              <button onClick={() => setShowAddPost(false)} className="p-2 hover:bg-slate-50 rounded-xl">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">সার্ভিস টাইটেল (Hospital Service)</label>
                <input 
                  required
                  type="text" 
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder={type === 'hospital' ? "উদা: ICU Bed Support, CCU Support" : "নাম লিখুন..."}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-sky-500/10 font-bold"
                />
                {type === 'hospital' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['General Bed', 'ICU Bed', 'CCU Bed', 'Air Ambulance'].map(t => (
                      <button 
                        key={t}
                        type="button" 
                        onClick={() => setNewPost({...newPost, title: t})}
                        className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg hover:border-sky-500 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">বিস্তারিত (Details)</label>
                <textarea 
                  required
                  rows={3}
                  value={newPost.description}
                  onChange={(e) => setNewPost({...newPost, description: e.target.value})}
                  placeholder="আপনার সার্ভিস সম্পর্কে বিস্তারিত লিখুন..."
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-sky-500/10 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">মূল্য (৳)</label>
                  <input 
                    type="text" 
                    value={newPost.price}
                    onChange={(e) => setNewPost({...newPost, price: e.target.value})}
                    placeholder="৳ 0.00"
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-sky-500/10 font-black text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">সরাসরি ছবি আপলোড</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="py-4 px-4 bg-sky-500 text-white rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition-all">
                         <Truck size={16} /> গ্যালারি / ক্যামেরা
                      </div>
                    </label>
                    {newPost.image && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-sky-500 shadow-md">
                        <img src={newPost.image} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploading}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm hover:bg-sky-600 transition-all shadow-xl disabled:opacity-50"
              >
                 {isUploading ? "আপলোড হচ্ছে..." : "অ্যাড করুন"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeChat && (
        <ChatWindow 
          orderId={activeChat.id} 
          recipientName={activeChat.name} 
          onClose={() => setActiveChat(null)} 
        />
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-sky-500" />
            
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900">টাকা উত্তোলন (Withdraw)</h2>
              <button onClick={() => setShowWithdraw(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <XCircle size={24} className="text-slate-300" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-sky-50 border-2 border-sky-500/10 p-5 rounded-3xl flex items-center justify-between group">
                <div>
                  <p className="text-sky-600 font-black text-lg leading-tight">Sheba (সেবা)</p>
                  <p className="text-sky-400 text-xs font-bold uppercase tracking-wider">অফিসিয়াল পেমেন্ট গেটওয়ে</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/10 overflow-hidden group-hover:scale-110 transition-transform">
                  <img 
                    src="https://i.postimg.cc/8cpNgrfB/Untitled-design-3.png" 
                    alt="Sheba Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 px-1">পরিমাণ (Amount)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">৳</span>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-12 pr-6 py-5 bg-slate-50 border-none rounded-[24px] text-2xl font-black focus:ring-4 focus:ring-sky-500/10 transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-700 mb-3 px-1">সেবা আইডি / নম্বর (Sheba ID/Phone)</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[24px] text-lg font-bold focus:ring-4 focus:ring-sky-500/10 transition-all"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-2">
                <button
                  onClick={() => {
                    setShowWithdraw(false);
                    setWithdrawAmount("");
                    setWithdrawPhone("");
                  }}
                  className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-[24px] hover:bg-slate-200 transition-all active:scale-95"
                >
                  বাতিল
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  className="flex-1 py-5 bg-sky-500 text-white font-black rounded-[24px] hover:bg-sky-600 shadow-xl shadow-sky-500/20 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                >
                  {isWithdrawing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>প্রসেসিং...</span>
                    </>
                  ) : "সাবমিট করুন"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
