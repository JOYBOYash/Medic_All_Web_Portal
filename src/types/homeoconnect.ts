
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string; // Firebase UID
  email: string | null;
  role: 'doctor' | 'patient';
  displayName?: string | null;
  photoURL?: string | null;
  contactNumber?: string;
  address?: string;
  createdAt?: Timestamp; // Firestore Timestamp
  updatedAt?: Timestamp; // Firestore Timestamp
}

export interface ClinicDetails {
  id: string; // Usually doctor's UID
  clinicName: string;
  address: string;
  phoneNumber: string;
  specialization?: string;
  // doctorId: string; // Link to the doctor's UserProfile.id
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Patient {
  id:string; // Firestore document ID
  doctorId: string; // UID of the doctor who created this patient
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  email: string; // Email associated with this patient record by the doctor, used for linking
  complications: string; // Text area for main health issues
  authUid: string | null; // Firebase Auth UID of the linked patient user account
  status?: 'active' | 'archived';
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

export interface Medicine {
  id: string; // Firestore document ID
  doctorId: string; // UID of the doctor who added this medicine
  name: string;
  description?: string; // e.g., potency, form (pills, liquid)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PrescribedMedicine {
  medicineId: string; // Refers to Medicine.id (or could be just the name if not linking to a DB of medicines)
  medicineName: string; // Denormalized for easy display
  quantity: string; // e.g., "10 pills", "1 teaspoon"
  repetition: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  instructions?: string; // e.g. "with food", "before sleep"
}

export type PainSeverity = 'none' | 'mild' | 'moderate' | 'severe' | 'excruciating';
export type CommonSymptom = 'fever' | 'cough' | 'headache' | 'fatigue' | 'nausea' | 'dizziness'; // Example, can be expanded

export interface Appointment {
  id: string; // Firestore document ID
  patientId: string; // Refers to Patient.id (the Firestore ID of the patient record)
  doctorId: string; // Doctor's Firebase UID
  appointmentDate: Timestamp; // Use Firestore Timestamp for dates
  patientRemarks?: string;
  doctorNotes?: string;
  painSeverity?: PainSeverity;
  symptoms?: string[];
  prescriptions: PrescribedMedicine[];
  nextAppointmentDate?: Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}


// CHAT-RELATED TYPES
export interface ParticipantInfo {
    displayName: string | null;
    photoURL: string | null;
}

export interface ChatRoom {
  id: string; // Composite key: patientUid_doctorUid (sorted)
  participants: string[]; // [patientUid, doctorUid]
  participantInfo: { [uid: string]: ParticipantInfo };
  lastMessage?: {
      text: string;
      timestamp: Timestamp;
      senderId: string;
  };
  unreadCounts?: { [uid: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string; // Firestore document ID
  senderId: string;
  text: string;
  timestamp: Timestamp;
}


// For dropdowns
export const painSeverityOptions: { value: PainSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'excruciating', label: 'Excruciating' },
];

export const commonSymptomsOptions: { value: string; label: string }[] = [
  { value: 'fever', label: 'Fever' },
  { value: 'cough', label: 'Cough' },
  { value: 'headache', label: 'Headache' },
  { value: 'fatigue', label: 'Fatigue' },
  { value: 'nausea', label: 'Nausea' },
  { value: 'dizziness', label: 'Dizziness' },
  { value: 'body_ache', label: 'Body Ache' },
  { value: 'sore_throat', label: 'Sore Throat' },
  { value: 'loss_of_appetite', label: 'Loss of Appetite' },
];
