import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Lock, UserCheck } from 'lucide-react';

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <ShieldCheck className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Terms & Conditions</h1>
        <p className="text-slate-600 mt-4 text-lg">Your safety and privacy are our top priorities.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
            <UserCheck className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">User Conduct</h2>
          <p className="text-slate-600 leading-relaxed">
            By using this platform, you agree to provide accurate information about your health and donation history. 
            Any misuse of the platform, including harassment or fraudulent requests, will result in immediate account termination.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Privacy Policy</h2>
          <p className="text-slate-600 leading-relaxed">
            We respect your privacy. Your contact information is only shared with verified users who have matching blood group needs. 
            We do not sell your data to third parties.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
            <FileText className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Liability</h2>
          <p className="text-slate-600 leading-relaxed">
            Blood Fighters of Bhairab is a platform to connect donors and recipients. 
            We do not provide medical services and are not liable for any medical complications arising from donations. 
            Always consult with a medical professional.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Data Security</h2>
          <p className="text-slate-600 leading-relaxed">
            We use industry-standard encryption and security measures to protect your data. 
            However, no platform is 100% secure. Please use a strong password and keep your account details private.
          </p>
        </motion.div>
      </div>

      <div className="mt-16 p-8 bg-slate-50 rounded-3xl border border-slate-100 text-center">
        <p className="text-slate-500 text-sm">
          Last updated: March 18, 2026. By continuing to use our platform, you agree to these terms.
        </p>
      </div>
    </div>
  );
}
