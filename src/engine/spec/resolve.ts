/*
 * Application d'un changement et mise en cohérence des pièces dépendantes.
 * Les interfaces dures (diamètres à appairer) sont résolues automatiquement : si le nouveau bloc n'accepte plus
 * les pistons, on prend les pistons compatibles les plus proches des actuels, et on dit ce qui a changé.
 * Les contraintes de réglage (jeu soupape-piston, rapport volumétrique…) ne sont pas corrigées en silence :
 * elles restent visibles dans validate(), car plusieurs corrections sont possibles et c'est à l'utilisateur de choisir.
 */
import { getVariant, variantsFor } from './catalog';
import type { EngineParams, EngineSpec, SlotId, Variant } from './types';

const num = (v: Variant | undefined, key: string) => (v?.props as Record<string, number> | undefined)?.[key];

interface Interface {
  slot: SlotId;
  dependsOn: SlotId[];
  /** Vrai si la variante candidate convient aux autres pièces de la spec. */
  accepts: (candidate: Variant, spec: EngineSpec) => boolean;
  reason: (spec: EngineSpec) => string;
}

const bore = (spec: EngineSpec) => num(getVariant(spec.parts.bloc), 'bore') ?? 0;
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export const INTERFACES: Interface[] = [
  {
    slot: 'piston',
    dependsOn: ['bloc'],
    accepts: (c, s) => Math.abs((num(c, 'diameter') ?? 0) - bore(s)) <= 0.05,
    reason: (s) => `alésage de ${fmt(bore(s))} mm`,
  },
  {
    slot: 'segments',
    dependsOn: ['bloc'],
    accepts: (c, s) => Math.abs((num(c, 'diameter') ?? 0) - bore(s)) <= 0.05,
    reason: (s) => `alésage de ${fmt(bore(s))} mm`,
  },
  {
    slot: 'joint',
    dependsOn: ['bloc'],
    accepts: (c, s) => {
      const gb = num(c, 'gasketBore') ?? 0;
      return gb >= bore(s) && gb <= bore(s) + 2;
    },
    reason: (s) => `alésage de ${fmt(bore(s))} mm`,
  },
  {
    slot: 'bielle',
    dependsOn: ['vilo'],
    accepts: (c, s) => num(c, 'bigEnd') === num(getVariant(s.parts.vilo), 'pinDiameter'),
    reason: (s) => `manetons de ${fmt(num(getVariant(s.parts.vilo), 'pinDiameter') ?? 0)} mm`,
  },
];

export type Change =
  | { type: 'part'; slot: SlotId; variant: string }
  | { type: 'param'; key: keyof EngineParams; value: EngineParams[keyof EngineParams] };

export interface Adjustment {
  slot: SlotId;
  from: string;
  to: string;
  /** Pourquoi la pièce a été remplacée. */
  reason: string;
}

export interface Resolution {
  spec: EngineSpec;
  /** Pièces remplacées automatiquement, dans l'ordre. */
  adjustments: Adjustment[];
  /** Emplacements qu'aucune variante du catalogue ne peut satisfaire ; validate() les signalera. */
  unresolved: SlotId[];
}

/** Ressemblance entre deux variantes d'un même emplacement : écart relatif moyen de leurs propriétés communes. */
function distance(a: Variant, b: Variant) {
  const pa = a.props as Record<string, number>;
  const pb = b.props as Record<string, number>;
  const keys = Object.keys(pa).filter((k) => k in pb);
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + Math.abs(pa[k] - pb[k]) / (Math.abs(pa[k]) + Math.abs(pb[k]) || 1), 0) / keys.length;
}

/** Remet en cohérence les interfaces dures, en partant de la spec donnée. */
export function resolve(spec: EngineSpec, locked: SlotId[] = []): Resolution {
  let next: EngineSpec = { ...spec, parts: { ...spec.parts } };
  const adjustments: Adjustment[] = [];
  const unresolved = new Set<SlotId>();

  /* quelques passes suffisent : les dépendances ne forment pas de cycle */
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const itf of INTERFACES) {
      const current = getVariant(next.parts[itf.slot]);
      if (current && itf.accepts(current, next)) {
        unresolved.delete(itf.slot);
        continue;
      }
      if (locked.includes(itf.slot)) {
        unresolved.add(itf.slot);
        continue;
      }
      const options = variantsFor(itf.slot, next.template).filter((c) => itf.accepts(c, next));
      if (!options.length) {
        unresolved.add(itf.slot);
        continue;
      }
      const best = current ? options.reduce((a, b) => (distance(b, current) < distance(a, current) ? b : a)) : options[0];
      adjustments.push({ slot: itf.slot, from: next.parts[itf.slot], to: best.id, reason: itf.reason(next) });
      next = { ...next, parts: { ...next.parts, [itf.slot]: best.id } };
      unresolved.delete(itf.slot);
      changed = true;
    }
    if (!changed) break;
  }
  return { spec: next, adjustments, unresolved: [...unresolved] };
}

/**
 * Applique un changement demandé par l'utilisateur. La pièce choisie est verrouillée : la résolution adapte
 * les autres pièces autour d'elle, jamais l'inverse.
 */
export function applyChange(spec: EngineSpec, change: Change): Resolution {
  if (change.type === 'param') {
    return resolve({ ...spec, params: { ...spec.params, [change.key]: change.value } });
  }
  const v = getVariant(change.variant);
  if (!v || v.slot !== change.slot) throw new Error(`Variante ${change.variant} inconnue pour ${change.slot}`);
  if (v.templates && !v.templates.includes(spec.template)) throw new Error(`La pièce ${change.variant} ne se monte pas sur ${spec.template}`);
  return resolve({ ...spec, parts: { ...spec.parts, [change.slot]: change.variant } }, [change.slot]);
}

export interface Option {
  variant: Variant;
  /** La variante peut être montée telle quelle, sans remplacer d'autre pièce. */
  fits: boolean;
  /** Pièces qui seraient remplacées automatiquement si on la choisit. */
  adjustments: Adjustment[];
  /** Raison pour laquelle elle ne peut pas être montée du tout. */
  blocked?: string;
}

/** Variantes d'un emplacement avec leurs conséquences, pour griser ou annoter les choix dans l'interface. */
export function optionsFor(spec: EngineSpec, slot: SlotId): Option[] {
  return variantsFor(slot, spec.template).map((variant) => {
    const r = applyChange(spec, { type: 'part', slot, variant: variant.id });
    const own = INTERFACES.find((i) => i.slot === slot);
    const blocked = r.unresolved.includes(slot) && own
      ? `Ne convient pas : ${own.reason(r.spec)}.`
      : r.unresolved.length
        ? `Aucune pièce du catalogue ne convient ensuite pour : ${r.unresolved.join(', ')}.`
        : undefined;
    return { variant, fits: !r.adjustments.length && !blocked, adjustments: r.adjustments, blocked };
  });
}
