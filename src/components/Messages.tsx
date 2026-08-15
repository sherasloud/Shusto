import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MessageCircle, Clock, User, Package, Stethoscope, Truck, Building, Activity, FlaskConical, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatWindow } from './ChatWindow';

interface Conversation {
  id: string;
  type: 'appointment' | 'request' | 'order' | 'lab';
  title: string;
  subtitle: string;
  lastMessage?: string;
  lastMessageAt?: string;
  recipientName: string;
  recipientId: string;
  status: string;
}

export function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'appointment' | 'order' | 'request'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    // Collections to monitor for conversations
    const collections = [
      { name: 'serviceRequests', userField: 'userId', providerField: 'providerId' },
      { name: 'appointments', userField: 'userId', providerField: 'targetId' },
      { name: 'orders', userField: 'userId', providerField: 'providerId' },
      { name: 'labOrders', userField: 'userId', providerField: 'providerId' }
    ];

    const allConvs: { [key: string]: Conversation } = {};

    collections.forEach(coll => {
      // Query as User
      const qUser = query(collection(db, coll.name), where(coll.userField, '==', user.uid));
      const unsubUser = onSnapshot(qUser, (snapshot) => {
        snapshot.docs.forEach(d => {
          const data = d.data();
          allConvs[d.id] = {
            id: d.id,
            type: coll.name === 'appointments' ? 'appointment' : 
                  coll.name === 'orders' ? 'order' : 
                  coll.name === 'labOrders' ? 'lab' : 'request',
            title: data.providerName || data.doctorName || data.testName || (coll.name === 'orders' ? 'Pharmacy' : 'Service'),
            subtitle: data.postTitle || data.details || (data.items ? data.items.join(', ') : ''),
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
            recipientName: data.providerName || data.doctorName || 'Admin',
            recipientId: data.providerId || data.targetId || 'admin',
            status: data.status
          };
        });
        updateList();
      }, (err) => console.warn(`Messages ${coll.name} user error:`, err));
      unsubscribes.push(unsubUser);

      // Query as Provider (by UID)
      const qProvider = query(collection(db, coll.name), where(coll.providerField, '==', user.uid));
      const unsubProvider = onSnapshot(qProvider, (snapshot) => {
        snapshot.docs.forEach(d => {
          const data = d.data();
          allConvs[d.id] = {
            id: d.id,
            type: coll.name === 'appointments' ? 'appointment' : 
                  coll.name === 'orders' ? 'order' : 
                  coll.name === 'labOrders' ? 'lab' : 'request',
            title: data.userName || 'Customer',
            subtitle: data.postTitle || data.details || (data.items ? data.items.join(', ') : ''),
            lastMessage: data.lastMessage,
            lastMessageAt: data.lastMessageAt,
            recipientName: data.userName || 'Customer',
            recipientId: data.userId,
            status: data.status
          };
        });
        updateList();
      }, (err) => console.warn(`Messages ${coll.name} provider error:`, err));
      unsubscribes.push(unsubProvider);

      // FALLBACK: Query as Provider by Email (for manual/email-linked accounts)
      if (user.email) {
        // We look for 'providerEmail' or 'doctorEmail' depending on collection
        const emailField = coll.name === 'appointments' ? 'doctorEmail' : 'providerEmail';
        const qEmail = query(collection(db, coll.name), where(emailField, '==', user.email.toLowerCase().trim()));
        const unsubEmail = onSnapshot(qEmail, (snapshot) => {
          snapshot.docs.forEach(d => {
            const data = d.data();
            // Only add if not already present or if we need to sync userId
            if (!allConvs[d.id]) {
              allConvs[d.id] = {
                id: d.id,
                type: coll.name === 'appointments' ? 'appointment' : 
                      coll.name === 'orders' ? 'order' : 
                      coll.name === 'labOrders' ? 'lab' : 'request',
                title: data.userName || 'Customer',
                subtitle: data.postTitle || data.details || (data.items ? data.items.join(', ') : ''),
                lastMessage: data.lastMessage,
                lastMessageAt: data.lastMessageAt,
                recipientName: data.userName || 'Customer',
                recipientId: data.userId,
                status: data.status
              };
              // Auto-sync: if this is me and providerField is missing my UID, update it
              if (data[coll.providerField] !== user.uid) {
                updateDoc(doc(db, coll.name, d.id), { [coll.providerField]: user.uid }).catch(console.error);
              }
            }
          });
          updateList();
        }, (err) => console.warn(`Messages ${coll.name} email error:`, err));
        unsubscribes.push(unsubEmail);
      }
    });

    function updateList() {
      // Deduplicate by normalized recipientId to ensure "1 profile = 1 chat profile"
      const deduped: { [key: string]: Conversation } = {};
      
      Object.values(allConvs).forEach(conv => {
        // Normalize IDs to handle u_UID vs UID inconsistencies
        const normalizedId = conv.recipientId.startsWith('u_') ? conv.recipientId.substring(2) : conv.recipientId;
        const existing = deduped[normalizedId];
        if (!existing) {
          deduped[normalizedId] = conv;
        } else {
          // Keep the one with the more recent message
          const timeA = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
          const timeB = existing.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
          if (timeA > timeB) {
            deduped[normalizedId] = conv;
          }
        }
      });

      const sorted = Object.values(deduped)
        .filter(c => c.lastMessage || c.status === 'confirmed' || c.status === 'pending')
        .sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
      setConversations(sorted);
      setLoading(false);
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const getIcon = (type: string) => {
    switch(type) {
      case 'appointment': return <Stethoscope size={20} />;
      case 'order': return <Package size={20} />;
      case 'lab': return <FlaskConical size={20} />;
      default: return <Activity size={20} />;
    }
  };

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.recipientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">মেসেজ</h1>
          <p className="text-slate-500 font-medium">আপনার সকল চ্যাট এবং কথা এখানে পাবেন।</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="চ্যাট খুঁজুন..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 w-full md:w-64 shadow-sm"
            />
          </div>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="all">সব টাইপ</option>
            <option value="appointment">অ্যাপয়েন্টমেন্ট</option>
            <option value="order">অর্ডার</option>
            <option value="request">অনুরোধ</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="all">সব স্ট্যাটাস</option>
            <option value="pending">পেন্ডিং</option>
            <option value="confirmed">কনফার্মড</option>
            <option value="completed">কমপ্লিটেড</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Chat List */}
        <div className={cn(
          "w-full md:w-80 border-r border-slate-100 overflow-y-auto",
          activeChat ? "hidden md:block" : "block"
        )}>
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading messages...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-4">
              <MessageCircle size={48} className="opacity-20" />
              <p>কোনো চ্যাট পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveChat(conv)}
                  className={cn(
                    "w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-all text-left",
                    activeChat?.id === conv.id ? "bg-sky-50 shadow-inner" : ""
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center relative",
                    conv.type === 'appointment' ? "bg-indigo-50 text-indigo-500" :
                    conv.type === 'order' ? "bg-emerald-50 text-emerald-500" :
                    conv.type === 'lab' ? "bg-purple-50 text-purple-500" : "bg-sky-50 text-sky-500"
                  )}>
                    {getIcon(conv.type)}
                    <span className={cn(
                      "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                      conv.status === 'confirmed' ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-slate-900 truncate">{conv.title}</h4>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate font-medium">
                      {conv.lastMessage || conv.subtitle || 'Start chatting...'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-slate-50/30 flex flex-col items-center justify-center relative">
          {activeChat ? (
            <div className="absolute inset-0 flex flex-col animate-in fade-in duration-300">
               {/* Mobile Back Button (would be needed if we hide list on mobile, but keeping it simple for now) */}
               <ChatWindow 
                 orderId={activeChat.id} 
                 recipientName={activeChat.recipientName} 
                 onClose={() => setActiveChat(null)} 
                 isInline={true}
               />
               {/* We wrap ChatWindow but ChatWindow is fixed bottom right by default. 
                   I should probably modify ChatWindow to support "inline" mode.
               */}
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50">
                <MessageCircle size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">বাম পাশ থেকে একটি চ্যাট সিলেক্ট করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
