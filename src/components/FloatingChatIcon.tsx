import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { MessageCircle, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import toast from 'react-hot-toast';

export default function FloatingChatIcon() {
  const { userProfile } = useAuth();
  const { chatRecipient, setChatRecipient } = useChat();
  const [chats, setChats] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatRecipientRef = useRef(chatRecipient);

  useEffect(() => {
    chatRecipientRef.current = chatRecipient;
  }, [chatRecipient]);

  useEffect(() => {
    if (!userProfile) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const chatData = change.doc.data();
          const recipientId = chatData.participants.find((id: string) => id !== userProfile.uid);
          
          const isUnread = chatData.lastMessageSenderId && 
            chatData.lastMessageSenderId !== userProfile.uid &&
            (!chatData.lastRead || !chatData.lastRead[userProfile.uid] || chatData.lastRead[userProfile.uid].toMillis() < chatData.lastMessageTime.toMillis());

          if (isUnread) {
            unread++;
            // Automatically popup if not already open and not currently chatting with this person
            if (chatRecipientRef.current?.id !== recipientId) {
              const isRecent = chatData.lastMessageTime?.toDate().getTime() > Date.now() - 10000;
              if (isRecent) {
                const senderName = chatData.participantNames?.[chatData.lastMessageSenderId] || 'Someone';
                toast.success(`New message from ${senderName}`, {
                  icon: '💬',
                  duration: 4000,
                });
                
                // Play notification sound
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                  audio.play().catch(e => console.log('Audio play failed:', e));
                } catch (e) {
                  // Ignore audio errors
                }
                
                // Auto popup the chat box
                setChatRecipient({
                  id: recipientId,
                  name: senderName,
                  photo: chatData.participantPhotos?.[chatData.lastMessageSenderId]
                });
              }
            }
          }
        }
      });

      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      setChats(chatList);
      
      // Calculate total unread
      const totalUnread = chatList.filter((c: any) => 
        c.lastMessageSenderId && 
        c.lastMessageSenderId !== userProfile.uid && 
        (!c.lastRead || !c.lastRead[userProfile.uid] || c.lastRead[userProfile.uid].toMillis() < c.lastMessageTime.toMillis())
      ).length;
      
      setUnreadCount(totalUnread);
      
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });

    return () => unsubscribe();
  }, [userProfile, setChatRecipient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userProfile) return null;

  // Don't show the icon if a chat box is currently open
  if (chatRecipient) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={dropdownRef}>
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-2">
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
            <h3 className="font-semibold flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" /> Messages
            </h3>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-300" />
            </button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {chats.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No messages yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chats.map((chat) => {
                  const recipientId = chat.participants.find((id: string) => id !== userProfile.uid);
                  const recipientName = chat.participantNames?.[recipientId] || 'Unknown User';
                  const recipientPhoto = chat.participantPhotos?.[recipientId];
                  const isUnread = chat.lastMessageSenderId && 
                    chat.lastMessageSenderId !== userProfile.uid && 
                    (!chat.lastRead || !chat.lastRead[userProfile.uid] || chat.lastRead[userProfile.uid].toMillis() < chat.lastMessageTime.toMillis());

                  return (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setChatRecipient({ id: recipientId, name: recipientName, photo: recipientPhoto });
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start space-x-3 ${isUnread ? 'bg-red-50/50' : ''}`}
                    >
                      {recipientPhoto ? (
                        <img src={recipientPhoto} alt={recipientName} className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className={`text-sm font-medium truncate ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                            {recipientName}
                          </p>
                          {chat.lastMessageTime && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">
                              {format(chat.lastMessageTime.toDate(), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                          {chat.lastMessageSenderId === userProfile.uid ? 'You: ' : ''}
                          {chat.lastMessage}
                        </p>
                      </div>
                      
                      {isUnread && (
                        <div className="w-2.5 h-2.5 bg-red-600 rounded-full flex-shrink-0 mt-1.5"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-transform hover:scale-105 active:scale-95 relative"
      >
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
