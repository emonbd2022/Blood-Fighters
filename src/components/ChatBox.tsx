import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface ChatBoxProps {
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  onClose: () => void;
}

export default function ChatBox({ recipientId, recipientName, recipientPhoto, onClose }: ChatBoxProps) {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userProfile) return;

    // Generate a consistent chat ID based on the two user IDs
    const generatedChatId = [userProfile.uid, recipientId].sort().join('_');
    setChatId(generatedChatId);

    let unsubscribe: (() => void) | undefined;

    const setupChat = async () => {
      try {
        const chatRef = doc(db, 'chats', generatedChatId);
        const chatSnap = await getDoc(chatRef);
        
        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            participants: [userProfile.uid, recipientId],
            participantNames: {
              [userProfile.uid]: userProfile.displayName,
              [recipientId]: recipientName
            },
            participantPhotos: {
              [userProfile.uid]: userProfile.photoURL || '',
              [recipientId]: recipientPhoto || ''
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        const q = query(
          collection(db, 'chats', generatedChatId, 'messages'),
          orderBy('createdAt', 'asc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(msgs);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `chats/${generatedChatId}/messages`);
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `chats/${generatedChatId}`);
      }
    };

    setupChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile, recipientId, recipientName, recipientPhoto]);

  useEffect(() => {
    if (chatId && userProfile && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== userProfile.uid) {
        setDoc(doc(db, 'chats', chatId), {
          [`lastRead.${userProfile.uid}`]: serverTimestamp()
        }, { merge: true }).catch(err => console.error("Failed to update lastRead", err));
      }
    }
  }, [messages, chatId, userProfile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile || !chatId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: userProfile.uid,
        text: messageText,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: userProfile.uid,
        [`lastRead.${userProfile.uid}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (!userProfile || !chatId) return;

        try {
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            senderId: userProfile.uid,
            text: 'Shared a location',
            type: 'location',
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            },
            createdAt: serverTimestamp()
          });

          await setDoc(doc(db, 'chats', chatId), {
            lastMessage: 'Shared a location',
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: userProfile.uid,
            [`lastRead.${userProfile.uid}`]: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        alert('Unable to retrieve your location.');
      }
    );
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden" style={{ height: '500px', maxHeight: '80vh' }}>
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          {recipientPhoto ? (
            <img src={recipientPhoto} alt={recipientName} className="w-8 h-8 rounded-full object-cover border border-slate-700" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-300" />
            </div>
          )}
          <span className="font-medium truncate">{recipientName}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center px-4">
            Send a message to start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === userProfile?.uid;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${isMe ? 'bg-red-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                  {msg.type === 'location' && msg.location ? (
                    <div className="flex flex-col items-center">
                      <MapPin className="w-6 h-6 mb-1" />
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${msg.location.lat},${msg.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs font-medium underline ${isMe ? 'text-white' : 'text-blue-600'}`}
                      >
                        View on Map / Navigate
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                </div>
                {msg.createdAt && (
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {format(msg.createdAt.toDate(), 'h:mm a')}
                  </span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSendLocation}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Share Location"
          >
            <MapPin className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-slate-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
