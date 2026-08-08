import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, getDocs, doc, updateDoc, setDoc, where, deleteDoc, onSnapshot, getDoc, increment, orderBy, limit, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { getApiUrl } from '../utils/api';
import { User as UserIcon, Shield, Stethoscope, Pill, FlaskConical, Truck, Building, Activity, Plus, X, Search, Camera, RefreshCcw, DollarSign, Wallet, Edit, Store, Heart, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { TransactionsPanel } from './TransactionsPanel';
import { MerchantPanel } from './MerchantPanel';
import { ProfitsPanel } from './ProfitsPanel';
import { useAuth } from '../AuthContext';

import { AMBULANCE_ROUTES, LAB_SERVICES_PRESETS, PHYSIO_SERVICES_PRESETS, HOSPITAL_SERVICES_PRESETS, NURSING_SERVICES_PRESETS } from '../constants';
import { BANGLADESH_LOCATIONS } from '../constants/locations';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  fee: number;
  image?: string;
  bmdcNumber?: string;
  experience?: string;
  degree?: string;
  university?: string;
  email: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Medicine {
  id: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  generic?: string;
  company?: string;
  createdAt?: string;
}

interface GenericService {
  id: string;
  name: string;
  category: string;
  price: number;
  type: 'lab' | 'physio';
  image?: string;
  description?: string;
  createdAt?: string;
}

interface Provider {
  id: string;
  name: string;
  location: string;
  contact?: string;
  email: string;
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  image?: string;
  userId?: string;
  division?: string;
  district?: string;
  thana?: string;
  createdAt?: string;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'patients' | 'doctors' | 'medicines' | 'pharmacies' | 'labs' | 'physios' | 'hospitals' | 'ambulances' | 'nursings' | 'transactions' | 'services' | 'merchant' | 'investors' | 'managers' | 'states' | 'shop_requests' | 'profits'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [shopRequests, setShopRequests] = useState<any[]>([]);
  const [investors, setInvestors] = useState<UserProfile[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [states, setStates] = useState<UserProfile[]>([]);
  const [userBalances, setUserBalances] = useState<Record<string, number>>({});
  const [manualDoctors, setManualDoctors] = useState<Doctor[]>([]);
  const [userDoctors, setUserDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacies, setPharmacies] = useState<Provider[]>([]);
  const [labs, setLabs] = useState<Provider[]>([]);
  const [physios, setPhysios] = useState<Provider[]>([]);
  const [hospitals, setHospitals] = useState<Provider[]>([]);
  const [ambulances, setAmbulances] = useState<Provider[]>([]);
  const [nursings, setNursings] = useState<Provider[]>([]);
  const [labTests, setLabTests] = useState<GenericService[]>([]);
  const [physioServices, setPhysioServices] = useState<GenericService[]>([]);
  const [adminBalance, setAdminBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [newDoctor, setNewDoctor] = useState({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', degree: '', university: '', email: '', image: '', division: '', district: '', thana: '' });
  const [newProvider, setNewProvider] = useState({ name: '', location: '', contact: '', email: '', division: '', district: '', thana: '' });

  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [isAddingMedicine, setIsAddingMedicine] = useState(false);
  const [newMedicineData, setNewMedicineData] = useState({ name: '', generic: '', category: 'Fever & Pain', price: 0, company: '', image: '' });

  const [editingService, setEditingService] = useState<GenericService | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState({ name: '', category: 'General', price: 0, image: '', description: '', type: 'physio' });

  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleModal, setShowRoleModal] = useState<{ user: UserProfile, role: string } | null>(null);
  const [showUserSearchModal, setShowUserSearchModal] = useState<{ role: 'investor' | 'manager' | 'state' } | null>(null);
  const [roleDetails, setRoleDetails] = useState({ 
    name: '', 
    specialty: 'General Physician', 
    fee: 500, 
    bmdcNumber: 'Pending', 
    experience: '', 
    degree: '', 
    university: '', 
    location: 'Pending', 
    contact: 'Pending', 
    division: '', 
    district: '', 
    thana: '',
    investorId: '',
    managerId: ''
  });

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = (u.displayName || 'User').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || email.includes(term);
    }).filter(u => {
      if (activeTab === 'users') return true;
      if (activeTab === 'patients') return u.role === 'user';
      if (activeTab === 'investors') return u.role === 'investor';
      if (activeTab === 'managers') return u.role === 'manager';
      if (activeTab === 'states') return u.role === 'state';
      return true;
    });
  }, [users, searchTerm, activeTab]);

  const handlePromoteUser = async () => {
    if (!showRoleModal) return;
    const { user: targetUser, role } = showRoleModal;
    
    setLoading(true);
    try {
      // 1. Update user document in 'users' collection
      const updateData: any = { 
        role: role, 
        roleUpdatedAt: new Date().toISOString(),
        displayName: (roleDetails.name || targetUser.displayName || targetUser.email || 'User').trim(),
        name: (roleDetails.name || targetUser.displayName || targetUser.email || 'User').trim()
      };
      
      if (['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance', 'nursing', 'manager', 'state'].includes(role)) {
        Object.assign(updateData, roleDetails);
      }
      
      const userRef = doc(db, 'users', targetUser.uid);
      await updateDoc(userRef, updateData);
      
      // 2. Update/Create record in specialized provider collection
      if (['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance', 'nursing', 'state'].includes(role)) {
        const collectionName = role === 'doctor' ? 'doctors' : 
                             role === 'pharmacy' ? 'pharmacies' : 
                             role === 'lab' ? 'labs' : 
                             role === 'physio' ? 'physios' : 
                             role === 'hospital' ? 'hospitals' : 
                             role === 'nursing' ? 'nursings' :
                             role === 'state' ? 'states' : 'ambulances';
        
        // Use a consistent ID for linked accounts to avoid duplication
        const providerId = `u_${targetUser.uid}`;
        await setDoc(doc(db, collectionName, providerId), {
          id: providerId,
          name: updateData.name,
          email: targetUser.email,
          type: role,
          userId: targetUser.uid,
          ...roleDetails,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        // Also check for any existing records with the same email and update them with the userId
        if (targetUser.email) {
          const q = query(collection(db, collectionName), where('email', '==', targetUser.email.toLowerCase().trim()));
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            if (d.id !== providerId) {
              await updateDoc(doc(db, collectionName, d.id), { userId: targetUser.uid });
            }
          }
        }
      }

      showSuccess(`${updateData.displayName} is now a ${role}!`);
      setShowRoleModal(null);
      setSearchTerm('');
      
      // Update local state for immediate feedback
      const updatedUser = { ...targetUser, ...updateData };
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? updatedUser : u));
      if (role === 'investor') {
        setInvestors(prev => [...prev.filter(i => i.uid !== targetUser.uid), updatedUser]);
      } else if (role === 'manager') {
        setManagers(prev => [...prev.filter(m => m.uid !== targetUser.uid), updatedUser]);
      } else if (role === 'state') {
        setStates(prev => [...prev.filter(s => s.uid !== targetUser.uid), updatedUser]);
      }
    } catch (error) {
      console.error("Promotion error:", error);
      alert("Failed to promote user. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        if (activeTab === 'users' || activeTab === 'patients' || activeTab === 'investors' || activeTab === 'managers' || activeTab === 'states' || activeTab === 'doctors') {
          const snapshot = await getDocs(query(collection(db, 'users'), limit(150)));
          let allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
          
          // Deduplicate by email
          const emailMap = new Map<string, UserProfile>();
          allUsers.forEach(u => {
            if (!u.email) {
              emailMap.set(u.uid, u);
              return;
            }
            const emailLower = u.email.toLowerCase();
            const existing = emailMap.get(emailLower);
            if (!existing) {
              emailMap.set(emailLower, u);
            } else {
              const dateA = u.createdAt ? new Date(u.createdAt).getTime() : 0;
              const dateB = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
              if (dateA > dateB) {
                emailMap.set(emailLower, u);
              }
            }
          });
          allUsers = Array.from(emailMap.values());

          allUsers.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setUsers(allUsers);
          
          if (activeTab === 'investors') {
            setInvestors(allUsers.filter(u => u.role === 'investor'));
          } else if (activeTab === 'managers') {
            setManagers(allUsers.filter(u => u.role === 'manager'));
          } else if (activeTab === 'states') {
            setStates(allUsers.filter(u => u.role === 'state'));
          }
          
          try {
            const walletsSnap = await getDocs(query(collection(db, 'wallets'), limit(100)));
            if (!walletsSnap.empty) {
              const balances: Record<string, number> = {};
              walletsSnap.docs.forEach(wDoc => {
                balances[wDoc.id] = wDoc.data().balance || 0;
              });
              setUserBalances(prev => ({ ...prev, ...balances }));
            }
          } catch (err) {
            console.error("Error fetching user balances:", err);
          }
          
          const uDocs = allUsers.filter(u => u.role === 'doctor').map(u => ({
            id: u.uid,
            name: u.displayName || 'Unnamed Doctor',
            email: u.email || '',
            specialty: (u as any).specialty || 'General Physician',
            fee: (u as any).fee || 0,
            bmdcNumber: (u as any).bmdcNumber,
            experience: (u as any).experience,
            degree: (u as any).degree,
            university: (u as any).university,
            image: (u as any).image || u.photoURL,
            isUserAccount: true
          })) as any[];
          setUserDoctors(uDocs);
        }
        
        if (activeTab === 'doctors') {
          const snapshot = await getDocs(query(collection(db, 'doctors'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
          docs.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
            return dateB - dateA;
          });
          setManualDoctors(docs);
        } else if (activeTab === 'medicines') {
          const snapshot = await getDocs(query(collection(db, 'medicines'), orderBy('orderIndex', 'asc')));
          if (snapshot.empty) {
             const fallback = await getDocs(query(collection(db, 'medicines'), orderBy('name', 'asc')));
             setMedicines(fallback.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
          } else {
             setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
          }
        } else if (activeTab === 'pharmacies') {
          const snapshot = await getDocs(query(collection(db, 'pharmacies'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setPharmacies(docs);
        } else if (activeTab === 'labs') {
          const snapshot = await getDocs(query(collection(db, 'labs'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setLabs(docs);
        } else if (activeTab === 'physios') {
          const snapshot = await getDocs(query(collection(db, 'physios'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setPhysios(docs);
        } else if (activeTab === 'hospitals') {
          const snapshot = await getDocs(query(collection(db, 'hospitals'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setHospitals(docs);
        } else if (activeTab === 'ambulances') {
          const snapshot = await getDocs(query(collection(db, 'ambulances'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setAmbulances(docs);
        } else if (activeTab === 'nursings') {
          const snapshot = await getDocs(query(collection(db, 'nursings'), limit(50)));
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Provider));
          docs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          setNursings(docs);
        } else if (activeTab === 'shop_requests') {
          const snapshot = await getDocs(query(collection(db, 'shop_requests'), orderBy('createdAt', 'desc')));
          setShopRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        setLoading(false);
      } catch (err: any) {
        console.error("Admin dashboard fetch error:", err);
        const errMsg = err.message || '';
        if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || errMsg.includes('Quota exceeded')) {
          setFetchError('QUOTA_EXCEEDED');
          
          const cacheKey = activeTab === 'users' || activeTab === 'patients' ? 'admin_cached_users' : 
                          activeTab === 'doctors' ? 'admin_cached_doctors' :
                          activeTab === 'medicines' ? 'admin_cached_meds' : '';
          
          if (cacheKey) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const data = JSON.parse(cached);
              if (activeTab === 'doctors') setManualDoctors(data);
              else if (activeTab === 'medicines') setMedicines(data);
              else if (activeTab === 'users' || activeTab === 'patients') setUsers(data);
            }
          }
        } else {
          setFetchError(errMsg);
        }
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab]);

  // Dedicated Admin Wallet Listener
  useEffect(() => {
    const adminEmail = 'shustobd@gmail.com';
    const q = query(collection(db, 'users'), where('email', '==', adminEmail));
    
    let unsubWallet: (() => void) | null = null;
    
    const unsubUser = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const adminId = snapshot.docs[0].id;
        if (unsubWallet) unsubWallet();
        unsubWallet = onSnapshot(doc(db, 'wallets', adminId), (walletDoc) => {
          if (walletDoc.exists()) {
            setAdminBalance(walletDoc.data().balance || 0);
          }
        });
      }
    });

    return () => {
      unsubUser();
      if (unsubWallet) unsubWallet();
    };
  }, []);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showAddShopModal, setShowAddShopModal] = useState(false);
  const [newShopData, setNewShopData] = useState({
    shopName: '',
    category: 'Pharmacy',
    address: '',
    phone: '',
    userEmail: ''
  });

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Find user by email to get UID and Name
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newShopData.userEmail.toLowerCase().trim()));
      const userSnap = await getDocs(q);
      
      if (userSnap.empty) {
        alert("এই ইমেইল দিয়ে কোনো ইউজার পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      const targetUser = userSnap.docs[0].data();
      
      await addDoc(collection(db, 'shop_requests'), {
        shopName: newShopData.shopName,
        category: newShopData.category,
        address: newShopData.address,
        phone: newShopData.phone,
        userId: userSnap.docs[0].id,
        userEmail: targetUser.email,
        userName: targetUser.displayName || 'Unknown',
        status: 'approved',
        createdAt: new Date().toISOString()
      });

      setShowAddShopModal(false);
      setNewShopData({ shopName: '', category: 'Pharmacy', address: '', phone: '', userEmail: '' });
      
      // Refresh list
      const snapshot = await getDocs(query(collection(db, 'shop_requests'), orderBy('createdAt', 'desc')));
      setShopRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      showSuccess('Shop added successfully!');
    } catch (err) {
      console.error("Error adding shop:", err);
      alert("শপ যোগ করা সম্ভব হয়নি।");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const email = newDoctor.email ? newDoctor.email.toLowerCase().trim() : '';
    if (!newDoctor.name.trim()) {
      alert("Doctor name is required.");
      return;
    }
    if (!email) {
      alert("Doctor email is required.");
      return;
    }

    setIsSubmitting(true);
    const cleanEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const id = `doc_${cleanEmail}`;
    const existing = manualDoctors.find(d => d.id === id);
    
    try {
      const doctorData: Doctor = { 
        ...newDoctor, 
        name: newDoctor.name.trim(),
        email,
        id,
        specialty: newDoctor.specialty.trim() || 'General Physician',
        fee: Number(newDoctor.fee) || 0,
        bmdcNumber: newDoctor.bmdcNumber.trim() || '',
        experience: newDoctor.experience.trim() || '',
        degree: newDoctor.degree.trim() || '',
        university: newDoctor.university.trim() || '',
        division: newDoctor.division || '',
        district: newDoctor.district || '',
        thana: newDoctor.thana || '',
        userId: `email_${cleanEmail}`,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Save directly to 'doctors' collection FIRST
      await setDoc(doc(db, 'doctors', id), doctorData);

      // 2. Try syncing with 'users' collection safely without blocking doctor creation
      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', email));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          doctorData.userId = userSnapshot.docs[0].id;
        }

        const syncData = {
          role: 'doctor',
          specialty: doctorData.specialty,
          fee: doctorData.fee,
          bmdcNumber: doctorData.bmdcNumber,
          experience: doctorData.experience,
          degree: doctorData.degree,
          university: doctorData.university,
          image: doctorData.image,
          photoURL: doctorData.image,
          displayName: doctorData.name,
          division: doctorData.division,
          district: doctorData.district,
          thana: doctorData.thana
        };

        if (!userSnapshot.empty) {
          const updatePromises = userSnapshot.docs.map(userDoc => 
            updateDoc(doc(db, 'users', userDoc.id), syncData)
          );
          await Promise.all(updatePromises);
        } else {
          const manualId = `email_${cleanEmail}`;
          await setDoc(doc(db, 'users', manualId), {
            ...syncData,
            email,
            uid: manualId,
            createdAt: new Date().toISOString()
          });
        }
      } catch (userErr) {
        console.warn("User role sync error (non-fatal):", userErr);
      }
      
      // Update local state immediately so doctor appears right away
      setManualDoctors(prev => {
        const filtered = prev.filter(d => d.id !== id);
        return [doctorData, ...filtered];
      });
      
      setNewDoctor({ name: '', specialty: '', fee: 0, bmdcNumber: '', experience: '', degree: '', university: '', email: '', image: '', division: '', district: '', thana: '' });
      setShowAddModal(false);
      showSuccess(existing ? "Doctor info and role updated!" : "Doctor added successfully!");
    } catch (error) {
      console.error("Error adding doctor:", error);
      handleFirestoreError(error, OperationType.WRITE, 'doctors');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        if (updatingDoctorId) {
          // Find if it's a user account or manual doctor
          const isUser = userDoctors.some(d => d.id === updatingDoctorId);
          const collectionName = isUser ? 'users' : 'doctors';
          
          try {
            await updateDoc(doc(db, collectionName, updatingDoctorId), { 
              image: base64,
              ...(isUser ? { photoURL: base64 } : {})
            });
            showSuccess("Doctor photo updated!");
          } catch (error) {
            console.error("Error updating photo:", error);
            alert("Failed to update photo. The image might be too large.");
          }
          setUpdatingDoctorId(null);
        } else {
          // New doctor form
          setNewDoctor(prev => ({ ...prev, image: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMedicineImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (editingMedicine) {
          setEditingMedicine(prev => prev ? { ...prev, image: base64 } : null);
        } else {
          setNewMedicineData(prev => ({ ...prev, image: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    
    setLoading(true);
    try {
      if (activeTab === 'doctors') {
        await updateDoc(doc(db, 'doctors', showEditModal.id), {
          name: showEditModal.name,
          specialty: showEditModal.specialty,
          fee: showEditModal.fee,
          bmdcNumber: showEditModal.bmdcNumber,
          experience: showEditModal.experience,
          degree: showEditModal.degree,
          university: showEditModal.university,
          email: showEditModal.email
        });
        
        // Sync to users collection
        if (showEditModal.email) {
          const userQuery = query(collection(db, 'users'), where('email', '==', showEditModal.email.toLowerCase()));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
             const updatePromises = userSnapshot.docs.map(userDoc => 
               updateDoc(doc(db, 'users', userDoc.id), {
                 displayName: showEditModal.name,
                 specialty: showEditModal.specialty,
                 fee: showEditModal.fee,
                 bmdcNumber: showEditModal.bmdcNumber,
                 experience: showEditModal.experience,
                 degree: showEditModal.degree,
                 university: showEditModal.university
               })
             );
             await Promise.all(updatePromises);
          }
        }

      } else {
        const collectionName = 
          activeTab === 'pharmacies' ? 'pharmacies' : 
          activeTab === 'labs' ? 'labs' : 
          activeTab === 'physios' ? 'physios' : 
          activeTab === 'hospitals' ? 'hospitals' : 
          activeTab === 'nursings' ? 'nursings' : 'ambulances';
        
        const type = activeTab.slice(0, -1);
        
        await updateDoc(doc(db, collectionName, showEditModal.id), {
          name: showEditModal.name,
          location: showEditModal.location,
          contact: showEditModal.contact,
          division: showEditModal.division,
          district: showEditModal.district,
          thana: showEditModal.thana || '',
          email: showEditModal.email
        });
        
        // Sync to users collection
        if (showEditModal.email) {
          const userQuery = query(collection(db, 'users'), where('email', '==', showEditModal.email.toLowerCase()));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
             const updatePromises = userSnapshot.docs.map(userDoc => 
               updateDoc(doc(db, 'users', userDoc.id), {
                 displayName: showEditModal.name,
                 role: type,
                 location: showEditModal.location,
                 contact: showEditModal.contact,
                 division: showEditModal.division,
                 district: showEditModal.district,
                 thana: showEditModal.thana || ''
               })
             );
             await Promise.all(updatePromises);
          }
        }
      }

      setShowEditModal(null);
      showSuccess(activeTab === 'doctors' ? 'Doctor updated successfully!' : 'Provider updated successfully!');
    } catch (error) {
      console.error("Error updating:", error);
      alert("Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  const seedProviders = async () => {
    if (!confirm('This will seed 5 default centers and their initial services for the current tab. Continue?')) return;
    setLoading(true);
    try {
      const collectionName = 
        activeTab === 'pharmacies' ? 'pharmacies' : 
        activeTab === 'labs' ? 'labs' : 
        activeTab === 'physios' ? 'physios' : 
        activeTab === 'hospitals' ? 'hospitals' : 
        activeTab === 'nursings' ? 'nursings' : 'ambulances';
      
      const type = activeTab.slice(0, -1);
      
      const providers = [
        { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Center Dhanmondi`, location: 'Dhanmondi, Dhaka', division: 'Dhaka', district: 'Dhaka', contact: '01711111111', email: `dhanmondi.${type}@shusto.com` },
        { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Care Gulshan`, location: 'Gulshan 2, Dhaka', division: 'Dhaka', district: 'Dhaka', contact: '01722222222', email: `gulshan.${type}@shusto.com` },
        { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Point Banani`, location: 'Banani, Dhaka', division: 'Dhaka', district: 'Dhaka', contact: '01733333333', email: `banani.${type}@shusto.com` },
        { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Hub Uttara`, location: 'Uttara, Dhaka', division: 'Dhaka', district: 'Dhaka', contact: '01744444444', email: `uttara.${type}@shusto.com` },
        { name: `${type.charAt(0).toUpperCase() + type.slice(1)} Station Chittagong`, location: 'GEC, Chittagong', division: 'Chittagong', district: 'Chittagong', contact: '01755555555', email: `ctg.${type}@shusto.com` }
      ];

      for (const p of providers) {
        const id = p.email.replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(doc(db, collectionName, id), { ...p, id, type: activeTab.slice(0, -1) });
        
        // If Hospital or Nursing, seed some sample services (posts) so they show up in Directory
        if (type === 'hospital' || type === 'nursing') {
          const presets = type === 'hospital' ? HOSPITAL_SERVICES_PRESETS : NURSING_SERVICES_PRESETS;
          for (const service of presets.slice(0, 4)) {
            const postId = `post_${type}_${id}_${service.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
            await setDoc(doc(db, 'posts', postId), {
              id: postId,
              title: service.name,
              description: service.description || '',
              price: service.price,
              image: service.image || '',
              providerId: id,
              providerName: p.name,
              providerType: type,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      showSuccess(`Seeded 5 ${activeTab} centers and their sample services!`);
    } catch (error) {
      console.error("Error seeding providers:", error);
      alert("Failed to seed providers.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGeneralProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newProvider.name.trim()) {
      alert("Provider name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const type = activeTab === 'pharmacies' ? 'pharmacy' : 
                   activeTab === 'labs' ? 'lab' : 
                   activeTab === 'physios' ? 'physio' : 
                   activeTab === 'hospitals' ? 'hospital' : 
                   activeTab === 'nursings' ? 'nursing' : 'ambulance';
      
      const collectionName = activeTab;
      const cleanName = newProvider.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const id = `${type}_${cleanName}`;
      const email = newProvider.email ? newProvider.email.toLowerCase().trim() : '';
      
      await setDoc(doc(db, collectionName, id), { 
        ...newProvider, 
        id, 
        type,
        email,
        division: newProvider.division,
        district: newProvider.district,
        thana: newProvider.thana || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update user accounts safely if email provided
      if (email) {
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', email));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const updatePromises = userSnapshot.docs.map(userDoc => 
              updateDoc(doc(db, 'users', userDoc.id), { 
                role: type,
                division: newProvider.division,
                district: newProvider.district,
                thana: newProvider.thana || ''
              })
            );
            await Promise.all(updatePromises);
          } else {
            const manualId = `email_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            await setDoc(doc(db, 'users', manualId), {
              email,
              role: type,
              displayName: newProvider.name,
              uid: manualId,
              division: newProvider.division,
              district: newProvider.district,
              thana: newProvider.thana || '',
              createdAt: new Date().toISOString()
            });
          }
        } catch (userErr) {
          console.warn("User role sync error (non-fatal):", userErr);
        }
      }
      
      setNewProvider({ name: '', location: '', contact: '', email: '', division: '', district: '', thana: '' });
      setShowAddModal(false);
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`);
    } catch (error) {
      console.error("Error adding provider:", error);
      handleFirestoreError(error, OperationType.WRITE, activeTab);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Merged lists to prevent duplicates in the dashboard UI
  const allDoctors = useMemo(() => {
    const doctorMap = new Map<string, Doctor>();
    
    // First load manualDoctors
    manualDoctors.forEach(doc => { 
      const key = doc.email ? doc.email.toLowerCase().trim() : doc.id;
      if (key) {
        doctorMap.set(key, doc);
      }
    });

    // Merge userDoctors while preserving manual doctor fields
    userDoctors.forEach(uDoc => {
      const key = uDoc.email ? uDoc.email.toLowerCase().trim() : uDoc.id;
      if (key) {
        const existing = doctorMap.get(key);
        if (existing) {
          doctorMap.set(key, {
            ...uDoc,
            ...existing, // Keep manual doctor fields as primary truth
            name: existing.name || uDoc.name,
            specialty: (existing.specialty && existing.specialty !== 'General Physician') ? existing.specialty : (uDoc.specialty || existing.specialty || 'General Physician'),
            fee: Number(existing.fee) > 0 ? Number(existing.fee) : Number(uDoc.fee) || 0,
            bmdcNumber: existing.bmdcNumber || uDoc.bmdcNumber || '',
            experience: existing.experience || uDoc.experience || '',
            degree: existing.degree || uDoc.degree || '',
            university: existing.university || uDoc.university || '',
            image: existing.image || uDoc.image,
            division: existing.division || uDoc.division,
            district: existing.district || uDoc.district,
            id: existing.id || uDoc.id,
            isUserAccount: true
          } as Doctor);
        } else {
          doctorMap.set(key, uDoc);
        }
      }
    });

    return Array.from(doctorMap.values());
  }, [manualDoctors, userDoctors]);

  const mergedPharmacies = useMemo(() => {
    const map = new Map<string, Provider>();
    pharmacies.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [pharmacies]);

  const mergedLabs = useMemo(() => {
    const map = new Map<string, Provider>();
    labs.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [labs]);

  const mergedPhysios = useMemo(() => {
    const map = new Map<string, Provider>();
    physios.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [physios]);

  const mergedHospitals = useMemo(() => {
    const map = new Map<string, Provider>();
    hospitals.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [hospitals]);

  const mergedAmbulances = useMemo(() => {
    const map = new Map<string, Provider>();
    ambulances.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [ambulances]);

  const mergedNursings = useMemo(() => {
    const map = new Map<string, Provider>();
    nursings.forEach(p => { if (p.email) map.set(p.email.toLowerCase().trim(), p); });
    return Array.from(map.values());
  }, [nursings]);

  // Bulk add medicines with real images
  const cleanupManualEntries = async () => {
    alert('নিরাপত্তার স্বার্থে বাল্ক ডাটা রিমুভ অপশন এই প্রজেক্ট থেকে নিষ্ক্রিয় রাখা হয়েছে।');
  };

  const deleteItem = async (collectionName: string, id: string) => {
    alert('নিরাপত্তার স্বার্থে ডিলিট/রিমুভ অপশন এই প্রজেক্ট থেকে নিষ্ক্রিয় রাখা হয়েছে। কোন ডাটা ডিলিট হবে না।');
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const userToUpdate = users.find(u => u.uid === userId);
      
      // Update user document with role and default doctor fields if needed
      const updateData: any = { role: newRole, roleUpdatedAt: new Date().toISOString() };
      if (newRole === 'doctor') {
        updateData.specialty = 'General Physician';
        updateData.fee = 500;
        updateData.bmdcNumber = 'Pending';
      }
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      // If the user being updated is a provider, we should also ensure they have a record in the respective collection
      if (userToUpdate && ['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance', 'nursing'].includes(newRole)) {
        const collectionName = newRole === 'doctor' ? 'doctors' : 
                             newRole === 'pharmacy' ? 'pharmacies' : 
                             newRole === 'lab' ? 'labs' : 
                             newRole === 'physio' ? 'physios' : 
                             newRole === 'hospital' ? 'hospitals' : 
                             newRole === 'nursing' ? 'nursings' : 'ambulances';
        
        const providerId = `u_${userId}`;
        const providerRef = doc(db, collectionName, providerId);
        const providerDoc = await getDoc(providerRef);
        
        if (!providerDoc.exists()) {
          // Create a basic provider record so they show up in directories
          await setDoc(providerRef, {
            id: providerId,
            name: userToUpdate.displayName || 'Unnamed Provider',
            email: userToUpdate.email,
            type: newRole,
            userId: userId,
            // Default values for doctors
            ...(newRole === 'doctor' ? { specialty: 'General Physician', fee: 500, bmdcNumber: 'Pending' } : { location: 'Pending', contact: 'Pending' })
          });
        }
      }

      setUsers(users.map(u => u.uid === userId ? { ...u, ...updateData } : u));
      showSuccess(`Role updated to ${newRole} successfully!`);
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please check permissions.");
    }
  };

  const handleAddProvider = null; // Removed as requested

  const syncUserRole = async (targetUser: UserProfile) => {
    setLoading(true);
    try {
      const email = targetUser.email.toLowerCase().trim();
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'];
      let found = false;

      for (const collectionName of providerCollections) {
        const q = query(collection(db, collectionName), where('email', '==', email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const newRole = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 
                         collectionName === 'nursings' ? 'nursing' : 'ambulance';
          
          const updateData: any = { role: newRole };
          if (newRole === 'doctor') {
            updateData.specialty = data.specialty;
            updateData.fee = data.fee;
            updateData.bmdcNumber = data.bmdcNumber;
            updateData.experience = data.experience;
          }
          
          await updateDoc(doc(db, 'users', targetUser.uid), updateData);
          found = true;
          showSuccess(`Synced ${targetUser.displayName} as ${newRole}!`);
          break;
        }
      }

      if (!found) {
        alert(`No provider record found for ${email}. User remains as ${targetUser.role}.`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync user role.");
    } finally {
      setLoading(false);
    }
  };

  const syncAllRoles = async () => {
    setLoading(true);
    try {
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'];
      let totalSynced = 0;

      for (const collectionName of providerCollections) {
        const snapshot = await getDocs(collection(db, collectionName));
        for (const pSnap of snapshot.docs) {
          const pData = pSnap.data();
          if (pData.email) {
            const email = pData.email.toLowerCase().trim();
            const userQuery = query(collection(db, 'users'), where('email', '==', email));
            const userSnapshot = await getDocs(userQuery);
            
            const newRole = collectionName === 'doctors' ? 'doctor' : 
                           collectionName === 'pharmacies' ? 'pharmacy' : 
                           collectionName === 'labs' ? 'lab' : 
                           collectionName === 'physios' ? 'physio' : 
                           collectionName === 'hospitals' ? 'hospital' : 
                           collectionName === 'nursings' ? 'nursing' : 'ambulance';

            for (const userDoc of userSnapshot.docs) {
              const updateData: any = { role: newRole };
              if (newRole === 'doctor') {
                updateData.specialty = pData.specialty;
                updateData.fee = pData.fee;
                updateData.bmdcNumber = pData.bmdcNumber;
                updateData.experience = pData.experience;
              }
              await updateDoc(doc(db, 'users', userDoc.id), updateData);
              totalSynced++;
            }
          }
        }
      }

      showSuccess(`Successfully synced ${totalSynced} user roles!`);
    } catch (error) {
      console.error("Sync error:", error);
      alert("Failed to sync roles.");
    } finally {
      setLoading(false);
    }
  };

  const seedMedicines = async () => {
    if (!confirm('This will seed a collection of 25+ common medicines with distinctive actual images. Continue?')) return;
    setLoading(true);
    try {
      const medicinePresets = [
        { name: 'Napa Extend', generic: 'Paracetamol', category: 'Fever & Pain', price: 15, company: 'Beximco', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800' },
        { name: 'Seclo 20', generic: 'Omeprazole', category: 'Gastric', price: 7, company: 'Square', image: 'https://images.unsplash.com/photo-1471864190281-ad5f9fc0700c?q=80&w=800' },
        { name: 'Fenadin 120', generic: 'Fexofenadine', category: 'Allergy', price: 10, company: 'Renata', image: 'https://images.unsplash.com/photo-1628771065518-0d82f1110547?q=80&w=800' },
        { name: 'Zithrin 500', generic: 'Azithromycin', category: 'Antibiotic', price: 35, company: 'Radiant', image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?q=80&w=800' },
        { name: 'Calbo-D', generic: 'Calcium + Vitamin D3', category: 'Supplements', price: 250, company: 'Square', image: 'https://images.unsplash.com/photo-1550572017-ed200f5e6383?q=80&w=400' },
        { name: 'Alatrol', generic: 'Cetirizine', category: 'Allergy', price: 5, company: 'Square', image: 'https://images.unsplash.com/photo-1631549916768-4119b295f78b?q=80&w=800' },
        { name: 'Monas 10', generic: 'Montelukast', category: 'Asthma', price: 18, company: 'Acme', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=800' },
        { name: 'Sergel 20', generic: 'Esomeprazole', category: 'Gastric', price: 8, company: 'Healthcare', image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=800' },
        { name: 'Ace Plus', generic: 'Paracetamol + Caffeine', category: 'Fever & Pain', price: 3, company: 'Square', image: 'https://images.unsplash.com/photo-1550572017-ed200f5e6383?q=80&w=400&sig=aceplus' },
        { name: 'Tofen', generic: 'Ketotifen', category: 'Asthma', price: 4, company: 'Beximco', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?q=80&w=800&sig=tofen' },
        { name: 'Bextram Gold', generic: 'Multivitamin', category: 'Supplements', price: 450, company: 'Beximco', image: 'https://images.unsplash.com/photo-1615461066841-f6677c789c6e?q=80&w=800' },
        { name: 'Orsaline N', generic: 'ORS', category: 'Nutrition', price: 6, company: 'SMC', image: 'https://images.unsplash.com/photo-1631549916768-4119b295f78b?q=80&w=800' },
        { name: 'Thyrox 50', generic: 'Levothyroxine', category: 'Hormone', price: 3, company: 'Square', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?q=80&w=800' },
        { name: 'Amodis 400', generic: 'Metronidazole', category: 'Gastric', price: 5, company: 'Aristopharma', image: 'https://images.unsplash.com/photo-1471864190281-ad5f9fc0700c?q=80&w=800&sig=amodis' },
        { name: 'Ecap 400', generic: 'Vitamin E', category: 'Supplements', price: 7, company: 'Healthcare', image: 'https://images.unsplash.com/photo-1559113084-25e50529d1bd?q=80&w=800' },
        { name: 'Maxpro 20', generic: 'Esomeprazole', category: 'Gastric', price: 7, company: 'Renata', image: 'https://images.unsplash.com/photo-1626285861696-9f0bf5a49c6d?q=80&w=800&sig=maxpro' },
        { name: 'Rivotril 0.5', generic: 'Clonazepam', category: 'Anxiety', price: 8, company: 'Roche', image: 'https://images.unsplash.com/photo-1563342081-3968393587b1?q=80&w=800' },
        { name: 'Exium 20', generic: 'Esomeprazole', category: 'Gastric', price: 10, company: 'Radiant', image: 'https://images.unsplash.com/photo-1471864190281-ad5f9fc0700c?q=80&w=800&sig=exium' },
        { name: 'Bizoran 5/20', generic: 'Amlodipine + Olmesartan', category: 'Blood Pressure', price: 12, company: 'Square', image: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=800' },
        { name: 'Metfo 500', generic: 'Metformin', category: 'Diabetes', price: 4, company: 'Beximco', image: 'https://images.unsplash.com/photo-1615461066159-fea0960485d5?q=80&w=800' },
        { name: 'Angilock 50', generic: 'Losartan', category: 'Blood Pressure', price: 8, company: 'Square', image: 'https://images.unsplash.com/photo-1631549916768-4119b295f78b?q=80&w=800&sig=angilock' },
        { name: 'Pantonix 20', generic: 'Pantoprazole', category: 'Gastric', price: 6, company: 'Incepta', image: 'https://images.unsplash.com/photo-1471864190281-ad5f9fc0700c?q=80&w=800&sig=pantonix' },
        { name: 'Filwel Gold', generic: 'Multivitamin', category: 'Supplements', price: 10, company: 'Square', image: 'https://images.unsplash.com/photo-15840174443b1-27bbd969ec8c?q=80&w=800' },
        { name: 'Xinc', generic: 'Zinc Sulfate', category: 'Supplements', price: 3, company: 'Square', image: 'https://images.unsplash.com/photo-1550572017-ed200f5e6383?q=80&w=400&sig=xinc' },
        { name: 'Rovista 10', generic: 'Rosuvastatin', category: 'Heart', price: 15, company: 'Incepta', image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?q=80&w=800' }
      ];

      for (const med of medicinePresets) {
        const id = `med_${med.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'medicines', id), { ...med, id, updatedAt: new Date().toISOString() });
      }
      showSuccess("Medicines seeded with real images!");
    } catch (error) {
      console.error("Medicine seed error:", error);
      alert("Failed to seed medicines.");
    } finally {
      setLoading(false);
    }
  };

  const seedServices = async () => {
    if (!confirm(`This will seed ${LAB_SERVICES_PRESETS.length + PHYSIO_SERVICES_PRESETS.length} total services for Lab and Physio. Continue?`)) return;
    setLoading(true);
    try {
      // Clear old services first to prevent stale data
      const labsSnap = await getDocs(collection(db, 'labTests'));
      const physiosSnap = await getDocs(collection(db, 'physioServices'));
      
      const deletePromises = [
        ...labsSnap.docs.map(d => deleteDoc(d.ref)),
        ...physiosSnap.docs.map(d => deleteDoc(d.ref))
      ];
      await Promise.all(deletePromises);

      // Seed Lab Tests
      for (const test of LAB_SERVICES_PRESETS) {
        const id = `lab_${test.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'labTests', id), { ...test, id, type: 'lab' });
      }
      
      // Seed Physio Services
      for (const service of PHYSIO_SERVICES_PRESETS) {
        const id = `physio_${service.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await setDoc(doc(db, 'physioServices', id), { ...service, id, type: 'physio' });
      }
      
      showSuccess(`Global services seeded! (${LAB_SERVICES_PRESETS.length} Lab, ${PHYSIO_SERVICES_PRESETS.length} Physio)`);
    } catch (error) {
      console.error("Seed error:", error);
      alert("Failed to seed services.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMedicine) {
        // Edit existing medicine
        await setDoc(doc(db, 'medicines', editingMedicine.id), {
          ...editingMedicine,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showSuccess("ঔষধ সফলভাবে আপডেট করা হয়েছে!");
        setEditingMedicine(null);
      } else if (isAddingMedicine) {
        // Add new medicine
        const id = `med_${newMedicineData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        await setDoc(doc(db, 'medicines', id), {
          id,
          ...newMedicineData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        showSuccess("নতুন ঔষধ সফলভাবে যোগ করা হয়েছে!");
        setIsAddingMedicine(false);
        setNewMedicineData({ name: '', generic: '', category: 'Fever & Pain', price: 0, company: '', image: '' });
      }
      
      // Refresh medicines list
      const snapshot = await getDocs(collection(db, 'medicines'));
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
    } catch (err) {
      console.error("Error saving medicine:", err);
      alert("ঔষধ সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই ঔষধটি মুছে ফেলতে চান?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'medicines', id));
      showSuccess("ঔষধ মুছে ফেলা হয়েছে!");
      
      // Refresh medicines list
      const snapshot = await getDocs(collection(db, 'medicines'));
      setMedicines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine)));
    } catch (err) {
      console.error("Error deleting medicine:", err);
      alert("ঔষধ মুছতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const adjustMedicinePrice = async (medicine: Medicine, change: number) => {
    const newPrice = Math.max(0, medicine.price + change);
    if (newPrice === medicine.price) return;
    
    // Optimistically update local UI state to be instant
    setMedicines(prev => prev.map(m => m.id === medicine.id ? { ...m, price: newPrice } : m));
    
    try {
      await setDoc(doc(db, 'medicines', medicine.id), {
        price: newPrice,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Update local storage cached medicines
      const cached = localStorage.getItem('admin_cached_meds');
      if (cached) {
        try {
          const cachedMeds = JSON.parse(cached) as Medicine[];
          const updated = cachedMeds.map(m => m.id === medicine.id ? { ...m, price: newPrice } : m);
          localStorage.setItem('admin_cached_meds', JSON.stringify(updated));
        } catch (e) {}
      }
      
      // Also update general customer/visitor cache so they see the change immediately
      const clientCached = localStorage.getItem('cached_medicines');
      if (clientCached) {
        try {
          const cachedMeds = JSON.parse(clientCached) as Medicine[];
          const updated = cachedMeds.map(m => m.id === medicine.id ? { ...m, price: newPrice } : m);
          localStorage.setItem('cached_medicines', JSON.stringify(updated));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Error adjusting medicine price:", err);
      // Revert on error
      setMedicines(prev => prev.map(m => m.id === medicine.id ? { ...m, price: medicine.price } : m));
      alert("মূল্য আপডেট করতে সমস্যা হয়েছে।");
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = editingService || newServiceData;
    const isEditing = !!editingService;
    const type = data.type; // 'lab' or 'physio'
    const collectionName = type === 'lab' ? 'labTests' : 'physioServices';
    
    try {
      if (isEditing && editingService) {
        // Edit existing
        await setDoc(doc(db, collectionName, editingService.id), {
          ...editingService,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        showSuccess("সার্ভিস সফলভাবে আপডেট করা হয়েছে!");
        setEditingService(null);
      } else if (isAddingService) {
        // Add new
        const id = `${type}_${newServiceData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
        await setDoc(doc(db, collectionName, id), {
          id,
          ...newServiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        showSuccess("নতুন সার্ভিস সফলভাবে যোগ করা হয়েছে!");
        setIsAddingService(false);
        setNewServiceData({ name: '', category: 'General', price: 0, image: '', description: '', type: 'physio' });
      }
      
      // Refresh list
      const labTestsSnap = await getDocs(collection(db, 'labTests'));
      const physioServSnap = await getDocs(collection(db, 'physioServices'));
      setLabTests(labTestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
      setPhysioServices(physioServSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
    } catch (err) {
      console.error("Error saving service:", err);
      alert("সার্ভিস সংরক্ষণ করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (id: string, type: 'lab' | 'physio') => {
    if (!confirm("আপনি কি নিশ্চিতভাবে এই সার্ভিসটি মুছে ফেলতে চান?")) return;
    setLoading(true);
    const collectionName = type === 'lab' ? 'labTests' : 'physioServices';
    try {
      await deleteDoc(doc(db, collectionName, id));
      showSuccess("সার্ভিস সফলভাবে মুছে ফেলা হয়েছে!");
      
      // Refresh list
      const labTestsSnap = await getDocs(collection(db, 'labTests'));
      const physioServSnap = await getDocs(collection(db, 'physioServices'));
      setLabTests(labTestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
      setPhysioServices(physioServSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GenericService)));
    } catch (err) {
      console.error("Error deleting service:", err);
      alert("সার্ভিস মুছতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'user', label: 'User', icon: UserIcon, split: 0 },
    { id: 'admin', label: 'Admin', icon: Shield, split: 0 },
    { id: 'doctor', label: 'Doctor', icon: Stethoscope, split: 0.70 },
    { id: 'pharmacy', label: 'Pharmacy', icon: Pill, split: 0.95 },
    { id: 'lab', label: 'Lab', icon: FlaskConical, split: 0.85 },
    { id: 'ambulance', label: 'Ambulance', icon: Truck, split: 0.90 },
    { id: 'hospital', label: 'Hospital', icon: Building, split: 0.80 },
    { id: 'physio', label: 'Physio', icon: Activity, split: 0.75 },
    { id: 'nursing', label: 'Nursing', icon: Heart, split: 0.80 },
    { id: 'investor', label: 'Investor', icon: DollarSign, split: 0 },
    { id: 'manager', label: 'Manager', icon: Shield, split: 0 },
  ];

  // Remove boring loading state as requested
  // if (loading && users.length === 0) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-8">
      {/* Quota Error Alert */}
      {fetchError === 'QUOTA_EXCEEDED' && (
        <div className="bg-red-50 border-2 border-red-200 p-8 rounded-[32px] text-center space-y-4">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Activity size={40} />
          </div>
          <h2 className="text-3xl font-black text-red-900">Firebase Quota Exceeded!</h2>
          <p className="text-red-700 max-w-lg mx-auto font-medium">
            দুঃখিত, আজকের জন্য ফায়ারবেসের ডেটা ব্যবহারের সীমা (Free Quota) শেষ হয়ে গেছে। 
            আগামীকাল বাংলাদেশ সময় দুপুর ১টায় এটি আবার রিসেট হবে। বর্তমানে ক্যাশ (Cached) ডেটা দেখানো হচ্ছে, নতুন কোনো ডেটা লোড হবে না।
          </p>
          <div className="pt-4">
             <button 
               onClick={() => window.location.reload()}
               className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all"
             >
               রিফ্রেশ করে দেখুন
             </button>
          </div>
        </div>
      )}

      {fetchError && fetchError !== 'QUOTA_EXCEEDED' && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl text-amber-800 font-medium">
          Error loading data: {fetchError}
        </div>
      )}
      {/* Hidden File Input for Doctor Images */}
      <input 
        id="doctor-image-upload"
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageUpload}
      />

      {/* Hidden File Input for Medicine Images */}
      <input 
        id="medicine-image-upload"
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handleMedicineImageUpload}
      />

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[200] bg-sky-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
          {successMessage}
        </div>
      )}

      {/* Revenue Split Info & Admin Wallet */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Admin Profit Card */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-sky-400 font-bold uppercase tracking-widest text-xs mb-2">Total Accumulated Profit</p>
            <h2 className="text-5xl font-black mb-6">৳{adminBalance.toLocaleString()}</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setActiveTab('profits')}
                className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20"
              >
                <TrendingUp size={18} /> লভ্যাংশ হিসাব (Profits)
              </button>
              <button 
                onClick={() => setActiveTab('profits')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Building size={18} /> Bank থেকে তুলে নিব
              </button>
              <button 
                onClick={() => setActiveTab('transactions')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl font-bold flex items-center gap-2 transition-all text-white"
              >
                <DollarSign size={18} /> লেনদেন দেখুন
              </button>
            </div>
          </div>
        </div>

        {roles.filter(r => r.split > 0).map(role => (
          <div key={role.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                <role.icon size={24} />
              </div>
              <p className="text-lg font-black text-sky-600">{(role.split * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{role.label} Share</p>
              <p className="text-[10px] text-slate-400">Shusto Profit: {((1 - role.split) * 100).toFixed(0)}%</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-sky-500 rounded-[40px] p-8 text-white shadow-2xl shadow-sky-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-lg">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">Management Panel</h2>
            <p className="text-sky-50 text-lg">Add and manage doctors, pharmacies, and healthcare providers.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Row 1: Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
          {(['profits', 'users', 'patients', 'doctors', 'medicines', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings', 'services', 'transactions', 'merchant', 'investors', 'managers', 'states', 'shop_requests'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 py-2 rounded-xl font-bold text-sm transition-all capitalize",
                activeTab === tab ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-400 hover:bg-slate-50"
              )}
            >
              {tab === 'profits' ? '💰 লভ্যাংশ (Profits)' :
               tab === 'users' ? 'সকল ইউজার' : 
               tab === 'patients' ? 'রোগী' :
               tab === 'doctors' ? 'ডাক্তার' :
               tab === 'medicines' ? 'ঔষধ' :
               tab === 'pharmacies' ? 'ফার্মেসি স্টোর' :
               tab === 'labs' ? 'ল্যাব' :
               tab === 'physios' ? 'ফিজিওথেরাপি' :
               tab === 'services' ? 'সার্ভিস ক্যাটালগ' :
               tab === 'hospitals' ? 'হাসপাতাল' : 
               tab === 'merchant' ? 'মার্চেন্ট' :
               tab === 'investors' ? 'ইনভেস্টর' :
               tab === 'managers' ? 'ম্যানেজার' :
               tab === 'states' ? 'স্টেট' :
               tab === 'shop_requests' ? 'শপ' :
               tab === 'nursings' ? 'নার্সিং সার্ভিস' :
               tab === 'transactions' ? 'লেনদেন' : 'অ্যাম্বুলেন্স'}
            </button>
          ))}
        </div>

        {/* Row 2: Add Buttons */}
        <div className="flex flex-wrap gap-3 w-full">
          <button 
            onClick={syncAllRoles}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-sky-50 text-sky-600 font-bold rounded-2xl border border-sky-100 hover:bg-sky-100 transition-all text-sm shadow-sm"
          >
            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
            সকল রোল সিঙ্ক করুন
          </button>
          

          {['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings', 'investors', 'managers', 'states'].includes(activeTab) && (
            <button 
              onClick={() => {
                if (activeTab === 'investors') {
                  setShowUserSearchModal({ role: 'investor' });
                } else if (activeTab === 'managers') {
                  setShowUserSearchModal({ role: 'manager' });
                } else if (activeTab === 'states') {
                  setShowUserSearchModal({ role: 'state' });
                } else {
                  setShowAddModal(true);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-bold rounded-2xl transition-all text-sm border",
                ['doctors', 'pharmacies', 'nursings', 'investors', 'managers', 'states'].includes(activeTab) 
                  ? "bg-sky-50 text-sky-600 border-sky-100 hover:bg-sky-100" 
                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
              )}
            >
              <Plus size={18} /> {
                activeTab === 'pharmacies' ? 'নতুন স্টোর যোগ করুন' :
                activeTab === 'labs' ? 'ল্যাব যোগ করুন' :
                activeTab === 'physios' ? 'ফিজিওথেরাপি যোগ করুন' :
                activeTab === 'hospitals' ? 'হাসপাতাল যোগ করুন' :
                activeTab === 'nursings' ? 'নার্সিং সার্ভিস যোগ করুন' :
                activeTab === 'ambulances' ? 'অ্যাম্বুলেন্স যোগ করুন' : 
                activeTab === 'investors' ? 'ইনভেস্টর যোগ করুন' :
                activeTab === 'managers' ? 'ম্যানেজার যোগ করুন' :
                activeTab === 'states' ? 'স্টেট যোগ করুন' : 'ডাক্তার যোগ করুন'
              }
            </button>
          )}
          {activeTab === 'medicines' && (
            <>
              <button 
                onClick={() => setIsAddingMedicine(true)}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all text-sm shadow-lg shadow-emerald-500/20"
              >
                <Plus size={18} />
                নতুন ঔষধ যোগ করুন
              </button>
              <button 
                onClick={seedMedicines}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all text-sm shadow-lg shadow-sky-500/20"
              >
                <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
                ঔষধ ড্রাইভ সিঙ্ক করুন (Real Images)
              </button>
            </>
          )}
          {activeTab === 'services' && (
            <button 
              onClick={() => setIsAddingService(true)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all text-sm shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} />
              নতুন সার্ভিস যোগ করুন
            </button>
          )}
        </div>
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Professional Role Details</h2>
                <p className="text-slate-500 font-medium">Promoting <span className="text-sky-500">{showRoleModal.user.displayName}</span> to <span className="capitalize text-sky-500 font-bold">{showRoleModal.role}</span></p>
              </div>
              <button onClick={() => setShowRoleModal(null)} className="p-2 hover:bg-slate-50 rounded-xl">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Professional / Center Name</label>
                <input 
                  type="text" 
                  placeholder={showRoleModal.role === 'doctor' ? "Dr. Name" : "Center Name"} 
                  value={roleDetails.name} 
                  onChange={e => setRoleDetails({...roleDetails, name: e.target.value})} 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-bold transition-all" 
                />
              </div>

              {showRoleModal.role === 'doctor' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Specialty</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Cardiologist" 
                      value={roleDetails.specialty} 
                      onChange={e => setRoleDetails({...roleDetails, specialty: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">BMDC No.</label>
                      <input 
                        type="text" 
                        placeholder="A-12345" 
                        value={roleDetails.bmdcNumber} 
                        onChange={e => setRoleDetails({...roleDetails, bmdcNumber: e.target.value})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Consultation Fee</label>
                      <input 
                        type="number" 
                        placeholder="৳ 500" 
                        value={roleDetails.fee} 
                        onChange={e => setRoleDetails({...roleDetails, fee: Number(e.target.value)})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Degree</label>
                      <input 
                        type="text" 
                        placeholder="MBBS / FCPS" 
                        value={roleDetails.degree} 
                        onChange={e => setRoleDetails({...roleDetails, degree: e.target.value})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">University / Ex.</label>
                      <input 
                        type="text" 
                        placeholder="Dhaka Medical College" 
                        value={roleDetails.university} 
                        onChange={e => setRoleDetails({...roleDetails, university: e.target.value})} 
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                      />
                    </div>
                  </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Division</label>
                        <select
                          value={roleDetails.division}
                          onChange={(e) => setRoleDetails({ ...roleDetails, division: e.target.value, district: '' })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                        >
                          <option value="">Select Division</option>
                          {BANGLADESH_LOCATIONS.map(l => (
                            <option key={l.division} value={l.division}>{l.division}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">District</label>
                        <select
                          value={roleDetails.district}
                          onChange={(e) => setRoleDetails({ ...roleDetails, district: e.target.value })}
                          disabled={!roleDetails.division}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                        >
                          <option value="">Select District</option>
                          {roleDetails.division && BANGLADESH_LOCATIONS.find(l => l.division === roleDetails.division)?.districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Thana / Area</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Dhanmondi" 
                          value={roleDetails.thana} 
                          onChange={(e) => setRoleDetails({...roleDetails, thana: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                    </div>
                </>
              ) : ['investor', 'manager', 'state'].includes(showRoleModal.role) ? (
                <div className="space-y-4">
                  <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                    <p className="text-sm text-sky-700 font-medium leading-relaxed">
                      আপনি {showRoleModal.user.displayName} কে <strong>{showRoleModal.role === 'state' ? 'স্টেট' : showRoleModal.role}</strong> হিসেবে প্রমোট করতে যাচ্ছেন।
                    </p>
                  </div>

                  {showRoleModal.role === 'manager' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ইনভেস্টর এসাইন করুন</label>
                      <select 
                        value={roleDetails.investorId} 
                        onChange={e => setRoleDetails({...roleDetails, investorId: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all"
                      >
                        <option value="">ইনভেস্টর সিলেক্ট করুন (ঐচ্ছিক)</option>
                        {investors.map(i => (
                          <option key={i.uid} value={i.uid}>{i.displayName || i.email}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {showRoleModal.role === 'state' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ম্যানেজার এসাইন করুন</label>
                      <select 
                        value={roleDetails.managerId} 
                        onChange={e => setRoleDetails({...roleDetails, managerId: e.target.value})}
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all"
                      >
                        <option value="">ম্যানেজার সিলেক্ট করুন (ঐচ্ছিক)</option>
                        {managers.map(m => (
                          <option key={m.uid} value={m.uid}>{m.displayName || m.email}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Division</label>
                        <select
                          value={roleDetails.division}
                          onChange={(e) => setRoleDetails({ ...roleDetails, division: e.target.value, district: '' })}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                        >
                          <option value="">Select Division</option>
                          {BANGLADESH_LOCATIONS.map(l => (
                            <option key={l.division} value={l.division}>{l.division}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">District</label>
                        <select
                          value={roleDetails.district}
                          onChange={(e) => setRoleDetails({ ...roleDetails, district: e.target.value })}
                          disabled={!roleDetails.division}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                        >
                          <option value="">Select District</option>
                          {roleDetails.division && BANGLADESH_LOCATIONS.find(l => l.division === roleDetails.division)?.districts.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Thana / Area</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Uttara" 
                          value={roleDetails.thana} 
                          onChange={(e) => setRoleDetails({...roleDetails, thana: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20"
                        />
                      </div>
                    </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Location / Area</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Dhaka, Bangladesh" 
                      value={roleDetails.location} 
                      onChange={e => setRoleDetails({...roleDetails, location: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                    <input 
                      type="text" 
                      placeholder="+8801xxxxxxxxx" 
                      value={roleDetails.contact} 
                      onChange={e => setRoleDetails({...roleDetails, contact: e.target.value})} 
                      className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all" 
                    />
                  </div>
                </>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowRoleModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={handlePromoteUser}
                  disabled={loading}
                  className="flex-3 py-4 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-xl shadow-sky-500/20 disabled:opacity-50"
                >
                  {loading ? 'প্রসেসিং হচ্ছে...' : 'প্রমোশন নিশ্চিত করুন'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Provider</h2>
              <button onClick={() => setShowEditModal(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProvider} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Name</label>
                <input required type="text" value={showEditModal.name} onChange={e => setShowEditModal({...showEditModal, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
              </div>

              {activeTab === 'doctors' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Specialty</label>
                    <input required type="text" value={showEditModal.specialty || ''} onChange={e => setShowEditModal({...showEditModal, specialty: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Fee</label>
                      <input required type="number" value={showEditModal.fee || 0} onChange={e => setShowEditModal({...showEditModal, fee: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">BMDC Number</label>
                      <input required type="text" value={showEditModal.bmdcNumber || ''} onChange={e => setShowEditModal({...showEditModal, bmdcNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Degree</label>
                      <input required type="text" value={showEditModal.degree || ''} onChange={e => setShowEditModal({...showEditModal, degree: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">University</label>
                      <input required type="text" value={showEditModal.university || ''} onChange={e => setShowEditModal({...showEditModal, university: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Experience</label>
                    <input required type="text" value={showEditModal.experience || ''} onChange={e => setShowEditModal({...showEditModal, experience: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Division</label>
                      <select
                        required
                        value={showEditModal.division}
                        onChange={(e) => setShowEditModal({...showEditModal, division: e.target.value, district: ''})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <option value="">Division</option>
                        {BANGLADESH_LOCATIONS.map(l => (
                          <option key={l.division} value={l.division}>{l.division}</option>
                        ))}
                      </select>
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">District</label>
                      <select
                        required
                        value={showEditModal.district}
                        onChange={(e) => setShowEditModal({...showEditModal, district: e.target.value})}
                        disabled={!showEditModal.division}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                      >
                        <option value="">District</option>
                        {showEditModal.division && BANGLADESH_LOCATIONS.find(l => l.division === showEditModal.division)?.districts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Thana / Area</label>
                      <input 
                        type="text" 
                        value={showEditModal.thana || ''} 
                        onChange={e => setShowEditModal({...showEditModal, thana: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200" 
                      />
                    </div>
                  </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Location</label>
                    <input required type="text" value={showEditModal.location} onChange={e => setShowEditModal({...showEditModal, location: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Contact</label>
                    <input required type="text" value={showEditModal.contact} onChange={e => setShowEditModal({...showEditModal, contact: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Email</label>
                <input required type="email" value={showEditModal.email} onChange={e => setShowEditModal({...showEditModal, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl">
                {loading ? 'Saving...' : 'Update Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User Search & Promotion Modal (for Investors/Managers) */}
      {showUserSearchModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                নতুন {showUserSearchModal.role === 'investor' ? 'ইনভেস্টর' : 'ম্যানেজার'} যোগ করুন
              </h2>
              <button 
                onClick={() => {
                  setShowUserSearchModal(null);
                  setSearchTerm('');
                }} 
                className="p-2 hover:bg-slate-50 rounded-xl"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="নাম, ইমেইল বা ফোন দিয়ে সার্চ করুন..." 
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-slate-200 focus:border-sky-500 bg-slate-50/50 font-medium transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {searchTerm && (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {users.filter(u => {
                    const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                       (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (u.phoneNumber || '').includes(searchTerm);
                    const isAlreadyRole = u.role === showUserSearchModal.role;
                    const isAdmin = u.role === 'admin';
                    return matchesSearch && !isAlreadyRole && !isAdmin;
                  }).map(u => (
                    <div key={u.uid} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-sky-100 transition-all group">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100/100`} className="w-10 h-10 rounded-xl" alt="" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm leading-tight">{u.displayName || 'User'}</span>
                          <span className="text-xs text-slate-500">{u.email || u.phoneNumber}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setShowUserSearchModal(null);
                          setShowRoleModal({ user: u, role: showUserSearchModal.role });
                        }}
                        className="p-2 bg-sky-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ))}
                  {users.filter(u => {
                     const matchesSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (u.phoneNumber || '').includes(searchTerm);
                     const isAlreadyRole = u.role === showUserSearchModal.role;
                     const isAdmin = u.role === 'admin';
                     return matchesSearch && !isAlreadyRole && !isAdmin;
                  }).length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-sm">কোন ইউজার পাওয়া যায়নি</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Add {
                  activeTab === 'pharmacies' ? 'Pharmacy' :
                  activeTab === 'labs' ? 'Lab' :
                  activeTab === 'physios' ? 'Physio' :
                  activeTab === 'hospitals' ? 'Hospital' :
                  activeTab === 'nursings' ? 'Nursing' :
                  activeTab === 'ambulances' ? 'Ambulance' : 'Doctor'
                }
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            {['pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'].includes(activeTab) && (
              <form onSubmit={handleAddGeneralProvider} className="space-y-4">
                <input required type="text" placeholder="Name" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    required
                    value={newProvider.division}
                    onChange={(e) => setNewProvider({...newProvider, division: e.target.value, district: ''})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Division</option>
                    {BANGLADESH_LOCATIONS.map(l => (
                      <option key={l.division} value={l.division}>{l.division}</option>
                    ))}
                  </select>
                  <select
                    required
                    value={newProvider.district}
                    onChange={(e) => setNewProvider({...newProvider, district: e.target.value})}
                    disabled={!newProvider.division}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                  >
                    <option value="">District</option>
                    {newProvider.division && BANGLADESH_LOCATIONS.find(l => l.division === newProvider.division)?.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <input type="text" placeholder="Thana / Area" value={newProvider.thana} onChange={e => setNewProvider({...newProvider, thana: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Additional Location Info" value={newProvider.location} onChange={e => setNewProvider({...newProvider, location: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Contact Number" value={newProvider.contact} onChange={e => setNewProvider({...newProvider, contact: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="email" placeholder="Email" value={newProvider.email} onChange={e => setNewProvider({...newProvider, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 capitalize transition-all shadow-lg shadow-sky-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCcw className="animate-spin" size={20} />
                      <span>Adding {activeTab.slice(0, -1)}...</span>
                    </>
                  ) : (
                    <span>Add {activeTab.slice(0, -1)}</span>
                  )}
                </button>
              </form>
            )}

            {activeTab === 'doctors' && (
              <form onSubmit={handleAddDoctor} className="space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById('doctor-image-upload')?.click()}>
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-sky-500 transition-colors">
                      {newDoctor.image ? (
                        <img src={newDoctor.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-slate-400 group-hover:text-sky-500 transition-colors" size={32} />
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 p-1.5 bg-sky-500 text-white rounded-full shadow-lg">
                      <Plus size={14} />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Click to upload doctor photo</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    required
                    value={newDoctor.division}
                    onChange={(e) => setNewDoctor({...newDoctor, division: e.target.value, district: ''})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Division</option>
                    {BANGLADESH_LOCATIONS.map(l => (
                      <option key={l.division} value={l.division}>{l.division}</option>
                    ))}
                  </select>
                  <select
                    required
                    value={newDoctor.district}
                    onChange={(e) => setNewDoctor({...newDoctor, district: e.target.value})}
                    disabled={!newDoctor.division}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50"
                  >
                    <option value="">District</option>
                    {newDoctor.division && BANGLADESH_LOCATIONS.find(l => l.division === newDoctor.division)?.districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <input required type="text" placeholder="Doctor Name" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="email" placeholder="Doctor Email (to prevent duplicates)" value={newDoctor.email} onChange={e => setNewDoctor({...newDoctor, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <input required type="text" placeholder="Specialty" value={newDoctor.specialty} onChange={e => setNewDoctor({...newDoctor, specialty: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Degree (e.g. MBBS, FCPS)" value={newDoctor.degree} onChange={e => setNewDoctor({...newDoctor, degree: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  <input type="text" placeholder="University / Institute (e.g. Dhaka Medical College)" value={newDoctor.university} onChange={e => setNewDoctor({...newDoctor, university: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" placeholder="BMDC Number" value={newDoctor.bmdcNumber} onChange={e => setNewDoctor({...newDoctor, bmdcNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                  <input required type="text" placeholder="Experience (e.g. 10 Years)" value={newDoctor.experience} onChange={e => setNewDoctor({...newDoctor, experience: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                </div>
                <input required type="number" placeholder="Consultation Fee" value={newDoctor.fee} onChange={e => setNewDoctor({...newDoctor, fee: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200" />
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCcw className="animate-spin" size={20} />
                      <span>Adding Doctor...</span>
                    </>
                  ) : (
                    <span>Add Doctor</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Medicine Add/Edit Modal */}
      {(editingMedicine || isAddingMedicine) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingMedicine ? 'ঔষধ সম্পাদনা করুন' : 'নতুন ঔষধ যোগ করুন'}
              </h2>
              <button 
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddingMedicine(false);
                }} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMedicine} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ঔষধের নাম (Medicine Name)</label>
                <input 
                  required 
                  type="text" 
                  value={editingMedicine ? editingMedicine.name : newMedicineData.name} 
                  onChange={e => editingMedicine ? setEditingMedicine({...editingMedicine, name: e.target.value}) : setNewMedicineData({...newMedicineData, name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                  placeholder="যেমন: Napa Extend"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">জেনেরিক নাম (Generic Name)</label>
                <input 
                  required 
                  type="text" 
                  value={editingMedicine ? editingMedicine.generic || '' : newMedicineData.generic} 
                  onChange={e => editingMedicine ? setEditingMedicine({...editingMedicine, generic: e.target.value}) : setNewMedicineData({...newMedicineData, generic: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                  placeholder="যেমন: Paracetamol"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ক্যাটাগরি</label>
                  <select
                    required
                    value={editingMedicine ? editingMedicine.category : newMedicineData.category}
                    onChange={e => editingMedicine ? setEditingMedicine({...editingMedicine, category: e.target.value}) : setNewMedicineData({...newMedicineData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                  >
                    {['Fever & Pain', 'Gastric', 'Allergy', 'Antibiotic', 'Supplements', 'Nutrition', 'Asthma', 'Anxiety', 'Diabetes', 'Blood Pressure', 'Hormone', 'Heart'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">মূল্য (৳ Price)</label>
                  <input 
                    required 
                    type="number" 
                    value={editingMedicine ? editingMedicine.price : newMedicineData.price} 
                    onChange={e => editingMedicine ? setEditingMedicine({...editingMedicine, price: Number(e.target.value)}) : setNewMedicineData({...newMedicineData, price: Number(e.target.value)})} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                    placeholder="যেমন: 15"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">প্রস্তুতকারক কোম্পানি (Company)</label>
                <input 
                  required 
                  type="text" 
                  value={editingMedicine ? editingMedicine.company || '' : newMedicineData.company} 
                  onChange={e => editingMedicine ? setEditingMedicine({...editingMedicine, company: e.target.value}) : setNewMedicineData({...newMedicineData, company: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                  placeholder="যেমন: Beximco"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ঔষধের ছবি (Medicine Image)</label>
                <div 
                  onClick={() => document.getElementById('medicine-image-upload')?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-sky-500 transition-colors cursor-pointer flex flex-col items-center justify-center bg-slate-50/50 gap-2"
                >
                  {((editingMedicine && editingMedicine.image) || (!editingMedicine && newMedicineData.image)) ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                      <img 
                        src={editingMedicine ? editingMedicine.image : newMedicineData.image} 
                        alt="Medicine Preview" 
                        className="h-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-all">
                        ছবি পরিবর্তন করুন
                      </div>
                    </div>
                  ) : (
                    <>
                      <Camera className="text-slate-400" size={32} />
                      <span className="text-xs font-bold text-slate-500">ছবি আপলোড করতে এখানে ক্লিক করুন</span>
                      <span className="text-[10px] text-slate-400 font-medium">JPG, PNG বা WEBP (ম্যাক্স ১MB রিকমেন্ডেড)</span>
                    </>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
              >
                {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Service Add/Edit Modal */}
      {(editingService || isAddingService) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingService ? 'সার্ভিস সম্পাদনা করুন' : 'নতুন সার্ভিস যোগ করুন'}
              </h2>
              <button 
                onClick={() => {
                  setEditingService(null);
                  setIsAddingService(false);
                }} 
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">সার্ভিসের নাম (Service Name)</label>
                <input 
                  required 
                  type="text" 
                  value={editingService ? editingService.name : newServiceData.name} 
                  onChange={e => editingService ? setEditingService({...editingService, name: e.target.value}) : setNewServiceData({...newServiceData, name: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                  placeholder="যেমন: ব্যাক পেইন থেরাপি বা CBC টেস্ট"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">সার্ভিস টাইপ (Type)</label>
                  {editingService ? (
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-bold capitalize">
                      {editingService.type === 'lab' ? 'Lab Test' : 'Physio Service'}
                    </div>
                  ) : (
                    <select
                      required
                      value={newServiceData.type}
                      onChange={e => setNewServiceData({...newServiceData, type: e.target.value as 'lab' | 'physio'})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                    >
                      <option value="physio">Physiotherapy</option>
                      <option value="lab">Lab Test</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">মূল্য (৳ Price)</label>
                  <input 
                    required 
                    type="number" 
                    value={editingService ? editingService.price : newServiceData.price} 
                    onChange={e => editingService ? setEditingService({...editingService, price: Number(e.target.value)}) : setNewServiceData({...newServiceData, price: Number(e.target.value)})} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                    placeholder="যেমন: 600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ক্যাটাগরি (Category)</label>
                <input 
                  required 
                  type="text" 
                  value={editingService ? editingService.category : newServiceData.category} 
                  onChange={e => editingService ? setEditingService({...editingService, category: e.target.value}) : setNewServiceData({...newServiceData, category: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium" 
                  placeholder="যেমন: Pain Management বা Basic"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ছবি লিঙ্ক (Image URL - Optional)</label>
                <input 
                  type="text" 
                  value={editingService ? editingService.image || '' : newServiceData.image} 
                  onChange={e => editingService ? setEditingService({...editingService, image: e.target.value}) : setNewServiceData({...newServiceData, image: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono" 
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">বর্ণনা (Description - Optional)</label>
                <textarea 
                  value={editingService ? editingService.description || '' : newServiceData.description} 
                  onChange={e => editingService ? setEditingService({...editingService, description: e.target.value}) : setNewServiceData({...newServiceData, description: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium text-sm" 
                  rows={3}
                  placeholder="থেরাপি বা টেস্ট সম্পর্কিত বিবরণ..."
                />
              </div>

              {/* Image Preview */}
              {((editingService && editingService.image) || (!editingService && newServiceData.image)) && (
                <div className="w-full h-32 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center">
                  <img 
                    src={editingService ? editingService.image : newServiceData.image} 
                    alt="Preview" 
                    className="h-full object-cover" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all"
              >
                {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
        {(activeTab === 'users' || activeTab === 'patients') && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeTab === 'users' ? 'সকল ইউজার' : 'পেশেন্ট ম্যানেজমেন্ট'}
                </h3>
                <p className="text-sm text-slate-500">
                  {searchTerm ? 'সার্চ রেজাল্ট: ' : 'মোট ইউজার: '}
                  <span className="font-bold text-slate-900">{filteredUsers.length}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={syncAllRoles}
                  className="px-6 py-2.5 bg-sky-50 text-sky-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-sky-100 transition-all border border-sky-100"
                >
                  <RefreshCcw size={18} /> রুলস সিঙ্ক করুন
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <Search className="text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ইউজার বা ইমেইল দিয়ে সার্চ করুন..." 
                className="flex-1 bg-transparent border-none focus:ring-0 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">User</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Email</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Role</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Shusto Balance</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                            className="w-10 h-10 rounded-2xl border border-slate-100 shadow-sm" 
                            alt="" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{user.displayName}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{user.uid.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-medium">{user.email}</td>
                      <td className="px-6 py-4 capitalize">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          user.role === 'admin' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          user.role === 'doctor' ? "bg-sky-50 text-sky-600 border border-sky-100" :
                          user.role === 'investor' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                          user.role === 'manager' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                          user.role === 'state' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          user.role === 'user' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">৳{userBalances[user.uid] || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex flex-wrap items-center gap-2">
                        {user.role === 'admin' ? (
                          <span className="text-xs text-rose-500 font-bold bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl">এডমিন (পরিবর্তন অসম্ভব)</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {['doctor', 'pharmacy', 'lab', 'physio', 'hospital', 'ambulance', 'investor', 'manager', 'state', 'user'].includes(user.role) && (
                              <div className="flex flex-wrap gap-2">
                                {user.role !== 'user' && (
                                  <button 
                                    onClick={async () => {
                                      if (window.confirm(`${user.displayName} কে সাধারণ ইউজারে নামিয়ে আনবেন?`)) {
                                        setLoading(true);
                                        try {
                                          await updateDoc(doc(db, 'users', user.uid), { role: 'user' });
                                          setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: 'user' } : u));
                                          setInvestors(prev => prev.filter(i => i.uid !== user.uid));
                                          setManagers(prev => prev.filter(m => m.uid !== user.uid));
                                          setStates(prev => prev.filter(s => s.uid !== user.uid));
                                          showSuccess(`${user.displayName} এখন একজন ইউজার।`);
                                        } catch (err) {
                                          alert("রোল রিসেট করতে ব্যর্থ হয়েছে।");
                                        } finally {
                                          setLoading(false);
                                        }
                                      }
                                    }}
                                    className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-200 transition-all"
                                  >
                                    Reset to User
                                  </button>
                                )}
                                <button 
                                  onClick={() => syncUserRole(user)} 
                                  className="p-2.5 text-sky-500 hover:bg-sky-50 rounded-xl transition-all" 
                                  title="Sync/Fix Role from Provider Records"
                                >
                                  <RefreshCcw size={18} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        No users found matching "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'medicines' && (
          <div className="p-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
            <p className="text-sm text-sky-700 font-medium">
              Populate medicine catalog with actual images.
            </p>
            <button 
              onClick={seedMedicines}
              disabled={loading}
              className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
            >
              Seed Sample Medicines
            </button>
          </div>
        )}
        {activeTab === 'medicines' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Medicine</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Category</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Price</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {medicines.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-100 flex-shrink-0">
                      {med.image ? (
                        <img src={med.image} alt={med.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                          <Pill size={16} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{med.name}</div>
                      <div className="text-[10px] text-slate-400">{med.generic} | {med.company}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{med.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
                      <button 
                        onClick={() => adjustMedicinePrice(med, -5)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all font-bold text-xs shadow-sm border border-slate-100"
                        title="৳৫ কমান"
                      >
                        -৫
                      </button>
                      <button 
                        onClick={() => adjustMedicinePrice(med, -1)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all font-bold text-xs shadow-sm border border-slate-100"
                        title="৳১ কমান"
                      >
                        -১
                      </button>
                      <span className="px-2 font-bold text-slate-800 text-sm min-w-[3rem] text-center">
                        ৳{med.price}
                      </span>
                      <button 
                        onClick={() => adjustMedicinePrice(med, 1)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-all font-bold text-xs shadow-sm border border-slate-100"
                        title="৳১ বাড়ান"
                      >
                        +১
                      </button>
                      <button 
                        onClick={() => adjustMedicinePrice(med, 5)}
                        className="w-7 h-7 flex items-center justify-center bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg transition-all font-bold text-xs shadow-sm border border-slate-100"
                        title="৳৫ বাড়ান"
                      >
                        +৫
                      </button>
                    </div>
                  </td>
                   <td className="px-6 py-4 flex items-center gap-2">
                    <button 
                      onClick={() => setEditingMedicine(med)}
                      className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl transition-colors"
                      title="Edit Medicine"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMedicine(med.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Medicine"
                    >
                      <X size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'doctors' && (
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <p className="text-sm text-amber-700 font-medium">
              Found {allDoctors.filter(d => !d.bmdcNumber || !d.fee).length} invalid doctors (missing BMDC or Fee).
            </p>
            <button 
              onClick={cleanupManualEntries}
              className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
            >
              Cleanup Invalid Doctors
            </button>
          </div>
        )}

        {['pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'].includes(activeTab) && (
          <div className="p-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
            <p className="text-sm text-sky-700 font-medium">
              Quickly populate your directory with sample centers.
            </p>
            <button 
              onClick={seedProviders}
              disabled={loading}
              className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 disabled:opacity-50"
            >
              Seed 5 Sample {activeTab}
            </button>
          </div>
        )}

        {activeTab === 'doctors' && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Doctor</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Type</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Specialty</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Fee</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {allDoctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setUpdatingDoctorId(doc.id);
                        document.getElementById('doctor-image-upload')?.click();
                      }}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 group-hover:opacity-75 transition-opacity">
                        {doc.image ? (
                          <img 
                            src={doc.image} 
                            alt={doc.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="text-slate-400" size={20} />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={14} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{doc.name}</div>
                      <div className="text-[10px] text-slate-400">BMDC: {doc.bmdcNumber || 'N/A'}</div>
                      {(doc.degree || doc.university) && (
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          {[doc.degree, doc.university].filter(Boolean).join(' - ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                      (doc as any).isUserAccount ? "bg-blue-50 text-blue-600" : "bg-sky-50 text-sky-600"
                    )}>
                      {(doc as any).isUserAccount ? 'User Account' : 'Manual Entry'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{doc.specialty}</td>
                  <td className="px-6 py-4 font-bold text-sky-600">৳{doc.fee}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {(doc as any).isUserAccount ? (
                      <p className="text-[10px] text-slate-400 italic">Manage in Users tab</p>
                    ) : (
                      <>
                        <button 
                          onClick={() => setShowEditModal(doc)}
                          className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl" 
                          title="Edit Doctor"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => syncUserRole({ uid: doc.userId || '', email: doc.email, displayName: doc.name, role: 'user' } as any)} 
                          className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl" 
                          title="Force Sync to User Account"
                        >
                          <RefreshCcw size={18} />
                        </button>
                        {/* Deletion disabled */}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {['pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursing'].includes(activeTab) && (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Name</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Location</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Contact</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(activeTab === 'pharmacies' ? mergedPharmacies : 
                activeTab === 'labs' ? mergedLabs : 
                activeTab === 'physios' ? mergedPhysios : 
                activeTab === 'hospitals' ? mergedHospitals : 
                activeTab === 'nursings' ? mergedNursings : mergedAmbulances).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.contact}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button 
                      onClick={() => setShowEditModal(item)}
                      className="p-2 text-sky-500 hover:bg-sky-50 rounded-xl"
                    >
                      <Edit size={18} />
                    </button>
                    {/* Deletion disabled */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'profits' && (
          <ProfitsPanel adminBalance={adminBalance} adminUid={user?.uid} />
        )}

        {activeTab === 'transactions' && (
          <TransactionsPanel isAdmin />
        )}

        {activeTab === 'merchant' && (
          <MerchantPanel />
        )}

        {activeTab === 'services' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Global Service Catalog</h2>
                <p className="text-slate-500">Manage standard prices for Lab Tests and Physio Services.</p>
              </div>
              <button 
                onClick={seedServices}
                className="px-6 py-3 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 flex items-center gap-2 text-sm"
              >
                <Plus size={18} /> সীড ডিফল্ট সার্ভিস
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Lab Tests */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="text-sky-500" /> Lab Tests
                </h3>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-6 py-4">Test Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {labTests.map(test => (
                        <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{test.name}</td>
                          <td className="px-6 py-4 font-bold text-sky-600">৳{test.price}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setEditingService({ ...test, type: 'lab' })}
                              className="p-1.5 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Edit Service"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(test.id, 'lab')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Service"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physio Services */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="text-sky-500" /> Physio Services
                </h3>
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest font-bold">
                      <tr>
                        <th className="px-6 py-4">Service Name</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {physioServices.map(service => (
                        <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{service.name}</td>
                          <td className="px-6 py-4 font-bold text-sky-600">৳{service.price}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setEditingService({ ...service, type: 'physio' })}
                              className="p-1.5 text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Edit Service"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteService(service.id, 'physio')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Service"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'investors' && (
          <div className="p-8 space-y-8">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">ইনভেস্টর ম্যানেজমেন্ট</h3>
                  <p className="text-sm text-slate-500">মোট ইনভেস্টর: {investors.length}</p>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Investor</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Email</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {investors.map(i => (
                      <tr key={i.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={i.photoURL || `https://picsum.photos/seed/${i.uid}/100/100`} className="w-10 h-10 rounded-2xl border border-slate-100" alt="" />
                            <span className="font-bold text-slate-900">{i.displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{i.email}</td>
                        <td className="px-6 py-4">
                           <button 
                             onClick={async () => {
                               if (window.confirm(`${i.displayName} কে রিমুভ করতে চান?`)) {
                                 await updateDoc(doc(db, 'users', i.uid), { role: 'user' });
                                 setInvestors(prev => prev.filter(inv => inv.uid !== i.uid));
                                 setUsers(prev => prev.map(u => u.uid === i.uid ? { ...u, role: 'user' } : u));
                               }
                             }}
                             className="text-xs font-bold text-rose-500 hover:underline"
                           >
                             Remove Investor
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'managers' && (
          <div className="p-8 space-y-8">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">ম্যানেজার ম্যানেজমেন্ট</h3>
                  <p className="text-sm text-slate-500">মোট ম্যানেজার: {managers.length}</p>
                </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Manager</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Email</th>
                      <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {managers.map(m => (
                      <tr key={m.uid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={m.photoURL || `https://picsum.photos/seed/${m.uid}/100/100`} className="w-10 h-10 rounded-2xl border border-slate-100" alt="" />
                            <span className="font-bold text-slate-900">{m.displayName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{m.email}</td>
                        <td className="px-6 py-4">
                           <button 
                             onClick={async () => {
                               if (window.confirm(`${m.displayName} কে রিমুভ করতে চান?`)) {
                                 await updateDoc(doc(db, 'users', m.uid), { role: 'user' });
                                 setManagers(prev => prev.filter(mgr => mgr.uid !== m.uid));
                                 setUsers(prev => prev.map(u => u.uid === m.uid ? { ...u, role: 'user' } : u));
                               }
                             }}
                             className="text-xs font-bold text-rose-500 hover:underline"
                           >
                             Remove Manager
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}
        {activeTab === 'shop_requests' && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">শপ ম্যানেজমেন্ট</h3>
                <p className="text-sm text-slate-500">মোট শপ: {shopRequests.length}</p>
              </div>
              <button 
                onClick={() => setShowAddShopModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-200"
              >
                <Plus size={18} /> নতুন শপ যোগ করুন
              </button>
            </div>

            {/* Add Shop Modal */}
            <AnimatePresence>
              {showAddShopModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddShopModal(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
                  >
                    <div className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">নতুন শপ যোগ করুন</h3>
                        <button onClick={() => setShowAddShopModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                          <X size={20} className="text-slate-400" />
                        </button>
                      </div>

                      <form onSubmit={handleAddShop} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">শপের নাম</label>
                            <input 
                              required
                              type="text"
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                              value={newShopData.shopName}
                              onChange={(e) => setNewShopData({...newShopData, shopName: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">ক্যাটাগরি</label>
                            <select 
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                              value={newShopData.category}
                              onChange={(e) => setNewShopData({...newShopData, category: e.target.value})}
                            >
                              <option value="Pharmacy">ফার্মেসি (Pharmacy)</option>
                              <option value="Diagnostic">ডায়াগনস্টিক সেন্টার</option>
                              <option value="Nursing">নার্সিং সার্ভিস (Nursing)</option>
                              <option value="Ambulance">অ্যাম্বুলেন্স সার্ভিস</option>
                              <option value="Clinic">ক্লিনিক/হাসপাতাল</option>
                              <option value="Other">অন্যান্য</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 ml-1">ইউজার ইমেইল (যাকে শপটি দেওয়া হবে)</label>
                          <input 
                            required
                            type="email"
                            placeholder="user@example.com"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                            value={newShopData.userEmail}
                            onChange={(e) => setNewShopData({...newShopData, userEmail: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">ফোন নম্বর</label>
                            <input 
                              required
                              type="tel"
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                              value={newShopData.phone}
                              onChange={(e) => setNewShopData({...newShopData, phone: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">ঠিকানা</label>
                            <input 
                              required
                              type="text"
                              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                              value={newShopData.address}
                              onChange={(e) => setNewShopData({...newShopData, address: e.target.value})}
                            />
                          </div>
                        </div>

                        <button 
                          disabled={loading}
                          className="w-full py-4 bg-sky-500 text-white rounded-2xl font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-200 disabled:opacity-50 mt-4"
                        >
                          {loading ? "যোগ হচ্ছে..." : "শপ তৈরি করুন"}
                        </button>
                      </form>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Shop Name</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Category</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Applicant</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Contact</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Status</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {shopRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                            <Store className="text-sky-500" size={20} />
                          </div>
                          <span className="font-bold text-slate-900">{req.shopName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{req.category}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{req.userName}</div>
                        <div className="text-[10px] text-slate-400">{req.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{req.phone}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          req.status === 'approved' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          req.status === 'rejected' ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          "bg-amber-50 text-amber-600 border border-amber-100"
                        )}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={async () => {
                            if (confirm('আপনি কি এই শপটি ডিলিট করতে চান?')) {
                              await deleteDoc(doc(db, 'shop_requests', req.id));
                              setShopRequests(prev => prev.filter(r => r.id !== req.id));
                              showSuccess('Shop deleted.');
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-100 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shopRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No shop requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
