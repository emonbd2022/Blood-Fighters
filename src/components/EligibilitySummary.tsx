import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Droplet, Calendar, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface EligibilitySummaryProps {
  userProfile: any;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
}

export default function EligibilitySummary({ userProfile, onConfirm, onCancel, onEdit }: EligibilitySummaryProps) {
  const lastDonation = userProfile.lastDonationDate ? new Date(userProfile.lastDonationDate) : null;
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const isEligible = !lastDonation || lastDonation < threeMonthsAgo;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Eligibility Check</h3>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Double check your status</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isEligible ? 'Eligible' : 'In Cool-down'}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Current Profile Info</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Droplet className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-slate-700">Group: <span className="font-bold">{userProfile.bloodGroup}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-700">Last: <span className="font-bold">{(() => {
                  if (!lastDonation) return 'Never';
                  try {
                    if (isNaN(lastDonation.getTime())) return 'Unknown';
                    return format(lastDonation, 'dd MMM yyyy');
                  } catch (e) {
                    return 'Unknown';
                  }
                })()}</span></span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <p className="text-sm text-slate-600 leading-relaxed italic">
              "I confirm that I am currently healthy, not taking any medication that prevents donation, and it has been at least 3 months since my last donation."
            </p>
          </div>
          
          {!isEligible && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Our records show you donated recently. Please ensure your profile is up to date if this is incorrect.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            Update Profile
          </button>
          <button
            onClick={onConfirm}
            disabled={!isEligible}
            className="flex-[1.5] px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm & Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}
