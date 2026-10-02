/*
 * Règles de cohérence. Une erreur rend le moteur impossible à construire ou à faire tourner : elle bloque
 * l'enregistrement. Un avertissement signale un choix possible mais risqué ou inhabituel.
 * La même fonction tourne dans le navigateur pendant l'édition et côté serveur avant l'enregistrement.
 */
import { getTemplate, getVariant, SLOTS } from './catalog';
import { derive, propsOf } from './derive';
import type { Derived, EngineSpec, Issue } from './types';

export const LIMITS = {
  /** Jeu minimal soupape-piston, mm. */
  valveClearanceError: 1,
  valveClearanceWarning: 2,
  /** Épaisseur de paroi entre cylindres, mm. */
  bridgeError: 5,
  bridgeWarning: 8,
  /** Rapport longueur de bielle / course. */
  rodRatioError: 1.25,
  rodRatioWarning: 1.45,
  /** Rapport volumétrique, essence atmosphérique. */
  crMin: 6,
  crMax: 15,
  crLowWarning: 8.5,
  crHighWarning: 11.5,
  /** Vitesse moyenne du piston au régime maxi, m/s. */
  pistonSpeedWarning: 23,
  pistonSpeedError: 27,
  /** Dégagement du piston sous le plan de joint au PMH au-delà duquel la chasse (squish) se perd, mm. */
  deckClearanceWarning: 1.5,
  /** Croisement au-delà duquel le ralenti devient instable, degrés. */
  overlapWarning: 50,
  ignitionWarning: 35,
  /** Tolérance d'appairage des diamètres, mm. */
  fitTolerance: 0.05,
  /** Débordement admissible du joint autour de l'alésage, mm. */
  gasketMargin: 2,
} as const;

const fmt = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Vérifie que la spec ne référence que des variantes existantes, au bon emplacement. Sans cela, rien ne peut être dérivé. */
function checkReferences(spec: EngineSpec): Issue[] {
  const issues: Issue[] = [];
  const template = getTemplate(spec.template);
  if (!template) {
    issues.push({ severity: 'error', code: 'spec.template', targets: [], message: `Modèle de départ inconnu : ${spec.template}.` });
  }
  for (const slot of SLOTS) {
    const v = getVariant(spec.parts[slot]);
    if (!v || v.slot !== slot) {
      issues.push({
        severity: 'error',
        code: 'spec.variant',
        targets: [slot],
        message: `La pièce « ${spec.parts[slot] ?? 'aucune'} » n'existe pas pour l'emplacement ${slot}.`,
      });
    } else if (v.templates && !v.templates.includes(spec.template)) {
      issues.push({
        severity: 'error',
        code: 'spec.variant-template',
        targets: [slot],
        message: `« ${v.name} » ne se monte pas sur ce moteur.`,
      });
    }
  }
  if (template) {
    const fo = spec.params.firingOrder;
    const valid = template.firingOrders.some((o) => o.length === fo.length && o.every((c, i) => c === fo[i]));
    if (!valid) {
      issues.push({
        severity: 'error',
        code: 'params.firing-order',
        targets: ['params.firingOrder'],
        message: `L'ordre d'allumage ${fo.join('-')} ne correspond pas au vilebrequin de ce moteur.`,
        hint: `Ordres possibles : ${template.firingOrders.map((o) => o.join('-')).join(' ou ')}.`,
      });
    }
  }
  return issues;
}

export interface Validation {
  issues: Issue[];
  /** Absent si la spec référence des pièces inconnues. */
  derived?: Derived;
  /** Vrai s'il n'y a aucune erreur : la spec peut être enregistrée. */
  ok: boolean;
}

export function validate(spec: EngineSpec): Validation {
  const refs = checkReferences(spec);
  if (refs.some((i) => i.code !== 'params.firing-order')) return { issues: refs, ok: false };

  const d = derive(spec);
  const issues: Issue[] = [...refs];
  const add = (i: Issue) => issues.push(i);

  const bloc = propsOf(spec, 'bloc');
  const piston = propsOf(spec, 'piston');
  const segments = propsOf(spec, 'segments');
  const joint = propsOf(spec, 'joint');
  const bielle = propsOf(spec, 'bielle');
  const vilo = propsOf(spec, 'vilo');
  const culasse = propsOf(spec, 'culasse');
  const camA = propsOf(spec, 'arb_adm');
  const camE = propsOf(spec, 'arb_ech');
  const ressort = propsOf(spec, 'ressort');

  /* ----- Appairages ----- */
  if (Math.abs(piston.diameter - bloc.bore) > LIMITS.fitTolerance) {
    add({
      severity: 'error', code: 'fit.piston-bore', targets: ['piston', 'bloc'],
      message: `Pistons de ${fmt(piston.diameter)} mm dans des cylindres de ${fmt(bloc.bore)} mm.`,
      hint: `Choisir des pistons de ${fmt(bloc.bore)} mm.`,
    });
  }
  if (Math.abs(segments.diameter - bloc.bore) > LIMITS.fitTolerance) {
    add({
      severity: 'error', code: 'fit.rings-bore', targets: ['segments', 'bloc'],
      message: `Segments de ${fmt(segments.diameter)} mm pour un alésage de ${fmt(bloc.bore)} mm.`,
      hint: `Choisir des segments de ${fmt(bloc.bore)} mm.`,
    });
  }
  if (joint.gasketBore < bloc.bore) {
    add({
      severity: 'error', code: 'fit.gasket-bore', targets: ['joint', 'bloc'],
      message: `Le passage du joint (${fmt(joint.gasketBore)} mm) est plus petit que l'alésage (${fmt(bloc.bore)} mm) : le piston le heurterait.`,
      hint: 'Choisir un joint grand alésage.',
    });
  } else if (joint.gasketBore > bloc.bore + LIMITS.gasketMargin) {
    add({
      severity: 'warning', code: 'fit.gasket-wide', targets: ['joint', 'bloc'],
      message: `Le passage du joint dépasse l'alésage de ${fmt(joint.gasketBore - bloc.bore)} mm : l'étanchéité au feu est moins bonne.`,
    });
  }
  if (Math.abs(bielle.bigEnd - vilo.pinDiameter) > LIMITS.fitTolerance) {
    add({
      severity: 'error', code: 'fit.rod-crank', targets: ['bielle', 'vilo'],
      message: `Têtes de bielle de ${fmt(bielle.bigEnd)} mm sur des manetons de ${fmt(vilo.pinDiameter)} mm.`,
    });
  }

  /* ----- Géométrie ----- */
  if (d.deckClearance < 0) {
    add({
      severity: 'error', code: 'geom.piston-protrudes', targets: ['vilo', 'bielle', 'piston', 'bloc'],
      message: `Au point mort haut, le piston dépasse du bloc de ${fmt(-d.deckClearance, 2)} mm et frapperait la culasse.`,
      hint: 'Raccourcir la bielle ou prendre des pistons à axe remonté.',
    });
  } else if (d.deckClearance > LIMITS.deckClearanceWarning) {
    add({
      severity: 'warning', code: 'geom.deck-clearance', targets: ['vilo', 'bielle', 'piston'],
      message: `Le piston reste ${fmt(d.deckClearance, 2)} mm sous le plan de joint au PMH : moins de turbulence et un rapport volumétrique en baisse.`,
    });
  }
  if (d.bridge < LIMITS.bridgeError) {
    add({
      severity: 'error', code: 'geom.bridge', targets: ['bloc'],
      message: `Il ne reste que ${fmt(d.bridge)} mm de paroi entre deux cylindres.`,
    });
  } else if (d.bridge < LIMITS.bridgeWarning) {
    add({
      severity: 'warning', code: 'geom.bridge-thin', targets: ['bloc'],
      message: `Paroi de ${fmt(d.bridge)} mm entre cylindres : risque de déformation et de fuite au joint.`,
    });
  }
  if (d.rodStrokeRatio < LIMITS.rodRatioError) {
    add({
      severity: 'error', code: 'geom.rod-ratio', targets: ['bielle', 'vilo'],
      message: `Bielle trop courte pour la course (rapport ${fmt(d.rodStrokeRatio, 2)}) : elle toucherait la jupe du cylindre.`,
    });
  } else if (d.rodStrokeRatio < LIMITS.rodRatioWarning) {
    add({
      severity: 'warning', code: 'geom.rod-ratio-low', targets: ['bielle', 'vilo'],
      message: `Rapport bielle/course de ${fmt(d.rodStrokeRatio, 2)} : efforts latéraux importants sur les pistons.`,
    });
  }

  /* ----- Rapport volumétrique ----- */
  const cr = d.compressionRatio;
  if (!(cr >= LIMITS.crMin && cr <= LIMITS.crMax)) {
    add({
      severity: 'error', code: 'cr.range', targets: ['piston', 'culasse', 'joint'],
      message: `Rapport volumétrique de ${fmt(cr)} : hors de ce qu'un moteur essence peut supporter.`,
    });
  } else if (cr > LIMITS.crHighWarning) {
    add({
      severity: 'warning', code: 'cr.high', targets: ['piston', 'culasse', 'joint'],
      message: `Rapport volumétrique de ${fmt(cr)} : risque de cliquetis, carburant 98 obligatoire.`,
      hint: 'Un joint plus épais ou des pistons moins bombés le font baisser.',
    });
  } else if (cr < LIMITS.crLowWarning) {
    add({
      severity: 'warning', code: 'cr.low', targets: ['piston', 'culasse', 'joint'],
      message: `Rapport volumétrique de ${fmt(cr)} : rendement en baisse pour un moteur atmosphérique.`,
    });
  }

  /* ----- Distribution ----- */
  const vc = [
    { key: 'intake' as const, slot: 'arb_adm' as const, label: "d'admission" },
    { key: 'exhaust' as const, slot: 'arb_ech' as const, label: "d'échappement" },
  ];
  for (const { key, slot, label } of vc) {
    const c = d.valveClearance[key];
    const deg = Math.round(Math.abs(c.at));
    const at = deg === 0 ? 'au PMH' : `${deg}° ${c.at < 0 ? 'avant' : 'après'} le PMH`;
    if (c.min < LIMITS.valveClearanceError) {
      add({
        severity: 'error', code: `valve.clearance-${key}`, targets: [slot, 'piston', 'culasse'],
        message: `Les soupapes ${label} passent à ${fmt(c.min, 2)} mm du piston (${at}) : elles le toucheraient.`,
        hint: 'Une came moins agressive, ou des pistons avec encoches de soupapes.',
      });
    } else if (c.min < LIMITS.valveClearanceWarning) {
      add({
        severity: 'warning', code: `valve.clearance-${key}-low`, targets: [slot, 'piston', 'culasse'],
        message: `Jeu de ${fmt(c.min, 2)} mm entre soupapes ${label} et piston (${at}) : aucune marge en cas d'affolement.`,
      });
    }
  }
  for (const [cam, slot, label] of [[camA, 'arb_adm', "d'admission"], [camE, 'arb_ech', "d'échappement"]] as const) {
    if (cam.lift > culasse.maxLift) {
      add({
        severity: 'error', code: `cam.lift-${slot}`, targets: [slot, 'culasse'],
        message: `La came ${label} lève de ${fmt(cam.lift)} mm, la culasse en admet ${fmt(culasse.maxLift)} : les ressorts arriveraient à spires jointives.`,
        hint: 'Prendre la culasse préparée.',
      });
    }
  }
  if (d.overlap > LIMITS.overlapWarning) {
    add({
      severity: 'warning', code: 'cam.overlap', targets: ['arb_adm', 'arb_ech'],
      message: `Croisement de ${fmt(d.overlap, 0)}° : ralenti instable et émissions en hausse.`,
    });
  }

  /* ----- Régime ----- */
  if (spec.params.redline > ressort.maxRpm) {
    add({
      severity: 'error', code: 'rpm.valve-float', targets: ['params.redline', 'ressort'],
      message: `Au-delà de ${fmt(ressort.maxRpm, 0)} tr/min, les ressorts ne referment plus les soupapes à temps (affolement).`,
      hint: 'Baisser le régime maxi ou monter des ressorts renforcés.',
    });
  }
  if (d.pistonSpeedAtRedline > LIMITS.pistonSpeedError) {
    add({
      severity: 'error', code: 'rpm.piston-speed', targets: ['params.redline', 'vilo'],
      message: `Vitesse moyenne du piston de ${fmt(d.pistonSpeedAtRedline)} m/s au régime maxi : les bielles casseraient.`,
    });
  } else if (d.pistonSpeedAtRedline > LIMITS.pistonSpeedWarning) {
    add({
      severity: 'warning', code: 'rpm.piston-speed-high', targets: ['params.redline', 'vilo'],
      message: `Vitesse moyenne du piston de ${fmt(d.pistonSpeedAtRedline)} m/s au régime maxi : usure rapide, niveau compétition.`,
    });
  }
  if (spec.params.ignitionAdvance > LIMITS.ignitionWarning) {
    add({
      severity: 'warning', code: 'params.ignition', targets: ['params.ignitionAdvance'],
      message: `Avance de ${spec.params.ignitionAdvance}° : risque de cliquetis à pleine charge.`,
    });
  }

  return { issues, derived: d, ok: !issues.some((i) => i.severity === 'error') };
}
