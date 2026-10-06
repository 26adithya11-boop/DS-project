import { BedSlot } from '../types/hospital';

export const INITIAL_BEDS: BedSlot[] = [
  {
    id: 'er-bay-1',
    name: 'ER Trauma Bay 1',
    department: 'ER',
    roomType: 'TRAUMA_RESUS',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Sarah Vance, MD',
      nurse: 'R. Miller, RN (Trauma Certified)',
      role: 'Attending Emergency Physician'
    },
    treatmentTotalDuration: 35,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'er-bay-2',
    name: 'ER Trauma Bay 2',
    department: 'ER',
    roomType: 'TRAUMA_RESUS',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Marcus Chen, MD',
      nurse: 'K. Kowalski, RN',
      role: 'Emergency Medicine Specialist'
    },
    treatmentTotalDuration: 40,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'er-acute-1',
    name: 'Acute Treatment Bed 3',
    department: 'ER',
    roomType: 'ACUTE_CARE',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Elena Rostova, MD',
      nurse: 'J. Davis, BSN',
      role: 'Acute Care Physician'
    },
    treatmentTotalDuration: 25,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'er-acute-2',
    name: 'Acute Treatment Bed 4',
    department: 'ER',
    roomType: 'ACUTE_CARE',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Aaron Patel, DO',
      nurse: 'S. Jenkins, RN',
      role: 'Emergency Resident'
    },
    treatmentTotalDuration: 20,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'or-suite-1',
    name: 'OR Suite 1 (Trauma & Vascular)',
    department: 'OR',
    roomType: 'OR_SUITE',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Julian Thorne, MD, FACS',
      nurse: 'M. O\'Connor, CRNA & Scrub Nurse',
      role: 'Chief Trauma Surgeon'
    },
    treatmentTotalDuration: 55,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'or-suite-2',
    name: 'OR Suite 2 (Cardiothoracic & Neuro)',
    department: 'OR',
    roomType: 'OR_SUITE',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Sophia Lindqvist, MD, PhD',
      nurse: 'T. Becker, Scrub Tech & Perfusionist',
      role: 'Cardiothoracic Surgeon'
    },
    treatmentTotalDuration: 65,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  },
  {
    id: 'or-suite-3',
    name: 'OR Suite 3 (General Acute Surgery)',
    department: 'OR',
    roomType: 'OR_SUITE',
    patient: null,
    assignedStaff: {
      doctor: 'Dr. Tariq Al-Mansoor, MD',
      nurse: 'L. Gomez, OR Lead RN',
      role: 'General & Laparoscopic Surgeon'
    },
    treatmentTotalDuration: 45,
    treatmentElapsedSeconds: 0,
    status: 'AVAILABLE'
  }
];
