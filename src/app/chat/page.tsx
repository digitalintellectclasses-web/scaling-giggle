'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/store/AuthContext';
import { useFinance } from '@/store/FinanceContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Hash, Users, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  isAdmin: boolean;
}

export default function ChatPage() {
  const { currentUser } = useAuth();
  const { isAdmin } = useFinance();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'group_messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setIsLoading(false);
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'group_messages'), {
        text: msgText,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        isAdmin: isAdmin,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            <Hash className="w-8 h-8 text-emerald-500" /> Team Group Chat
          </h1>
          <p className="text-zinc-400">Real-time collaboration for all agency members.</p>
        </div>
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <Users className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">General Channel</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/50 rounded-[32px] overflow-hidden shadow-2xl relative">
        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
              <div className="p-6 bg-zinc-900 rounded-full">
                <Hash className="w-12 h-12" />
              </div>
              <p className="font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwnMessage = msg.senderId === currentUser?.id;
              const showDate = idx === 0 || (msg.timestamp && messages[idx-1].timestamp && 
                new Date(msg.timestamp?.toDate()).toDateString() !== new Date(messages[idx-1].timestamp?.toDate()).toDateString());

              return (
                <div key={msg.id} className="space-y-4">
                  {showDate && msg.timestamp && (
                    <div className="flex justify-center">
                      <span className="px-3 py-1 bg-zinc-900/80 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800/50">
                        {new Date(msg.timestamp?.toDate()).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex flex-col gap-1.5",
                      isOwnMessage ? "items-end" : "items-start"
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-2 mb-0.5",
                      isOwnMessage ? "flex-row-reverse" : "flex-row"
                    )}>
                      <span className="text-[11px] font-bold text-zinc-400">{msg.senderName}</span>
                      {msg.isAdmin && <ShieldCheck className="w-3 h-3 text-purple-400" />}
                      {msg.timestamp && (
                        <span className="text-[9px] text-zinc-600 font-medium">
                          {new Date(msg.timestamp?.toDate()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    <div className={cn(
                      "max-w-[80%] px-4 py-3 rounded-2xl shadow-lg relative group",
                      isOwnMessage 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50 rounded-tl-none"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </motion.div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/50 backdrop-blur-2xl">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <div className="flex-1 relative group">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-white outline-none focus:border-emerald-500/50 transition-all shadow-inner placeholder:text-zinc-600"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-500">
                   <Clock className="w-3 h-3" />
                   <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
