import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { BloodRequest } from '../types';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Phone, Droplet, Clock, CheckCircle2, Search, Share2, Check, Map as MapIcon, List, AlertTriangle, Navigation, MessageCircle, Mail, ChevronLeft, ChevronRight, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, getDocs, orderBy, doc, updateDoc, serverTimestamp, where, addDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useNavigate, useLocation } from 'react-router-dom';
import EligibilityForm from '../components/EligibilityForm';
import FAQAndTerms from '../components/FAQAndTerms';
import { Hospital } from 'lucide-react';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

export default function Home() {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(50); // km
  const [locating, setLocating] = useState(false);
  const [donateNowRequest, setDonateNowRequest] = useState<BloodRequest | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'fulfilled'>('all');
  const [activeTab, setActiveTab] = useState<'requests' | 'donors'>('requests');
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const { setChatRecipient, sendMessage } = useChat();

  useEffect(() => {
    if (location.state?.highlightRequestId) {
      setHighlightedRequestId(location.state.highlightRequestId);
      // Scroll to the element if it exists
      setTimeout(() => {
        const element = document.getElementById(`request-${location.state.highlightRequestId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      // Clear state so it doesn't highlight again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  
  // Pagination state
  const [requestPage, setRequestPage] = useState(1);
  const [donorPage, setDonorPage] = useState(1);
  const itemsPerPage = 6;

  const [hasMadeRequest, setHasMadeRequest] = useState(false);

  useEffect(() => {
    const checkUserRequests = async () => {
      if (!userProfile) return;
      try {
        const q = query(collection(db, 'bloodRequests'), where('requesterUid', '==', userProfile.uid));
        const querySnapshot = await getDocs(q);
        setHasMadeRequest(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking user requests:', error);
      }
    };
    checkUserRequests();
  }, [userProfile]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocating(false);
        alert('Unable to retrieve your location.');
      }
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qRequests = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'));
        const querySnapshotRequests = await getDocs(qRequests);
        const mappedRequests = querySnapshotRequests.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });
        setRequests(mappedRequests as any);

        const qDonors = query(collection(db, 'donors'), orderBy('createdAt', 'desc'));
        const querySnapshotDonors = await getDocs(qDonors);
        const mappedDonors = querySnapshotDonors.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        });
        setDonors(mappedDonors);

        // Fetch chats to suggest donor IDs
        if (userProfile) {
          const qChats = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', userProfile.uid)
          );
          const querySnapshotChats = await getDocs(qChats);
          const mappedChats = querySnapshotChats.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setChats(mappedChats);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
        handleFirestoreError(error, OperationType.GET, 'bloodRequests/donors');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Polling for updates every 10 seconds since we don't have WebSockets set up
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFulfill = (requestId: string) => {
    setFulfillModalOpen(requestId);
  };

  const handleShare = async (req: BloodRequest) => {
    const shareText = `Urgent: ${req.bloodGroup} blood needed at ${req.location} for ${req.patientIssue}. Contact: ${req.contact}.`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Urgent Blood Request',
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedId(req.id!);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredRequests = requests.filter(req => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = (req.patientIssue || '').toLowerCase().includes(query) || 
                          (req.location || '').toLowerCase().includes(query) ||
                          (req.bloodGroup || '').toLowerCase().includes(query) ||
                          (req.urgency || '').toLowerCase().includes(query);
    
    const matchesBloodGroup = bloodGroupFilter ? req.bloodGroup === bloodGroupFilter : true;
    const matchesStatus = statusFilter === 'all' ? true : (statusFilter === 'fulfilled' ? req.status === 'fulfilled' : req.status !== 'fulfilled');
    
    let matchesDistance = true;
    if (userLocation && req.coordinates) {
      const distance = getDistance(userLocation.lat, userLocation.lng, req.coordinates.lat, req.coordinates.lng);
      matchesDistance = distance <= maxDistance;
    } else if (userLocation && !req.coordinates) {
      matchesDistance = false;
    }

    return matchesSearch && matchesDistance && matchesBloodGroup && matchesStatus;
  }).sort((a, b) => {
    // Sort by status first (pending/open first)
    if (a.status !== b.status) {
      if (a.status === 'fulfilled') return 1;
      if (b.status === 'fulfilled') return -1;
    }
    
    // Then sort by urgency
    const urgencyMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const urgencyA = urgencyMap[a.urgency] ?? 3;
    const urgencyB = urgencyMap[b.urgency] ?? 3;
    
    if (urgencyA !== urgencyB) {
      return urgencyA - urgencyB;
    }
    
    // Then by date
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

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

  const formatDonationDate = (dateStr: string) => {
    if (dateStr === 'less_than_3_months') return 'Less than 3 months ago';
    if (dateStr === '3_to_6_months') return '3 to 6 months ago';
    if (dateStr === 'more_than_6_months') return 'More than 6 months ago';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, 'MMM d, yyyy');
  };

  const filteredDonors = donors.filter(donor => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch = (donor.displayName || '').toLowerCase().includes(query) || 
                          (donor.location || '').toLowerCase().includes(query);
    const matchesBloodGroup = bloodGroupFilter ? donor.bloodGroup === bloodGroupFilter : true;
    
    // We don't have coordinates for donors yet, but if we did, we could filter by distance here.
    // For now, just return true for distance.
    const matchesDistance = true;

    return matchesSearch && matchesBloodGroup && matchesDistance;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const [fulfillModalOpen, setFulfillModalOpen] = useState<string | null>(null);
  const [donateConfirmModal, setDonateConfirmModal] = useState<BloodRequest | null>(null);
  const [fulfilledBy, setFulfilledBy] = useState('');

  const handleDonateConfirm = async () => {
    if (!donateConfirmModal || !userProfile) return;
    try {
      const requestRef = doc(db, 'bloodRequests', donateConfirmModal.id!);
      await updateDoc(requestRef, {
        pendingDonors: arrayUnion(userProfile.uid),
        updatedAt: serverTimestamp()
      });

      // Auto-send message
      await sendMessage(donateConfirmModal.requesterUid, "I can donate blood for your request.");

      // In a real app, we would trigger a Cloud Function here to send a push notification
      // For now, we'll just show a success message
      alert('Confirmation sent! The recipient has been notified and a message has been sent to their inbox.');
      
      setDonateConfirmModal(null);
      // Refresh requests locally
      setRequests(requests.map(req => 
        req.id === donateConfirmModal.id ? { ...req, pendingDonors: [...(req.pendingDonors || []), userProfile.uid] } : req
      ));
    } catch (error) {
      console.error('Error confirming donation:', error);
      alert('Failed to send confirmation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const confirmFulfill = async () => {
    if (!fulfillModalOpen || !userProfile) return;
    try {
      const requestRef = doc(db, 'bloodRequests', fulfillModalOpen);
      
      // Find the donor profile if we have a donorId
      let donorUid = '';
      if (fulfilledBy) {
        const donorMatch = donors.find(d => d.donorId === fulfilledBy || d.displayName === fulfilledBy);
        if (donorMatch) {
          donorUid = donorMatch.uid;
        }
      }

      await updateDoc(requestRef, {
        status: 'fulfilled',
        fulfilledBy: fulfilledBy || 'Unknown Donor',
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
          updatedAt: serverTimestamp()
        });

        // Also update the public donor profile if it exists
        const donorDoc = donors.find(d => d.uid === donorUid);
        if (donorDoc && donorDoc.id) {
          await updateDoc(doc(db, 'donors', donorDoc.id), {
            lastDonationDate: todayIso,
            updatedAt: serverTimestamp()
          });
        }

        // Create donation record
        const request = requests.find(r => r.id === fulfillModalOpen);
        if (request) {
          await addDoc(collection(db, 'donation_history'), {
            donorUid: donorUid,
            recipientUid: userProfile.uid,
            recipientName: userProfile.displayName,
            requestId: fulfillModalOpen,
            date: serverTimestamp(),
            bloodGroup: request.bloodGroup,
            location: request.location,
            createdAt: serverTimestamp()
          });
        }
      }
      
      // Update local state
      setRequests(requests.map(req => 
        req.id === fulfillModalOpen ? { ...req, status: 'fulfilled', fulfilledBy: fulfilledBy || 'Unknown Donor' } : req
      ));
      setFulfillModalOpen(null);
      setFulfilledBy('');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `bloodRequests/${fulfillModalOpen}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('requests')}
            className={`text-2xl font-bold tracking-tight transition-colors ${activeTab === 'requests' ? 'text-slate-900 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Blood Requests
          </button>
          <button
            onClick={() => setActiveTab('donors')}
            className={`text-2xl font-bold tracking-tight transition-colors ${activeTab === 'donors' ? 'text-slate-900 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Donors
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {activeTab === 'requests' && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl bg-white shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Not Fulfilled</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
              <select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl bg-white shadow-sm"
              >
                <option value="">All Blood Groups</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl bg-white shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Not Fulfilled</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </>
          )}
          {activeTab === 'donors' && (
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-slate-200 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl bg-white shadow-sm"
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by group, location, urgency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm shadow-sm transition-colors"
            />
          </div>
        </div>
      </div>

      {activeTab === 'requests' && (
        filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Droplet className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No requests found</h3>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search terms or distance filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {filteredRequests.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage).map((req, index) => {
              const isMatchingGroup = userProfile?.bloodGroup === req.bloodGroup;
              const isOwner = userProfile?.uid === req.requesterUid;
              const isFulfilled = req.status === 'fulfilled';

              return (
                <motion.div
                  key={req.id}
                  id={`request-${req.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: highlightedRequestId === req.id ? 1.02 : 1,
                    borderColor: highlightedRequestId === req.id ? '#ef4444' : (isFulfilled ? '#d1fae5' : '#f1f5f9')
                  }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl p-6 shadow-sm border ${isFulfilled ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100'} relative overflow-hidden ${highlightedRequestId === req.id ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                >
                  {isFulfilled && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-wider flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Fulfilled
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {req.requesterPhoto ? (
                        <img src={req.requesterPhoto} alt={req.requesterName || 'Unknown'} className="h-10 w-10 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-slate-500 font-medium">{(req.requesterName || '?').charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{req.requesterName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy h:mm a') : 'Just now'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        {req.bloodGroup}
                      </span>
                      {req.urgency && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getUrgencyColor(req.urgency)}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" /> {req.urgency}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{req.amount}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-sm text-slate-800 font-medium">রোগীর সমস্যা (Issue):</p>
                      <p className="text-sm text-slate-600 mt-1">{req.patientIssue}</p>
                    </div>

                    {req.guardianName && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="font-medium">Guardian: {req.guardianName}</span>
                      </div>
                    )}

                    {req.hospitalName && (
                      <div className="flex items-center text-slate-600 text-sm">
                        <Hospital className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="font-medium">{req.hospitalName}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-slate-600">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="truncate" title={req.date}>{req.date}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="truncate" title={req.location}>{req.location}</span>
                      </div>
                    </div>
                    
                    {isFulfilled && req.fulfilledBy && (
                      <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                        <span className="text-sm text-emerald-800">Fulfilled by: <span className="font-bold">{req.fulfilledBy}</span></span>
                      </div>
                    )}

                    {!isFulfilled && req.pendingDonors && req.pendingDonors.length > 0 && (
                      <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-amber-500" />
                        <span className="text-sm text-amber-800">
                          <span className="font-bold">{req.pendingDonors.length}</span> donor{req.pendingDonors.length > 1 ? 's' : ''} pending response
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center text-slate-700 font-medium text-sm">
                      <Phone className="w-4 h-4 mr-2 text-slate-400" />
                      <a href={`tel:${req.contact}`} className="hover:text-red-600">{req.contact}</a>
                      {req.whatsapp && (
                        <a href={`https://wa.me/${req.whatsapp}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-green-500 hover:text-green-600" title="WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {req.messengerId && (
                        <a href={`https://m.me/${req.messengerId}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:text-blue-600" title="Messenger">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleShare(req)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Share request"
                      >
                        {copiedId === req.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                      </button>

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${req.coordinates ? `${req.coordinates.lat},${req.coordinates.lng}` : encodeURIComponent((req.hospitalName ? req.hospitalName + ' ' : '') + req.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                      >
                        <Navigation className="w-3.5 h-3.5 mr-1" /> Go there
                      </a>

                      {!isFulfilled && isOwner && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFulfill(req.id!)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Mark Fulfilled
                          </button>
                          <button
                            onClick={() => navigate(`/edit-request/${req.id}`)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                      
                      {!isFulfilled && !isOwner && isMatchingGroup && (
                        <div className="flex items-center space-x-2">
                          {req.pendingDonors?.includes(userProfile.uid) ? (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" /> Pending Response
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  if (!userProfile) {
                                    alert('Please sign in to chat.');
                                    return;
                                  }
                                  setChatRecipient({
                                    id: req.requesterUid,
                                    name: req.requesterName,
                                    photo: req.requesterPhoto
                                  });
                                }}
                                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center"
                              >
                                <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
                              </button>
                              <button
                                onClick={() => {
                                  if (!userProfile?.isProfileComplete) {
                                    alert('Please complete your profile and eligibility form first.');
                                    navigate('/profile');
                                    return;
                                  }
                                  // Check eligibility based on last donation date
                                  const isEligible = checkEligibility(userProfile.lastDonationDate);
                                  if (!isEligible) {
                                    alert('You are currently in the 3-month cool-down period.');
                                    return;
                                  }
                                  setDonateConfirmModal(req);
                                }}
                                className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
                              >
                                Donate Now
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      
                      {!isFulfilled && !isOwner && !isMatchingGroup && (
                        <span className="text-xs text-slate-400 italic">
                          Requires {req.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </div>

            {/* Pagination Controls */}
            {filteredRequests.length > itemsPerPage && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => setRequestPage(prev => Math.max(prev - 1, 1))}
                  disabled={requestPage === 1}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-600">
                  Page {requestPage} of {Math.ceil(filteredRequests.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setRequestPage(prev => Math.min(prev + 1, Math.ceil(filteredRequests.length / itemsPerPage)))}
                  disabled={requestPage === Math.ceil(filteredRequests.length / itemsPerPage)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )
      )}

      {activeTab === 'donors' && (
        !hasMadeRequest ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Donor list is hidden</h3>
            <p className="mt-1 text-sm text-slate-500">You must create a blood request first to see available donors.</p>
            <button
              onClick={() => navigate('/create-request')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Create Request Now
            </button>
          </div>
        ) : filteredDonors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Droplet className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">No donors found</h3>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDonors.slice((donorPage - 1) * itemsPerPage, donorPage * itemsPerPage).map((donor, index) => {
                const isEligible = checkEligibility(donor.lastDonationDate);
                const isAvailable = donor.isAvailable && isEligible;
                const isSelf = userProfile?.uid === donor.uid;

                return (
                <motion.div
                  key={donor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden"
                >
                  <div className="flex items-center space-x-4">
                    {donor.photoURL ? (
                      <img src={donor.photoURL} alt={donor.displayName} className="h-14 w-14 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="text-slate-500 font-medium text-xl">{(donor.displayName || '?').charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{donor.displayName}</h3>
                        {donor.donorId && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {donor.donorId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                          {donor.bloodGroup}
                        </span>
                        {isAvailable ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {donor.lastDonationDate && !checkEligibility(donor.lastDonationDate) ? 'In Cool-down' : 'Unavailable'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                      <span className="truncate" title={donor.location}>{donor.location}</span>
                    </div>
                    {donor.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                        <a href={`tel:${donor.phone}`} className="hover:text-red-600 transition-colors">{donor.phone}</a>
                      </div>
                    )}
                    {donor.lastDonationDate && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        <span>Last Donated: {formatDonationDate(donor.lastDonationDate)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isEligible && (
                        <>
                          {donor.whatsapp && (
                            <a href={`https://wa.me/${donor.whatsapp}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="WhatsApp">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {donor.messengerId && (
                            <a href={`https://m.me/${donor.messengerId}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Messenger">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {donor.gmail && (
                            <a href={`mailto:${donor.gmail}`} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" title="Email">
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                        </>
                      )}
                    </div>

                    {!isSelf && (
                      <button
                        onClick={() => {
                          if (!userProfile) {
                            alert('Please sign in to contact donors.');
                            return;
                          }
                          setChatRecipient({
                            id: donor.uid,
                            name: donor.displayName,
                            photo: donor.photoURL
                          });
                        }}
                        className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" /> Contact
                      </button>
                    )}
                  </div>
                </motion.div>
              )})}
            </div>

            {/* Pagination Controls */}
            {filteredDonors.length > itemsPerPage && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => setDonorPage(prev => Math.max(prev - 1, 1))}
                  disabled={donorPage === 1}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-medium text-slate-600">
                  Page {donorPage} of {Math.ceil(filteredDonors.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setDonorPage(prev => Math.min(prev + 1, Math.ceil(filteredDonors.length / itemsPerPage)))}
                  disabled={donorPage === Math.ceil(filteredDonors.length / itemsPerPage)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )
      )}

      <FAQAndTerms />

      {/* Donate Confirm Modal */}
      {donateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Droplet className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Donation Interest</h3>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to donate blood for this request? 
                The recipient will be notified, and an automated message will be sent to their inbox.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setDonateConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDonateConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                >
                  Confirm & Notify
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                      onChange={(e) => setFulfilledBy(e.target.value)}
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

                {chats.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Suggested from your chats:</p>
                    <div className="flex flex-wrap gap-2">
                      {chats.map(chat => {
                        const otherParticipantId = chat.participants.find((p: string) => p !== userProfile?.uid);
                        const otherParticipantName = chat.participantNames[otherParticipantId];
                        // Find donor ID for this participant
                        const donorProfile = donors.find(d => d.uid === otherParticipantId);
                        const displayId = donorProfile?.donorId || otherParticipantName;
                        
                        return (
                          <button
                            key={chat.id}
                            onClick={() => setFulfilledBy(displayId)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors border border-slate-200"
                          >
                            {displayId}
                          </button>
                        );
                      })}
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

      {/* Eligibility Modal */}
      {donateNowRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <EligibilityForm
              initialData={{
                bloodGroup: userProfile?.bloodGroup || donateNowRequest.bloodGroup,
                location: userProfile?.location || '',
                phone: userProfile?.phone || ''
              }}
              onCancel={() => setDonateNowRequest(null)}
              onSubmit={(data) => {
                // If eligible, show contact info
                window.location.href = `tel:${donateNowRequest.contact}`;
                setDonateNowRequest(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
