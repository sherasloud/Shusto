import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, query, where, collection, getDocs, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { safeStorage } from './utils/safeStorage';

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
  role: 'user' | 'admin' | 'doctor' | 'pharmacy' | 'physio' | 'hospital' | 'ambulance' | 'lab' | 'investor' | 'manager' | 'state' | 'nursing' | 'nutritionist';
  investorId?: string; // For managers to point to their investor
  managerId?: string; // For states to point to their manager
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  instantLogin: (role?: 'admin' | 'user' | 'doctor' | 'pharmacy' | 'lab', customName?: string, customEmail?: string) => Promise<void>;
  logout: () => Promise<void>;
  forceSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = safeStorage.getItem('shusto_user_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      return null;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (user) {
        safeStorage.setItem('shusto_user_cache', JSON.stringify(user));
      } else {
        safeStorage.removeItem('shusto_user_cache');
      }
    } catch (e) {}
  }, [user]);

  useEffect(() => {
    // Process redirect sign-in result if returning from Google redirect flow
    getRedirectResult(auth).then(async (res) => {
      if (res?.user) {
        console.log("Logged in via redirect successfully for:", res.user.email);
        const fbUser = res.user;
        const email = fbUser.email?.toLowerCase().trim() || null;
        const isDefaultAdmin = email === 'shustobd@gmail.com';
        const isHardcodedDoctor = email === 'thesiambin@gmail.com' || email === 'monsurhelal86@gmail.com';
        const profileName = email === 'shustobd@gmail.com' ? 'Shusto' : (fbUser.displayName || email?.split('@')[0] || 'Shusto');
        const profile: UserProfile = {
          uid: fbUser.uid,
          displayName: profileName,
          email: email,
          photoURL: fbUser.photoURL || null,
          role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user'),
        };
        
        const userRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const existingData = userDoc.data() as UserProfile;
          setUser(existingData);
          safeStorage.setItem('shusto_user_cache', JSON.stringify(existingData));
        } else {
          setUser(profile);
          safeStorage.setItem('shusto_user_cache', JSON.stringify(profile));
        }
        
        safeStorage.setItem('hasSeenWelcome', 'true');
        setLoading(false);
        setError(null);
      }
    }).catch((err) => {
      console.error("Redirect sign in result error:", err);
    });

    let unsubProfile: (() => void) | null = null;

    // Fast fallback timeout (max 1s delay if auth check hangs)
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 1000);

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout);
      
      // Cleanup previous profile listener if it exists
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setError(null);

      const email = firebaseUser.email?.toLowerCase().trim() || null;
      const isDefaultAdmin = email === 'shustobd@gmail.com';
      const isHardcodedDoctor = email === 'thesiambin@gmail.com' || email === 'monsurhelal86@gmail.com';
      const baseDisplayName = email === 'shustobd@gmail.com' ? 'Shusto' : (firebaseUser.displayName || (email ? email.split('@')[0] : 'Shusto'));

      const baseProfile: UserProfile = {
        uid: firebaseUser.uid,
        displayName: baseDisplayName,
        email: email,
        photoURL: firebaseUser.photoURL || null,
        role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user'),
      };

      // Set user immediately so user is taken into the app without waiting
      setUser(prev => (prev && prev.uid === firebaseUser.uid ? prev : baseProfile));
      safeStorage.setItem('hasSeenWelcome', 'true');
      setLoading(false);

      // Real-time listener for user's full Firestore profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      unsubProfile = onSnapshot(userRef, async (userDoc) => {
        try {
          if (!userDoc.exists()) {
            console.log("User doc not found in Firestore, saving initial profile...");
            
            const quickProfile: any = {
              uid: firebaseUser.uid,
              displayName: email === 'shustobd@gmail.com' ? 'Shusto' : (firebaseUser.displayName || 'Shusto'),
              email: email || null,
              photoURL: firebaseUser.photoURL || null,
              role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user'),
              createdAt: new Date().toISOString()
            };

            setUser(prev => ({ ...quickProfile, ...(prev || {}) }));
            setLoading(false);

            // Sync doc in Firestore in background
            setDoc(userRef, quickProfile, { merge: true }).catch(err => {
              console.warn("User profile background write warning:", err);
            });
          } else {
            const existingData = userDoc.data() as UserProfile;
            setUser(existingData);
            safeStorage.setItem('shusto_user_cache', JSON.stringify(existingData));
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
      console.log("Starting Google login via popup flow...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login result obtained for:", result.user.email);
      
      const fbUser = result.user;
      const email = fbUser.email?.toLowerCase().trim() || null;
      const isDefaultAdmin = email === 'shustobd@gmail.com';
      const isHardcodedDoctor = email === 'thesiambin@gmail.com' || email === 'monsurhelal86@gmail.com';
      
      const immediateProfile: UserProfile = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || (email ? email.split('@')[0] : 'User'),
        email: email,
        photoURL: fbUser.photoURL || null,
        role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user'),
      };
      
      const userRef = doc(db, 'users', fbUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const existingData = userDoc.data() as UserProfile;
        setUser(existingData);
        safeStorage.setItem('shusto_user_cache', JSON.stringify(existingData));
      } else {
        setUser(immediateProfile);
        safeStorage.setItem('shusto_user_cache', JSON.stringify(immediateProfile));
        setDoc(userRef, immediateProfile, { merge: true }).catch(e => {
          console.warn("User profile background write warning:", e);
        });
      }
      
      safeStorage.setItem('hasSeenWelcome', 'true');
      setLoading(false);
      setError(null);
    } catch (err: any) {
      console.error("Detailed login error:", err);
      if (err?.code === 'auth/cancelled-popup-request') {
        setError(null);
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        setError(`এই ডোমেইনটি অনুমোদিত নয়। Firebase Console-এ authorized domains চেক করুন।`);
      } else if (err?.code === 'auth/invalid-continue-uri' || err?.message?.includes('invalid-continue-uri')) {
        setError(`Firebase Auth Continue URI ত্রুটি: 'shustoorg' প্রজেক্টের ফায়ারবেস কনসোলে (Authentication -> Settings -> Authorized Domains) ডোমেইনটি যুক্ত করুন।`);
      } else {
        setError(err?.message || "লগইন করতে সমস্যা হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।");
      }
      throw err;
    }
  };

  const instantLogin = async (
    role: 'admin' | 'user' | 'doctor' | 'pharmacy' | 'lab' = 'admin',
    customName?: string,
    customEmail?: string
  ) => {
    setError(null);
    setLoading(true);
    try {
      let firebaseUser;
      try {
        const cred = await signInAnonymously(auth);
        firebaseUser = cred.user;
      } catch (e) {
        console.warn("Anonymous auth note:", e);
      }

      const uid = firebaseUser?.uid || 'shusto_' + role + '_' + Date.now();
      const defaultEmail = role === 'admin' ? 'shustobd@gmail.com' : (role === 'doctor' ? 'thesiambin@gmail.com' : `${role}@shusto.com`);
      const email = customEmail ? customEmail.toLowerCase().trim() : defaultEmail;
      
      const defaultName = role === 'admin' ? 'Shusto Admin' : (role === 'doctor' ? 'Dr. Shusto Doctor' : (role === 'pharmacy' ? 'Shusto Pharmacy' : (role === 'lab' ? 'Shusto Lab' : 'Shusto User')));
      const profileName = customName ? customName.trim() : defaultName;

      const profile: UserProfile = {
        uid: uid,
        displayName: profileName,
        email: email,
        photoURL: null,
        role: role,
      };

      setUser(profile);
      safeStorage.setItem('shusto_user_cache', JSON.stringify(profile));
      safeStorage.setItem('hasSeenWelcome', 'true');

      const userRef = doc(db, 'users', uid);
      setDoc(userRef, profile, { merge: true }).catch(err => {
        console.warn("Profile background write warning:", err);
      });

      setLoading(false);
    } catch (err: any) {
      console.error("Instant login error:", err);
      const fallbackProfile: UserProfile = {
        uid: 'local_admin_' + Date.now(),
        displayName: customName || 'Shusto Admin',
        email: customEmail || 'shustobd@gmail.com',
        photoURL: null,
        role: role,
      };
      setUser(fallbackProfile);
      safeStorage.setItem('shusto_user_cache', JSON.stringify(fallbackProfile));
      safeStorage.setItem('hasSeenWelcome', 'true');
      setLoading(false);
    }
  };

  const logout = async () => {
    safeStorage.removeItem('shusto_user_cache');
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
    <AuthContext.Provider value={{ user, loading, error, login, instantLogin, logout, forceSync }}>
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
