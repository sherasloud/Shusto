import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, where, collection, getDocs, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

interface UserProfile {
  uid: string;
  id?: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  address?: string;
  location?: string;
  division?: string;
  district?: string;
  referredBy?: string; // UID of the state that referred this patient
  role: 'user' | 'admin' | 'doctor' | 'pharmacy' | 'physio' | 'hospital' | 'ambulance' | 'lab' | 'investor' | 'manager' | 'state' | 'nursing';
  investorId?: string; // For managers to point to their investor
  managerId?: string; // For states to point to their manager
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  demoLogin: (role?: 'user' | 'admin' | 'doctor' | 'pharmacy') => void;
  logout: () => Promise<void>;
  forceSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('shusto_user_cache');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!localStorage.getItem('shusto_user_cache'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('shusto_user_cache', JSON.stringify(user));
    } else {
      localStorage.removeItem('shusto_user_cache');
    }
  }, [user]);

  useEffect(() => {
    // Process redirect sign-in result if returning from Google redirect flow
    getRedirectResult(auth).then(async (res) => {
      if (res?.user) {
        console.log("Logged in via redirect successfully for:", res.user.email);
        
        // Login success logic
        console.log("Logged in via redirect successfully for:", res.user.email);
      }
    }).catch((err) => {
      console.error("Redirect sign in result error:", err);
    });

    // Check for demo user session
    const storedDemoUser = sessionStorage.getItem('shusto_demo_user');
    if (storedDemoUser) {
      try {
        const parsed = JSON.parse(storedDemoUser);
        setUser(parsed);
        setLoading(false);
      } catch (e) {
        sessionStorage.removeItem('shusto_demo_user');
      }
    }

    let unsubProfile: (() => void) | null = null;

    const timeout = setTimeout(() => {
      if (loading && !sessionStorage.getItem('shusto_demo_user')) {
        setLoading(false);
      }
    }, 5000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        if (!sessionStorage.getItem('shusto_demo_user')) {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      // If we have a cached user that matches the logged in user, we don't need to block UI
      if (!user || user.uid !== firebaseUser.uid) {
        setLoading(true);
      }
      setError(null);

      const email = firebaseUser.email?.toLowerCase().trim();
      const isDefaultAdmin = email === 'shustobd@gmail.com';
      const isHardcodedDoctor = email === 'thesiambin@gmail.com' || email === 'monsurhelal86@gmail.com';

      // Real-time listener for the user's profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      unsubProfile = onSnapshot(userRef, async (userDoc) => {
        try {
          if (!userDoc.exists()) {
            console.log("User profile not found, providing quick entry...");
            
            // Initial simple profile
            const quickProfile: any = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              email: email || null,
              photoURL: firebaseUser.photoURL || null,
              role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user'),
              createdAt: new Date().toISOString()
            };

            setUser(quickProfile);
            setLoading(false);

            // Background processing for full profile
            (async () => {
              const cleanEmail = email?.replace(/[^a-zA-Z0-9]/g, '_');
              const manualId = `email_${cleanEmail}`;
              const manualRef = doc(db, 'users', manualId);
              let manualData: any = null;
              try {
                const mDoc = await getDoc(manualRef);
                if (mDoc.exists()) manualData = mDoc.data();
              } catch (e) {}

              const emailClean = email?.toLowerCase().trim();
              let preRegisteredName = manualData?.name || manualData?.displayName;
              let professionalRole = manualData?.role;

              if (!preRegisteredName && emailClean) {
                const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'];
                const results = await Promise.all(providerCollections.map(coll => 
                  getDocs(query(collection(db, coll), where('email', '==', emailClean)))
                ));
                
                for (let i = 0; i < results.length; i++) {
                  if (!results[i].empty) {
                    const data = results[i].docs[0].data();
                    preRegisteredName = data.name;
                    const coll = providerCollections[i];
                    professionalRole = coll === 'doctors' ? 'doctor' : 
                                     coll === 'pharmacies' ? 'pharmacy' : 
                                     coll === 'labs' ? 'lab' : 
                                     coll === 'physios' ? 'physio' : 
                                     coll === 'hospitals' ? 'hospital' : 
                                     coll === 'nursings' ? 'nursing' : 'ambulance';
                    break;
                  }
                }
              }

              const finalRole = isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : (professionalRole || 'user'));
              const finalProfile = {
                ...quickProfile,
                ...manualData,
                displayName: preRegisteredName || quickProfile.displayName,
                name: preRegisteredName || quickProfile.displayName,
                role: finalRole
              };

              await setDoc(userRef, finalProfile);
              if (manualData) await deleteDoc(manualRef).catch(() => {});
            })();
          } else {
            const existingData = userDoc.data() as UserProfile;
            setUser(existingData);
            setLoading(false);
          }
        } catch (err) {
          console.error("Profile sync error details:", err);
          setLoading(false);
        }
      }, (err) => {
        console.error("Snapshot real-time listener error:", err);
        setLoading(false);
      });

    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Proactive Sync Effect - Runs once when user is loaded to sync professional status
  useEffect(() => {
    // Prevent infinite loop if the user is forced to be 'admin'
    if (!user || !user.email || user.role === 'admin' || user.email === 'thesiambin@gmail.com' || user.email === 'monsurhelal86@gmail.com') return;

    const syncRole = async () => {
      const email = user.email!.toLowerCase().trim();
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'];
      
      const results = await Promise.all(providerCollections.map(coll => 
        getDocs(query(collection(db, coll), where('email', '==', email)))
      ));

      for (let i = 0; i < results.length; i++) {
        const snapshot = results[i];
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const docId = snapshot.docs[0].id;
          const collectionName = providerCollections[i];
          const newRole = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 
                         collectionName === 'nursings' ? 'nursing' : 'ambulance';
          
          let needsUpdate = false;
          const profileUpdate: any = {};

          if (user.role !== newRole) {
            profileUpdate.role = newRole;
            profileUpdate.userId = user.uid;
            profileUpdate.id = docId;
            needsUpdate = true;
          }

          const profName = data.hospitalName || data.name;
          const isProfNameBetter = profName && !profName.includes('@') && profName !== 'User' && !profName.includes('Twitter');

          if (isProfNameBetter && user.displayName !== profName) {
            profileUpdate.displayName = profName;
            profileUpdate.name = profName;
            profileUpdate.hospitalName = profName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            console.log("Syncing professional profile to user:", profileUpdate);
            const updatedName = profileUpdate.name || data.name || user.displayName;
            await updateDoc(doc(db, 'users', user.uid), {
              ...data,
              ...profileUpdate,
              displayName: updatedName,
              name: updatedName,
              updatedAt: new Date().toISOString()
            });
          }
          break; 
        }
      }
    };

    syncRole();
  }, [user?.uid, user?.email, user?.role, user?.displayName]);

  const login = async () => {
    setError(null);
    try {
      console.log("Starting Google login process...");
      const isInIframe = window.self !== window.top;
      
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log("Login result obtained for:", result.user.email);
      } catch (popupErr: any) {
        console.warn("signInWithPopup failed, error code:", popupErr.code, popupErr.message);
        
        // If inside iframe or popup blocked/closed/cross-origin, attempt redirect fallback
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.code === 'auth/internal-error' ||
          popupErr.code === 'auth/popup-closed-by-user' ||
          isInIframe
        ) {
          console.log("Attempting signInWithRedirect fallback...");
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      console.error("Detailed login error:", err);
      if (err.code === 'auth/network-request-failed') {
        setError("নেটওয়ার্ক সমস্যা: আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন। ভিপিএন বা অ্যাড-ব্লকার থাকলে তা বন্ধ করে আবার চেষ্টা করুন।");
      } else if (err.code === 'auth/popup-blocked') {
        setError("পপ-আপ ব্লক করা: আপনার ব্রাউজার লগইন উইন্ডোটি খুলতে বাধা দিয়েছে। নিচে 'নতুন ট্যাবে অ্যাপ খুলুন' বাটনে ক্লিক করুন।");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("ফায়ারবেস কনসোলে Google Provider বন্ধ রয়েছে। Firebase Console > Authentication > Sign-in method-এ গিয়ে Google এনাবল করুন।");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`এই ডোমেইনটি (${window.location.hostname}) অনুমোদিত নয়। Firebase Console > Authentication > Settings > Authorized domains-এ যুক্ত করুন।`);
      } else if (err.code === 'auth/internal-error' && err.message?.includes('cross-origin')) {
        setError("ব্রাউজার সিকিউরিটি (Cross-Origin) সীমাবদ্ধতা: অনুগ্রহ করে অ্যাপটি নতুন ট্যাবে খুলে চেষ্টা করুন।");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(err.message || "লগইন করতে সমস্যা হয়েছে। দয়া করে ফায়ারবেসে Google Auth সক্ষম রয়েছে কিনা এবং নতুন ট্যাবে অ্যাপটি খোলা হয়েছে কিনা পরীক্ষা করুন।");
      }
      throw err;
    }
  };

  const demoLogin = (demoRole: 'user' | 'admin' | 'doctor' | 'pharmacy' = 'user') => {
    setError(null);
    setLoading(true);
    const demoUserMap = {
      user: {
        uid: 'demo-patient-123',
        displayName: 'Demo Patient (রোগী)',
        email: 'patient@shusto.demo',
        photoURL: 'https://picsum.photos/seed/patient/200/200',
        role: 'user' as const,
      },
      doctor: {
        uid: 'demo-doctor-123',
        displayName: 'Dr. Rahul Chowdhury',
        email: 'doctor@shusto.demo',
        photoURL: 'https://picsum.photos/seed/doctor/200/200',
        role: 'doctor' as const,
      },
      admin: {
        uid: 'demo-admin-123',
        displayName: 'Shusto Admin',
        email: 'shustobd@gmail.com',
        photoURL: 'https://picsum.photos/seed/admin/200/200',
        role: 'admin' as const,
      },
      pharmacy: {
        uid: 'demo-pharmacy-123',
        displayName: 'City Pharmacy',
        email: 'pharmacy@shusto.demo',
        photoURL: 'https://picsum.photos/seed/pharmacy/200/200',
        role: 'pharmacy' as const,
      }
    };

    const selected = demoUserMap[demoRole];
    setUser(selected);
    sessionStorage.setItem('shusto_demo_user', JSON.stringify(selected));
    setLoading(false);
  };

  const logout = async () => {
    sessionStorage.removeItem('shusto_demo_user');
    setUser(null);
    await signOut(auth);
  };

  const forceSync = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const email = auth.currentUser.email?.toLowerCase().trim();
      if (!email) return;

      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances', 'nursings'];
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
          
          await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);
          break;
        }
      }
    } catch (err) {
      console.error("Force sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, demoLogin, logout, forceSync }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
