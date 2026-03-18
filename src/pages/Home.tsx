import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { BloodRequest } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, Phone, Droplet, Clock, CheckCircle2, Search, Share2, Check, Map as MapIcon, List, AlertTriangle, Navigation, MessageCircle, Mail, ChevronLeft, ChevronRight, User, AlertCircle, ShieldCheck, Award } from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, query, getDocs, orderBy, doc, updateDoc, serverTimestamp, where, addDoc, arrayUnion, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import EligibilityForm from '../components/EligibilityForm';
import EligibilitySummary from '../components/EligibilitySummary';
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
  const [showEligibilitySummary, setShowEligibilitySummary] = useState<BloodRequest | null>(null);
  const [donorSearchResults, setDonorSearchResults] = useState<any[]>([]);
  const [isSearchingDonors, setIsSearchingDonors] = useState(false);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
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
  const [requestedBloodGroups, setRequestedBloodGroups] = useState<string[]>([]);

  useEffect(() => {
    const checkUserRequests = async () => {
      if (!userProfile) return;
      try {
        const q = query(
          collection(db, 'bloodRequests'), 
          where('requesterUid', '==', userProfile.uid)
        );
        const querySnapshot = await getDocs(q);
        const activeRequests = querySnapshot.docs.filter(doc => doc.data().status !== 'fulfilled');
        setHasMadeRequest(activeRequests.length > 0);
        const groups = activeRequests.map(doc => doc.data().bloodGroup);
        setRequestedBloodGroups([...new Set(groups)]);
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

        const qDonations = query(collection(db, 'donation_history'), orderBy('createdAt', 'desc'));
        const querySnapshotDonations = await getDocs(qDonations);
        const mappedDonations = querySnapshotDonations.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date()
          };
        });
        setRecentDonations(mappedDonations);

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
    
    // Privacy feature: Only show donors matching user's active requests
    const matchesUserRequest = requestedBloodGroups.includes(donor.bloodGroup);
    
    // Eligibility check: Only show donors who are eligible to donate (3 months cool-down)
    const isEligible = checkEligibility(donor.lastDonationDate);
    
    // We don't have coordinates for donors yet, but if we did, we could filter by distance here.
    const matchesDistance = true;

    return matchesSearch && matchesBloodGroup && matchesDistance && matchesUserRequest && isEligible;
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<string | null>(null);
  const [isDonating, setIsDonating] = useState(false);
  const [donateConfirmModal, setDonateConfirmModal] = useState<BloodRequest | null>(null);
  const [fulfilledBy, setFulfilledBy] = useState('');

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmModal || !userProfile) return;
    try {
      await deleteDoc(doc(db, 'bloodRequests', deleteConfirmModal));
      setRequests(prev => prev.filter(req => req.id !== deleteConfirmModal));
      toast.success('Request deleted successfully');
      setDeleteConfirmModal(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const handleDonateConfirm = async () => {
    if (!donateConfirmModal || !userProfile || isDonating) return;
    setIsDonating(true);
    try {
      // 1. Create a notification for the requester
      await addDoc(collection(db, 'notifications'), {
        userId: donateConfirmModal.requesterUid,
        title: 'New Donation Interest',
        message: `${userProfile.displayName} (${userProfile.bloodGroup}) is interested in donating for your request.`,
        type: 'donation_interest',
        requestId: donateConfirmModal.id,
        fromUid: userProfile.uid,
        read: false,
        createdAt: serverTimestamp()
      });

      // 2. Send an automated chat message with donor details
      const donorDetails = `I am interested in donating blood for your request: ${donateConfirmModal.patientIssue} at ${donateConfirmModal.hospitalName}.

My Details:
Name: ${userProfile.displayName}
Blood Group: ${userProfile.bloodGroup}
Phone: ${userProfile.phone || 'N/A'}
Location: ${userProfile.location || 'N/A'}
Total Donations: ${userProfile.totalDonations || 0}`;

      await sendMessage(donateConfirmModal.requesterUid, donorDetails);

      // 3. Update the blood request document with pendingDonors
      if (donateConfirmModal.id) {
        const requestRef = doc(db, 'bloodRequests', donateConfirmModal.id);
        await updateDoc(requestRef, {
          pendingDonors: arrayUnion(userProfile.uid)
        });
      }

      setDonateConfirmModal(null);
      toast.success('Interest confirmed! The recipient has been notified and a chat message has been sent.');
      
      // Refresh requests locally
      setRequests(requests.map(req => 
        req.id === donateConfirmModal.id ? { ...req, pendingDonors: [...(req.pendingDonors || []), userProfile.uid] } : req
      ));
    } catch (error) {
      console.error('Error confirming donation:', error);
      toast.error('Failed to confirm donation interest. Please try again.');
    } finally {
      setIsDonating(false);
    }
  };

  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  useEffect(() => {
    if (recentDonations.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex(prev => (prev + 1) % recentDonations.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [recentDonations.length]);

  const searchDonors = async (term: string) => {
    if (!term || term.length < 2) {
      setDonorSearchResults([]);
      return;
    }
    setIsSearchingDonors(true);
    try {
      // Search by donorId or displayName
      // Note: Firestore doesn't support case-insensitive search easily without extra fields
      // We'll do a simple prefix search for now
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
      
      // Remove duplicates
      const uniqueResults = results.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
      setDonorSearchResults(uniqueResults);
    } catch (error) {
      console.error('Error searching donors:', error);
    } finally {
      setIsSearchingDonors(false);
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
        // Try to find by donorId first, then by displayName
        const donorMatch = donors.find(d => 
          (d.donorId && d.donorId === fulfilledBy) || 
          (d.displayName && d.displayName === fulfilledBy)
        );
        if (donorMatch) {
          donorUid = donorMatch.uid;
        }
      }

      if (!donorUid) {
        toast.error('Please select a valid donor from the list or search results.');
        return;
      }

      await updateDoc(requestRef, {
        status: 'pending_fulfillment',
        fulfilledBy: fulfilledBy || 'Unknown Donor',
        fulfilledByUid: donorUid,
        updatedAt: serverTimestamp()
      });

      // Send notification to the donor for verification
      await addDoc(collection(db, 'notifications'), {
        userId: donorUid,
        title: 'Donation Verification Required',
        message: `${userProfile.displayName} marked their request as fulfilled by you. Please verify this donation in your profile.`,
        type: 'fulfillment_verification',
        requestId: fulfillModalOpen,
        fromUid: userProfile.uid,
        read: false,
        createdAt: serverTimestamp()
      });
      
      // Update local state
      setRequests(requests.map(req => 
        req.id === fulfillModalOpen ? { ...req, status: 'pending_fulfillment', fulfilledBy: fulfilledBy || 'Unknown Donor', fulfilledByUid: donorUid } : req
      ));
      setFulfillModalOpen(null);
      setFulfilledBy('');
      toast.success('Verification request sent to the donor!');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, OperationType.UPDATE, `bloodRequests/${fulfillModalOpen}`);
    }
  };

  const getSuggestedDonors = () => {
    if (!fulfillModalOpen || !userProfile) return [];
    const request = requests.find(r => r.id === fulfillModalOpen);
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
                    opacity: isFulfilled ? 0.6 : 1, 
                    y: 0,
                    scale: highlightedRequestId === req.id ? 1.02 : 1,
                    borderColor: highlightedRequestId === req.id ? '#ef4444' : (isFulfilled ? '#d1fae5' : '#f1f5f9')
                  }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm border ${isFulfilled ? 'border-emerald-100 bg-emerald-50/30 grayscale-[20%]' : 'border-slate-100'} relative overflow-hidden ${highlightedRequestId === req.id ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
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
                          {req.createdAt ? (() => {
                            try {
                              return format(new Date(req.createdAt), 'MMM d, yyyy h:mm a');
                            } catch (e) {
                              return 'Recently';
                            }
                          })() : 'Just now'}
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
                      <div className="flex items-start text-slate-600 text-sm mt-3">
                        <Hospital className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-medium block">{req.hospitalName}</span>
                          <span className="text-slate-500 text-xs mt-0.5 block">{req.location}</span>
                        </div>
                      </div>
                    )}

                    {!req.hospitalName && (
                      <div className="flex items-start text-slate-600 text-sm mt-3">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">{req.location}</span>
                      </div>
                    )}

                    <div className="flex items-center text-slate-600 text-sm mt-3">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span>
                        {req.date ? (() => {
                          try {
                            return format(new Date(req.date), 'dd MMMM, yyyy');
                          } catch (e) {
                            return 'Unknown Date';
                          }
                        })() : 'Unknown Date'}
                      </span>
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

                  <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {!isFulfilled && (
                      <div className="flex flex-wrap items-center text-slate-700 font-medium text-sm gap-2">
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-slate-400" />
                          <a href={`tel:${req.contact}`} className="hover:text-red-600">{req.contact}</a>
                        </div>
                        <div className="flex items-center space-x-1">
                          {req.whatsapp && (
                            <a href={`https://wa.me/${req.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 p-1 hover:bg-green-50 rounded-lg transition-colors" title="WhatsApp">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          {req.messengerId && (
                            <a href={`https://m.me/${req.messengerId}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 p-1 hover:bg-blue-50 rounded-lg transition-colors" title="Messenger">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                      {!isFulfilled && (
                        <>
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
                        </>
                      )}

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
                          <button
                            onClick={() => setDeleteConfirmModal(req.id!)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors border border-red-200"
                          >
                            Delete
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
                                    setShowEligibilitySummary(req);
                                  }}
                                  className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center whitespace-nowrap"
                                >
                                  Donate
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
            <h3 className="mt-2 text-sm font-medium text-slate-900">No matching donors found</h3>
            <p className="mt-1 text-sm text-slate-500">
              We couldn't find any donors matching your requested blood group(s): {requestedBloodGroups.join(', ')}.
            </p>
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
                  className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden"
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
                        <div className="flex items-center space-x-1 truncate">
                          <h3 className="text-lg font-bold text-slate-900 truncate">{donor.displayName}</h3>
                          {donor.isVerified && (
                            <span title="Verified Donor">
                              <ShieldCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                            </span>
                          )}
                        </div>
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
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Donations</p>
                      <div className="flex items-center text-slate-900">
                        <Droplet className="w-4 h-4 mr-1.5 text-red-500" />
                        <span className="text-sm font-bold">{donor.totalDonations || 0}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Donor Score</p>
                      <div className="flex items-center text-slate-900">
                        <Award className="w-4 h-4 mr-1.5 text-amber-500" />
                        <span className="text-sm font-bold">{donor.donorScore || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="break-words" title={donor.location}>{donor.location}</span>
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
                            id: donor.uid || donor.id,
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

      {recentDonations.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-8 overflow-hidden">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Award className="w-6 h-6 mr-2 text-red-500" />
            রক্ত দিলে হয় না ক্ষতি, জাগ্রত হয় মানবিক অনুভূতি।
          </h2>
          <div className="relative h-32 sm:h-24">
            <AnimatePresence mode="wait">
              {recentDonations.length > 0 && (
                <motion.div
                  key={currentNewsIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center"
                >
                  <p className="text-slate-700 text-sm sm:text-base">
                    <span className="font-bold text-red-600">
                      {recentDonations[currentNewsIndex].donorUid ? donors.find(d => d.uid === recentDonations[currentNewsIndex].donorUid)?.displayName || 'A donor' : 'A donor'}
                    </span> donated <span className="font-bold">{recentDonations[currentNewsIndex].bloodGroup}</span> blood to <span className="font-bold">{recentDonations[currentNewsIndex].recipientName}</span> on {(() => {
                      try {
                        return format(recentDonations[currentNewsIndex].date, 'dd MMMM, yyyy');
                      } catch (e) {
                        return 'Unknown Date';
                      }
                    })()} in {recentDonations[currentNewsIndex].hospitalName || recentDonations[currentNewsIndex].location}. This was {recentDonations[currentNewsIndex].donorGender === 'female' ? 'her' : recentDonations[currentNewsIndex].donorGender === 'male' ? 'his' : 'their'} <span className="font-bold">{recentDonations[currentNewsIndex].donorDonationCount || 1}{
                      (() => {
                        const n = recentDonations[currentNewsIndex].donorDonationCount || 1;
                        const s = ["th", "st", "nd", "rd"];
                        const v = n % 100;
                        return s[(v - 20) % 10] || s[v] || s[0];
                      })()
                    }</span> time blood donation.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {recentDonations.length > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              {recentDonations.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentNewsIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === currentNewsIndex ? 'bg-red-600' : 'bg-slate-300 hover:bg-slate-400'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <FAQAndTerms />

      {/* Delete Confirm Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Request</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this blood request? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirmModal(null)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                >
                  Delete Request
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
                  No
                </button>
                <button
                  onClick={handleDonateConfirm}
                  disabled={isDonating}
                  className={`flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center ${isDonating ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isDonating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Yes'}
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
                <div className="relative">
                  <label htmlFor="fulfilledBy" className="block text-sm font-medium text-slate-700 mb-1">
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
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                    <button
                      onClick={() => setFulfilledBy('Other Donor')}
                      className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors"
                    >
                      Other
                    </button>
                  </div>

                  {/* Search Results Dropdown */}
                  {donorSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {donorSearchResults.map(donor => (
                        <button
                          key={donor.id}
                          onClick={() => {
                            setFulfilledBy(donor.donorId || donor.displayName);
                            setDonorSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{donor.displayName}</span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{donor.donorId}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">{donor.bloodGroup}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
                  setDonorSearchResults([]);
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

      {/* Eligibility Summary Modal */}
      {showEligibilitySummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <EligibilitySummary
            userProfile={userProfile}
            onCancel={() => setShowEligibilitySummary(null)}
            onEdit={() => {
              setShowEligibilitySummary(null);
              navigate('/profile');
            }}
            onConfirm={() => {
              const req = showEligibilitySummary;
              setShowEligibilitySummary(null);
              setDonateConfirmModal(req);
            }}
          />
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
