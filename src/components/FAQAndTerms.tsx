import React from 'react';
import { HelpCircle, ShieldCheck, Info, Droplet, Heart, CheckCircle2, Clock } from 'lucide-react';

export default function FAQAndTerms() {
  return (
    <div className="mt-16 space-y-12 pb-12">
      {/* FAQ Section */}
      <section>
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-red-100 p-2 rounded-lg">
            <HelpCircle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">রক্তদান সম্পর্কে সাধারণ জিজ্ঞাসা (FAQ)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center">
              <Droplet className="w-4 h-4 mr-2 text-red-500" /> কারা রক্ত দিতে পারবেন?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              ১৮ থেকে ৬০ বছর বয়সী যেকোনো সুস্থ ব্যক্তি রক্ত দিতে পারেন। রক্তদাতার ওজন অন্তত ৪৫ কেজি (পুরুষ) বা ৫০ কেজি (মহিলা) হওয়া প্রয়োজন। রক্তদানের সময় রক্তদাতার শরীরের তাপমাত্রা, রক্তচাপ এবং পালস স্বাভাবিক থাকতে হবে।
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-red-500" /> কতদিন পর পর রক্ত দেওয়া যায়?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              একজন সুস্থ পুরুষ প্রতি ৩ মাস অন্তর এবং একজন সুস্থ মহিলা প্রতি ৪ মাস অন্তর রক্ত দিতে পারেন। এই সময়ের মধ্যে শরীর রক্তকণিকার ঘাটতি পূরণ করে ফেলে।
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center">
              <Heart className="w-4 h-4 mr-2 text-red-500" /> রক্ত দিলে কি শরীর দুর্বল হয়?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              না, রক্ত দিলে শরীর দুর্বল হয় না। বরং রক্তদানের কয়েক ঘন্টার মধ্যেই শরীরের তরল অংশ পূরণ হয়ে যায় এবং কয়েক সপ্তাহের মধ্যে নতুন রক্তকণিকা তৈরি হয়। রক্তদান হৃদরোগের ঝুঁকি কমায় এবং শরীরে নতুন রক্তকণিকা তৈরিতে সাহায্য করে।
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-red-500" /> রক্তদানের আগে ও পরে করণীয় কি?
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              রক্তদানের আগে ভালো করে খাবার খেতে হবে এবং প্রচুর পানি পান করতে হবে। রক্তদানের পর অন্তত ১০-১৫ মিনিট বিশ্রাম নিতে হবে এবং ঐদিন ভারী কাজ করা থেকে বিরত থাকতে হবে।
            </p>
          </div>
        </div>
      </section>

      {/* Terms Section */}
      <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">আমাদের শর্তাবলী ও নীতিমালা</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            "রক্তদান সম্পূর্ণ একটি স্বেচ্ছাসেবী এবং মানবিক কাজ।",
            "রক্তের জন্য কোনো প্রকার আর্থিক লেনদেন করা কঠোরভাবে নিষিদ্ধ।",
            "রক্তদাতার সঠিক তথ্য প্রদান করা বাধ্যতামূলক।",
            "জরুরী প্রয়োজনে সরাসরি রক্তদাতার সাথে যোগাযোগ করুন।",
            "ভুল তথ্য প্রদান করলে আপনার অ্যাকাউন্ট বাতিল করা হতে পারে।",
            "আমরা শুধুমাত্র রক্তদাতা ও গ্রহীতার মধ্যে যোগাযোগ স্থাপনে সাহায্য করি।"
          ].map((term, i) => (
            <div key={i} className="flex items-start space-x-3 text-sm text-slate-600">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{term}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
