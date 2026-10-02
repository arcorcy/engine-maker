/*
 * Modèle de données d'un moteur personnalisable.
 * Trois niveaux : l'architecture (le modèle de départ, figé), les choix stockés (variantes de pièces et
 * quelques réglages), et les valeurs dérivées, toujours recalculées, jamais stockées.
 * Chaque grandeur physique a un seul propriétaire : l'alésage appartient au bloc, la course au vilebrequin,
 * la longueur de bielle à la bielle, le calage aux arbres à cames.
 */

/** Emplacements de pièces. Ils reprennent les identifiants des pièces de la maquette 3D. */
export type SlotId =
  | 'bloc' | 'joint' | 'culasse' | 'cache' | 'carter'
  | 'piston' | 'segments' | 'bielle' | 'vilo' | 'volant' | 'poulie'
  | 'arb_adm' | 'arb_ech' | 'sou_adm' | 'sou_ech' | 'ressort' | 'courroie'
  | 'bougie' | 'bobine' | 'injecteur'
  | 'admission' | 'papillon' | 'echappement' | 'catalyseur' | 'sonde_lambda'
  | 'filtre' | 'pompe_huile' | 'pompe_eau'
  | 'alternateur' | 'courroie_acc';

/** Propriétés portées par chaque type de variante. Unités : mm, cm³, degrés, tr/min. */
export interface SlotProps {
  bloc: { bore: number; pitch: number; deckHeight: number };
  joint: { gasketBore: number; thickness: number };
  culasse: { chamberVolume: number; maxLift: number; valveRecess: number };
  piston: { diameter: number; compressionHeight: number; domeVolume: number };
  segments: { diameter: number };
  bielle: { length: number; bigEnd: number };
  vilo: { stroke: number; pinDiameter: number };
  /** Centre de came : après le PMH pour l'admission, avant le PMH pour l'échappement. */
  arb_adm: { centerline: number; duration: number; lift: number };
  arb_ech: { centerline: number; duration: number; lift: number };
  ressort: { maxRpm: number };
}

export type ParamSlot = keyof SlotProps;
type PropsOf<S extends SlotId> = S extends ParamSlot ? SlotProps[S] : Record<string, never>;

export interface Variant<S extends SlotId = SlotId> {
  id: string;
  slot: S;
  name: string;
  /** Une phrase sur ce que change la variante. */
  note: string;
  props: PropsOf<S>;
  /** Modèles de départ auxquels la pièce se monte ; absent, elle convient à tous. */
  templates?: string[];
}

export interface Template {
  id: string;
  name: string;
  /** Nom court, par exemple « V8 5.0 ». */
  short: string;
  /** Une phrase de présentation. */
  note: string;
  /** Cylindres alignés, ou répartis sur deux bancs en V. */
  layout: 'inline' | 'v';
  /** Angle entre les deux bancs, en degrés (moteurs en V). */
  bankAngle?: number;
  cylinders: number;
  valvesPerCylinder: number;
  fuel: 'essence';
  /** Ordres d'allumage possibles pour ce vilebrequin. */
  firingOrders: number[][];
  /** Choix par défaut : variante de chaque emplacement et réglages. */
  defaults: Pick<EngineSpec, 'parts' | 'params'>;
}

export interface EngineParams {
  /** Régime maxi, tr/min. */
  redline: number;
  /** Avance à l'allumage, degrés avant le PMH. */
  ignitionAdvance: number;
  /** Numéros de cylindres dans l'ordre où ils s'allument, en commençant par 1. */
  firingOrder: number[];
}

/** Ce qui est stocké : rien qui puisse se déduire du reste. */
export interface EngineSpec {
  schemaVersion: 1;
  template: string;
  name: string;
  parts: Record<SlotId, string>;
  params: EngineParams;
}

export interface CamEvents {
  /** Ouverture, en degrés avant le point mort (haut pour l'admission, bas pour l'échappement). */
  opens: number;
  /** Fermeture, en degrés après le point mort (bas pour l'admission, haut pour l'échappement). */
  closes: number;
  /** Pic de levée dans le cycle de 720° (0 = PMH de croisement). */
  peak: number;
  halfDuration: number;
  lift: number;
}

export interface Derived {
  cylinders: number;
  bore: number;
  stroke: number;
  crankRadius: number;
  rodLength: number;
  /** Longueur de bielle divisée par la course. */
  rodStrokeRatio: number;
  /** Cylindrée unitaire et totale, cm³. */
  cylinderVolume: number;
  displacement: number;
  /** Distance du piston sous le plan de joint au PMH (négative s'il dépasse), mm. */
  deckClearance: number;
  /** Volume mort au PMH, cm³. */
  clearanceVolume: number;
  compressionRatio: number;
  /** Épaisseur de paroi entre deux cylindres, mm. */
  bridge: number;
  /** Vitesse moyenne du piston au régime maxi, m/s. */
  pistonSpeedAtRedline: number;
  intake: CamEvents;
  exhaust: CamEvents;
  /** Croisement des soupapes, degrés. */
  overlap: number;
  /** Décalage de cycle de chaque cylindre (degrés), dans l'ordre des cylindres. */
  cycleOffsets: number[];
  /** Angle d'allumage dans le cycle de 720°. */
  sparkAngle: number;
  /** Plus petit jeu entre soupape et piston sur le cycle, et l'angle où il se produit. */
  valveClearance: { intake: { min: number; at: number }; exhaust: { min: number; at: number } };
}

export type Severity = 'error' | 'warning';

export interface Issue {
  severity: Severity;
  /** Identifiant stable de la règle, utile pour les tests et la traduction. */
  code: string;
  /** Emplacements ou réglages concernés. */
  targets: Array<SlotId | `params.${keyof EngineParams}`>;
  message: string;
  /** Piste de correction. */
  hint?: string;
}
