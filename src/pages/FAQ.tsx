import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';

const FAQS = [
  {
    question: "Who can donate blood?",
    answer: "Most healthy adults between 18-65 years old weighing over 50kg can donate blood. You should be in good health and not have any infectious diseases."
  },
  {
    question: "How often can I donate blood?",
    answer: "You can safely donate whole blood every 3 months (90 days). This allows your body enough time to replenish its iron stores."
  },
  {
    question: "Is blood donation safe?",
    answer: "Yes, blood donation is very safe. All needles and equipment used are sterile, single-use, and disposed of after one use. You cannot contract any diseases from donating blood."
  },
  {
    question: "What should I do before donating?",
    answer: "Eat a healthy meal, drink plenty of water, and get a good night's sleep. Avoid fatty foods and alcohol for 24 hours before donation."
  },
  {
    question: "How long does the donation process take?",
    answer: "The actual donation takes about 8-10 minutes. However, the entire process including registration and brief medical checkup takes about 45-60 minutes."
  },
  {
    question: "What happens after I click 'Donate'?",
    answer: "The recipient will receive a notification and an automated message in their inbox. They can then contact you to coordinate the donation."
  }
];

export default function FAQ() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <HelpCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">General FAQ</h1>
        <p className="text-slate-600 mt-2">Common questions for donors and recipients</p>
      </div>

      <div className="space-y-4">
        {FAQS.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <details className="group">
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <h3 className="text-lg font-semibold text-slate-900">{faq.question}</h3>
                <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-6 pb-6 text-slate-600 border-t border-slate-50 pt-4">
                {faq.answer}
              </div>
            </details>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
