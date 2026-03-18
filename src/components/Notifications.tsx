import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BloodRequest } from '../types';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { userProfile, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState<BloodRequest[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCount = useRef(0);
  const navigate = useNavigate();

  const playNotificationSound = () => {
    try {
      // Using a more standard notification sound URL
      const audio = new Audio('https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3');
      audio.volume = 0.5;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay prevented or sound error:", error);
        });
      }
    } catch (error) {
      console.error("Audio error:", error);
    }
  };

  useEffect(() => {
    if (!userProfile?.bloodGroup) return;
    
    const fetchNotifications = async () => {
      try {
        const q = query(
          collection(db, 'bloodRequests'),
          where('bloodGroup', '==', userProfile.bloodGroup)
        );
        const querySnapshot = await getDocs(q);
        const reqs = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          })
          .filter((req: any) => req.requesterUid !== userProfile.uid && req.status === 'open')
          .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
        
        const currentUnreadCount = reqs.filter(n => {
          if (!userProfile?.lastReadNotifications) return true;
          return n.createdAt && n.createdAt.getTime() > new Date(userProfile.lastReadNotifications).getTime();
        }).length;

        if (currentUnreadCount > prevUnreadCount.current) {
          playNotificationSound();
        }
        prevUnreadCount.current = currentUnreadCount;
        
        setNotifications(reqs as any);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
        handleFirestoreError(error, OperationType.GET, 'bloodRequests');
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userProfile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => {
    if (!userProfile?.lastReadNotifications) return true;
    return n.createdAt && n.createdAt.getTime() > new Date(userProfile.lastReadNotifications).getTime();
  }).length;

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0 && userProfile) {
      try {
        const userRef = doc(db, 'users', userProfile.uid);
        await updateDoc(userRef, {
          lastReadNotifications: serverTimestamp()
        });
        await refreshProfile();
      } catch (error) {
        if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
        handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
      }
    }
  };

  const handleNotificationClick = (requestId: string) => {
    setIsOpen(false);
    navigate('/', { state: { highlightRequestId: requestId } });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen} 
        className="relative p-2 text-slate-600 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-600 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No new matching requests for your blood group.
              </div>
            ) : (
              notifications.map(req => {
                // Highlight if location matches (simple string includes)
                const locationMatch = userProfile?.location && req.location &&
                  req.location.toLowerCase().includes(userProfile.location.split(' ')[0].toLowerCase());
                
                const isNew = !userProfile?.lastReadNotifications || 
                  (req.createdAt && req.createdAt.getTime() > new Date(userProfile.lastReadNotifications).getTime());

                return (
                  <button 
                    key={req.id} 
                    onClick={() => handleNotificationClick(req.id)}
                    className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${isNew ? 'bg-red-50/30' : ''}`}
                  >
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{req.requesterName || 'Unknown'}</span> needs <span className="font-bold text-red-600">{req.bloodGroup}</span> blood.
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500">
                      <span className={locationMatch ? "text-emerald-600 font-medium" : ""}>
                        📍 {req.location} {locationMatch && '(Near you)'}
                      </span>
                      <span>🕒 {req.createdAt ? format(req.createdAt, 'MMM d, h:mm a') : 'Recently'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
