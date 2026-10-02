import { PART } from '../../../engine/data/parts';
import type { Issue, SlotId } from '../../../engine/spec';

export const PARAM_LABEL = {
  redline: 'Régime maxi',
  ignitionAdvance: "Avance à l'allumage",
  firingOrder: "Ordre d'allumage",
} as const;

/** Nom lisible d'un emplacement ou d'un réglage, repris de la fiche des pièces pour rester cohérent avec la vue 3D. */
export function targetLabel(t: Issue['targets'][number]) {
  if (t.startsWith('params.')) return PARAM_LABEL[t.slice(7) as keyof typeof PARAM_LABEL];
  return PART[t as SlotId]?.name ?? t;
}

export const GROUPS: { title: string; note: string; slots: SlotId[] }[] = [
  { title: 'Bas moteur', note: 'Cylindrée, course et hauteur des pistons.', slots: ['bloc', 'vilo', 'bielle', 'piston', 'segments', 'joint'] },
  { title: 'Haut moteur', note: 'Chambre de combustion et distribution.', slots: ['culasse', 'arb_adm', 'arb_ech', 'ressort'] },
];
