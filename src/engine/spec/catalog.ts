/*
 * Catalogue de pièces et modèles de départ.
 * Base de référence : 4 cylindres 1.6 16 soupapes, alésage 79 mm, course 81,5 mm, 1 598 cm³, rapport volumétrique 10,5.
 * Les variantes sont choisies pour illustrer les conséquences d'un changement : course longue qui fait dépasser
 * le piston, réalésage qui impose pistons et joint, arbres à cames qui réduisent le jeu soupape-piston.
 */
import type { EngineSpec, SlotId, Template, Variant } from './types';

export const SLOTS: SlotId[] = [
  'bloc', 'joint', 'culasse', 'cache', 'carter',
  'piston', 'segments', 'bielle', 'vilo', 'volant', 'poulie',
  'arb_adm', 'arb_ech', 'sou_adm', 'sou_ech', 'ressort', 'courroie',
  'bougie', 'bobine', 'injecteur',
  'admission', 'papillon', 'echappement', 'catalyseur', 'sonde_lambda',
  'filtre', 'pompe_huile', 'pompe_eau',
  'alternateur', 'courroie_acc',
];

const v = <S extends SlotId>(slot: S, id: string, name: string, note: string, props: Variant<S>['props']): Variant<S> => ({
  id, slot, name, note, props,
});

const I4 = 'i4-dohc-16v';

const I4_PARTS: Variant[] = [
  /* ----- Bloc : porte l'alésage, l'entraxe des cylindres et la hauteur du plan de joint ----- */
  v('bloc', 'bloc-79', "Bloc d'origine, alésage 79 mm", 'Fonte, entraxe 88 mm entre cylindres.', { bore: 79, pitch: 88, deckHeight: 213 }),
  v('bloc', 'bloc-80-5', 'Bloc réalésé à 80,5 mm', "Réalésage de rénovation : plus de cylindrée, parois un peu plus fines.", { bore: 80.5, pitch: 88, deckHeight: 213 }),
  v('bloc', 'bloc-82', 'Bloc réalésé à 82 mm', "Réalésage maximal : la paroi entre cylindres devient très fine.", { bore: 82, pitch: 88, deckHeight: 213 }),

  /* ----- Joint de culasse ----- */
  v('joint', 'joint-80', "Joint d'origine", 'Multicouche acier, passage 80 mm, 0,75 mm écrasé.', { gasketBore: 80, thickness: 0.75 }),
  v('joint', 'joint-80-epais', 'Joint épais', 'Passage 80 mm, 1,3 mm : baisse le rapport volumétrique.', { gasketBore: 80, thickness: 1.3 }),
  v('joint', 'joint-82', 'Joint grand alésage', 'Passage 82 mm, 0,75 mm, pour blocs réalésés.', { gasketBore: 82, thickness: 0.75 }),

  /* ----- Culasse : volume de chambre, levée admissible, retrait des soupapes ----- */
  v('culasse', 'culasse-std', "Culasse d'origine", 'Chambre de 38 cm³, levée admissible 10,5 mm.', { chamberVolume: 38, maxLift: 10.5, valveRecess: 3 }),
  v('culasse', 'culasse-rectifiee', 'Culasse rectifiée', 'Plan surfacé de 0,5 mm : chambre de 36 cm³, soupapes plus proches du piston.', {
    chamberVolume: 36, maxLift: 10.5, valveRecess: 2.5,
  }),
  v('culasse', 'culasse-preparee', 'Culasse préparée', 'Guides et coupelles modifiés : levée admissible 12 mm.', { chamberVolume: 38, maxLift: 12, valveRecess: 3 }),

  /* ----- Pistons : diamètre lié à l'alésage, hauteur de compression, calotte (+ bombée, − creusée) ----- */
  v('piston', 'piston-79', "Pistons d'origine 79 mm", 'Calotte légèrement bombée.', { diameter: 79, compressionHeight: 38.25, domeVolume: 2.2 }),
  v('piston', 'piston-79-hc', 'Pistons haute compression 79 mm', 'Calotte bombée : rapport volumétrique plus élevé.', { diameter: 79, compressionHeight: 38.25, domeVolume: 6.5 }),
  v('piston', 'piston-79-turbo', 'Pistons turbo 79 mm', 'Calotte creusée : rapport volumétrique abaissé pour la suralimentation.', {
    diameter: 79, compressionHeight: 38.25, domeVolume: -6,
  }),
  v('piston', 'piston-79-long', 'Pistons course longue 79 mm', "Axe remonté de 2,25 mm, pour un vilebrequin de 86 mm.", { diameter: 79, compressionHeight: 36, domeVolume: 2.2 }),
  v('piston', 'piston-80-5', 'Pistons cote réparation 80,5 mm', 'Pour bloc réalésé à 80,5 mm.', { diameter: 80.5, compressionHeight: 38.25, domeVolume: 2.2 }),
  v('piston', 'piston-82', 'Pistons forgés 82 mm', 'Pour bloc réalésé à 82 mm.', { diameter: 82, compressionHeight: 38.25, domeVolume: 2.2 }),

  v('segments', 'segments-79', 'Segments 79 mm', 'Jeu de trois segments par piston.', { diameter: 79 }),
  v('segments', 'segments-80-5', 'Segments 80,5 mm', 'Cote réparation.', { diameter: 80.5 }),
  v('segments', 'segments-82', 'Segments 82 mm', 'Pour pistons forgés 82 mm.', { diameter: 82 }),

  /* ----- Bielles et vilebrequin ----- */
  v('bielle', 'bielle-133-5', "Bielles d'origine 133,5 mm", 'Acier forgé, tête de 43 mm.', { length: 133.5, bigEnd: 43 }),
  v('bielle', 'bielle-131', 'Bielles courtes 131 mm', 'Pour garder le piston sous le plan de joint avec une course longue.', { length: 131, bigEnd: 43 }),
  v('bielle', 'bielle-140', 'Bielles longues 140 mm', 'Meilleur rapport bielle/course, à associer à des pistons à axe remonté.', { length: 140, bigEnd: 43 }),

  v('vilo', 'vilo-81-5', "Vilebrequin d'origine, course 81,5 mm", 'Cinq paliers, manetons de 43 mm.', { stroke: 81.5, pinDiameter: 43 }),
  v('vilo', 'vilo-77', 'Vilebrequin course courte 77 mm', 'Moteur plus vif dans les tours, un peu moins de couple.', { stroke: 77, pinDiameter: 43 }),
  v('vilo', 'vilo-86', 'Vilebrequin course longue 86 mm', 'Plus de cylindrée et de couple : le piston monte plus haut.', { stroke: 86, pinDiameter: 43 }),

  /* ----- Distribution ----- */
  v('arb_adm', 'cam-adm-std', "Came d'admission d'origine", 'Centre à 105°, 220° d’ouverture, 9,5 mm de levée.', { centerline: 105, duration: 220, lift: 9.5 }),
  v('arb_adm', 'cam-adm-sport', "Came d'admission sport", 'Centre à 102°, 256°, 10,2 mm : plus de remplissage à haut régime.', { centerline: 102, duration: 256, lift: 10.2 }),
  v('arb_adm', 'cam-adm-course', "Came d'admission course", 'Centre à 100°, 290°, 11,5 mm : ralenti instable, réservée à la piste.', { centerline: 100, duration: 290, lift: 11.5 }),
  v('arb_ech', 'cam-ech-std', "Came d'échappement d'origine", 'Centre à 105°, 220° d’ouverture, 9,5 mm de levée.', { centerline: 105, duration: 220, lift: 9.5 }),
  v('arb_ech', 'cam-ech-sport', "Came d'échappement sport", 'Centre à 104°, 250°, 9,8 mm.', { centerline: 104, duration: 250, lift: 9.8 }),
  v('arb_ech', 'cam-ech-course', "Came d'échappement course", 'Centre à 100°, 284°, 11 mm.', { centerline: 100, duration: 284, lift: 11 }),

  v('ressort', 'ressort-std', "Ressorts d'origine", 'Tiennent les soupapes jusqu’à 7 000 tr/min.', { maxRpm: 7000 }),
  v('ressort', 'ressort-renforce', 'Ressorts renforcés', 'Double ressort : soupapes tenues jusqu’à 8 500 tr/min.', { maxRpm: 8500 }),
].map((x) => ({ ...x, templates: [I4] }));

/* ----- Autres architectures : cotes de base réelles, famille de pièces générée avec la même logique que le 1.6 ----- */

interface Base {
  id: string;
  short: string;
  name: string;
  note: string;
  layout: 'inline' | 'v';
  bankAngle?: number;
  cylinders: number;
  bore: number;
  stroke: number;
  rod: number;
  pitch: number;
  /** Rapport volumétrique visé pour la version d'origine. */
  cr: number;
  cam: { centerline: number; duration: number; lift: number };
  maxRpm: number;
  redline: number;
  firingOrders: number[][];
}

const BASES: Base[] = [
  {
    id: 'i3-dohc-12v', short: 'L3 1.0', name: '3 cylindres en ligne, 12 soupapes', note: 'Petit moteur de citadine, vibrations compensées par un arbre d’équilibrage.',
    layout: 'inline', cylinders: 3, bore: 74.5, stroke: 76.4, rod: 132, pitch: 84, cr: 10.5,
    cam: { centerline: 105, duration: 216, lift: 8.8 }, maxRpm: 7000, redline: 6500, firingOrders: [[1, 2, 3]],
  },
  {
    id: 'i5-dohc-20v', short: 'L5 2.5', name: '5 cylindres en ligne, 20 soupapes', note: 'Sonorité irrégulière caractéristique, une combustion tous les 144°.',
    layout: 'inline', cylinders: 5, bore: 82.5, stroke: 92.8, rod: 144, pitch: 92, cr: 10,
    cam: { centerline: 106, duration: 224, lift: 10 }, maxRpm: 7500, redline: 7000, firingOrders: [[1, 2, 4, 5, 3]],
  },
  {
    id: 'i6-dohc-24v', short: 'L6 3.0', name: '6 cylindres en ligne, 24 soupapes', note: 'Équilibré naturellement : aucune vibration du premier ni du deuxième ordre.',
    layout: 'inline', cylinders: 6, bore: 84, stroke: 89.6, rod: 144.5, pitch: 94, cr: 10.2,
    cam: { centerline: 105, duration: 232, lift: 9.7 }, maxRpm: 7500, redline: 7000, firingOrders: [[1, 5, 3, 6, 2, 4], [1, 4, 2, 6, 3, 5]],
  },
  {
    id: 'v6-60-24v', short: 'V6 3.5', name: 'V6 à 60°, 24 soupapes', note: 'Compact et court, logé en travers dans les berlines.',
    layout: 'v', bankAngle: 60, cylinders: 6, bore: 94, stroke: 83, rod: 147.5, pitch: 105, cr: 10.8,
    cam: { centerline: 106, duration: 236, lift: 10.5 }, maxRpm: 7300, redline: 6800, firingOrders: [[1, 2, 3, 4, 5, 6], [1, 4, 3, 6, 2, 5]],
  },
  {
    id: 'v8-90-32v', short: 'V8 5.0', name: 'V8 à 90°, 32 soupapes', note: 'Le moteur des grandes routières et des muscle cars, couple à tous les régimes.',
    layout: 'v', bankAngle: 90, cylinders: 8, bore: 92.2, stroke: 92.7, rod: 150.7, pitch: 102, cr: 11,
    cam: { centerline: 108, duration: 240, lift: 12 }, maxRpm: 8000, redline: 7400, firingOrders: [[1, 8, 4, 3, 6, 5, 7, 2], [1, 5, 4, 8, 6, 3, 7, 2]],
  },
  {
    id: 'v10-90-40v', short: 'V10 5.2', name: 'V10 à 90°, 40 soupapes', note: 'Moteur de supercar, très haut régime et cri aigu.',
    layout: 'v', bankAngle: 90, cylinders: 10, bore: 84.5, stroke: 92.8, rod: 154, pitch: 94, cr: 11.3,
    cam: { centerline: 105, duration: 250, lift: 11 }, maxRpm: 9000, redline: 7400, firingOrders: [[1, 10, 9, 4, 3, 6, 5, 8, 7, 2]],
  },
  {
    id: 'v12-60-48v', short: 'V12 6.5', name: 'V12 à 60°, 48 soupapes', note: 'Parfaitement équilibré, une combustion tous les 60° : la référence du grand tourisme.',
    layout: 'v', bankAngle: 60, cylinders: 12, bore: 94, stroke: 78, rod: 150, pitch: 104, cr: 11.4,
    cam: { centerline: 104, duration: 248, lift: 11 }, maxRpm: 9000, redline: 8500, firingOrders: [[1, 12, 5, 8, 3, 10, 6, 7, 2, 11, 4, 9]],
  },
  {
    id: 'v16-45-64v', short: 'V16 8.0', name: 'V16 à 45°, 64 soupapes', note: 'Démesure des années 1930 et des hypercars : huit manetons, une combustion tous les 45°.',
    layout: 'v', bankAngle: 45, cylinders: 16, bore: 86, stroke: 86, rod: 142, pitch: 96, cr: 10,
    cam: { centerline: 106, duration: 228, lift: 9.5 }, maxRpm: 7000, redline: 6500,
    firingOrders: [[1, 2, 11, 12, 3, 4, 9, 10, 15, 16, 5, 6, 13, 14, 7, 8]],
  },
];

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const mm = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const vol = (d: number, h: number) => (Math.PI / 4) * d * d * h / 1000; // cm³

/** Famille de pièces d'une architecture : d'origine, plus les mêmes possibilités de préparation que le 1.6. */
function family(b: Base): Variant[] {
  const T = [b.id];
  const k = b.id;
  const ch = r2(b.bore * 0.46);
  const deck = r2(b.stroke / 2 + b.rod + ch + 0.5);
  const ds = Math.round(b.stroke * 0.055 * 2) / 2; // écart de course des vilebrequins court et long
  const gb = Math.ceil(b.bore + 1);
  const vd = vol(b.bore, b.stroke);
  const dome = r1(vd * 0.0055);
  /* chambre choisie pour donner le rapport volumétrique visé avec les pièces d'origine */
  const chamber = r1(vd / (b.cr - 1) - vol(gb, 0.75) - vol(b.bore, 0.5) + dome);
  const lift = b.cam.lift;
  const big = b.bore + 1;
  const f = (slot: SlotId, id: string, name: string, note: string, props: Record<string, number>): Variant => ({
    id: `${k}-${id}`, slot, name, note, props: props as Variant['props'], templates: T,
  });
  return [
    f('bloc', 'bloc', `Bloc d'origine, alésage ${mm(b.bore)} mm`, `Entraxe ${mm(b.pitch)} mm entre cylindres.`, { bore: b.bore, pitch: b.pitch, deckHeight: deck }),
    f('bloc', 'bloc-rea', `Bloc réalésé à ${mm(big)} mm`, 'Plus de cylindrée, parois un peu plus fines.', { bore: big, pitch: b.pitch, deckHeight: deck }),
    f('joint', 'joint', "Joint d'origine", `Multicouche acier, passage ${mm(gb)} mm, 0,75 mm écrasé.`, { gasketBore: gb, thickness: 0.75 }),
    f('joint', 'joint-epais', 'Joint épais', `Passage ${mm(gb)} mm, 1,3 mm : baisse le rapport volumétrique.`, { gasketBore: gb, thickness: 1.3 }),
    f('culasse', 'culasse', "Culasse d'origine", `Chambre de ${mm(chamber)} cm³, levée admissible ${mm(lift + 1)} mm.`, { chamberVolume: chamber, maxLift: r1(lift + 1), valveRecess: 3 }),
    f('culasse', 'culasse-rect', 'Culasse rectifiée', 'Plan surfacé : chambre plus petite, soupapes plus proches du piston.', {
      chamberVolume: r1(chamber - 2), maxLift: r1(lift + 1), valveRecess: 2.5,
    }),
    f('culasse', 'culasse-prep', 'Culasse préparée', `Guides et coupelles modifiés : levée admissible ${mm(lift + 3.5)} mm.`, { chamberVolume: chamber, maxLift: r1(lift + 3.5), valveRecess: 3 }),
    f('piston', 'piston', `Pistons d'origine ${mm(b.bore)} mm`, 'Calotte légèrement bombée.', { diameter: b.bore, compressionHeight: ch, domeVolume: dome }),
    f('piston', 'piston-hc', `Pistons haute compression ${mm(b.bore)} mm`, 'Calotte bombée : rapport volumétrique plus élevé.', {
      diameter: b.bore, compressionHeight: ch, domeVolume: r1(dome + vd * 0.011),
    }),
    f('piston', 'piston-turbo', `Pistons turbo ${mm(b.bore)} mm`, 'Calotte creusée : rapport volumétrique abaissé pour la suralimentation.', {
      diameter: b.bore, compressionHeight: ch, domeVolume: r1(-vd * 0.015),
    }),
    f('piston', 'piston-long', `Pistons course longue ${mm(b.bore)} mm`, `Axe remonté de ${mm(ds / 2)} mm, pour le vilebrequin long.`, {
      diameter: b.bore, compressionHeight: r2(ch - ds / 2), domeVolume: dome,
    }),
    f('piston', 'piston-rea', `Pistons cote réparation ${mm(big)} mm`, 'Pour bloc réalésé.', { diameter: big, compressionHeight: ch, domeVolume: dome }),
    f('segments', 'segments', `Segments ${mm(b.bore)} mm`, 'Jeu de trois segments par piston.', { diameter: b.bore }),
    f('segments', 'segments-rea', `Segments ${mm(big)} mm`, 'Cote réparation.', { diameter: big }),
    f('bielle', 'bielle', `Bielles d'origine ${mm(b.rod)} mm`, 'Acier forgé.', { length: b.rod, bigEnd: 50 }),
    f('bielle', 'bielle-courte', `Bielles courtes ${mm(r2(b.rod - ds / 2))} mm`, 'Pour garder le piston sous le plan de joint avec une course longue.', {
      length: r2(b.rod - ds / 2), bigEnd: 50,
    }),
    f('bielle', 'bielle-longue', `Bielles longues ${mm(b.rod + 6.5)} mm`, 'Meilleur rapport bielle/course, à associer à des pistons à axe remonté.', { length: b.rod + 6.5, bigEnd: 50 }),
    f('vilo', 'vilo', `Vilebrequin d'origine, course ${mm(b.stroke)} mm`, b.layout === 'v' ? 'Manetons décalés, un par cylindre.' : 'Un maneton par cylindre.', {
      stroke: b.stroke, pinDiameter: 50,
    }),
    f('vilo', 'vilo-court', `Vilebrequin course courte ${mm(r1(b.stroke - ds))} mm`, 'Plus vif dans les tours, un peu moins de couple.', { stroke: r1(b.stroke - ds), pinDiameter: 50 }),
    f('vilo', 'vilo-long', `Vilebrequin course longue ${mm(r1(b.stroke + ds))} mm`, 'Plus de cylindrée et de couple : le piston monte plus haut.', { stroke: r1(b.stroke + ds), pinDiameter: 50 }),
    ...(['arb_adm', 'arb_ech'] as const).flatMap((slot) => {
      const label = slot === 'arb_adm' ? "d'admission" : "d'échappement";
      const c = b.cam;
      return [
        f(slot, `${slot}`, `Came ${label} d'origine`, `Centre à ${c.centerline}°, ${c.duration}° d’ouverture, ${mm(c.lift)} mm de levée.`, { ...c }),
        f(slot, `${slot}-sport`, `Came ${label} sport`, 'Plus de remplissage à haut régime.', { centerline: c.centerline - 3, duration: c.duration + 34, lift: r1(c.lift + 0.7) }),
        f(slot, `${slot}-course`, `Came ${label} course`, 'Ralenti instable, réservée à la piste.', { centerline: c.centerline - 5, duration: c.duration + 66, lift: r1(c.lift + 2) }),
      ];
    }),
    f('ressort', 'ressort', "Ressorts d'origine", `Tiennent les soupapes jusqu’à ${b.maxRpm.toLocaleString('fr-FR')} tr/min.`, { maxRpm: b.maxRpm }),
    f('ressort', 'ressort-renf', 'Ressorts renforcés', `Double ressort : soupapes tenues jusqu’à ${(b.maxRpm + 1500).toLocaleString('fr-FR')} tr/min.`, {
      maxRpm: b.maxRpm + 1500,
    }),
  ];
}

const PARAMETRIC: Variant[] = [...I4_PARTS, ...BASES.flatMap(family)];

/* Les autres emplacements n'ont pour l'instant qu'une variante d'origine, sans effet sur la géométrie */
const FIXED: Variant[] = SLOTS.filter((slot) => !I4_PARTS.some((x) => x.slot === slot)).map((slot) => ({
  id: `${slot}-std`,
  slot,
  name: "D'origine",
  note: "Pièce d'origine.",
  props: {},
}));

export const VARIANTS: Variant[] = [...PARAMETRIC, ...FIXED];

const BY_ID = new Map(VARIANTS.map((x) => [x.id, x]));

export function getVariant(id: string): Variant | undefined {
  return BY_ID.get(id);
}

/** Variantes d'un emplacement ; avec un modèle de départ, seulement celles qui s'y montent. */
export function variantsFor<S extends SlotId>(slot: S, templateId?: string): Variant<S>[] {
  return VARIANTS.filter((x) => x.slot === slot && (!templateId || !x.templates || x.templates.includes(templateId))) as Variant<S>[];
}

/** Première variante (celle d'origine) d'un emplacement pour un modèle de départ. */
const originalFor = (slot: SlotId, templateId: string) => variantsFor(slot, templateId)[0].id;

const partsFor = (templateId: string) => Object.fromEntries(SLOTS.map((slot) => [slot, originalFor(slot, templateId)])) as Template['defaults']['parts'];

const I4_TEMPLATE: Template = {
  id: I4,
  short: 'L4 1.6',
  name: '4 cylindres en ligne, 16 soupapes',
  note: 'Le moteur de la plupart des voitures : simple, compact, économique.',
  layout: 'inline',
  cylinders: 4,
  valvesPerCylinder: 4,
  fuel: 'essence',
  firingOrders: [
    [1, 3, 4, 2],
    [1, 2, 4, 3],
  ],
  defaults: { parts: partsFor(I4), params: { redline: 6500, ignitionAdvance: 5, firingOrder: [1, 3, 4, 2] } },
};

/** Modèles de départ, du plus petit au plus grand nombre de cylindres. */
export const TEMPLATES: Template[] = [
  I4_TEMPLATE,
  ...BASES.map((b): Template => ({
    id: b.id,
    short: b.short,
    name: b.name,
    note: b.note,
    layout: b.layout,
    bankAngle: b.bankAngle,
    cylinders: b.cylinders,
    valvesPerCylinder: 4,
    fuel: 'essence',
    firingOrders: b.firingOrders,
    defaults: { parts: partsFor(b.id), params: { redline: b.redline, ignitionAdvance: 5, firingOrder: [...b.firingOrders[0]] } },
  })),
].sort((x, y) => x.cylinders - y.cylinders || (x.layout === 'inline' ? -1 : 1));

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

/** Nouvelle spec à partir d'un modèle de départ, avec ses pièces et réglages par défaut. */
export function createSpec(templateId: string, name = 'Mon moteur'): EngineSpec {
  const t = getTemplate(templateId);
  if (!t) throw new Error(`Modèle de départ inconnu : ${templateId}`);
  return {
    schemaVersion: 1,
    template: t.id,
    name,
    parts: { ...t.defaults.parts },
    params: { ...t.defaults.params, firingOrder: [...t.defaults.params.firingOrder] },
  };
}
