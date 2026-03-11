import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { format } from "date-fns";
import { Droplet, MapPin, Clock, Phone, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ bloodGroup: "", city: "" });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await api.get(`/requests?${query}`);
      setRequests(res.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Live Blood Requests</h1>
          <Link to="/requests/new" className="bg-red-600 text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition">
            Request Blood
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col sm:flex-row gap-4">
          <select 
            className="border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 p-2 border"
            value={filters.bloodGroup}
            onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
          >
            <option value="">All Blood Groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="Filter by City" 
            className="border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 p-2 border flex-1"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req: any) => (
              <motion.div key={req._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-100 text-red-600 font-bold text-xl h-12 w-12 rounded-full flex items-center justify-center">
                        {req.bloodGroup}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{req.patientName}</h3>
                        <p className="text-sm text-gray-500">{req.unitsRequired} Units needed</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{req.hospitalName}, {req.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-red-600 font-medium">Needed by: {format(new Date(req.requiredTime), "PPp")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{req.contactPerson} - {req.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                  <button className="w-full bg-red-600 text-white font-medium py-2 rounded-lg hover:bg-red-700 transition">
                    I Can Donate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
