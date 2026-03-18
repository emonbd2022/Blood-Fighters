import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BloodRequest } from '../types';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, Droplet, CheckCircle, Calendar, Clock, CheckCircle2, FileText, Navigation, MessageCircle, Mail, ShieldCheck, Award } from 'lucide-react';
import { format } from 'date-fns';
import EligibilityForm from '../components/EligibilityForm';
import { doc, updateDoc, setDoc, collection, query, where, getDocs, orderBy, serverTimestamp, addDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useNavigate } from 'react-router-dom';
import { DonationRecord } from '../types';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<BloodRequest[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showEligibilityForm, setShowEligibilityForm] = useState(!userProfile?.isProfileComplete);
  const [fulfillModalOpen, setFulfillModalOpen] = useState<string | null>(null);
  const [fulfilledBy, setFulfilledBy] = useState('');
  const [donors, setDonors] = useState<any[]>([]);
  const [donorSearchResults, setDonorSearchResults] = useState<any[]>([]);
  const [isSearchingDonors, setIsSearchingDonors] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bloodGroup: userProfile?.bloodGroup || '',
    location: userProfile?.location || '',
    phone: userProfile?.phone || '',
    whatsapp: userProfile?.whatsapp || '',
    messengerId: userProfile?.messengerId || '',
    gmail: userProfile?.gmail || '',
    lastDonationDate: userProfile?.lastDonationDate || '',
  });

  useEffect(() => {
    const fetchDonationHistory = async () => {
      if (!userProfile?.uid) return;
      try {
        const q = query(
          collection(db, 'donation_history'),
          where('donorUid', '==', userProfile.uid)
        );
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as DonationRecord[];
        
        // Sort in memory to avoid composite index requirement
        history.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        setDonationHistory(history);
      } catch (error) {
        console.error('Error fetching donation history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchDonationHistory();
  }, [userProfile?.uid]);

  useEffect(() => {
    const fetchDonorsAndChats = async () => {
      if (!userProfile?.uid) return;
      try {
        const donorsSnap = await getDocs(collection(db, 'donors'));
        setDonors(donorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const chatsSnap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', userProfile.uid)));
        setChats(chatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching donors/chats:', error);
      }
    };
    fetchDonorsAndChats();
  }, [userProfile?.uid]);

  useEffect(() => {
    if (userProfile && !userProfile.isProfileComplete) {
      setShowEligibilityForm(true);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    
    const fetchMyRequests = async () => {
      try {
        const q = query(
          collection(db, 'bloodRequests'), 
          where('requesterUid', '==', userProfile.uid)
        );
        const querySnapshot = await getDocs(q);
        const mappedData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setMyRequests(mappedData as any);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
        handleFirestoreError(error, OperationType.GET, 'bloodRequests');
      }
    };

    fetchMyRequests();
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const checkEligibility = (dateStr?: string) => {
    if (!dateStr) return true;
    if (dateStr === 'less_than_3_months') return false;
    if (dateStr === '3_to_6_months' || dateStr === 'more_than_6_months') return true;
    
    const lastDonation = new Date(dateStr);
    if (isNaN(lastDonation.getTime())) return true; // fallback if invalid date
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return lastDonation < threeMonthsAgo;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    
    setLoading(true);
    setSuccess(false);
    
    try {
      const isAvailable = checkEligibility(formData.lastDonationDate);

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        ...formData,
        donorId: userProfile.donorId,
        isProfileComplete: true,
        updatedAt: serverTimestamp()
      });
      
      const donorRef = doc(db, 'donors', userProfile.uid);
      await setDoc(donorRef, {
        uid: userProfile.uid,
        donorId: userProfile.donorId,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
        bloodGroup: formData.bloodGroup,
        location: formData.location,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        messengerId: formData.messengerId,
        gmail: formData.gmail,
        lastDonationDate: formData.lastDonationDate,
        isAvailable: isAvailable,
        totalDonations: userProfile.totalDonations || 0,
        donorScore: userProfile.donorScore || 0,
        isVerified: userProfile.isVerified || false,
        createdAt: userProfile.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEligibilitySubmit = async (eligibilityData: any) => {
    if (!userProfile) return;
    
    setLoading(true);
    setSuccess(false);
    
    try {
      // If lastDonation is 'less_than_3_months', they shouldn't even reach here due to EligibilityForm validation,
      // but if they do, or if they have a real date, we check it.
      // EligibilityForm doesn't provide a real date, just a string like '3_to_6_months'.
      // For now, if they passed the form, they are eligible.
      const isAvailable = true;

      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        bloodGroup: eligibilityData.bloodGroup,
        location: eligibilityData.location,
        phone: eligibilityData.phone,
        lastDonationDate: eligibilityData.lastDonation || '',
        donorId: userProfile.donorId,
        eligibilityData: eligibilityData,
        isProfileComplete: true,
        updatedAt: serverTimestamp()
      });
      
      const donorRef = doc(db, 'donors', userProfile.uid);
      await setDoc(donorRef, {
        uid: userProfile.uid,
        donorId: userProfile.donorId,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || '',
        bloodGroup: eligibilityData.bloodGroup,
        location: eligibilityData.location,
        phone: eligibilityData.phone,
        lastDonationDate: eligibilityData.lastDonation || '',
        isAvailable: isAvailable,
        totalDonations: userProfile.totalDonations || 0,
        donorScore: userProfile.donorScore || 0,
        isVerified: userProfile.isVerified || false,
        createdAt: userProfile.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      await refreshProfile();
      setFormData({
        bloodGroup: eligibilityData.bloodGroup,
        location: eligibilityData.location,
        phone: eligibilityData.phone,
        whatsapp: userProfile.whatsapp || '',
        messengerId: userProfile.messengerId || '',
        gmail: userProfile.gmail || '',
        lastDonationDate: eligibilityData.lastDonation || '',
      });
      setSuccess(true);
      setShowEligibilityForm(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = (requestId: string) => {
    setFulfillModalOpen(requestId);
  };

  const searchDonors = async (term: string) => {
    if (!term || term.length < 2) {
      setDonorSearchResults([]);
      return;
    }
    setIsSearchingDonors(true);
    try {
      const q = query(
        collection(db, 'donors'),
        where('displayName', '>=', term),
        where('displayName', '<=', term + '\uf8ff')
      );
      const qId = query(
        collection(db, 'donors'),
        where('donorId', '>=', term.toUpperCase()),
        where('donorId', '<=', term.toUpperCase() + '\uf8ff')
      );
      
      const [snapName, snapId] = await Promise.all([getDocs(q), getDocs(qId)]);
      const results = [...snapName.docs, ...snapId.docs].map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const uniqueResults = results.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setDonorSearchResults(uniqueResults);
    } catch (error) {
      console.error('Error searching donors:', error);
    } finally {
      setIsSearchingDonors(false);
    }
  };

  const confirmFulfill = async () => {
    if (!fulfillModalOpen || !userProfile) return;
    try {
      const requestRef = doc(db, 'bloodRequests', fulfillModalOpen);
      
      // Find the donor profile if we have a donorId
      let donorUid = '';
      if (fulfilledBy) {
        // Try to find by donorId first, then by displayName
        const donorMatch = donors.find(d => 
          (d.donorId && d.donorId === fulfilledBy) || 
          (d.displayName && d.displayName === fulfilledBy)
        );
        if (donorMatch) {
          donorUid = donorMatch.uid;
        }
      }

      await updateDoc(requestRef, {
        status: 'fulfilled',
        fulfilledBy: fulfilledBy || 'Other Donor',
        updatedAt: serverTimestamp()
      });

      // If we identified a donor, update their last donation date and create a donation record
      if (donorUid) {
        const userRef = doc(db, 'users', donorUid);
        const donorRef = doc(db, 'donors', donorUid);
        
        const today = new Date();
        const todayIso = today.toISOString();
        
        await updateDoc(userRef, {
          lastDonationDate: todayIso,
          totalDonations: increment(1),
          donorScore: increment(10),
          updatedAt: serverTimestamp()
        });

        // Also update the public donor profile if it exists
        const donorDoc = donors.find(d => d.uid === donorUid);
        if (donorDoc) {
          const donorProfileRef = doc(db, 'donors', donorUid);
          await updateDoc(donorProfileRef, {
            lastDonationDate: todayIso,
            totalDonations: increment(1),
            donorScore: increment(10),
            updatedAt: serverTimestamp()
          });
        }

        // Create donation record
        const request = myRequests.find(r => r.id === fulfillModalOpen);
        if (request) {
          const currentDonations = donorDoc ? (donorDoc.totalDonations || 0) + 1 : 1;
          await addDoc(collection(db, 'donation_history'), {
            donorUid: donorUid,
            recipientUid: userProfile.uid,
            recipientName: userProfile.displayName,
            requestId: fulfillModalOpen,
            date: serverTimestamp(),
            bloodGroup: request.bloodGroup,
            location: request.location,
            hospitalName: request.hospitalName || '',
            donorDonationCount: currentDonations,
            createdAt: serverTimestamp()
          });
        }
      }
      
      // Update local state
      setMyRequests(myRequests.map(req => 
        req.id === fulfillModalOpen ? { ...req, status: 'fulfilled', fulfilledBy: fulfilledBy || 'Other Donor' } : req
      ));
      
      setFulfillModalOpen(null);
      setFulfilledBy('');
      setDonorSearchResults([]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `bloodRequests/${fulfillModalOpen}`);
    }
  };

  const getSuggestedDonors = () => {
    if (!fulfillModalOpen || !userProfile) return [];
    const request = myRequests.find(r => r.id === fulfillModalOpen);
    if (!request) return [];

    const pendingUids = request.pendingDonors || [];
    const chattedUids = chats.map(chat => chat.participants.find((p: string) => p !== userProfile.uid)).filter(Boolean);
    const sameGroupUids = donors.filter(d => d.bloodGroup === request.bloodGroup).map(d => d.uid);

    // Combine all unique UIDs
    const allUids = Array.from(new Set([...pendingUids, ...chattedUids, ...sameGroupUids]));

    // Map to donor objects and sort
    const suggested = allUids.map(uid => {
      const donor = donors.find(d => d.uid === uid);
      if (!donor) return null;
      
      let score = 0;
      if (pendingUids.includes(uid)) score += 100;
      if (chattedUids.includes(uid)) score += 50;
      if (sameGroupUids.includes(uid)) score += 10;

      return { ...donor, suggestionScore: score };
    }).filter(Boolean).sort((a: any, b: any) => (b.suggestionScore || 0) - (a.suggestionScore || 0));

    return suggested.slice(0, 10); // Top 10 suggestions
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="bg-slate-50 px-4 sm:px-6 py-8 border-b border-slate-100 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          {userProfile.photoURL ? (
            <img 
              src={userProfile.photoURL} 
              alt={userProfile.displayName} 
              className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center border-4 border-white shadow-sm">
              <User className="h-10 w-10 text-slate-400" />
            </div>
          )}
          <div className="flex flex-col items-center sm:items-start w-full">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full justify-center sm:justify-start">
              <h2 className="text-2xl font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none">{userProfile.displayName}</h2>
              <div className="flex items-center space-x-2">
                {userProfile.isVerified && (
                  <span title="Verified Donor">
                    <ShieldCheck className="w-5 h-5 text-blue-500 fill-blue-500/10" />
                  </span>
                )}
                {userProfile.donorId && (
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-300">
                    {userProfile.donorId}
                  </span>
                )}
              </div>
            </div>
            <p className="text-slate-500 text-sm truncate max-w-[250px] sm:max-w-none">{userProfile.email}</p>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              <div className="flex items-center bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <Droplet className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                <span className="text-xs font-bold text-slate-700">{userProfile.totalDonations || 0} Donations</span>
              </div>
              <div className="flex items-center bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <Award className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-700">{userProfile.donorScore || 0} Score</span>
              </div>
              {userProfile.isProfileComplete ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle className="w-3 h-3 mr-1" /> Complete
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Incomplete
                </span>
              )}
            </div>
          </div>
        </div>

        {showEligibilityForm ? (
          <EligibilityForm 
            initialData={formData} 
            onSubmit={handleEligibilitySubmit} 
            onCancel={() => setShowEligibilityForm(false)} 
          />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="bloodGroup" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Droplet className="w-4 h-4 mr-2 text-red-500" /> Blood Group
                </label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl border bg-white shadow-sm"
                >
                  <option value="" disabled>Select Blood Group</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 01915-582689"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="e.g. 01915-582689"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="messengerId" className="block text-sm font-medium text-slate-700 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2 text-blue-500" /> Messenger ID (Optional)
                </label>
                <input
                  type="text"
                  id="messengerId"
                  name="messengerId"
                  value={formData.messengerId}
                  onChange={handleChange}
                  placeholder="e.g. username"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gmail" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-slate-400" /> Gmail (Optional)
                </label>
                <input
                  type="email"
                  id="gmail"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleChange}
                  placeholder="e.g. example@gmail.com"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="lastDonationDate" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" /> Last Donation Date
                </label>
                <input
                  type="date"
                  id="lastDonationDate"
                  name="lastDonationDate"
                  value={['less_than_3_months', '3_to_6_months', 'more_than_6_months'].includes(formData.lastDonationDate) ? '' : formData.lastDonationDate}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
                <p className="text-xs text-slate-500">Leave empty if you haven't donated before.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Location
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Dhaka Jatrabari"
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            try {
                              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                              const data = await response.json();
                              setFormData(prev => ({
                                ...prev,
                                location: data.display_name
                              }));
                            } catch (error) {
                              console.error('Error fetching location name:', error);
                              alert('Could not determine location name. Please enter manually.');
                            }
                          },
                          (error) => {
                            console.error('Error getting location:', error);
                            alert('Please enable location services to use this feature.');
                          }
                        );
                      } else {
                        alert('Geolocation is not supported by your browser.');
                      }
                    }}
                    className="inline-flex items-center px-4 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Find Near Me
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              {success ? (
                <p className="text-sm text-emerald-600 font-medium flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" /> Profile updated successfully!
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Keep your profile updated to help others.
                </p>
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEligibilityForm(true)}
                  className="inline-flex justify-center py-2.5 px-6 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors flex items-center"
                >
                  <FileText className="w-4 h-4 mr-2" /> Eligibility Form
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-8"
      >
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">Donation Impact</h3>
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-slate-500">Lives Impacted</p>
                <p className="text-3xl font-bold text-slate-900">{(userProfile.totalDonations || 0) * 3}+</p>
              </div>
              <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center">
                <Droplet className="w-6 h-6 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <span>Next Milestone</span>
                  <span>{userProfile.totalDonations || 0} / {((Math.floor((userProfile.totalDonations || 0) / 5) + 1) * 5)}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${((userProfile.totalDonations || 0) % 5) * 20}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 italic">
                  Each donation can save up to 3 lives. You're doing great!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">My Donation History</h3>
          {loadingHistory ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : donationHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
              <Calendar className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-slate-500">No donation history found.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {donationHistory.map((record) => (
                <div key={record.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start space-x-4">
                  <div className="bg-red-50 p-3 rounded-xl">
                    <Droplet className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Donated to {record.recipientName}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" /> {format(record.date, 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" /> {record.location}
                    </p>
                    <span className="inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                      {record.bloodGroup}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-4">My Blood Requests</h3>
          
          {myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
              <Droplet className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-slate-500">You haven't made any blood requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map((req) => {
                const isFulfilled = req.status === 'fulfilled';
                
                return (
                  <div 
                    key={req.id} 
                    className={`bg-white rounded-2xl p-5 shadow-sm border ${isFulfilled ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'} relative overflow-hidden`}
                  >
                    {isFulfilled && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Fulfilled
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            {req.bloodGroup}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{req.amount}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2"><span className="font-medium">Issue:</span> {req.patientIssue}</p>
                        
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                          <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {req.time ? `${(() => {
                              const [hours, minutes] = req.time.split(':');
                              const h = parseInt(hours, 10);
                              const ampm = h >= 12 ? 'PM' : 'AM';
                              const h12 = h % 12 || 12;
                              return `${h12}:${minutes} ${ampm}`;
                            })()} on ` : ''}
                            {req.date ? format(new Date(req.date), 'dd MMMM, yyyy') : 'Unknown Date'}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {req.location}
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy') : 'Recently'}
                          </div>
                        </div>
                      </div>
                      
                      {!isFulfilled && (
                        <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                          <button
                            onClick={() => handleFulfill(req.id!)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                          >
                            Mark as Fulfilled
                          </button>
                          <button
                            onClick={() => navigate(`/edit-request/${req.id}`)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                          >
                            Edit Request
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Fulfill Modal */}
      {fulfillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Mark Request as Fulfilled</h3>
              <p className="text-sm text-slate-500 mb-4">
                Please enter the User ID or name of the donor who fulfilled this request.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="fulfilledBy" className="block text-sm font-medium text-slate-700">
                    Donor ID or Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="fulfilledBy"
                      value={fulfilledBy}
                      onChange={(e) => {
                        setFulfilledBy(e.target.value);
                        searchDonors(e.target.value);
                      }}
                      placeholder="e.g. ROKTO-XXXX or Name"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    />
                    <button
                      onClick={() => setFulfilledBy('Other Donor')}
                      className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
                    >
                      Other
                    </button>
                  </div>
                </div>

                {isSearchingDonors && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
                    Searching donors...
                  </div>
                )}

                {donorSearchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-1">Search Results</p>
                    {donorSearchResults.map(donor => (
                      <button
                        key={donor.id}
                        onClick={() => {
                          setFulfilledBy(donor.donorId || donor.displayName);
                          setDonorSearchResults([]);
                        }}
                        className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 rounded-lg text-xs flex justify-between items-center group transition-colors"
                      >
                        <span className="font-medium text-slate-700 group-hover:text-emerald-700">{donor.displayName}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{donor.donorId}</span>
                      </button>
                    ))}
                  </div>
                )}

                {getSuggestedDonors().length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Suggested Donors:</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestedDonors().map((donor: any) => (
                        <button
                          key={donor.uid}
                          onClick={() => setFulfilledBy(donor.donorId || donor.displayName)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors border border-slate-200 flex flex-col items-start"
                        >
                          <span className="font-bold">{donor.displayName}</span>
                          <span className="text-[9px] opacity-70">{donor.donorId}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setFulfillModalOpen(null);
                  setFulfilledBy('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmFulfill}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-xl shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Confirm Fulfillment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
