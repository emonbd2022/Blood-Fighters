export interface UserProfile {
  donorId?: string;
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bloodGroup?: string;
  location?: string;
  phone?: string;
  whatsapp?: string;
  messengerId?: string;
  gmail?: string;
  gender?: string;
  fcmToken?: string;
  eligibilityData?: any;
  lastDonationDate?: string;
  totalDonations?: number;
  donorScore?: number;
  isVerified?: boolean;
  isProfileComplete: boolean;
  lastReadNotifications?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Donor {
  id?: string;
  donorId?: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  bloodGroup: string;
  location: string;
  phone?: string;
  gender?: string;
  whatsapp?: string;
  messengerId?: string;
  gmail?: string;
  isAvailable: boolean;
  lastDonationDate?: string;
  totalDonations?: number;
  donorScore?: number;
  isVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonationRecord {
  id?: string;
  donorUid: string;
  recipientUid: string;
  recipientName: string;
  requestId: string;
  date: Date;
  bloodGroup: string;
  location: string;
  hospitalName?: string;
  donorGender?: string;
  donorDonationCount?: number;
  createdAt: Date;
}

export interface Chat {
  id?: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  text: string;
  type?: 'text' | 'location';
  location?: { lat: number; lng: number };
  createdAt: Date;
}

export interface BloodRequest {
  id?: string;
  requesterUid: string;
  requesterName: string;
  requesterPhoto?: string;
  patientIssue: string;
  guardianName?: string;
  hospitalName?: string;
  bloodGroup: string;
  amount: string;
  date: string;
  time?: string;
  location: string;
  contact: string;
  whatsapp?: string;
  messengerId?: string;
  urgency: 'High' | 'Medium' | 'Low';
  coordinates?: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'fulfilled' | 'open' | 'pending_fulfillment';
  fulfilledBy?: string;
  fulfilledByUid?: string;
  pendingDonors?: string[];
  createdAt: Date;
  updatedAt: Date;
}
