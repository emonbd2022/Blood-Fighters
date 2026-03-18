import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, AlertCircle, Calendar, MapPin, Phone, User, Activity, AlertTriangle, Navigation, MessageCircle } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function CreateRequest() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  
  const [formData, setFormData] = useState({
    patientIssue: '',
    guardianName: '',
    hospitalName: '',
    bloodGroup: '',
    amount: '1 Bag',
    date: '',
    location: '',
    contact: userProfile?.phone || '',
    urgency: 'Medium',
    whatsapp: '',
    messengerId: '',
  });
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchRequest = async () => {
        try {
          const docRef = doc(db, 'bloodRequests', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.requesterUid !== userProfile?.uid) {
              alert("You don't have permission to edit this request.");
              navigate('/');
              return;
            }
            setFormData({
              patientIssue: data.patientIssue || '',
              guardianName: data.guardianName || '',
              hospitalName: data.hospitalName || '',
              bloodGroup: data.bloodGroup || '',
              amount: data.amount || '1 Bag',
              date: data.date || '',
              location: data.location || '',
              contact: data.contact || '',
              urgency: data.urgency || 'Medium',
              whatsapp: data.whatsapp || '',
              messengerId: data.messengerId || '',
            });
            if (data.coordinates) {
              setCoordinates(data.coordinates);
            }
          }
        } catch (error) {
          console.error("Error fetching request:", error);
        } finally {
          setInitialLoading(false);
        }
      };
      fetchRequest();
    }
  }, [id, userProfile, navigate]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            location: data.display_name
          }));
        } catch (error) {
          console.error('Error fetching location name:', error);
        }
        
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocating(false);
        alert('Unable to retrieve your location. You can still post the request without precise map coordinates.');
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    try {
      const requestData: any = {
        ...formData,
        requesterUid: userProfile.uid,
        requesterName: userProfile.displayName || 'Unknown',
        requesterPhoto: userProfile.photoURL || '',
      };
      
      if (coordinates) {
        requestData.coordinates = coordinates;
      }

      if (id) {
        // Update existing request
        const docRef = doc(db, 'bloodRequests', id);
        await updateDoc(docRef, {
          ...requestData,
          updatedAt: serverTimestamp()
        });
        navigate('/');
      } else {
        // Create new request
        requestData.status = 'open';
        const response = await addDoc(collection(db, 'bloodRequests'), {
          ...requestData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        if (response.id) {
          navigate('/');
        } else {
          console.error("Failed to create request");
          alert("Failed to create request. Please try again.");
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Firestore Error')) throw error;
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, id ? `bloodRequests/${id}` : 'bloodRequests');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="bg-red-50 px-6 py-8 border-b border-red-100 flex items-center space-x-4">
          <div className="h-14 w-14 bg-red-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            <Droplet className="h-7 w-7 text-red-600 fill-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{id ? 'Edit Blood Request' : 'Request Blood'}</h2>
            <p className="text-slate-600 text-sm mt-1">{id ? 'Update the details of your blood request.' : 'Fill out the form below to request blood donation.'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="patientIssue" className="block text-sm font-medium text-slate-700 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-slate-400" /> রোগীর সমস্যা (Patient Issue)
              </label>
              <input
                type="text"
                id="patientIssue"
                name="patientIssue"
                value={formData.patientIssue}
                onChange={handleChange}
                required
                placeholder="e.g. রক্তশূন্যতা (Anemia)"
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="guardianName" className="block text-sm font-medium text-slate-700 flex items-center">
                <User className="w-4 h-4 mr-2 text-slate-400" /> রোগীর অভিভাবকের নাম (Guardian Name)
              </label>
              <input
                type="text"
                id="guardianName"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleChange}
                required
                placeholder="e.g. মোঃ রহিম (Md. Rahim)"
                className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="hospitalName" className="block text-sm font-medium text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" /> হাসপাতালের নাম (Hospital Name)
                </label>
                <input
                  type="text"
                  id="hospitalName"
                  name="hospitalName"
                  value={formData.hospitalName}
                  onChange={handleChange}
                  placeholder="e.g. Dhaka Medical College Hospital"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-slate-700 flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" /> রক্তদানের স্থান (Location)
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating}
                    className="text-xs flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    {locating ? 'Locating...' : (coordinates ? 'Location Pinned ✓' : 'Realtime location')}
                  </button>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  placeholder="e.g. ঢাকা যাত্রাবাড়ী (Dhaka Jatrabari)"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
                {coordinates && (
                  <p className="text-xs text-emerald-600 mt-1">Map coordinates saved successfully.</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="bloodGroup" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Droplet className="w-4 h-4 mr-2 text-red-500" /> রক্তের গ্রুপ (Blood Group)
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
                <label htmlFor="amount" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Droplet className="w-4 h-4 mr-2 text-slate-400" /> রক্তের পরিমাণ (Amount)
                </label>
                <select
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl border bg-white shadow-sm"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={`${num} Bag${num > 1 ? 's' : ''}`}>{num} Bag{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" /> রক্তদানের তারিখ (Date)
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contact" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400" /> যোগাযোগ (Contact)
                </label>
                <input
                  type="tel"
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="e.g. 01712345678"
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
                <p className="text-xs text-slate-500">Must be exactly 11 digits.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-green-500" /> WhatsApp (Optional)
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp || ''}
                  onChange={handleChange}
                  pattern="[0-9]{11}"
                  minLength={11}
                  maxLength={11}
                  placeholder="e.g. 01712345678"
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
                <label htmlFor="urgency" className="block text-sm font-medium text-slate-700 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> Urgency (জরুরী অবস্থা)
                </label>
                <select
                  id="urgency"
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-xl border bg-white shadow-sm"
                >
                  <option value="High">High (খুব জরুরী)</option>
                  <option value="Medium">Medium (মাঝারি)</option>
                  <option value="Low">Low (সাধারণ)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mr-4 bg-white py-2.5 px-6 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : (id ? 'Update Request' : 'Post Request')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
