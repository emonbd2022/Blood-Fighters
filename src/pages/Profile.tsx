import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BloodRequest } from '../types';
import { motion } from 'framer-motion';
import { User, MapPin, Phone, Droplet, CheckCircle, Calendar, Clock, CheckCircle2, FileText, Navigation, MessageCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import EligibilityForm from '../components/EligibilityForm';
import { doc, updateDoc, setDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
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

  const handleFulfill = async (requestId: string) => {
    if (!userProfile) return;
    try {
      const requestRef = doc(db, 'bloodRequests', requestId);
      await updateDoc(requestRef, {
        status: 'fulfilled',
        updatedAt: serverTimestamp()
      });
      
      setMyRequests(myRequests.map(req => 
        req.id === requestId ? { ...req, status: 'fulfilled' } : req
      ));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `bloodRequests/${requestId}`);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="bg-slate-50 px-6 py-8 border-b border-slate-100 flex items-center space-x-6">
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
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{userProfile.displayName}</h2>
              {userProfile.donorId && (
                <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-300">
                  {userProfile.donorId}
                </span>
              )}
            </div>
            <p className="text-slate-500">{userProfile.email}</p>
            {userProfile.isProfileComplete ? (
              <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <CheckCircle className="w-3 h-3 mr-1" /> Profile Complete
              </span>
            ) : (
              <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Incomplete Profile
              </span>
            )}
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
                  value={formData.bloodGroup || ''}
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
                  value={formData.phone || ''}
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
                  value={formData.whatsapp || ''}
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
                  value={formData.messengerId || ''}
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
                  value={formData.gmail || ''}
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
                  value={['less_than_3_months', '3_to_6_months', 'more_than_6_months'].includes(formData.lastDonationDate) ? '' : (formData.lastDonationDate || '')}
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
                    value={formData.location || ''}
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
                            {req.date}
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
    </div>
  );
}
