import { systemColors } from '@ds/tokens';

export type SystemId = 'str' | 'mob' | 'dis' | 'ign' | 'air' | 'flu' | 'ele';

export interface System {
  id: SystemId;
  name: string;
  color: string;
}

export const SYSTEMS: System[] = [
  { id: 'str', name: 'Structure', color: systemColors.gray },
  { id: 'mob', name: 'Équipage mobile', color: systemColors.orange },
  { id: 'dis', name: 'Distribution', color: systemColors.yellow },
  { id: 'ign', name: 'Allumage et injection', color: systemColors.purple },
  { id: 'air', name: 'Admission et échappement', color: systemColors.blue },
  { id: 'flu', name: 'Huile et refroidissement', color: systemColors.teal },
  { id: 'ele', name: 'Accessoires', color: systemColors.pink },
];

export const SYSTEM = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, System>;
