import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await api.get("/donations/me");
        setDonations(res.data);
      } catch (error) {
        console.error("Failed to fetch donations", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, donationId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("proof", file);

    setUploadingId(donationId);
    try {
      const res = await api.post(`/donations/${donationId}/proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Proof uploaded! Poster generated.");
      
      // Update local state
      setDonations(donations.map((d: any) => d._id === donationId ? res.data : d));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const handleLogDonation = async () => {
    try {
      const res = await api.post("/donations", { donationDate: new Date() });
      setDonations([res.data, ...donations]);
      toast.success("Donation logged successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to log donation");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="bg-red-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
            <p className="mt-2 text-red-100">Blood Group: <span className="font-bold text-white">{user?.bloodGroup}</span></p>
          </div>
          <div className="p-6">
            <button onClick={handleLogDonation} className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition shadow-sm">
              Log New Donation
            </button>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Donation History</h2>
        
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div></div>
        ) : donations.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
            No donations logged yet. Be a hero and donate today!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {donations.map((donation: any) => (
              <motion.div key={donation._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-500">{format(new Date(donation.donationDate), "PPP")}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      donation.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {donation.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {donation.requestId && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <p className="font-medium text-gray-900">Donated for request:</p>
                      <p className="text-gray-600">{donation.requestId.patientName} at {donation.requestId.hospitalName}</p>
                    </div>
                  )}

                  {donation.status === 'pending' && (
                    <div className="mt-4">
                      <label className="cursor-pointer flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition text-gray-600">
                        {uploadingId === donation._id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <>
                            <Upload className="h-5 w-5" />
                            <span className="text-sm font-medium">Upload Proof</span>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, donation._id)} disabled={uploadingId === donation._id} />
                      </label>
                    </div>
                  )}

                  {donation.status === 'verified' && donation.posterUrl && (
                    <div className="mt-4">
                      <a href={donation.posterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-red-50 text-red-600 rounded-lg p-3 hover:bg-red-100 transition font-medium text-sm">
                        <ImageIcon className="h-5 w-5" />
                        View Hero Poster
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
