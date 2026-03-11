import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.requests": "Requests",
    "nav.dashboard": "Dashboard",
    "nav.login": "Login / Register",
    "nav.logout": "Logout",
    "home.hero.title": "Save a Life, Give Blood",
    "home.hero.subtitle": "Join our community of blood fighters. Your donation can bring hope and life to someone in need.",
    "home.hero.cta": "Find Blood Requests",
    "req.title": "Blood Requests",
    "req.create": "Create Request",
    "req.patientCondition": "Patient Condition",
    "req.bloodGroup": "Blood Group Needed",
    "req.amount": "Required Amount (bags)",
    "req.hemoglobin": "Hemoglobin Level (g/dL)",
    "req.date": "Donation Date",
    "req.time": "Preferred Time",
    "req.hospital": "Hospital / Location",
    "req.district": "District",
    "req.upazila": "Upazila / Area",
    "req.address": "Address",
    "req.urgency": "Urgency Level",
    "req.contactName": "Contact Person",
    "req.contactPhone": "Contact Phone",
    "req.notes": "Additional Notes",
    "req.submit": "Submit Request",
    "req.status.pending": "Pending",
    "req.status.accepted": "Accepted",
    "req.status.donated": "Donated",
    "req.status.approved": "Approved",
    "req.status.rejected": "Rejected",
    "req.action.ican": "I can give",
    "req.action.ihave": "I have given",
    "req.action.approve": "Approve",
    "req.action.reject": "Reject",
    "req.donatedBy": "Blood Donated by",
  },
  bn: {
    "nav.requests": "অনুরোধসমূহ",
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.login": "লগইন / নিবন্ধন",
    "nav.logout": "লগআউট",
    "home.hero.title": "রক্ত দিন, জীবন বাঁচান",
    "home.hero.subtitle": "আমাদের ব্লাড ফাইটার্স কমিউনিটিতে যোগ দিন। আপনার রক্তদান কারো জীবনে আশা ও আলো নিয়ে আসতে পারে।",
    "home.hero.cta": "রক্তের অনুরোধ খুঁজুন",
    "req.title": "রক্তের অনুরোধসমূহ",
    "req.create": "অনুরোধ তৈরি করুন",
    "req.patientCondition": "রোগীর সমস্যা",
    "req.bloodGroup": "প্রয়োজনীয় রক্তের গ্রুপ",
    "req.amount": "রক্তের পরিমাণ (ব্যাগ)",
    "req.hemoglobin": "হিমোগ্লোবিন (g/dL)",
    "req.date": "রক্তদানের তারিখ",
    "req.time": "রক্তদানের সময়",
    "req.hospital": "হাসপাতাল / রক্তদানের স্থান",
    "req.district": "জেলা",
    "req.upazila": "উপজেলা / এলাকা",
    "req.address": "ঠিকানা",
    "req.urgency": "জরুরিতা",
    "req.contactName": "যোগাযোগের ব্যক্তির নাম",
    "req.contactPhone": "যোগাযোগ নম্বর",
    "req.notes": "অতিরিক্ত তথ্য",
    "req.submit": "অনুরোধ জমা দিন",
    "req.status.pending": "অপেক্ষমাণ",
    "req.status.accepted": "গৃহীত",
    "req.status.donated": "রক্তদান সম্পন্ন",
    "req.status.approved": "অনুমোদিত",
    "req.status.rejected": "বাতিল",
    "req.action.ican": "আমি রক্ত দিতে ইচ্ছুক",
    "req.action.ihave": "আমি রক্ত দিয়েছি",
    "req.action.approve": "অনুমোদন করুন",
    "req.action.reject": "বাতিল করুন",
    "req.donatedBy": "রক্তদান করেছেন",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved === 'bn' || saved === 'en') ? saved : 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
