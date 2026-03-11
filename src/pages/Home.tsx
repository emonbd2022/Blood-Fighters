import { Link } from "react-router-dom";
import { Droplet, Heart, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-red-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Droplet className="h-20 w-20 mx-auto mb-6 fill-white" />
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
              Be a Hero. Save a Life.
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-red-100 max-w-3xl mx-auto">
              Join the Blood Fighters community. We connect blood donors with patients in urgent need. Every drop counts.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/register" className="bg-white text-red-600 font-bold py-3 px-8 rounded-full shadow-lg hover:bg-gray-100 transition duration-300 text-lg">
                Become a Donor
              </Link>
              <Link to="/requests" className="bg-red-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-red-800 transition duration-300 text-lg border border-red-500">
                Find Blood
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">A seamless process to connect donors and patients.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Register</h3>
              <p className="text-gray-600">Sign up as a donor with your blood group and location.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Get Notified</h3>
              <p className="text-gray-600">Receive alerts when someone nearby needs your blood type.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Donate & Share</h3>
              <p className="text-gray-600">Donate blood, upload proof, and get a personalized hero poster.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
