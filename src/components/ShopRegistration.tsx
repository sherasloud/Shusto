import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, ShoppingBag, AlertCircle, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export function ShopRegistration() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [checkingShop, setCheckingShop] = useState(true);
  
  // Product state
  const [productData, setProductData] = useState({
    name: '',
    price: '',
    description: '',
    image: ''
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if user already has an assigned shop
    const q = query(collection(db, 'shop_requests'), where('userId', '==', user.uid), where('status', '==', 'approved'));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const shopData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setShop(shopData);
        
        // Load products for this shop with clean unmount
        const prodQ = query(collection(db, 'products'), where('shopId', '==', shopData.id));
        const prodUnsub = onSnapshot(prodQ, (prodSnap) => {
          setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
          console.warn("Products snapshot warning:", err);
        });
        
        return () => prodUnsub();
      } else {
        setShop(null);
      }
      setCheckingShop(false);
    }, (err) => {
      console.warn("Shop request snapshot warning:", err);
      setCheckingShop(false);
    });

    return () => unsub();
  }, [user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'products'), {
        ...productData,
        shopId: shop.id,
        shopName: shop.shopName,
        createdAt: new Date().toISOString()
      });
      setProductData({ name: '', price: '', description: '', image: '' });
      alert("প্রোডাক্ট যোগ করা হয়েছে!");
    } catch (err) {
      alert("প্রোডাক্ট যোগ করা সম্ভব হয়নি।");
    } finally {
      setLoading(false);
    }
  };

  if (checkingShop) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
      </div>
    );
  }

  // No Shop assigned view
  if (!shop) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6 mt-12">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
          <Store className="text-slate-300" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">কোন শপ পাওয়া যায়নি</h2>
        <p className="text-slate-500 font-medium leading-relaxed">
          আপনার অ্যাকাউন্টের সাথে কোনো শপ যুক্ত নেই। <br />
          শপ যোগ করতে চাইলে অ্যাডমিনের সাথে যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  // Approved Shop View (Management)
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center">
            <Store className="text-sky-500" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{shop.shopName}</h2>
            <p className="text-slate-500 font-medium">{shop.category} • {shop.address}</p>
          </div>
        </div>
        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-100">
          Active Shop
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Product Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm sticky top-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShoppingBag className="text-sky-500" size={20} /> নতুন প্রোডাক্ট যোগ করুন
            </h3>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">প্রোডাক্টের নাম</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                  value={productData.name}
                  onChange={(e) => setProductData({...productData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">দাম (TK)</label>
                <input 
                  required
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                  value={productData.price}
                  onChange={(e) => setProductData({...productData, price: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-1">বর্ণনা</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500 text-sm font-medium resize-none"
                  rows={3}
                  value={productData.description}
                  onChange={(e) => setProductData({...productData, description: e.target.value})}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full py-4 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition-all disabled:opacity-50"
              >
                {loading ? "যোগ হচ্ছে..." : "প্রোডাক্ট যোগ করুন"}
              </button>
            </form>
          </div>
        </div>

        {/* Product List */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-900">আপনার প্রোডাক্টসমূহ ({products.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((prod) => (
              <motion.div 
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={prod.id}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{prod.name}</h4>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{prod.description}</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-black text-sky-500">৳{prod.price}</span>
                  <button className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors">
                    <AlertCircle size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">কোন প্রোডাক্ট পাওয়া যায়নি। বাম পাশের ফর্ম থেকে প্রোডাক্ট যোগ করুন।</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
