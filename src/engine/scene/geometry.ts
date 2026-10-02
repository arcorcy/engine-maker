/*
 * Passage de la spec (mm, cm³) à la maquette (1 unité = 1 dm). C'est le seul endroit où la 3D lit le moteur :
 * le modèle, la cinématique et les gaz ne contiennent plus aucune cote du moteur.
 * Disposition : en ligne, un banc vertical ; en V, deux bancs inclinés de ±angle/2 autour de l'axe du vilebrequin.
 * Cylindres numérotés de l'avant vers l'arrière ; en V, impairs sur le banc A (côté +z), pairs sur le banc B.
 */
import { camLift, derive, getTemplate, propsOf, type EngineSpec } from '../spec';

/** Plan de joint autour duquel la culasse et tout ce qui est au-dessus ont été dessinés. */
export const DRAWN_DECK = 2.05;
/** Épaisseur du joint dans la maquette, exagérée pour rester visible. */
const GASKET = 0.04;
/** Décalage le long du vilebrequin entre les deux cylindres d'un même maneton, en V (épaisseur de bielle). */
const V_OFFSET = 0.11;
/** Marge du bloc au-delà des cylindres extrêmes, à chaque bout. */
const END = 0.35;

export interface CamGeometry {
  /** Pic de levée dans le cycle de 720°. */
  peak: number;
  /** Demi-durée d'ouverture en degrés vilebrequin. */
  half: number;
  /** Levée maximale, dm. */
  lift: number;
}

export interface Bank {
  /** Inclinaison du banc autour de l'axe X, en radians (positive vers +z). */
  angle: number;
  /** Banc dessiné en miroir pour garder l'admission dans le V. */
  mirror: boolean;
  /** Indices des cylindres du banc. */
  cyls: number[];
}

export interface EngineGeometry {
  n: number;
  layout: 'inline' | 'v';
  banks: Bank[];
  /** Banc de chaque cylindre. */
  bankOf: number[];
  /** Position de chaque cylindre le long du vilebrequin, dm. */
  cylX: number[];
  /** Longueur du bloc ; il s'étend de -length/2 (avant) à +length/2 (arrière). */
  length: number;
  /** Manetons groupés par coude du vilebrequin (un cylindre en ligne, deux en V). */
  throws: { center: number; cyls: number[] }[];
  /** Paliers de vilebrequin et d'arbres à cames. */
  mains: number[];
  /** Rayon d'alésage, dm. */
  boreR: number;
  /** Rayon de manivelle (demi-course), dm. */
  CR: number;
  /** Longueur de bielle, dm. */
  CL: number;
  /** Hauteur de compression du piston (axe à la calotte), dm. */
  CH: number;
  /** Plan de joint du bloc, dm au-dessus de l'axe du vilebrequin, le long de l'axe du banc. */
  deck: number;
  /** Face inférieure de la culasse. */
  headBot: number;
  /** Décalage vertical appliqué à la culasse et à ce qui la surmonte. */
  headDy: number;
  /** Décalage de cycle de chaque cylindre (degrés). */
  offsets: number[];
  /** Angle d'allumage dans le cycle. */
  spark: number;
  intake: CamGeometry;
  exhaust: CamGeometry;
  /** Rapport volumétrique calculé, que la simulation des gaz reproduit. */
  compressionRatio: number;
}

export function geometryFor(spec: EngineSpec): EngineGeometry {
  const t = getTemplate(spec.template);
  if (!t) throw new Error(`Modèle de départ inconnu : ${spec.template}`);
  const d = derive(spec);
  const bloc = propsOf(spec, 'bloc');
  const piston = propsOf(spec, 'piston');
  const deck = bloc.deckHeight / 100;
  const n = t.cylinders;
  const pitch = bloc.pitch / 100;
  const idx = Array.from({ length: n }, (_, i) => i);

  let banks: Bank[];
  let cylX: number[];
  let throws: EngineGeometry['throws'];
  let axial: number;
  if (t.layout === 'v') {
    const m = n / 2;
    const half = (((t.bankAngle ?? 90) / 2) * Math.PI) / 180;
    const center = (k: number) => (k - (m - 1) / 2) * pitch;
    cylX = idx.map((c) => center(Math.floor(c / 2)) + (c % 2 === 0 ? -V_OFFSET : V_OFFSET));
    banks = [
      { angle: half, mirror: true, cyls: idx.filter((c) => c % 2 === 0) },
      { angle: -half, mirror: false, cyls: idx.filter((c) => c % 2 === 1) },
    ];
    throws = Array.from({ length: m }, (_, k) => ({ center: center(k), cyls: [2 * k, 2 * k + 1] }));
    axial = m;
  } else {
    cylX = idx.map((i) => (i - (n - 1) / 2) * pitch);
    banks = [{ angle: 0, mirror: false, cyls: idx }];
    throws = idx.map((i) => ({ center: cylX[i], cyls: [i] }));
    axial = n;
  }
  const bankOf = idx.map((c) => banks.findIndex((b) => b.cyls.includes(c)));
  const length = axial * pitch + 2 * END + (t.layout === 'v' ? 2 * V_OFFSET : 0);
  const centers = throws.map((th) => th.center);
  const mains = [centers[0] - pitch / 2, ...centers.slice(1).map((x, i) => (x + centers[i]) / 2), centers[centers.length - 1] + pitch / 2];

  return {
    n,
    layout: t.layout,
    banks,
    bankOf,
    cylX,
    length,
    throws,
    mains,
    boreR: d.bore / 200,
    CR: d.crankRadius / 100,
    CL: d.rodLength / 100,
    CH: piston.compressionHeight / 100,
    deck,
    headBot: deck + GASKET,
    headDy: deck - DRAWN_DECK,
    offsets: d.cycleOffsets,
    spark: d.sparkAngle,
    intake: { peak: d.intake.peak, half: d.intake.halfDuration, lift: d.intake.lift / 100 },
    exhaust: { peak: d.exhaust.peak, half: d.exhaust.halfDuration, lift: d.exhaust.lift / 100 },
    compressionRatio: d.compressionRatio,
  };
}

/** Point du repère d'un banc (axe du cylindre = Y local) exprimé dans le repère du moteur. */
export function toWorld(bank: Bank, p: readonly number[]): [number, number, number] {
  const z = bank.mirror ? -p[2] : p[2];
  const c = Math.cos(bank.angle);
  const s = Math.sin(bank.angle);
  return [p[0], p[1] * c - z * s, p[1] * s + z * c];
}

/** Levée d'une came de la maquette (dm) à l'angle de cycle c. */
export const liftOf = (cam: CamGeometry, c: number) => camLift(c, cam.peak, cam.half, cam.lift);

/** Angle dans le cycle de 720° d'un cylindre décalé de offset, pour un angle vilebrequin psi. */
export const cycleAngle = (psi: number, offset: number) => (((psi - offset) % 720) + 720) % 720;
