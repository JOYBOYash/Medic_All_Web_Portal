export interface UserProfile {
  id: string;
  email: string | null;
  role: 'doctor' | 'patient';
  displayName?: string | null;
  photoURL?: string | null;
}

export interface ClinicDetails {
  id: string; // Usually doctor's UID
  clinicName: string;
  address: string;
  phoneNumber: string;
  specialization?: string;
}

export interface Patient {
  id: string;
  doctorId: string; // UID of the doctor who created this patient
  name: string;
  age: number;
  sex: 'male' | 'female' | 'other';
  complications: string; // Text area for main health issues
  createdAt: Date;
  updatedAt: Date;
}

export interface Medicine {
  id: string;
  doctorId: string; // UID of the doctor who added this medicine
  name: string;
  description?: string; // e.g., potency, form (pills, liquid)
  // any other relevant fields like common uses, stock, etc.
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescribedMedicine {
  medicineId: string;
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
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  patientRemarks?: string; // Notes from patient before/during appointment
  doctorNotes?: string; // Doctor's private notes
  painSeverity?: PainSeverity;
  symptoms?: string[]; // Could be keywords or selected from a list
  prescriptions: PrescribedMedicine[];
  nextAppointmentDate?: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// For dropdowns
export const painSeverityOptions: { value: PainSeverity; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'excruciating', label: 'Excruciating' },
];

// Example common symptoms, this list could be managed by the doctor or be predefined
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
