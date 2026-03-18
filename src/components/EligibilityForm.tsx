import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Shield, Navigation } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface EligibilityFormProps {
  initialData: {
    bloodGroup: string;
    location: string;
    phone: string;
    lastDonationDate?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function EligibilityForm({ initialData, onSubmit, onCancel }: EligibilityFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    ...initialData,
    age: '',
    weight: '',
    gender: '',
    feelingHealthy: null as boolean | null,
    hasInfection: null as boolean | null,
    takingMedicine: null as boolean | null,
    donatedBefore: initialData.lastDonationDate ? true : null as boolean | null,
    lastDonation: initialData.lastDonationDate || '',
    previousProblems: null as boolean | null,
    hasDiseases: null as boolean | null,
    hasHepatitisOrHIV: null as boolean | null,
    hasRecentMalaria: null as boolean | null,
    smokeOrDrink: null as boolean | null,
    takenDrugs: null as boolean | null,
    recentSurgery: null as boolean | null,
    recentTattoo: null as boolean | null,
    recentVaccine: null as boolean | null,
    isPregnant: null as boolean | null,
    isBreastfeeding: null as boolean | null,
    onPeriod: null as boolean | null,
    voluntary: null as boolean | null,
    infoCorrect: null as boolean | null,
  });

  const [disqualification, setDisqualification] = useState<string | null>(null);

  const totalSteps = formData.gender === 'female' ? 8 : 7; // Skip step 7 for males

  const handleNext = () => {
    // Check disqualifications for current step
    if (step === 1) {
      if (parseInt(formData.age) < 18) {
        setDisqualification("You must be at least 18 years old to donate blood. / রক্তদানের জন্য আপনার বয়স অন্তত ১৮ বছর হতে হবে।");
        return;
      }
      if (parseInt(formData.weight) < 50) {
        setDisqualification("You must weigh at least 50 kg to donate blood. / রক্তদানের জন্য আপনার ওজন অন্তত ৫০ কেজি হতে হবে।");
        return;
      }
    } else if (step === 2) {
      if (formData.feelingHealthy === false) {
        setDisqualification("You must be feeling healthy today to donate. / রক্তদানের জন্য আপনাকে আজ সুস্থ বোধ করতে হবে।");
        return;
      }
      if (formData.hasInfection === true) {
        setDisqualification("You cannot donate with an active infection. / সংক্রমণ থাকলে আপনি রক্ত দিতে পারবেন না।");
        return;
      }
    } else if (step === 3) {
      if (formData.donatedBefore) {
        if (formData.lastDonation === 'less_than_3_months') {
          setDisqualification("You must wait at least 3 months between donations. / রক্তদানের মাঝে অন্তত ৩ মাসের বিরতি থাকতে হবে।");
          return;
        }
        
        // Check actual date if it's an ISO string
        if (formData.lastDonation && !['less_than_3_months', '3_to_6_months', 'more_than_6_months'].includes(formData.lastDonation)) {
          const lastDate = new Date(formData.lastDonation);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          if (lastDate > threeMonthsAgo) {
            setDisqualification("You must wait at least 3 months between donations. / রক্তদানের মাঝে অন্তত ৩ মাসের বিরতি থাকতে হবে।");
            return;
          }
        }
      }
    } else if (step === 4) {
      if (formData.hasDiseases === true || formData.hasHepatitisOrHIV === true || formData.hasRecentMalaria === true) {
        setDisqualification("You are not eligible to donate due to medical conditions. / শারীরিক অবস্থার কারণে আপনি রক্তদানের যোগ্য নন।");
        return;
      }
    } else if (step === 5) {
      if (formData.takenDrugs === true) {
        setDisqualification("You are not eligible to donate. / আপনি রক্তদানের যোগ্য নন।");
        return;
      }
    } else if (step === 6) {
      if (formData.recentSurgery === true || formData.recentTattoo === true) {
        setDisqualification("You must wait 6 months after surgery or tattoo to donate. / অপারেশন বা ট্যাটুর পর রক্তদানের জন্য ৬ মাস অপেক্ষা করতে হবে।");
        return;
      }
    } else if (step === 7 && formData.gender === 'female') {
      if (formData.isPregnant === true || formData.isBreastfeeding === true) {
        setDisqualification("You cannot donate while pregnant or breastfeeding. / গর্ভাবস্থায় বা স্তন্যপান করানোর সময় রক্তদান করা যাবে না।");
        return;
      }
    }

    if (step === 6 && formData.gender !== 'female') {
      setStep(8); // Skip step 7 for males
    } else if (step < 8) {
      setStep(step + 1);
    } else {
      // Final submit
      if (formData.voluntary === true && formData.infoCorrect === true) {
        onSubmit(formData);
      } else {
        setDisqualification("You must agree to all conditions to proceed. / এগিয়ে যাওয়ার জন্য আপনাকে সব শর্তে সম্মত হতে হবে।");
      }
    }
  };

  const handlePrev = () => {
    setDisqualification(null);
    if (step === 8 && formData.gender !== 'female') {
      setStep(6);
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      onCancel();
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setDisqualification(null);
  };

  const renderYesNo = (field: string, labelEn: string, labelBn: string) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-800 mb-1">{labelEn}</label>
      <label className="block text-xs text-slate-500 mb-3">{labelBn}</label>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => updateField(field, true)}
          className={`flex-1 py-3 rounded-xl border-2 font-medium transition-colors ${
            (formData as any)[field] === true
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          Yes / হ্যাঁ
        </button>
        <button
          type="button"
          onClick={() => updateField(field, false)}
          className={`flex-1 py-3 rounded-xl border-2 font-medium transition-colors ${
            (formData as any)[field] === false
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          No / না
        </button>
      </div>
    </div>
  );

  const isStepValid = () => {
    if (step === 1) return formData.age && formData.weight && formData.bloodGroup && formData.gender && formData.phone && formData.location;
    if (step === 2) return formData.feelingHealthy !== null && formData.hasInfection !== null && formData.takingMedicine !== null;
    if (step === 3) return formData.donatedBefore !== null && (formData.donatedBefore ? formData.lastDonation && formData.previousProblems !== null : true);
    if (step === 4) return formData.hasDiseases !== null && formData.hasHepatitisOrHIV !== null && formData.hasRecentMalaria !== null;
    if (step === 5) return formData.smokeOrDrink !== null && formData.takenDrugs !== null;
    if (step === 6) return formData.recentSurgery !== null && formData.recentTattoo !== null && formData.recentVaccine !== null;
    if (step === 7) return formData.isPregnant !== null && formData.isBreastfeeding !== null && formData.onPeriod !== null;
    if (step === 8) return formData.voluntary !== null && formData.infoCorrect !== null;
    return false;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-900">Donor Eligibility</h2>
          <span className="text-sm font-medium text-slate-500">Step {step === 8 && formData.gender !== 'female' ? 7 : step} of {totalSteps}</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${((step === 8 && formData.gender !== 'female' ? 7 : step) / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {disqualification ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-red-800 mb-2">Not Eligible / যোগ্য নন</h3>
              <p className="text-red-600 mb-6">{disqualification}</p>
              <button
                onClick={() => setDisqualification(null)}
                className="px-6 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50"
              >
                Go Back / ফিরে যান
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">1. Basic Information</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Age / বয়স</label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => updateField('age', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Weight / ওজন (kg)</label>
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => updateField('weight', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 65"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Blood Group / রক্তের গ্রুপ</label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => updateField('bloodGroup', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="" disabled>Select</option>
                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Gender / লিঙ্গ</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500 bg-white"
                      >
                        <option value="" disabled>Select</option>
                        <option value="male">Male / পুরুষ</option>
                        <option value="female">Female / মহিলা</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Phone / ফোন নম্বর</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. 01..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Location / ঠিকানা</label>
                      <div className="flex space-x-2 mt-1">
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => updateField('location', e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500"
                          placeholder="e.g. Dhaka"
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
                                    updateField('location', data.display_name);
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
                          className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <Navigation className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">2. General Health Condition</h3>
                  {renderYesNo('feelingHealthy', 'Are you feeling healthy today?', 'আপনি কি আজ নিজেকে সুস্থ মনে করছেন?')}
                  {renderYesNo('hasInfection', 'Do you have fever, cold, or any infection now?', 'আপনার কি এখন জ্বর, সর্দি, বা কোনো সংক্রমণ আছে?')}
                  {renderYesNo('takingMedicine', 'Are you currently taking any medicine?', 'আপনি কি বর্তমানে কোনো ওষুধ খাচ্ছেন?')}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">3. Donation History</h3>
                  {renderYesNo('donatedBefore', 'Have you donated blood before?', 'আপনি কি আগে রক্ত দিয়েছেন?')}
                  
                  {formData.donatedBefore && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="block text-sm font-medium text-slate-800 mb-1">When was your last blood donation?</label>
                      <label className="block text-xs text-slate-500 mb-3">আপনি শেষ কবে রক্ত দিয়েছেন?</label>
                      
                      {initialData.lastDonationDate && !['less_than_3_months', '3_to_6_months', 'more_than_6_months'].includes(initialData.lastDonationDate) ? (
                        <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200 text-sm">
                          <p className="text-slate-600">Recorded last donation: <span className="font-bold text-slate-900">{new Date(initialData.lastDonationDate).toLocaleDateString()}</span></p>
                          <p className="text-xs text-slate-500 mt-1">This is from your profile. / এটি আপনার প্রোফাইল থেকে নেওয়া হয়েছে।</p>
                        </div>
                      ) : (
                        <select
                          value={formData.lastDonation}
                          onChange={(e) => updateField('lastDonation', e.target.value)}
                          className="block w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-red-500 focus:border-red-500 bg-white mb-4"
                        >
                          <option value="" disabled>Select time</option>
                          <option value="less_than_3_months">Less than 3 months ago</option>
                          <option value="3_to_6_months">3 to 6 months ago</option>
                          <option value="more_than_6_months">More than 6 months ago</option>
                        </select>
                      )}

                      {renderYesNo('previousProblems', 'Did you face any problems during previous donation?', 'আগের রক্তদানে কোনো সমস্যা হয়েছিল কি?')}
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">4. Medical Conditions</h3>
                  {renderYesNo('hasDiseases', 'Do you have any of these diseases? (Diabetes, Heart disease, High blood pressure)', 'আপনার কি এসব রোগ আছে? (ডায়াবেটিস, হৃদরোগ, উচ্চ রক্তচাপ)')}
                  {renderYesNo('hasHepatitisOrHIV', 'Have you ever had Hepatitis B/C or HIV/AIDS?', 'আপনার কি কখনো হেপাটাইটিস বি/সি বা এইচআইভি/এইডস হয়েছে?')}
                  {renderYesNo('hasRecentMalaria', 'Have you had malaria, typhoid, or dengue recently?', 'সম্প্রতি কি আপনার ম্যালেরিয়া, টাইফয়েড বা ডেঙ্গু হয়েছে?')}
                </div>
              )}

              {step === 5 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">5. Lifestyle & Risk Factors</h3>
                  {renderYesNo('smokeOrDrink', 'Do you smoke or drink alcohol regularly?', 'আপনি কি নিয়মিত ধূমপান বা মদ্যপান করেন?')}
                  {renderYesNo('takenDrugs', 'Have you taken any drugs or injections not prescribed by a doctor?', 'আপনি কি ডাক্তারের পরামর্শ ছাড়া কোনো ইনজেকশন বা মাদক নিয়েছেন?')}
                </div>
              )}

              {step === 6 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">6. Recent Activities</h3>
                  {renderYesNo('recentSurgery', 'Have you had any surgery in the last 6 months?', 'গত ৬ মাসে কি আপনার কোনো অপারেশন হয়েছে?')}
                  {renderYesNo('recentTattoo', 'Have you had any tattoo or piercing in the last 6 months?', 'গত ৬ মাসে কি আপনি ট্যাটু বা পিয়ার্সিং করেছেন?')}
                  {renderYesNo('recentVaccine', 'Have you received any vaccine recently?', 'সম্প্রতি কি আপনি কোনো ভ্যাকসিন নিয়েছেন?')}
                </div>
              )}

              {step === 7 && formData.gender === 'female' && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">7. For Female Donors</h3>
                  {renderYesNo('isPregnant', 'Are you currently pregnant?', 'আপনি কি বর্তমানে গর্ভবতী?')}
                  {renderYesNo('isBreastfeeding', 'Are you breastfeeding?', 'আপনি কি শিশুকে দুধ খাওয়াচ্ছেন?')}
                  {renderYesNo('onPeriod', 'Are you on your menstrual period today?', 'আপনার কি আজ মাসিক চলছে?')}
                </div>
              )}

              {step === 8 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">8. Consent & Final Check</h3>
                  {renderYesNo('voluntary', 'Are you willing to donate blood voluntarily?', 'আপনি কি স্বেচ্ছায় রক্ত দিতে রাজি?')}
                  {renderYesNo('infoCorrect', 'Is all the information you provided correct?', 'আপনি যে তথ্য দিয়েছেন তা কি সঠিক?')}
                  
                  <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start">
                    <Shield className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Your information is safe and only used for donation safety.</p>
                      <p className="text-xs text-emerald-600 mt-1">আপনার তথ্য নিরাপদ এবং শুধুমাত্র রক্তদানের জন্য ব্যবহৃত হবে।</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6 border-t border-slate-100 mt-8">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors flex items-center"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                  {step === 8 ? 'Complete Profile' : 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
