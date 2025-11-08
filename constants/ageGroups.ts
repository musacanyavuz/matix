// Yaş ve sınıf grupları

export type AgeGroup = 
  | 'age4'
  | 'age5'
  | 'age6'
  | 'grade1'
  | 'grade2'
  | 'grade3'
  | 'grade4';

export interface AgeGroupOption {
  id: AgeGroup;
  label: string;
  description: string;
}

export const AGE_GROUPS: AgeGroupOption[] = [
  { id: 'age4', label: '4 Yaş', description: 'Okul öncesi' },
  { id: 'age5', label: '5 Yaş', description: 'Okul öncesi' },
  { id: 'age6', label: '6 Yaş', description: 'Okul öncesi' },
  { id: 'grade1', label: '1. Sınıf', description: 'İlkokul' },
  { id: 'grade2', label: '2. Sınıf', description: 'İlkokul' },
  { id: 'grade3', label: '3. Sınıf', description: 'İlkokul' },
  { id: 'grade4', label: '4. Sınıf', description: 'İlkokul' },
];

