import React, { useEffect, useState } from 'react';
import { Droplet, Heart, Facebook, Mail, Phone, Info, ShieldCheck, HelpCircle, Users, Award, ExternalLink, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Footer() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonations: 0,
    totalDonors: 0
  });

  useEffect(() => {
    // Real-time listeners for stats
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubDonations = onSnapshot(collection(db, 'donation_history'), (snap) => {
      setStats(prev => ({ ...prev, totalDonations: snap.size }));
    });

    const unsubDonors = onSnapshot(collection(db, 'donors'), (snap) => {
      setStats(prev => ({ ...prev, totalDonors: snap.size }));
    });

    return () => {
      unsubUsers();
      unsubDonations();
      unsubDonors();
    };
  }, []);

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-b border-slate-800 pb-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-2xl mb-4">
              <Users className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalUsers}+</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Total Users</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-2xl mb-4">
              <Heart className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalDonors}+</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Active Donors</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/10 rounded-2xl mb-4">
              <Award className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalDonations}+</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Lives Saved</div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 rounded-2xl mb-4">
              <Droplet className="w-6 h-6 text-amber-500" />
            </div>
            <div className="text-3xl font-bold text-white">24/7</div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mt-1">Availability</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand & About */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-white">
              <Droplet className="h-8 w-8 text-red-500 fill-current" />
              <span className="text-xl font-black tracking-tighter uppercase">Blood Fighters of Bhairab</span>
            </div>
            <p className="text-sm leading-relaxed">
              ভৈরবের রক্ত যোদ্ধাদের একটি স্বেচ্ছাসেবী প্ল্যাটফর্ম। আমাদের লক্ষ্য রক্তদানের মাধ্যমে মানুষের জীবন বাঁচানো এবং একটি সচেতন সমাজ গড়ে তোলা।
            </p>
            <div className="space-y-3">
              <h5 className="text-white font-bold text-sm uppercase tracking-widest">Community</h5>
              <div className="flex flex-col space-y-2 text-sm">
                <a href="https://www.facebook.com/bfbhairab" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-white transition-colors">
                  <Facebook className="w-4 h-4 mr-2" /> Facebook Page
                </a>
                <a href="https://www.facebook.com/groups/1234105410440732" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-white transition-colors">
                  <Facebook className="w-4 h-4 mr-2" /> Facebook Group
                </a>
                <a href="mailto:bfbhairab@gmail.com" className="flex items-center hover:text-white transition-colors">
                  <Mail className="w-4 h-4 mr-2" /> bfbhairab@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:pl-8">
            <h4 className="text-white font-bold mb-6 flex items-center">
              <Info className="w-4 h-4 mr-2 text-red-500" /> প্রয়োজনীয় লিঙ্ক
            </h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">হোম</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">আমার প্রোফাইল</Link></li>
              <li><Link to="/request" className="hover:text-white transition-colors">রক্তের আবেদন করুন</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">রক্তদান সম্পর্কে জিজ্ঞাসা (FAQ)</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">শর্তাবলী ও নীতিমালা</Link></li>
            </ul>
          </div>

          {/* Developer Details */}
          <div className="lg:pl-8">
            <h4 className="text-white font-bold mb-6 flex items-center">
              <Award className="w-4 h-4 mr-2 text-red-500" /> Developer
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-white font-bold">Shahin Alam Emon</p>
                <p className="text-xs text-slate-500">Vibe Coder</p>
              </div>
              <div className="flex flex-col space-y-2 text-sm">
                <a href="https://www.facebook.com/reactoremonbd" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-white transition-colors">
                  <Facebook className="w-4 h-4 mr-2" /> Facebook
                </a>
                <a href="https://shahinalamemon.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-white transition-colors">
                  <ExternalLink className="w-4 h-4 mr-2" /> My Portfolio
                </a>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="lg:pl-8">
            <h4 className="text-white font-bold mb-6 flex items-center">
              <Phone className="w-4 h-4 mr-2 text-red-500" /> জরুরী যোগাযোগ
            </h4>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-xs text-slate-400 mb-2">যেকোনো প্রয়োজনে কল করুন</p>
              <a href="tel:01961616110" className="text-lg font-bold text-white hover:text-red-500 transition-colors flex items-center">
                <Phone className="w-4 h-4 mr-2" />01961-616110</a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Blood Fighters of Bhairab. All rights reserved.</p>
          <div className="flex items-center space-x-1">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-current" />
            <span>for the people of Bhairab</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
