import React, { createContext, useContext, useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface ChatRecipient {
  id: string;
  name: string;
  photo?: string;
}

interface ChatContextType {
  chatRecipient: ChatRecipient | null;
  setChatRecipient: (recipient: ChatRecipient | null) => void;
  sendMessage: (recipientId: string, text: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chatRecipient, setChatRecipient] = useState<ChatRecipient | null>(null);
  const { userProfile } = useAuth();

  const sendMessage = async (recipientId: string, text: string) => {
    if (!userProfile) return;

    const chatId = [userProfile.uid, recipientId].sort().join('_');
    
    try {
      // Ensure chat document exists
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        // We might not have the recipient's name/photo here easily if we're calling from Home.tsx
        // But we can at least create the basic structure. 
        // Ideally, the recipient info should be passed or fetched.
        await setDoc(chatRef, {
          participants: [userProfile.uid, recipientId],
          participantNames: {
            [userProfile.uid]: userProfile.displayName,
            [recipientId]: 'User' // Fallback
          },
          participantPhotos: {
            [userProfile.uid]: userProfile.photoURL || '',
            [recipientId]: ''
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: userProfile.uid,
        text: text,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: userProfile.uid,
        [`lastRead.${userProfile.uid}`]: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  return (
    <ChatContext.Provider value={{ chatRecipient, setChatRecipient, sendMessage }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
