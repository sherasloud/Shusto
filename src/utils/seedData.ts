import { doc, setDoc, writeBatch } from 'firebase/firestore';

export interface SeedUser {
  uid: string;
  displayName: string;
  name: string;
  email: string;
  role: 'user' | 'doctor' | 'investor' | 'manager' | 'state' | 'admin' | 'pharmacy' | 'hospital' | 'ambulance' | 'lab' | 'physio' | 'nursing';
  phone?: string;
  division?: string;
  district?: string;
  thana?: string;
  balance?: number;
  specialty?: string;
  fee?: number;
  bmdcNumber?: string;
  experience?: string;
  degree?: string;
  university?: string;
  image?: string;
  photoURL?: string;
  createdAt: string;
}

export const SEED_DOCTORS = [
  {
    id: 'doc_rahul_101',
    userId: 'doc_rahul_101',
    name: 'Dr. Rahul Chowdhury',
    email: 'rahul.cardio@shusto.demo',
    specialty: 'Cardiology (হৃদরোগ বিশেষজ্ঞ)',
    fee: 800,
    bmdcNumber: 'BMDC-A10293',
    experience: '12 Years',
    degree: 'MBBS, FCPS (Cardiology)',
    university: 'Dhaka Medical College',
    isOnline: true,
    rating: 4.9,
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Dhanmondi',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'doc_nushrat_102',
    userId: 'doc_nushrat_102',
    name: 'Dr. Nushrat Jahan',
    email: 'nushrat.gynae@shusto.demo',
    specialty: 'Gynecology & Obstetrics (স্ত্রী ও প্রসূতি রোগ)',
    fee: 700,
    bmdcNumber: 'BMDC-A20482',
    experience: '10 Years',
    degree: 'MBBS, MS (Gynae & Obs)',
    university: 'BSMMU (PG Hospital)',
    isOnline: true,
    rating: 4.8,
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Uttara',
    image: 'https://images.unsplash.com/photo-1594824813571-24a69c100d3a?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 'doc_tanvir_103',
    userId: 'doc_tanvir_103',
    name: 'Dr. Tanvir Hasan',
    email: 'tanvir.medicine@shusto.demo',
    specialty: 'Medicine & Diabetes (মেডিসিন ও ডায়াবেটিস)',
    fee: 600,
    bmdcNumber: 'BMDC-A30192',
    experience: '8 Years',
    degree: 'MBBS, MD (Internal Medicine), CCD (BIRDEM)',
    university: 'Chittagong Medical College',
    isOnline: false,
    rating: 4.7,
    division: 'Chittagong (চট্টগ্রাম)',
    district: 'Chittagong (চট্টগ্রাম)',
    thana: 'Panchlaish',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'doc_sabrina_104',
    userId: 'doc_sabrina_104',
    name: 'Dr. Sabrina Ahmed',
    email: 'sabrina.pedia@shusto.demo',
    specialty: 'Pediatrics (শিশু বিশেষজ্ঞ)',
    fee: 650,
    bmdcNumber: 'BMDC-A40581',
    experience: '9 Years',
    degree: 'MBBS, DCH (Pediatrics), FCPS-P1',
    university: 'Mymensingh Medical College',
    isOnline: true,
    rating: 4.9,
    division: 'Mymensingh (ময়মনসিংহ)',
    district: 'Mymensingh (ময়মনসিংহ)',
    thana: 'Sadar',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'doc_kamrul_105',
    userId: 'doc_kamrul_105',
    name: 'Dr. Kamrul Islam',
    email: 'kamrul.ortho@shusto.demo',
    specialty: 'Orthopedics & Spine (হাড় ও জোড়া বিশেষজ্ঞ)',
    fee: 1000,
    bmdcNumber: 'BMDC-A50921',
    experience: '15 Years',
    degree: 'MBBS, MS (Orthopedic Surgery)',
    university: 'NITOR (Pangu Hospital)',
    isOnline: true,
    rating: 4.9,
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Mirpur',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'doc_anika_106',
    userId: 'doc_anika_106',
    name: 'Dr. Anika Tabassum',
    email: 'anika.derma@shusto.demo',
    specialty: 'Dermatology & Skin (চর্ম ও যৌন রোগ)',
    fee: 800,
    bmdcNumber: 'BMDC-A60341',
    experience: '7 Years',
    degree: 'MBBS, DDV (Dermatology)',
    university: 'Sylhet MAG Osmani Medical College',
    isOnline: false,
    rating: 4.8,
    division: 'Sylhet (সিলেট)',
    district: 'Sylhet (সিলেট)',
    thana: 'Ambarkhana',
    image: 'https://images.unsplash.com/photo-1594824813571-24a69c100d3a?auto=format&fit=crop&q=80&w=400',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  }
];

export const SEED_PATIENTS: SeedUser[] = [
  {
    uid: 'pat_rahim_01',
    displayName: 'Md. Rahim Ullah',
    name: 'Md. Rahim Ullah',
    email: 'rahim.patient@shusto.demo',
    role: 'user',
    phone: '01712345678',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Mirpur',
    balance: 1500,
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    uid: 'pat_fatima_02',
    displayName: 'Fatima Begum',
    name: 'Fatima Begum',
    email: 'fatima.patient@shusto.demo',
    role: 'user',
    phone: '01898765432',
    division: 'Chittagong (চট্টগ্রাম)',
    district: 'Chittagong (চট্টগ্রাম)',
    thana: 'GEC Circle',
    balance: 3200,
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString()
  },
  {
    uid: 'pat_tariq_03',
    displayName: 'Tariqul Islam',
    name: 'Tariqul Islam',
    email: 'tariq.patient@shusto.demo',
    role: 'user',
    phone: '01911223344',
    division: 'Sylhet (সিলেট)',
    district: 'Sylhet (সিলেট)',
    thana: 'Zindabazar',
    balance: 850,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    uid: 'pat_salma_04',
    displayName: 'Salma Khatun',
    name: 'Salma Khatun',
    email: 'salma.patient@shusto.demo',
    role: 'user',
    phone: '01655443322',
    division: 'Rajshahi (রাজশাহী)',
    district: 'Rajshahi (রাজশাহী)',
    thana: 'Boalia',
    balance: 2100,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

export const SEED_INVESTORS: SeedUser[] = [
  {
    uid: 'inv_kazi_01',
    displayName: 'Kazi Mahbubur Rahman',
    name: 'Kazi Mahbubur Rahman',
    email: 'kazi.investor@shusto.demo',
    role: 'investor',
    phone: '01711998877',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Gulshan',
    balance: 250000,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    uid: 'inv_chowdhury_02',
    displayName: 'Alhaj Faruk Chowdhury',
    name: 'Alhaj Faruk Chowdhury',
    email: 'faruk.investor@shusto.demo',
    role: 'investor',
    phone: '01811554433',
    division: 'Chittagong (চট্টগ্রাম)',
    district: 'Chittagong (চট্টগ্রাম)',
    thana: 'Agrabad',
    balance: 180000,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  }
];

export const SEED_MANAGERS: SeedUser[] = [
  {
    uid: 'mgr_kamal_01',
    displayName: 'Kamal Hossain (Area Manager)',
    name: 'Kamal Hossain',
    email: 'kamal.mgr@shusto.demo',
    role: 'manager',
    phone: '01722334455',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Dhanmondi',
    balance: 15000,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    uid: 'mgr_shafiq_02',
    displayName: 'Shafiqur Rahman (Zonal Manager)',
    name: 'Shafiqur Rahman',
    email: 'shafiq.mgr@shusto.demo',
    role: 'manager',
    phone: '01822334455',
    division: 'Chittagong (চট্টগ্রাম)',
    district: 'Chittagong (চট্টগ্রাম)',
    thana: 'Kotwali',
    balance: 12500,
    createdAt: new Date(Date.now() - 18 * 86400000).toISOString()
  }
];

export const SEED_STATES: SeedUser[] = [
  {
    uid: 'state_asif_01',
    displayName: 'Asif Mahmud (Dhaka Coordinator)',
    name: 'Asif Mahmud',
    email: 'asif.state@shusto.demo',
    role: 'state',
    phone: '01733445566',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Shahbagh',
    balance: 8000,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    uid: 'state_mehedi_02',
    displayName: 'Mehedi Hasan (Sylhet Coordinator)',
    name: 'Mehedi Hasan',
    email: 'mehedi.state@shusto.demo',
    role: 'state',
    phone: '01744556677',
    division: 'Sylhet (সিলেট)',
    district: 'Sylhet (সিলেট)',
    thana: 'Sadar',
    balance: 6500,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  }
];

export const SEED_AMBULANCES = [
  {
    id: 'amb_dhaka_01',
    name: 'Shusto Emergency ICU Ambulance (Dhaka)',
    hospitalName: 'Shusto Emergency ICU Ambulance (Dhaka)',
    location: 'Dhaka Medical College Hospital Area, Dhaka',
    contact: '01711000111',
    email: 'ambulance.dhaka@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Shahbagh',
    role: 'ambulance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'amb_mirpur_02',
    name: 'LifeCare AC & Non-AC Ambulance',
    hospitalName: 'LifeCare AC & Non-AC Ambulance',
    location: 'Mirpur 10 Roundabout, Dhaka',
    contact: '01811222333',
    email: 'ambulance.mirpur@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Mirpur',
    role: 'ambulance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'amb_ctg_03',
    name: 'Chittagong Metro Fast Response Ambulance',
    hospitalName: 'Chittagong Metro Fast Response Ambulance',
    location: 'GEC Circle, Chittagong',
    contact: '01911333444',
    email: 'ambulance.ctg@shusto.demo',
    division: 'Chittagong (চট্টগ্রাম)',
    district: 'Chittagong (চট্টগ্রাম)',
    thana: 'Panchlaish',
    role: 'ambulance',
    createdAt: new Date().toISOString()
  }
];

export const SEED_HOSPITALS = [
  {
    id: 'hosp_square_01',
    name: 'Square Hospital Ltd.',
    hospitalName: 'Square Hospital Ltd.',
    location: '18/F Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka',
    contact: '10616',
    email: 'info@squarehospital.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Panthapath',
    role: 'hospital',
    createdAt: new Date().toISOString()
  },
  {
    id: 'hosp_evercare_02',
    name: 'Evercare Hospital Dhaka',
    hospitalName: 'Evercare Hospital Dhaka',
    location: 'Plot 81, Block E, Bashundhara R/A, Dhaka',
    contact: '10678',
    email: 'info@evercare.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Bashundhara',
    role: 'hospital',
    createdAt: new Date().toISOString()
  },
  {
    id: 'hosp_popular_03',
    name: 'Popular Medical College Hospital',
    hospitalName: 'Popular Medical College Hospital',
    location: 'House 16, Road 2, Dhanmondi, Dhaka',
    contact: '09613787801',
    email: 'dhanmondi@popular.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Dhanmondi',
    role: 'hospital',
    createdAt: new Date().toISOString()
  }
];

export const SEED_PHARMACIES = [
  {
    id: 'pharm_lazz_01',
    name: 'Lazz Pharma (Central)',
    location: 'Kalabagan, Mirpur Road, Dhaka',
    contact: '16515',
    email: 'lazz@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Kalabagan',
    role: 'pharmacy',
    createdAt: new Date().toISOString()
  },
  {
    id: 'pharm_tamanna_02',
    name: 'Tamanna Pharmacy & Model Store',
    location: 'Mirpur 1, Dhaka',
    contact: '01712003344',
    email: 'tamanna@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Mirpur',
    role: 'pharmacy',
    createdAt: new Date().toISOString()
  }
];

export const SEED_LABS = [
  {
    id: 'lab_ibnsina_01',
    name: 'Ibn Sina Diagnostic & Consultation Center',
    location: 'House 48, Road 9/A, Dhanmondi, Dhaka',
    contact: '10615',
    email: 'ibnsina@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Dhanmondi',
    role: 'lab',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lab_popular_02',
    name: 'Popular Diagnostic Centre',
    location: 'House 11, Road 2, Dhanmondi, Dhaka',
    contact: '09613787801',
    email: 'populardiagnostic@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Dhanmondi',
    role: 'lab',
    createdAt: new Date().toISOString()
  }
];

export const SEED_NURSINGS = [
  {
    id: 'nurs_caregiver_01',
    name: 'Caregiver Home Nursing & ICU Support',
    location: 'Gulshan 1, Dhaka',
    contact: '01900112233',
    email: 'caregiver@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Gulshan',
    role: 'nursing',
    createdAt: new Date().toISOString()
  }
];

export const SEED_PHYSIOS = [
  {
    id: 'physio_active_01',
    name: 'Active Spine & Pain Relief Physio Center',
    location: 'Uttara Sector 7, Dhaka',
    contact: '01788990011',
    email: 'physio.active@shusto.demo',
    division: 'Dhaka (ঢাকা)',
    district: 'Dhaka (ঢাকা)',
    thana: 'Uttara',
    role: 'physio',
    createdAt: new Date().toISOString()
  }
];

export async function seedCompletePlatformData(firestoreDb: any): Promise<{ success: boolean; count: number }> {
  try {
    let writeCount = 0;

    // 1. Seed Doctors
    for (const d of SEED_DOCTORS) {
      await setDoc(doc(firestoreDb, 'doctors', d.id), d, { merge: true });
      await setDoc(doc(firestoreDb, 'users', d.userId), {
        uid: d.userId,
        displayName: d.name,
        name: d.name,
        email: d.email,
        role: 'doctor',
        specialty: d.specialty,
        fee: d.fee,
        bmdcNumber: d.bmdcNumber,
        experience: d.experience,
        degree: d.degree,
        university: d.university,
        image: d.image,
        division: d.division,
        district: d.district,
        thana: d.thana,
        createdAt: d.createdAt
      }, { merge: true });
      writeCount += 2;
    }

    // 2. Seed Patients
    for (const p of SEED_PATIENTS) {
      await setDoc(doc(firestoreDb, 'users', p.uid), p, { merge: true });
      await setDoc(doc(firestoreDb, 'wallets', p.uid), { balance: p.balance || 1000 }, { merge: true });
      writeCount += 2;
    }

    // 3. Seed Investors
    for (const inv of SEED_INVESTORS) {
      await setDoc(doc(firestoreDb, 'users', inv.uid), inv, { merge: true });
      await setDoc(doc(firestoreDb, 'wallets', inv.uid), { balance: inv.balance || 50000 }, { merge: true });
      writeCount += 2;
    }

    // 4. Seed Managers
    for (const mgr of SEED_MANAGERS) {
      await setDoc(doc(firestoreDb, 'users', mgr.uid), mgr, { merge: true });
      await setDoc(doc(firestoreDb, 'wallets', mgr.uid), { balance: mgr.balance || 10000 }, { merge: true });
      writeCount += 2;
    }

    // 5. Seed State Coordinators
    for (const st of SEED_STATES) {
      await setDoc(doc(firestoreDb, 'users', st.uid), st, { merge: true });
      await setDoc(doc(firestoreDb, 'wallets', st.uid), { balance: st.balance || 5000 }, { merge: true });
      writeCount += 2;
    }

    // 6. Seed Ambulances
    for (const amb of SEED_AMBULANCES) {
      await setDoc(doc(firestoreDb, 'ambulances', amb.id), amb, { merge: true });
      writeCount++;
    }

    // 7. Seed Hospitals
    for (const hosp of SEED_HOSPITALS) {
      await setDoc(doc(firestoreDb, 'hospitals', hosp.id), hosp, { merge: true });
      writeCount++;
    }

    // 8. Seed Pharmacies
    for (const ph of SEED_PHARMACIES) {
      await setDoc(doc(firestoreDb, 'pharmacies', ph.id), ph, { merge: true });
      writeCount++;
    }

    // 9. Seed Labs
    for (const lab of SEED_LABS) {
      await setDoc(doc(firestoreDb, 'labs', lab.id), lab, { merge: true });
      writeCount++;
    }

    // 10. Seed Nursings & Physios
    for (const n of SEED_NURSINGS) {
      await setDoc(doc(firestoreDb, 'nursings', n.id), n, { merge: true });
      writeCount++;
    }
    for (const phy of SEED_PHYSIOS) {
      await setDoc(doc(firestoreDb, 'physios', phy.id), phy, { merge: true });
      writeCount++;
    }

    return { success: true, count: writeCount };
  } catch (error) {
    console.error("Error seeding complete platform data:", error);
    throw error;
  }
}
