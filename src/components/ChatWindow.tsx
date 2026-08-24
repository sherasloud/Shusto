import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, orderBy, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Send, X, User, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface ChatWindowProps {
  orderId: string;
  onClose: () => void;
  recipientName: string;
  isInline?: boolean;
}

export function ChatWindow({ orderId, onClose, recipientName, isInline }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCollectionForOrder = (id: string) => {
    if (id.startsWith('req_')) return 'serviceRequests';
    if (id.startsWith('appt_')) return 'appointments';
    // Add logic to determine collection based on ID pattern if possible, 
    // or just try common ones. 
    // Since I don't have perfect ID prefixes, I'll try to find which collection the ID belongs to.
    return 'serviceRequests'; // Default
  };

  const updateLastMessage = async (orderId: string, text: string) => {
    const collections = ['serviceRequests', 'appointments', 'orders', 'labOrders'];
    for (const coll of collections) {
      try {
        const docRef = doc(db, coll, orderId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, {
            lastMessage: text,
            lastMessageAt: new Date().toISOString()
          });
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
  };

  useEffect(() => {
    if (!orderId) return;

    // Remove orderBy to avoid missing composite index errors.
    // We will sort the messages on the client side.
    const q = query(
      collection(db, 'messages'),
      where('orderId', '==', orderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Sort in memory instead of relying on Firestore index
      list.sort((a, b) => {
        // If createdAt is null, it means the message is being written locally (pending), so it should be at the very bottom
        const timeA = a.createdAt ? (a.createdAt.toMillis?.() || a.createdAt.seconds * 1000 || 0) : Date.now() + 100000;
        const timeB = b.createdAt ? (b.createdAt.toMillis?.() || b.createdAt.seconds * 1000 || 0) : Date.now() + 100000;
        return timeA - timeB;
      });
      
      setMessages(list);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const textToCloud = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        orderId,
        senderId: user.uid,
        senderName: (user as any).name || user.displayName || 'User',
        text: textToCloud,
        createdAt: serverTimestamp()
      });

      await updateLastMessage(orderId, textToCloud);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const containerClass = isInline 
    ? "h-full w-full bg-white flex flex-col"
    : "fixed inset-0 md:inset-auto md:bottom-4 md:right-4 z-[150] w-full md:max-w-sm bg-white md:rounded-[32px] shadow-2xl md:border border-slate-100 overflow-hidden flex flex-col h-[100dvh] md:h-[500px] animate-in slide-in-from-bottom-4";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="p-4 bg-sky-500 text-white flex items-center justify-between shadow-md relative z-10">
        <div className="flex items-center gap-3">
          {isInline && (
            <button onClick={onClose} className="md:hidden p-2 -ml-2 hover:bg-white/10 rounded-lg">
              <ChevronLeft size={24} />
            </button>
          )}
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight truncate max-w-[150px]">{recipientName}</h3>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">শাস্তো সাপোর্ট</p>
          </div>
        </div>
        <button onClick={onClose} className={cn("p-2 hover:bg-white/10 rounded-lg transition-colors", isInline && "hidden md:block")}>
          <X size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-3xl flex items-center justify-center mb-4">
              <Send size={24} />
            </div>
            <p className="text-slate-400 text-xs font-medium">Safe & Secure Chat. Start your conversation now.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] px-4 py-2 rounded-2xl text-sm",
                  isMe ? "bg-sky-500 text-white rounded-tr-none" : "bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 uppercase font-bold">
                  {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sky-500/20 text-sm"
        />
        <button
          type="submit"
          className="w-12 h-12 bg-sky-500 text-white rounded-xl flex items-center justify-center hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
