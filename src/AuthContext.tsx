import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
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
  referredBy?: string; // UID of the pharmacy/state that referred this user
  role: 'user' | 'admin' | 'doctor' | 'pharmacy' | 'physio' | 'hospital' | 'ambulance' | 'lab';
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  forceSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const timeout = setTimeout(() => {
      if (loading) {
        setError("সংযোগের সময় পার হয়ে গেছে। দয়া করে আপনার ইন্টারনেট চেক করুন অথবা পেজটি রিফ্রেশ করুন।");
        setLoading(false);
      }
    }, 30000);

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

      setLoading(true);
      setError(null);

      const email = firebaseUser.email?.toLowerCase().trim();
      const isDefaultAdmin = email === 'shustobd@gmail.com';
      const isHardcodedDoctor = email === 'thesiambin@gmail.com' || email === 'monsurhelal86@gmail.com';

      // Real-time listener for the user's profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      
      unsubProfile = onSnapshot(userRef, async (userDoc) => {
        try {
          if (!userDoc.exists()) {
            console.log("User profile not found, checking for manual placeholder or creating new...");
            const cleanEmail = email?.replace(/[^a-zA-Z0-9]/g, '_');
            const manualId = `email_${cleanEmail}`;
            const manualRef = doc(db, 'users', manualId);
            let manualData: any = null;
            try {
              const manualDoc = await getDoc(manualRef);
              if (manualDoc.exists()) {
                console.log("Found manual placeholder doc");
                manualData = manualDoc.data();
              }
            } catch (placeholderErr) {
              console.log("No manual placeholder found or no access (this is normal for new users)");
            }
            
            // Check if this user was pre-registered in any professional collection
            const emailClean = email?.toLowerCase().trim();
            let preRegisteredName = manualData?.name || manualData?.displayName;
            let professionalRole = manualData?.role;

            if (!preRegisteredName && emailClean) {
              const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
              for (const coll of providerCollections) {
                const q = query(collection(db, coll), where('email', '==', emailClean));
                const snap = await getDocs(q);
                if (!snap.empty) {
                  const data = snap.docs[0].data();
                  preRegisteredName = data.name;
                  professionalRole = coll === 'doctors' ? 'doctor' : 
                                   coll === 'pharmacies' ? 'pharmacy' : 
                                   coll === 'labs' ? 'lab' : 
                                   coll === 'physios' ? 'physio' : 
                                   coll === 'hospitals' ? 'hospital' : 'ambulance';
                  break;
                }
              }
            }

            let role: any = isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : (professionalRole || manualData?.role || 'user'));
            const referralUID = sessionStorage.getItem('shusto_referral');
            const referredByValue = referralUID || manualData?.referredBy;

            const newProfile: any = {
              uid: firebaseUser.uid,
              displayName: preRegisteredName || firebaseUser.displayName || 'User',
              email: email || null,
              photoURL: firebaseUser.photoURL || manualData?.photoURL || null,
              role: role,
              createdAt: new Date().toISOString(),
              ...(manualData || {})
            };
            
            if (referredByValue) {
              newProfile.referredBy = referredByValue;
            }
            
            // Ensure name field is also present
            if (preRegisteredName) {
              newProfile.name = preRegisteredName;
            }
            
            setUser(newProfile);
            setLoading(false);
            
            await setDoc(userRef, newProfile);
            console.log("User profile created/consolidated in Firestore");
            // If manualData was found (meaning manualDoc exists), try to delete it
            if (manualData) {
              await deleteDoc(manualRef).catch(err => console.error("Could not delete manual placeholder:", err));
            }
          } else {
            const existingData = userDoc.data() as UserProfile;
            let currentRole = existingData.role;
            let needsUpdate = false;
            let updatedDisplayName = existingData.displayName;

            // If the user has a professional name (from a previous sync or update), make sure it is used
            const profName = (existingData as any).hospitalName || (existingData as any).name;
            const isProfNameBetter = profName && !profName.includes('@') && profName !== 'User' && !profName.includes('Twitter');
            
            if (isProfNameBetter && profName !== existingData.displayName) {
              updatedDisplayName = profName;
              needsUpdate = true;
            }

            if (isDefaultAdmin && currentRole !== 'admin') {
              console.log("Elevating user to admin based on email");
              currentRole = 'admin';
              needsUpdate = true;
            } else if (isHardcodedDoctor && currentRole !== 'doctor') {
              console.log("Setting user as doctor based on email");
              currentRole = 'doctor';
              needsUpdate = true;
            }

            setUser({ ...existingData, role: currentRole, displayName: updatedDisplayName });
            setLoading(false);

            if (needsUpdate) {
              await updateDoc(userRef, { 
                role: currentRole,
                displayName: updatedDisplayName,
                name: updatedDisplayName // Keep name field in sync too
              });
            }
          }
        } catch (err) {
          console.error("Profile sync error details:", err);
          setLoading(false);
        }
      }, (err) => {
        console.error("Snapshot real-time listener error:", err);
        // If snapshot fails, we still want to show something to the user if possible
        if (!user) {
           setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'User',
              email: firebaseUser.email || null,
              photoURL: firebaseUser.photoURL,
              role: isDefaultAdmin ? 'admin' : (isHardcodedDoctor ? 'doctor' : 'user')
           });
        }
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
      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      
      for (const collectionName of providerCollections) {
        const q = query(collection(db, collectionName), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const docId = snapshot.docs[0].id;
          const newRole = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 'ambulance';
          
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
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login result obtained for:", result.user.email);
    } catch (err: any) {
      console.error("Detailed login error:", err);
      if (err.code === 'auth/network-request-failed') {
        setError("নেটওয়ার্ক সমস্যা: আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন। ভিপিএন বা অ্যাড-ব্লকার থাকলে তা বন্ধ করে আবার চেষ্টা করুন।");
      } else if (err.code === 'auth/popup-blocked') {
        setError("পপ-আপ ব্লক করা: আপনার ব্রাউজার লগইন উইন্ডোটি খুলতে বাধা দিয়েছে। অনুগ্রহ করে পপ-আপ এলাউ করুন।");
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(null); 
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`এই ডোমেইনটি অনুমোদিত নয়। দয়া করে ফায়ারবেস কনসোলে "${window.location.hostname}" ডোমেইনটি যোগ করুন।`);
      } else if (err.code === 'auth/internal-error' && err.message?.includes('cross-origin')) {
        setError("ব্রাউজার সিকিউরিটি সমস্যা: অনুগ্রহ করে অ্যাপ্লিকেশনটি নতুন ট্যাবে খুলে চেষ্টা করুন।");
      } else {
        setError(err.message || "লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const forceSync = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const email = auth.currentUser.email?.toLowerCase().trim();
      if (!email) return;

      const providerCollections = ['doctors', 'pharmacies', 'labs', 'physios', 'hospitals', 'ambulances'];
      for (const collectionName of providerCollections) {
        const q = query(collection(db, collectionName), where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          const newRole = collectionName === 'doctors' ? 'doctor' : 
                         collectionName === 'pharmacies' ? 'pharmacy' : 
                         collectionName === 'labs' ? 'lab' : 
                         collectionName === 'physios' ? 'physio' : 
                         collectionName === 'hospitals' ? 'hospital' : 'ambulance';
          
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
    <AuthContext.Provider value={{ user, loading, error, login, logout, forceSync }}>
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
