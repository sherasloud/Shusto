import React, { useEffect, useState } from 'react';
import { Search, MapPin, Phone, ExternalLink, Clock, CheckCircle, Tag, XCircle, Navigation, ChevronDown, Activity, X, Truck, Filter, MessageCircle } from 'lucide-react';
import { collection, onSnapshot, query, addDoc, where, doc, getDoc, updateDoc, increment, runTransaction, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { distributeCommissions } from '../utils/commissions';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { cn } from '../lib/utils';
import { AMBULANCE_ROUTES, LAB_SERVICES_PRESETS, PHYSIO_SERVICES_PRESETS, AMBULANCE_PRICE_DETECTION_DATABASE } from '../constants';
import { BANGLADESH_LOCATIONS, DISTRICT_THANAS } from '../constants/locations';
import { FALLBACK_PROVIDERS } from '../constants/fallbackProviders';


interface ServiceProvider {
  id: string;
  name: string;
  hospitalName?: string;
  location: string;
  contact: string;
  email: string;
  type: string;
  [key: string]: any;
}

interface Post {
  id: string;
  title: string;
  description: string;
  price?: string;
  image?: string;
  providerId?: string;
  providerName?: string;
  bedLimit?: number;
  ccuLimit?: number;
  isICU?: boolean;
  isCCU?: boolean;
  [key: string]: any;
}

interface ServiceDirectoryProps {
  type: 'pharmacy' | 'lab' | 'physio' | 'hospital' | 'ambulance';
  title: string;
  description: string;
}

const toBengaliNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, d => banglaDigits[Number(d)]);
};

export function ServiceDirectory({ type, title, description }: ServiceDirectoryProps) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'centers' | 'services' | 'ambulance_form'>(type === 'ambulance' ? 'ambulance_form' : 'services');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [globalServices, setGlobalServices] = useState<any[]>([]);
  const [allProviderPosts, setAllProviderPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [selectedGlobalService, setSelectedGlobalService] = useState<any | null>(null);
  const [providerPosts, setProviderPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [nearestCenter, setNearestCenter] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    if (!user || !providers.length) return;
    
    const userLoc = {
      division: (user as any).division || '',
      district: (user as any).district || '',
      thana: (user as any).thana || ''
    };

    const scored = providers.map(p => {
      let score = 0;
      if ((p as any).division === userLoc.division) {
        score += 1;
        if ((p as any).district === userLoc.district) {
          score += 2;
          if ((p as any).thana === userLoc.thana) {
            score += 4;
          }
        }
      }
      return { ...p, score };
    }).sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score > 0) {
      setNearestCenter(scored[0]);
    } else {
      setNearestCenter(providers[0] || null);
    }
  }, [user, providers]);

  useEffect(() => {
    if (!user) {
      setWalletBalance(null);
      return;
    }
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        setWalletBalance(snap.data().balance || 0);
      } else {
        setWalletBalance(0);
      }
    });
    return () => unsubWallet();
  }, [user]);

  // Ambulance specific state
  const [pickupDivision, setPickupDivision] = useState('');
  const [pickupDistrict, setPickupDistrict] = useState('');
  const [pickupThana, setPickupThana] = useState('');
  const [pickupGram, setPickupGram] = useState('');
  const [destinationDivision, setDestinationDivision] = useState('');
  const [destinationDistrict, setDestinationDistrict] = useState('');
  const [destinationThana, setDestinationThana] = useState('');
  const [destinationGram, setDestinationGram] = useState('');
  const [showAmbulanceForm, setShowAmbulanceForm] = useState(false);
  const [ambulancePrice, setAmbulancePrice] = useState(0);
  const [ambulanceDistance, setAmbulanceDistance] = useState(0);
  const [ambulanceToll, setAmbulanceToll] = useState(0);
  const [ambulanceTollDetails, setAmbulanceTollDetails] = useState('');
  const [ambulanceBaseFare, setAmbulanceBaseFare] = useState(500);
  const [ambulanceFarePart, setAmbulanceFarePart] = useState(0);

  const directionsLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');
  const [pickupPlace, setPickupPlace] = useState<any>(null);
  const [destinationPlace, setDestinationPlace] = useState<any>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  useEffect(() => {
    if (!geocodingLib) return;
    
    const geocodeLocation = async (division: string, district: string, thana: string, setPlace: (p: any) => void) => {
      if (!district) return;
      const address = `${thana ? thana + ', ' : ''}${district}, ${division}, Bangladesh`;
      const geocoder = new (geocodingLib as any).Geocoder();
      
      geocoder.geocode({ address }, (results: any, status: any) => {
        console.log(`[Geocoding] ${address} status:`, status);
        if (status === 'OK' && results[0]) {
          setPlace({ 
            location: results[0].geometry.location,
            formatted_address: results[0].formatted_address,
            isAutoGeocoded: true
          });
        }
      });
    };

    if (pickupDistrict) {
      geocodeLocation(pickupDivision, pickupDistrict, pickupThana, setPickupPlace);
    }
  }, [geocodingLib, pickupDivision, pickupDistrict, pickupThana]);

  useEffect(() => {
    if (!geocodingLib) return;
    
    const geocodeLocation = async (division: string, district: string, thana: string, setPlace: (p: any) => void) => {
      if (!district) return;
      const address = `${thana ? thana + ', ' : ''}${district}, ${division}, Bangladesh`;
      const geocoder = new (geocodingLib as any).Geocoder();
      geocoder.geocode({ address }, (results: any, status: any) => {
        console.log(`[Geocoding Destination] ${address} status:`, status);
        if (status === 'OK' && results[0]) {
          setPlace({ 
            location: results[0].geometry.location,
            formatted_address: results[0].formatted_address,
            isAutoGeocoded: true 
          });
        }
      });
    };

    if (destinationDistrict) {
      geocodeLocation(destinationDivision, destinationDistrict, destinationThana, setDestinationPlace);
    }
  }, [geocodingLib, destinationDivision, destinationDistrict, destinationThana]);

  useEffect(() => {
    if (!directionsLib || !pickupPlace?.location || !destinationPlace?.location) {
      return;
    }

    const calculateDistance = async () => {
      setCalculatingDistance(true);
      try {
        const directionsService = new (directionsLib as any).DirectionsService();
        
        const request = {
          origin: pickupPlace.location,
          destination: destinationPlace.location,
          travelMode: 'DRIVING'
        };

        directionsService.route(request, (result: any, status: any) => {
          console.log(`[Directions] status:`, status);
          if (status === 'OK' && result.routes[0]) {
            const distanceMeters = result.routes[0].legs[0].distance.value;
            const distanceKm = distanceMeters / 1000;
            
            const finalKm = Number(distanceKm.toFixed(1));
            setAmbulanceDistance(finalKm);
            
            const perKmFare = Math.round(finalKm * 49);
            setAmbulanceFarePart(perKmFare);
            
            const baseFare = 500;
            setAmbulanceBaseFare(baseFare);
            const total = baseFare + perKmFare + ambulanceToll;
            setAmbulancePrice(total > 0 ? total : 0);
          } else {
            // If API fails, fallback to something or show error
            if (status === 'ZERO_RESULTS') {
              console.warn("No route found between points");
            }
          }
          setCalculatingDistance(false);
        });
      } catch (error) {
        console.error("Error calculating route:", error);
        setCalculatingDistance(false);
      }
    };

    calculateDistance();
  }, [directionsLib, pickupPlace, destinationPlace, ambulanceToll]);

  const normalizeLocation = (loc: string): string => {
    if (!loc) return "";
    const lower = loc.toLowerCase();
    if (lower.includes("dhaka") || lower.includes("ঢাকা")) return "dhaka";
    if (lower.includes("gazipur") || lower.includes("গাজীপুর")) return "gazipur";
    if (lower.includes("narayanganj") || lower.includes("নারায়ণগঞ্জ") || lower.includes("নারায়ণগঞ্জ")) return "narayanganj";
    if (lower.includes("munshiganj") || lower.includes("মুन्সীগঞ্জ") || lower.includes("মুন্সীগঞ্জ")) return "munshiganj";
    if (lower.includes("faridpur") || lower.includes("ফরিদপুর")) return "faridpur";
    if (lower.includes("gopalganj") || lower.includes("গোপালগঞ্জ")) return "gopalganj";
    if (lower.includes("madaripur") || lower.includes("মাদারীপুর")) return "madaripur";
    if (lower.includes("shariatpur") || lower.includes("শরীয়তপুর") || lower.includes("শরিয়তপুর")) return "shariatpur";
    
    if (lower.includes("chittagong") || lower.includes("চট্টগ্রাম")) return "chittagong";
    if (lower.includes("comilla") || lower.includes("কুমিল্লা")) return "comilla";
    if (lower.includes("feni") || lower.includes("ফেনী")) return "feni";
    if (lower.includes("noakhali") || lower.includes("নোয়াখালী") || lower.includes("নোয়াখালী")) return "noakhali";
    if (lower.includes("cox") || lower.includes("কক্সবাজার")) return "coxsbazar";
    if (lower.includes("khagrachari") || lower.includes("খাগড়াছড়ি") || lower.includes("খাগড়াছড়ি")) return "khagrachari";
    if (lower.includes("rangamati") || lower.includes("রাঙ্গামাটি")) return "rangamati";
    if (lower.includes("bandarban") || lower.includes("বান্দরবান")) return "bandarban";
    
    if (lower.includes("sylhet") || lower.includes("সিলেট")) return "sylhet";
    if (lower.includes("moulvibazar") || lower.includes("মৌলভীবাজার")) return "moulvibazar";
    if (lower.includes("habiganj") || lower.includes("হবিগঞ্জ")) return "habiganj";
    if (lower.includes("sunamganj") || lower.includes("সুনামগঞ্জ")) return "sunamganj";
    
    if (lower.includes("rajshahi") || lower.includes("রাজশাহী")) return "rajshahi";
    if (lower.includes("natore") || lower.includes("নাটোর")) return "natore";
    if (lower.includes("pabna") || lower.includes("পাবনা")) return "pabna";
    if (lower.includes("sirajganj") || lower.includes("সিরাজগঞ্জ")) return "sirajganj";
    if (lower.includes("bogra") || lower.includes("বগুড়া") || lower.includes("বগুড়া")) return "bogra";
    if (lower.includes("joypurhat") || lower.includes("জয়পুরহাট") || lower.includes("জয়পুরহাট")) return "joypurhat";
    if (lower.includes("naogaon") || lower.includes("নওগাঁ")) return "naogaon";
    if (lower.includes("nawabganj") || lower.includes("চাঁপাইনবাবগঞ্জ") || lower.includes("নবাবগঞ্জ")) return "chapainawabganj";
    
    if (lower.includes("rangpur") || lower.includes("রংপুর")) return "rangpur";
    if (lower.includes("gaibandha") || lower.includes("গাইবান্ধা")) return "gaibandha";
    if (lower.includes("kurigram") || lower.includes("কুড়িগ্রাম") || lower.includes("কুড়িগ্রাম")) return "kurigram";
    if (lower.includes("lalmonirhat") || lower.includes("লালমনিরহাট")) return "lalmonirhat";
    if (lower.includes("nilphamari") || lower.includes("নীলফামারী")) return "nilphamari";
    if (lower.includes("thakurgaon") || lower.includes("ঠাকুরগাঁও")) return "thakurgaon";
    if (lower.includes("dinajpur") || lower.includes("দিনাজপুর")) return "dinajpur";
    if (lower.includes("panchagarh") || lower.includes("পঞ্চগড়") || lower.includes("পঞ্চগড়")) return "panchagarh";
    
    if (lower.includes("khulna") || lower.includes("খুলনা")) return "khulna";
    if (lower.includes("jessore") || lower.includes("যশোর")) return "jessore";
    if (lower.includes("kushtia") || lower.includes("কুষ্টিয়া") || lower.includes("কুষ্টিয়া")) return "kushtia";
    if (lower.includes("magura") || lower.includes("মাগুরা")) return "magura";
    if (lower.includes("jhenaidah") || lower.includes("ঝিনাইদহ")) return "jhenaidah";
    if (lower.includes("narail") || lower.includes("নড়াইল") || lower.includes("নড়াইল")) return "narail";
    if (lower.includes("satkhira") || lower.includes("সাতক্ষীরা")) return "satkhira";
    if (lower.includes("bagerhat") || lower.includes("বাগেরহাট")) return "bagerhat";
    
    if (lower.includes("barisal") || lower.includes("বরিশাল")) return "barisal";
    if (lower.includes("patuakhali") || lower.includes("পটুয়াখালী") || lower.includes("পটুয়াখালী")) return "patuakhali";
    if (lower.includes("jhalokati") || lower.includes("jhalakathi") || lower.includes("ঝালকাঠি") || lower.includes("ঝালোকাতী")) return "jhalokati";
    if (lower.includes("bhola") || lower.includes("ভোলা")) return "bhola";
    if (lower.includes("barguna") || lower.includes("বরগুনা")) return "barguna";
    if (lower.includes("pirojpur") || lower.includes("পিরোজপুর")) return "pirojpur";
    
    if (lower.includes("mymensingh") || lower.includes("ময়মনসিংহ") || lower.includes("ময়মনসিংহ")) return "mymensingh";
    if (lower.includes("jamalpur") || lower.includes("জামালপুর")) return "jamalpur";
    if (lower.includes("sherpur") || lower.includes("শেরপুর")) return "sherpur";
    if (lower.includes("netrokona") || lower.includes("নেত্রকোনা") || lower.includes("নেত্রকোণা")) return "netrokona";
    
    if (lower.includes("brahmanbaria") || lower.includes("ব্রাহ্মণবাড়িয়া") || lower.includes("ব্রাহ্মণবাড়িয়া")) return "brahmanbaria";
    if (lower.includes("lakshmipur") || lower.includes("লক্ষ্মীপুর")) return "lakshmipur";
    
    // নতুন যুক্ত করা জেলাসমূহ
    if (lower.includes("kishoreganj") || lower.includes("কিশোরগঞ্জ")) return "kishoreganj";
    if (lower.includes("manikganj") || lower.includes("মানিকগঞ্জ")) return "manikganj";
    if (lower.includes("narsingdi") || lower.includes("নরসিংদী")) return "narsingdi";
    if (lower.includes("rajbari") || lower.includes("রাজবাড়ী") || lower.includes("রাজবাড়ী")) return "rajbari";
    if (lower.includes("tangail") || lower.includes("টাঙ্গাইল")) return "tangail";
    if (lower.includes("chandpur") || lower.includes("চাঁদপুর")) return "chandpur";
    if (lower.includes("chuadanga") || lower.includes("চুয়াডাঙ্গা") || lower.includes("চুয়াডাঙ্গা")) return "chuadanga";
    if (lower.includes("meherpur") || lower.includes("মেহেরপুর")) return "meherpur";
    
    return lower;
  };

  const getAmbulancePriceDetails = () => {
    // Priority: Use Real-Time Google Maps Distance (Mandatory for accuracy)
    if (ambulanceDistance > 0) {
      const perKmFare = Math.round(ambulanceDistance * 49);
      const baseFare = 500; // Shusto standard base
      return {
        distance: ambulanceDistance,
        fare: perKmFare,
        toll: ambulanceToll,
        tollDetails: ambulanceToll > 0 ? 'ব্রীজ/রোড টোল অন্তর্ভুক্ত' : '',
        baseFare: baseFare,
        total: baseFare + perKmFare + ambulanceToll
      };
    }

    // Fallback: If we have districts but no distance yet, use database or logical estimate
    if (pickupDistrict || destinationDistrict) {
      const normPickup = normalizeLocation(pickupDistrict);
      const normDest = normalizeLocation(destinationDistrict);

      // Look up in database
      const match = AMBULANCE_PRICE_DETECTION_DATABASE.find(r => 
        (r.from === normPickup && r.to === normDest) || 
        (r.from === normDest && r.to === normPickup)
      );

      if (match) {
        return {
          distance: match.distance,
          fare: match.fare,
          toll: match.toll,
          tollDetails: match.tollDetails,
          baseFare: 500,
          total: match.total,
          isEstimate: true
        };
      }

      // Logical default fallback if no DB match
      const isSameDistrict = normPickup === normDest;
      const distance = isSameDistrict ? 25 : 150;
      const fare = Math.round(distance * 49);
      const total = 500 + fare;

      return { 
        distance, 
        fare, 
        toll: 0, 
        tollDetails: '', 
        baseFare: 500, 
        total,
        isEstimate: true
      };
    }

    return { distance: 0, fare: 0, toll: 0, tollDetails: '', baseFare: 500, total: 0, isEstimate: false };
  };

  const getAmbulancePrice = () => {
    return getAmbulancePriceDetails().total;
  };

  useEffect(() => {
    if (type === 'ambulance') {
      const details = getAmbulancePriceDetails();
      setAmbulancePrice(details.total);
      // We don't setAmbulanceDistance here if it's already set by Maps to avoid loops
      if (details.distance !== ambulanceDistance && details.distance > 0 && ambulanceDistance === 0) {
        setAmbulanceDistance(details.distance);
      }
      setAmbulanceToll(details.toll);
      setAmbulanceTollDetails(details.tollDetails);
      setAmbulanceBaseFare(details.baseFare);
      setAmbulanceFarePart(details.fare);
    }
  }, [type, pickupDistrict, destinationDistrict, pickupDivision, destinationDivision, ambulanceDistance, ambulanceToll]);

  useEffect(() => {
    // For all types, we now prioritize services over centers
    // This allows patients to see Beds, ICU, Tests directly
    if (type === 'ambulance') {
      setActiveView('centers');
    } else {
      setActiveView('services');
    }

    const collectionName = type === 'pharmacy' ? 'pharmacies' : 
                         type === 'lab' ? 'labs' : 
                         type === 'physio' ? 'physios' : 
                         type === 'hospital' ? 'hospitals' : 'ambulances';
    
    // Still fetch providers for context/mapping if needed, but primary view is services
    const qProviders = query(collection(db, collectionName), limit(100));
    const fetchProviders = async () => {
      try {
        const snapshot = await getDocs(qProviders);
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceProvider[];
        
        // Deduplicate by email to avoid duplicates (placeholder vs active account)
        const map = new Map<string, ServiceProvider>();
        docs.forEach(d => {
          if (d.email) {
            const email = d.email.toLowerCase().trim();
            const existing = map.get(email);
            
            if (!existing) {
              map.set(email, d);
            } else {
              // Decide which record is better
              const existingName = (existing as any).hospitalName || (existing as any).name || existing.name || '';
              const currentName = (d as any).hospitalName || (d as any).name || d.name || '';
              
              const isExistingNameReal = existingName && !existingName.includes('@') && existingName !== 'User';
              const isCurrentNameReal = currentName && !currentName.includes('@') && currentName !== 'User';
              
              const proKeywords = ['hospital', 'clinic', 'medical', 'center', 'diagnostic', 'lab', 'pharmacy', 'health', 'হাসপাতাল', 'ক্লিনিক', 'care', 'special', 'ambulance', 'doctor', 'physio', 'rehab', 'medicine'];
              const isExistingPro = proKeywords.some(k => existingName.toLowerCase().includes(k));
              const isCurrentPro = proKeywords.some(k => currentName.toLowerCase().includes(k));
              
              if (isCurrentPro && !isExistingPro) {
                map.set(email, d);
              } else if (isExistingPro && !isCurrentPro) {
                // Keep existing
              } else if (!isExistingNameReal && isCurrentNameReal) {
                map.set(email, d);
              } else if (d.id.startsWith('u_')) {
                if (!isCurrentPro && isExistingPro) {
                  map.set(email, { ...d, ...existing, id: d.id, name: existingName, hospitalName: existingName });
                } else {
                  map.set(email, d);
                }
              }
            }
          } else {
            map.set(d.id, d);
          }
        });
        
        const fetchedProviders = Array.from(map.values());
        if (fetchedProviders.length > 0) {
          localStorage.setItem(`cached_providers_${type}`, JSON.stringify(fetchedProviders));
        }
        
        setProviders(fetchedProviders);
        
        if (type === 'hospital' || type === 'ambulance' || type === 'pharmacy') {
          setLoading(false);
        }
      } catch (error: any) {
        console.error("Provider fetch error:", error);
        if (error.message?.includes('quota')) {
           const cached = localStorage.getItem(`cached_providers_${type}`);
           if (cached) {
             setProviders(JSON.parse(cached));
           } else {
             setProviders(FALLBACK_PROVIDERS.filter(p => p.role === (type === 'hospital' ? 'hospital' : type === 'ambulance' ? 'ambulance' : type === 'pharmacy' ? 'pharmacy' : type)));
           }
        }
        setLoading(false);
      }
    };
    
    fetchProviders();

    // Fetch All Posts for Pharmacy and Hospital (to show all products directly)
    if (type === 'pharmacy' || type === 'hospital') {
      const qPosts = query(
        collection(db, 'posts'),
        where('providerType', '==', type),
        limit(100)
      );
      getDocs(qPosts).then((snapshot) => {
        setAllProviderPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        setLoading(false);
      }).catch((error) => {
        console.error("Posts fetch error:", error);
        setLoading(false);
      });
    }

    // Fetch Global Services if Lab or Physio
    if (type === 'lab' || type === 'physio') {
      setLoading(true);
      const globalColl = type === 'lab' ? 'labTests' : 'physioServices';
      const qGlobal = query(collection(db, globalColl), limit(100));
      getDocs(qGlobal).then((snapshot) => {
        let services = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // If Firestore is empty, use presets as fallback for immediate display
        if (services.length === 0) {
          const presets = type === 'lab' ? LAB_SERVICES_PRESETS : PHYSIO_SERVICES_PRESETS;
          services = presets.map((p, idx) => ({ 
            id: `preset_${idx}`, 
            ...p,
            isPreset: true
          }));
        }
        
        setGlobalServices(services);
        setLoading(false);
      }).catch((error) => {
        console.error("Global services fetch error (falling back to presets):", error);
        // Fallback on error too
        const presets = type === 'lab' ? LAB_SERVICES_PRESETS : PHYSIO_SERVICES_PRESETS;
        setGlobalServices(presets.map((p, idx) => ({ id: `preset_err_${idx}`, ...p, isPreset: true })));
        setLoading(false);
      });
    }

    // Ambulance loading state
    if (type === 'ambulance') {
      setLoading(false);
    }

  }, [type]);

  useEffect(() => {
    if (!selectedProvider) {
      setProviderPosts([]);
      return;
    }

    setLoadingPosts(true);
    // Provider ID can be u_UID or just UID depending on how it was created
    const q = query(
      collection(db, 'posts'),
      where('providerId', 'in', [selectedProvider.id, selectedProvider.id.replace('u_', '')])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setProviderPosts(docs);
      setLoadingPosts(false);
    });

    return () => unsubscribe();
  }, [selectedProvider]);

  const handleBook = async (post?: Post | any, explicitProvider?: ServiceProvider | null) => {
    // If it's a global service, it won't have a provider yet
    if (!user) return;
    
    const contextProvider = explicitProvider !== undefined ? explicitProvider : selectedProvider;

    // For ambulance, we allow booking without a specific provider/post if locations are set
    const isAmbulanceBooking = type === 'ambulance' && (pickupPlace || (pickupDistrict && destinationDistrict));
    if (!post && !contextProvider && !isAmbulanceBooking) return;
    
    // For services, we might need a default fee if it's a general request,
    // or the item price if a post is selected.
    // improved price extraction: find first number in string
    let price = 0;
    let details = post ? `Interested in: ${post.title || post.name}` : 'General inquiry';
    let postTitle = post?.title || post?.name || null;
    let targetProviderId = post?.providerId || contextProvider?.id || (type === 'ambulance' ? 'ambulance_general' : nearestCenter?.id || 'admin');
    
    // Explicit fail-safe for ambulance list selection
    if (type === 'ambulance' && contextProvider && !post && !isAmbulanceBooking) {
      targetProviderId = contextProvider.id;
    }

    let targetProviderName = post?.providerName || contextProvider?.name || (type !== 'ambulance' ? nearestCenter?.name : 'Any Ambulance');
    if (type === 'ambulance' && contextProvider && targetProviderName === 'Any Center') {
      targetProviderName = contextProvider.name;
    }

    const pickupStr = pickupPlace?.formatted_address || `${pickupThana}, ${pickupDistrict}, ${pickupDivision}`;
    const destStr = destinationPlace?.formatted_address || `${destinationThana}, ${destinationDistrict}, ${destinationDivision}`;

    if (isAmbulanceBooking) {
      price = ambulancePrice;
      details = `Ambulance service requested from ${pickupStr} to ${destStr}. Genuine Price: ৳${ambulancePrice}`;
    } else {
      const priceRaw = String(post?.price || "").replace(/,/g, '');
      const priceMatch = priceRaw.match(/\d+(\.\d+)?/);
      price = priceMatch ? Number(priceMatch[0]) : 0;
    }

    const currentBookingId = post?.id || contextProvider?.id || (type === 'ambulance' ? 'ambulance_booking' : 'general');
    setActiveBookingId(currentBookingId);
    setBookingStatus('booking');
    try {
      // Find the actual provider for this post to get their correct email
      const actualProvider = explicitProvider || 
                            providers.find(p => p.id === post?.providerId || p.id === `u_${post?.providerId}`) ||
                            contextProvider;

      const providerEmail = actualProvider?.email?.toLowerCase().trim() || 
                           contextProvider?.email?.toLowerCase().trim() || 
                           nearestCenter?.email?.toLowerCase().trim() || 
                           'shustobd@gmail.com';
      
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'), limit(1));
      const adminSnap = await getDocs(adminQuery);
      const adminUid = !adminSnap.empty ? adminSnap.docs[0].id : 'admin_placeholder';

      if (price > 0) {
        await runTransaction(db, async (transaction) => {
          const walletRef = doc(db, 'wallets', user.uid);
          const walletSnap = await transaction.get(walletRef);
          const balance = walletSnap.exists() ? walletSnap.data().balance || 0 : 0;

          if (balance < price) {
            throw new Error('insufficient_balance');
          }

          // 1. Create Request
          const requestRef = doc(collection(db, 'serviceRequests'));
          transaction.set(requestRef, {
            userId: user.uid,
            userName: (user as any).name || (user as any).displayName || user.displayName || user.email,
            userLocation: isAmbulanceBooking ? pickupStr : ((user as any).location || 'Unknown'),
            userDivision: isAmbulanceBooking ? pickupDivision : null,
            userDistrict: isAmbulanceBooking ? pickupDistrict : null,
            providerId: targetProviderId,
            providerName: targetProviderName,
            hospitalName: targetProviderName, // Legacy/Dashboard support
            providerEmail: providerEmail.toLowerCase().trim(),
            providerType: type,
            status: 'pending',
            price: price,
            postTitle: postTitle || (type === 'ambulance' ? 'জরুরি অ্যাম্বুলেন্স' : `${type} Service`),
            createdAt: new Date().toISOString(),
            details: details,
            pickup: isAmbulanceBooking ? pickupStr : null,
            destination: isAmbulanceBooking ? destStr : null
          });

          // 2. Deduct & Record Transaction
          transaction.update(walletRef, {
            balance: increment(-price),
            updatedAt: new Date().toISOString()
          });

          // Distribute multi-level commissions
          const adminNetProfit = await distributeCommissions(
            transaction,
            user.uid,
            price,
            adminUid,
            `Service Request ${requestRef.id} (${type})`
          );

          // Give remaining to admin
          const adminWalletRef = doc(db, 'wallets', adminUid);
          transaction.set(adminWalletRef, {
            uid: adminUid,
            balance: increment(adminNetProfit),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          const txRef = doc(collection(db, 'transactions'));
          transaction.set(txRef, {
            userId: user.uid,
            amount: price,
            type: 'payment',
            status: 'success',
            targetId: requestRef.id,
            targetName: targetProviderName,
            details: details,
            createdAt: new Date().toISOString()
          });
        });
      } else {
        await addDoc(collection(db, 'serviceRequests'), {
          userId: user.uid,
          userName: (user as any).name || (user as any).displayName || user.displayName || user.email,
          userLocation: isAmbulanceBooking ? pickupStr : ((user as any).location || 'Unknown'),
          userDivision: isAmbulanceBooking ? pickupDivision : null,
          userDistrict: isAmbulanceBooking ? pickupDistrict : null,
          providerId: targetProviderId,
          providerName: targetProviderName,
          hospitalName: targetProviderName,
          providerType: type,
          providerEmail: providerEmail.toLowerCase().trim(),
          status: 'pending',
          price: price, // Added price field
          postTitle: postTitle || (type === 'ambulance' ? 'জরুরি অ্যাম্বুলেন্স' : `${type} Service`),
          createdAt: new Date().toISOString(),
          details: details,
          pickup: isAmbulanceBooking ? pickupStr : null,
          destination: isAmbulanceBooking ? destStr : null
        });
      }

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedGlobalService(null);
      }, 2000);
    } catch (error: any) {
      console.error("Booking error details:", error);
      
      // Use standard firestore error handler for debugging
      try {
        const OperationType = { WRITE: 'write' as any };
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: 'write',
          path: 'serviceRequests',
          authInfo: {
            userId: user.uid,
            email: user.email,
          }
        };
        console.error('Firestore Error context:', JSON.stringify(errInfo));
      } catch (e) { /* ignore */ }

      if (error.message === 'insufficient_balance') {
        alert('আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। দয়া করে টাকা যোগ করুন।');
      } else {
        alert("বুকিং করতে সমস্যা হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন বা ওয়ালেট চেক করে আবার চেষ্টা করুন।");
      }
      setBookingStatus('idle');
    }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("আপনার ব্রাউজার জিওলোকেশন সাপোর্ট করে না।");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use Nominatim for free reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          );
          const data = await response.json();
          
          let locationString = "";
          let division = "";
          let district = "";
          let thana = "";

          if (data.address) {
            const addr = data.address;
            division = addr.state || "";
            district = addr.county || addr.city || addr.district || "";
            thana = addr.town || addr.village || addr.suburb || "";
            locationString = `${thana}, ${district}, ${division}`.replace(/^, |, $/g, '');
          } else {
            locationString = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
          
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), {
              location: locationString,
              division,
              district,
              thana,
              lat: latitude,
              lng: longitude,
              address: data.display_name || '',
              updatedAt: new Date().toISOString()
            });
            alert(`আপনার এলাকা সেট করা হয়েছে: ${locationString}`);
            window.location.reload(); // Reload to refresh user context
          }
        } catch (error) {
          console.error("Error saving location:", error);
          alert("লোকেশন সেভ করতে সমস্যা হয়েছে।");
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        setDetectingLocation(false);
        console.error("Geolocation error:", error);
        alert("লোকেশন অ্যাক্সেস করা সম্ভব হয়নি। দয়া করে পারমিশন চেক করুন।");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDivision = !selectedDivision || (p as any).division === selectedDivision;
    const matchesDistrict = !selectedDistrict || (p as any).district === selectedDistrict;
    return matchesSearch && matchesDivision && matchesDistrict;
  });

  const filteredGlobalServices = globalServices.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllPosts = allProviderPosts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.providerName?.toLowerCase().includes(searchQuery.toLowerCase());
    const provider = providers.find(prov => prov.id === p.providerId || prov.id === `u_${p.providerId}`);
    const matchesDivision = !selectedDivision || (provider as any)?.division === selectedDivision;
    const matchesDistrict = !selectedDistrict || (provider as any)?.district === selectedDistrict;
    return matchesSearch && matchesDivision && matchesDistrict;
  });

  return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
            <img 
              src="https://i.postimg.cc/HWMYLkGG/Image.jpg" 
              alt="Shusto Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedDistrict('');
              }}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent"
            >
              <option value="">সকল বিভাগ</option>
              {BANGLADESH_LOCATIONS.map(l => (
                <option key={l.division} value={l.division}>{l.division}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedDivision}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent disabled:opacity-50"
            >
              <option value="">সকল জেলা</option>
              {selectedDivision && BANGLADESH_LOCATIONS.find(l => l.division === selectedDivision)?.districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {activeView !== 'ambulance_form' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={`সার্চ করুন...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-full md:w-64 font-sans"
              />
            </div>
          )}
        </div>
      </div>

      {/* View Switcher for Lab, Physio and Hospital */}
      {(type === 'lab' || type === 'physio' || type === 'hospital') && (
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 self-start shadow-sm mb-4">
          <button
            onClick={() => setActiveView('services')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
              activeView === 'services' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {type === 'hospital' ? 'বেড/সার্ভিস তালিকা' : 'সার্ভিস তালিকা'}
          </button>
          <button
            onClick={() => setActiveView('centers')}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
              activeView === 'centers' ? "bg-sky-500 text-white shadow-lg shadow-sky-500/20" : "text-slate-400 hover:text-slate-600"
            )}
          >
            {type === 'hospital' ? 'হাসপাতাল তালিকা' : 'সেন্টার তালিকা'}
          </button>
        </div>
      )}

      {user && !(user as any).location && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex flex-col md:flex-row items-center gap-6 text-amber-800 animate-in fade-in slide-in-from-top-2">
           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
             <MapPin size={24} />
           </div>
           <div className="flex-1 text-center md:text-left">
             <p className="font-bold mb-1">এলাকা (Area) সেট করা নেই</p>
             <p className="text-sm opacity-80">
               আপনার প্রোফাইল থেকে এলাকা সেট করুন যাতে আপনার নিকটবর্তী প্রোভাইডাররা সার্ভিস অনুরোধটি দ্রুত দেখতে পায়।
             </p>
           </div>
           <button 
             onClick={detectLocation}
             disabled={detectingLocation}
             className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
           >
             {detectingLocation ? (
               <>লোডিং...</>
             ) : (
               <>
                 <Navigation size={18} />
                 লোকেশন ডিটেক্ট করুন
               </>
             )}
           </button>
        </div>
      )}

      {/* Ambulance Direct Booking View */}
      {type === 'ambulance' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center">
                  <Navigation size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">অ্যাম্বুলেন্স বুক করুন</h3>
                  <p className="text-slate-400">সরাসরি লোকেশন সিলেক্ট করে জেনুইন প্রাইসে অ্যাম্বুলেন্স দ্রুত ডাকুন।</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Pickup Section */}
                <div className="space-y-4 p-6 bg-white/5 rounded-[32px] border border-white/10 relative z-30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center">
                      <MapPin size={18} />
                    </div>
                    <label className="text-sm font-bold text-slate-100">পিকআপ লোকেশন (Pickup)</label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={pickupDivision} 
                      onChange={(e) => { setPickupDivision(e.target.value); setPickupDistrict(''); }}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none text-xs font-bold text-white"
                    >
                      <option value="" className="text-slate-900">বিভাগ নির্বাচন করুন</option>
                      {BANGLADESH_LOCATIONS.map(l => (
                        <option key={l.division} value={l.division} className="text-slate-900">{l.division}</option>
                      ))}
                    </select>
                    
                    <select 
                      value={pickupDistrict} 
                      onChange={(e) => { setPickupDistrict(e.target.value); setPickupThana(''); }}
                      disabled={!pickupDivision}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none text-xs font-bold text-white disabled:opacity-30"
                    >
                      <option value="" className="text-slate-900">জেলা</option>
                      {pickupDivision && BANGLADESH_LOCATIONS.find(l => l.division === pickupDivision)?.districts.map(d => (
                        <option key={d} value={d} className="text-slate-900">{d}</option>
                      ))}
                    </select>

                    {DISTRICT_THANAS[pickupDistrict] && (
                      <select 
                        value={pickupThana}
                        onChange={(e) => setPickupThana(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none text-xs font-bold text-white md:col-span-2"
                      >
                        <option value="" className="text-slate-900">থানা নির্বাচন করুন</option>
                        {DISTRICT_THANAS[pickupDistrict].map(thana => (
                          <option key={thana} value={thana} className="text-slate-900">{thana}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <PlacesAutocomplete 
                    placeholder="পিকআপ এলাকা বা গ্রাম সার্চ করুন (নির্ভুল ভাড়ার জন্য)..." 
                    onPlaceSelected={(place) => {
                      setPickupPlace(place);
                      if (place?.formatted_address) {
                        setPickupGram(place.formatted_address);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">সার্চ ব্যবহার করলে প্রতি কিমি ৪৯ টাকা হিসেবে ভাড়া হিসাব হবে</p>
                  </div>
                </div>
                
                {/* Destination Section */}
                <div className="space-y-4 p-6 bg-white/5 rounded-[32px] border border-white/10 relative z-30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center">
                      <Navigation size={18} />
                    </div>
                    <label className="text-sm font-bold text-slate-100">গন্তব্যস্থল (Destination)</label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select 
                      value={destinationDivision} 
                      onChange={(e) => { setDestinationDivision(e.target.value); setDestinationDistrict(''); }}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold text-white"
                    >
                      <option value="" className="text-slate-900">বিভাগ নির্বাচন করুন</option>
                      {BANGLADESH_LOCATIONS.map(l => (
                        <option key={l.division} value={l.division} className="text-slate-900">{l.division}</option>
                      ))}
                    </select>
                    
                    <select 
                      value={destinationDistrict} 
                      onChange={(e) => { setDestinationDistrict(e.target.value); setDestinationThana(''); }}
                      disabled={!destinationDivision}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold text-white disabled:opacity-30"
                    >
                      <option value="" className="text-slate-900">জেলা</option>
                      {destinationDivision && BANGLADESH_LOCATIONS.find(l => l.division === destinationDivision)?.districts.map(d => (
                        <option key={d} value={d} className="text-slate-900">{d}</option>
                      ))}
                    </select>

                    {DISTRICT_THANAS[destinationDistrict] && (
                      <select 
                        value={destinationThana}
                        onChange={(e) => setDestinationThana(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold text-white md:col-span-2"
                      >
                        <option value="" className="text-slate-900">থানা নির্বাচন করুন</option>
                        {DISTRICT_THANAS[destinationDistrict].map(thana => (
                          <option key={thana} value={thana} className="text-slate-900">{thana}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <PlacesAutocomplete 
                    placeholder="গন্তব্যস্থল বা হাসপাতাল সার্চ করুন..." 
                    onPlaceSelected={(place) => {
                      setDestinationPlace(place);
                      if (place?.formatted_address) {
                        setDestinationGram(place.formatted_address);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">যেকোনো নির্দিষ্ট হাসপাতাল বা পয়েন্ট সিলেক্ট করুন</p>
                  </div>
                </div>
              </div>

              {ambulancePrice > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
                  <div className="bg-sky-500/20 border border-sky-500/30 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-1">Genuine Price (Shusto Identity)</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">৳{ambulancePrice}</span>
                        <span className="text-slate-400 text-sm">/ নির্ধারিত ভাড়া</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">দূরত্ব: <span className="text-white font-bold">{ambulanceDistance} কিমি</span></p>
                      {ambulanceToll > 0 && (
                        <p className="text-xs text-slate-400">টোল: <span className="text-white font-bold">৳{ambulanceToll} ({ambulanceTollDetails})</span></p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 relative z-20 overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <CheckCircle size={80} className="text-sky-400" />
                    </div>
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                       <Truck className="text-sky-400" size={20} />
                       ভাড়া নির্ধারণ সমীকরণ (Fare Calculation Equation)
                    </h4>
                    
                    <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-700/60 mb-6 font-mono text-center text-sm md:text-base text-sky-300">
                      <span className="text-slate-400">সমীকরণ:</span> <span className="font-bold text-white">মোট ভাড়া = বেস ভাড়া ({toBengaliNumber(ambulanceBaseFare)}৳) + (দূরত্ব × ৪৯৳/কিমি) + টোল</span>
                    </div>

                    <div className="space-y-3 mb-6">
                       <div className="flex justify-between items-center text-sm p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
                          <span className="text-slate-400">বেস ভাড়া (Base Fare)</span>
                          <span className="text-slate-200 font-bold">৳{ambulanceBaseFare}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
                          <span className="text-slate-400">দূরত্ব ভিত্তিক ভাড়া (Distance Fare)</span>
                          <span className="text-slate-200 font-bold">৳{ambulanceFarePart} <span className="text-xs text-slate-500 font-normal">({ambulanceDistance} কিমি × ৪৯৳)</span></span>
                       </div>
                       <div className="flex justify-between items-center text-sm p-3 bg-slate-900/40 rounded-xl border border-slate-700/50">
                          <span className="text-slate-400">টোল/ফেরি খরচ (Toll Fees)</span>
                          <span className="text-slate-200 font-bold">{ambulanceToll > 0 ? `৳${ambulanceToll} (${ambulanceTollDetails})` : '৳০'}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm p-3 bg-sky-500/10 rounded-xl border border-sky-500/20">
                          <span className="text-sky-300 font-bold">সর্বমোট হিসাবকৃত ভাড়া (Total Fare)</span>
                          <span className="text-sky-300 font-black text-lg">৳{ambulancePrice}</span>
                       </div>
                    </div>

                    <div className="bg-sky-500/10 p-4 rounded-2xl border border-sky-500/20 mb-6">
                       <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest mb-1">Standard Rates Policy</p>
                       <ul className="text-[11px] text-slate-400 space-y-1">
                          <li>• আমরা সরকারি নীতিমালা ও ব্যবহারকারীর শিট অনুযায়ী সঠিক ভাড়া ১০০% নির্ভুল ক্যালকুলেট করি।</li>
                          <li>• কোনো অতিরিক্ত লুকানো চার্জ বা দরদাম করার ঝামেলা নেই।</li>
                          <li>• রোগী বা রোগীর অভিভাবক সরাসরি বুক করে নিরাপদ সেবা নিশ্চিত করতে পারেন।</li>
                       </ul>
                    </div>

                    <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-300">
                       উপলব্ধ অ্যাম্বুলেন্সসমূহ
                    </h4>
                    
                    {providers.length === 0 ? (
                      <div className="text-center p-6 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 text-slate-400">
                        এই মুহূর্তে কোনো অ্যাম্বুলেন্স পাওয়া যাচ্ছে না।
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {providers.map(provider => (
                          <div key={provider.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between hover:border-sky-500/30 transition-colors group">
                            <div className="mb-4">
                              <h5 className="font-bold text-slate-100 flex items-center gap-2">
                                {provider.name}
                                <span className="bg-sky-500/20 text-sky-400 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Available</span>
                              </h5>
                              <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1.5">
                                <MapPin size={12} /> {provider.lastLocation || provider.location}
                              </p>
                              {provider.updatedAt && (
                                <p className="text-[10px] text-sky-500/60 mt-1">
                                  Last synced: {new Date(provider.updatedAt).toLocaleTimeString()}
                                </p>
                              )}
                              {/* Phone hidden for privacy as requested */}
                              <p className="text-slate-400 text-xs mt-1 flex items-center gap-1.5 italic">
                                <MessageCircle size={12} className="text-sky-400" /> Use chat after booking
                              </p>
                            </div>
                            <button 
                              onClick={() => handleBook(undefined, provider)}
                              disabled={bookingStatus !== 'idle'}
                              className="w-full py-2.5 bg-sky-500/10 text-sky-400 font-bold rounded-xl hover:bg-sky-500 hover:text-white transition-all disabled:opacity-50 disabled:grayscale group-hover:bg-sky-500 group-hover:text-white"
                            >
                              {bookingStatus === 'booking' && activeBookingId === provider.id ? 'লোডিং...' : bookingStatus === 'success' && activeBookingId === provider.id ? 'সফল হয়েছে!' : 'এই অ্যাম্বুলেন্সটি বুক করুন'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Truck size={300} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading...</div>
      ) : activeView === 'services' && (type === 'lab' || type === 'physio') ? (
        <div className="space-y-6">
          {filteredGlobalServices.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
              <Activity className="mx-auto mb-4 opacity-20" size={48} />
              <p className="font-bold text-slate-900 mb-1">কোনো সার্ভিস পাওয়া যায়নি</p>
              <p className="text-sm">সার্ভিসগুলো এখনো লোড হচ্ছে অথবা প্রোফাইল থেকে অ্যাড করা হয়নি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGlobalServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-white rounded-[32px] border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group overflow-hidden flex flex-col"
              >
                {service.image ? (
                  <div className="h-56 overflow-hidden relative">
                    <img src={service.image} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/90 backdrop-blur-md text-sky-600 font-black text-[10px] uppercase tracking-tighter px-3 py-1.5 rounded-full shadow-sm">
                        {service.category || type}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-56 bg-sky-50 flex items-center justify-center relative">
                    <Activity size={48} className="text-sky-200 animate-pulse" />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/90 backdrop-blur-md text-sky-600 font-black text-[10px] uppercase tracking-tighter px-3 py-1.5 rounded-full shadow-sm">
                        {service.category || type}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors leading-tight">{service.name}</h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed">
                      {service.description || `Professional ${type} service with verified specialists and high-quality equipment assistance.`}
                    </p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Standard Fee</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">৳{service.price}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedGlobalService(service)}
                      className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold text-sm hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/25 active:scale-95"
                    >
                      বুক করুন
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      ) : activeView === 'services' && (type === 'pharmacy' || type === 'hospital') ? (
        <div className="space-y-6">
          {filteredAllPosts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
              <Activity className="mx-auto mb-4 opacity-20" size={48} />
              <p className="font-bold text-slate-900 mb-1">এখনো কোনো সেবা বা পণ্য পাওয়া যায়নি।</p>
              <p className="text-sm">অনুগ্রহ করে পরে চেষ্টা করুন বা অন্য ক্যাটাগরি চেক করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredAllPosts.map((post) => {
                const provider = providers.find(prov => prov.id === post.providerId || prov.id === post.providerId.replace('u_', '') || `u_${post.providerId}` === prov.id);
                
                // Extremely robust name picking:
                const getBestName = (p: any, post?: any) => {
                  const proKeywords = ['hospital', 'clinic', 'medical', 'center', 'diagnostic', 'lab', 'physio', 'rehab', 'ambulance', 'হাসপাতাল', 'ক্লিনিক', 'ডায়াগনস্টিক', 'ফার্মেসী', 'সেবা'];
                  
                  const candidates = [
                    p?.hospitalName,
                    p?.labName,
                    p?.clinicName,
                    p?.name,
                    post?.hospitalName,
                    post?.providerName,
                    p?.displayName
                  ].filter(c => c && c !== 'User' && !c.includes('@') && !c.toLowerCase().includes('twitter') && !c.toLowerCase().includes('google'));

                  // 1. Look for professional names first
                  const proCandidate = candidates.find(c => proKeywords.some(k => c.toLowerCase().includes(k.toLowerCase())));
                  if (proCandidate) return proCandidate;

                  // 2. Look for any non-generic name
                  if (candidates.length > 0) return candidates[0];
                  
                  return p?.email || (type === 'hospital' ? 'Healthcare Center' : 'Pharmacy / Store');
                };

                const displayName = getBestName(provider, post);
                
                return (
                  <div key={post.id} className="bg-white rounded-[32px] border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group overflow-hidden flex flex-col">
                    {post.image && (
                      <div className="h-56 overflow-hidden relative">
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sky-600 font-black text-[10px] uppercase tracking-tighter bg-sky-50 px-2 py-0.5 rounded border border-sky-100/50">
                            Verified Provider
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-0.5 group-hover:text-sky-600 transition-colors line-clamp-1">
                          {displayName}
                        </h3>
                        <p className="text-sm font-bold text-sky-500 mb-3 uppercase tracking-wide">
                          {post.title}
                        </p>
                        <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{post.description}</p>
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-slate-50 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black text-sky-600 uppercase tracking-tighter mb-1">Genuine Price</p>
                          <p className="text-2xl font-black text-slate-900 leading-none">৳{post.price}</p>
                          {type === 'hospital' && ((post as any).bedLimit || (post as any).ccuLimit || (post as any).isICU || (post as any).isCCU) && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(post as any).bedLimit && <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded">Bed: {(post as any).bedLimit}</span>}
                              {(post as any).ccuLimit && <span className="text-[10px] text-slate-400 font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">CCU: {(post as any).ccuLimit}</span>}
                              {(post as any).isICU && <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">ICU Available</span>}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            const originalProvider = providers.find(p => p.id === post.providerId || p.id === `u_${post.providerId}`);
                            if (originalProvider) setSelectedProvider(originalProvider);
                            handleBook(post, originalProvider);
                          }}
                          disabled={bookingStatus !== 'idle'}
                          className="flex-1 py-4 bg-sky-500 text-white rounded-2xl font-bold text-sm hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {bookingStatus === 'booking' && activeBookingId === post.id ? 'লোডিং...' : (type === 'hospital' ? 'বুকিং রিকোয়েস্ট' : 'কিনুন')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeView === 'centers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200 text-slate-400">
              এই এলাকাতে এখনো কোনো সেন্টার পাওয়া যায়নি।
            </div>
          ) : (
            filteredProviders.map((provider) => (
              <div 
                key={provider.id} 
                className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    <MapPin size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {(() => {
                      const proKeywords = ['hospital', 'clinic', 'medical', 'center', 'diagnostic', 'lab', 'physio', 'rehab', 'ambulance', 'হাসপাতাল', 'ক্লিনিক', 'ডায়াগনস্টিক', 'ফার্মেসী', 'সেবা'];
                      const blacklist = ['user', 'twitter', 'google', 'creator', 'bluebird', 'anonymous'];
                      const candidates = [
                        (provider as any).hospitalName,
                        (provider as any).name,
                        provider.name,
                        provider.displayName
                      ].filter(c => c && !blacklist.some(b => c.toLowerCase().includes(b)) && !c.includes('@'));

                      const proCandidate = candidates.find(c => proKeywords.some(k => c.toLowerCase().includes(k)));
                      if (proCandidate) return proCandidate;
                      if (candidates.length > 0) return candidates[0];

                      return provider.email || 'Healthcare Center';
                    })()}
                  </h3>
                  <div className="space-y-2 mb-6">
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                       <MapPin size={14} className="text-sky-500" /> {provider.location}
                    </p>
                    {provider.contact && (
                      <p className="text-slate-500 text-sm flex items-center gap-2">
                         <Phone size={14} className="text-blue-500" /> {provider.contact}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedProvider(provider)}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  বিস্তারিত দেখুন <ExternalLink size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

              {/* Global Service Booking Modal */}
              {selectedGlobalService && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-slate-100">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">সার্ভিস বুকিং</h2>
                <button onClick={() => setSelectedGlobalService(null)} className="p-2 hover:bg-slate-50 rounded-xl">
                  <X size={24} className="text-slate-400" />
                </button>
             </div>

             <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
                <p className="text-sky-600 font-black text-[10px] uppercase tracking-tighter mb-1">{selectedGlobalService.category}</p>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{selectedGlobalService.name}</h3>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-slate-500 font-medium font-sans">Total Price</span>
                  <span className="text-3xl font-black text-sky-600">৳{selectedGlobalService.price}</span>
                </div>
             </div>

             {nearestCenter ? (
                <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 mb-6 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">আপনার নিকটবর্তী {type === 'lab' ? 'ল্যাব' : 'সেন্টার'}</p>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-900">
                      {(() => {
                        const n = (nearestCenter as any).hospitalName || nearestCenter.name || '';
                        if (n && n !== 'User' && !n.includes('@') && !n.toLowerCase().includes('twitter')) return n;
                        return nearestCenter.email || 'Healthcare Center';
                      })()}
                    </div>
                    <div className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full">Nearest</div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{nearestCenter.thana || 'Unknown'}, {nearestCenter.district || 'Unknown'}</p>
                </div>
              ) : (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 text-amber-800 text-xs font-bold text-center">
                  নিকটবর্তী কোনো সেন্টার খুঁজে পাওয়া যায়নি। আপনার বুকিং সাধারণ অনুরোধ হিসেবে পাঠানো হবে।
                </div>
              )}

             <div className="flex flex-col gap-3">
               {/* TEMPORARILY DISABLED FOR TESTING
               {walletBalance !== null && walletBalance < selectedGlobalService.price && (
                 <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                   <XCircle size={16} />
                   <span className="text-xs font-bold">আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই</span>
                 </div>
               )}
               */}
               <button 
                 onClick={() => handleBook(selectedGlobalService, nearestCenter)}
                 disabled={bookingStatus !== 'idle'}
                 className="w-full py-5 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-600 shadow-2xl shadow-sky-500/40 transition-all disabled:opacity-50 disabled:grayscale"
               >
                 {bookingStatus === 'booking' && activeBookingId === selectedGlobalService.id ? 'প্রসেসিং হচ্ছে...' : bookingStatus === 'success' && activeBookingId === selectedGlobalService.id ? 'বুকিং সফল হয়েছে!' : 'বুকিং কনফার্ম করুন'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Provider Details Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <MapPin size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {(() => {
                      const n = (selectedProvider as any).hospitalName || selectedProvider.name || '';
                      if (n && n !== 'User' && !n.includes('@') && !n.toLowerCase().includes('twitter')) return n;
                      return selectedProvider.email || 'Healthcare Center';
                    })()}
                  </h2>
                  <p className="text-slate-500 text-sm">{selectedProvider.location}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProvider(null)} className="p-2 hover:bg-white rounded-xl transition-colors">
                <XCircle size={32} className="text-slate-300 hover:text-red-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {type === 'ambulance' ? (
                <div className="mb-8">
                   <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden mb-8">
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                          <Navigation size={24} className="text-sky-400" />
                          লোকেশন সেট করুন
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Pickup Section */}
                          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">পিকআপ লোকেশন</label>
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                value={pickupDivision} 
                                onChange={(e) => { setPickupDivision(e.target.value); setPickupDistrict(''); }}
                                className="w-full px-3 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold"
                              >
                                <option value="" className="text-slate-900">বিভাগ</option>
                                {BANGLADESH_LOCATIONS.map(l => (
                                  <option key={l.division} value={l.division} className="text-slate-900">{l.division}</option>
                                ))}
                              </select>
                              <select 
                                value={pickupDistrict} 
                                onChange={(e) => setPickupDistrict(e.target.value)}
                                disabled={!pickupDivision}
                                className="w-full px-3 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold disabled:opacity-30"
                              >
                                <option value="" className="text-slate-900">জেলা</option>
                                {pickupDivision && BANGLADESH_LOCATIONS.find(l => l.division === pickupDivision)?.districts.map(d => (
                                  <option key={d} value={d} className="text-slate-900">{d}</option>
                                ))}
                              </select>
                            </div>
                            <input 
                              type="text" 
                              placeholder="থানা / নির্দিষ্ট এলাকা" 
                              value={pickupThana}
                              onChange={(e) => setPickupThana(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold"
                            />
                          </div>

                          {/* Destination Section */}
                          <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">গন্তব্যস্থল</label>
                            <div className="grid grid-cols-2 gap-2">
                              <select 
                                value={destinationDivision} 
                                onChange={(e) => { setDestinationDivision(e.target.value); setDestinationDistrict(''); }}
                                className="w-full px-3 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold"
                              >
                                <option value="" className="text-slate-900">বিভাগ</option>
                                {BANGLADESH_LOCATIONS.map(l => (
                                  <option key={l.division} value={l.division} className="text-slate-900">{l.division}</option>
                                ))}
                              </select>
                              <select 
                                value={destinationDistrict} 
                                onChange={(e) => setDestinationDistrict(e.target.value)}
                                disabled={!destinationDivision}
                                className="w-full px-3 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold disabled:opacity-30"
                              >
                                <option value="" className="text-slate-900">জেলা</option>
                                {destinationDivision && BANGLADESH_LOCATIONS.find(l => l.division === destinationDivision)?.districts.map(d => (
                                  <option key={d} value={d} className="text-slate-900">{d}</option>
                                ))}
                              </select>
                            </div>
                            <input 
                              type="text" 
                              placeholder="থানা / নির্দিষ্ট এলাকা" 
                              value={destinationThana}
                              onChange={(e) => setDestinationThana(e.target.value)}
                              className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:bg-white/20 focus:outline-none text-xs font-bold"
                            />
                          </div>
                        </div>

                        {calculatingDistance && (
                          <div className="bg-sky-500/10 border border-sky-500/20 p-6 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
                            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sky-500 font-bold">ভাড়া হিসাব করা হচ্ছে (Google Maps)...</p>
                          </div>
                        )}

                        {!calculatingDistance && (pickupDistrict || destinationDistrict) && ambulancePrice === 0 && (
                           <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-center justify-center gap-3">
                            <p className="text-amber-500 font-bold text-sm text-center">
                              লোকেশন নির্ভুলভাবে শনাক্ত করা হচ্ছে... <br/>
                              <span className="text-[10px] font-normal">দয়া করে থানা/এলাকা সঠিকভাবে লিখুন।</span>
                            </p>
                          </div>
                        )}

                        {!calculatingDistance && ambulancePrice > 0 && (() => {
                          const details = getAmbulancePriceDetails();
                          return (
                            <div className="bg-sky-500/20 border border-sky-500/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest">
                                    {details.isEstimate ? "SHUSTO FARE ESTIMATE" : "SHUSTO REAL-TIME FARE"}
                                  </p>
                                  {ambulanceDistance > 0 && (
                                    <span className="bg-sky-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                      {ambulanceDistance} KM
                                    </span>
                                  )}
                                  {details.isEstimate && (
                                    <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                      আনুমানিক
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <p className="text-4xl font-black">৳{ambulancePrice}</p>
                                  <span className="text-sky-400/60 text-xs font-bold">@ ৳49/km</span>
                                </div>
                                <p className="text-[9px] text-sky-400/80 font-bold mt-1">
                                  {details.isEstimate 
                                    ? "গুগল ম্যাপ কাজ না করায় ডাটাবেজ থেকে আনুমানিক দূরত্ব ধরা হয়েছে।" 
                                    : "ভাড়া হিসাব করা হয়েছে গুগল ম্যাপের নির্ভুল দূরত্ব অনুযায়ী।"}
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                              {/* TEMPORARILY DISABLED FOR TESTING
                              {walletBalance !== null && walletBalance < ambulancePrice && (
                                <div className="flex items-center gap-1.5 text-rose-400 bg-rose-400/10 px-3 py-1.5 rounded-lg border border-rose-400/20">
                                  <XCircle size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-tight">আপনার টাকা নেই</span>
                                </div>
                              )}
                              */}
                              <p className="text-xs text-white/60 font-medium">নিশ্চিত প্রাইস, কোন লুকানো খরচ নেই</p>
                              <button 
                                onClick={() => handleBook(undefined, selectedProvider)}
                                disabled={bookingStatus !== 'idle'}
                                className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-sky-50 transition-all shadow-xl disabled:opacity-50 disabled:grayscale"
                              >
                                {bookingStatus === 'booking' && activeBookingId === selectedProvider.id ? 'লোডিং...' : bookingStatus === 'success' && activeBookingId === selectedProvider.id ? 'সফল!' : 'বুক করুন'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      </div>
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Navigation size={150} />
                      </div>
                   </div>
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{selectedProvider.name} - এর সেবাসমূহ</h3>
                  {loadingPosts ? (
                    <div className="text-center py-12 text-slate-400">সেবা লোড হচ্ছে...</div>
                  ) : providerPosts.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400">
                      এই প্রোভাইডার এখনো কোনো পোস্ট বা পণ্য তালিকাভুক্ত করেনি।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {providerPosts.map((post) => (
                        <div key={post.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex gap-4 hover:shadow-lg transition-all">
                          {post.image && (
                            <img src={post.image} alt={post.title} className="w-24 h-24 object-cover rounded-2xl flex-shrink-0" />
                          )}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900">{post.title}</h4>
                              <p className="text-slate-500 text-xs line-clamp-2 mb-2">{post.description}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-auto">
                              <div className="flex flex-wrap items-center gap-2">
                                {post.price && (
                                  <span className="text-sky-600 font-bold text-sm shadow-sm bg-sky-50 px-2 py-1 rounded-lg">৳{post.price}</span>
                                )}
                                {post.bedLimit && (
                                  <span className="text-amber-600 font-black text-[10px] uppercase shadow-sm bg-amber-50 px-2 py-1 rounded-lg">
                                    {post.bedLimit} Beds
                                  </span>
                                )}
                                {post.ccuLimit && (
                                  <span className="text-blue-600 font-black text-[10px] uppercase shadow-sm bg-blue-50 px-2 py-1 rounded-lg">
                                    {post.ccuLimit} CCU
                                  </span>
                                )}
                                {post.isICU && (
                                  <span className="text-rose-600 font-black text-[10px] uppercase shadow-sm bg-rose-50 px-2 py-1 rounded-lg animate-pulse">
                                    ICU
                                  </span>
                                )}
                                {post.isCCU && (
                                  <span className="text-indigo-600 font-black text-[10px] uppercase shadow-sm bg-indigo-50 px-2 py-1 rounded-lg">
                                    CCU
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => handleBook(post)}
                                disabled={bookingStatus !== 'idle'}
                                className="px-4 py-1.5 bg-sky-50 text-sky-600 text-xs font-bold rounded-lg hover:bg-sky-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                {bookingStatus === 'booking' && activeBookingId === post.id ? 'লোডিং...' : bookingStatus === 'success' && activeBookingId === post.id ? 'সফল!' : 'বুক করুন'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-sky-50 p-8 rounded-[32px] border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold text-sky-900 mb-1">অন্য কিছু প্রয়োজন?</h3>
                  <p className="text-sky-700/70 text-sm">সরাসরি প্রোভাইডারের সাথে যোগাযোগ করুন অথবা একটি সাধারণ অনুরোধ পাঠান।</p>
                </div>
                <div className="flex gap-3">
                  <a 
                    href={`tel:${selectedProvider.contact}`}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-sky-600 font-bold rounded-xl hover:bg-sky-50 transition-all shadow-sm"
                  >
                    <Phone size={18} />
                    কল করুন
                  </a>
                  <button 
                    onClick={() => handleBook()}
                    disabled={bookingStatus !== 'idle'}
                    className="flex items-center gap-2 px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
                  >
                    {bookingStatus === 'booking' && activeBookingId === (selectedProvider?.id || 'general') ? 'পাঠানো হচ্ছে...' : bookingStatus === 'success' && activeBookingId === (selectedProvider?.id || 'general') ? 'অনুরোধ পাঠানো হয়েছে!' : 'অনুরোধ পাঠান'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}
