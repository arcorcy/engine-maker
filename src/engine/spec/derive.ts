/*
 * Valeurs dérivées d'une spec : géométrie, volumes, calage, jeux. Rien de tout cela n'est stocké.
 * Les fonctions de cinématique (position du piston, levée de came) sont celles que la maquette 3D utilisera,
 * pour que ce qui est validé soit exactement ce qui est affiché.
 */
import { getTemplate, getVariant } from './catalog';
import type { CamEvents, Derived, EngineSpec, ParamSlot, SlotProps } from './types';

/** Propriétés de la variante choisie pour un emplacement paramétrique. */
export function propsOf<S extends ParamSlot>(spec: EngineSpec, slot: S): SlotProps[S] {
  const v = getVariant(spec.parts[slot]);
  if (!v || v.slot !== slot) throw new Error(`Variante inconnue pour ${slot} : ${spec.parts[slot]}`);
  return v.props as SlotProps[S];
}

const cylVolume = (diameter: number, height: number) => (Math.PI / 4) * diameter * diameter * height; // mm³

/** Descente du piston depuis le PMH (mm) pour un angle vilebrequin en degrés. */
export function pistonDrop(theta: number, crankRadius: number, rodLength: number) {
  const t = (theta * Math.PI) / 180;
  const s = Math.sin(t);
  return crankRadius + rodLength - (crankRadius * Math.cos(t) + Math.sqrt(rodLength * rodLength - crankRadius * crankRadius * s * s));
}

/** Levée (mm) d'une came de profil en cos², centrée sur peak, ouverte sur ±half degrés vilebrequin. */
export function camLift(theta: number, peak: number, half: number, lift: number) {
  const d = ((theta - peak + 360 + 720 * 4) % 720) - 360;
  return Math.abs(d) < half ? lift * Math.cos(((Math.PI / 2) * d) / half) ** 2 : 0;
}

function camEvents(cam: SlotProps['arb_adm'], exhaust: boolean): CamEvents {
  const half = cam.duration / 2;
  return exhaust
    ? { opens: cam.centerline + half - 180, closes: half - cam.centerline, peak: 720 - cam.centerline, halfDuration: half, lift: cam.lift }
    : { opens: half - cam.centerline, closes: cam.centerline + half - 180, peak: cam.centerline, halfDuration: half, lift: cam.lift };
}

/** Plus petit jeu soupape-piston autour du PMH de croisement, où les deux se rapprochent. */
function minClearance(ev: CamEvents, base: number, r: number, l: number) {
  let min = Infinity;
  let at = 0;
  for (let th = -120; th <= 120; th += 0.5) {
    const c = base + pistonDrop(th, r, l) - camLift((th + 720) % 720, ev.peak, ev.halfDuration, ev.lift);
    if (c < min) {
      min = c;
      at = th;
    }
  }
  return { min: Math.round(min * 100) / 100, at };
}

export function derive(spec: EngineSpec): Derived {
  const template = getTemplate(spec.template);
  if (!template) throw new Error(`Modèle de départ inconnu : ${spec.template}`);

  const bloc = propsOf(spec, 'bloc');
  const joint = propsOf(spec, 'joint');
  const culasse = propsOf(spec, 'culasse');
  const piston = propsOf(spec, 'piston');
  const bielle = propsOf(spec, 'bielle');
  const vilo = propsOf(spec, 'vilo');

  const n = template.cylinders;
  const r = vilo.stroke / 2;
  const deckClearance = bloc.deckHeight - (r + bielle.length + piston.compressionHeight);

  const cylinderVolume = cylVolume(bloc.bore, vilo.stroke) / 1000;
  const clearanceVolume =
    culasse.chamberVolume +
    cylVolume(joint.gasketBore, joint.thickness) / 1000 +
    cylVolume(bloc.bore, deckClearance) / 1000 -
    piston.domeVolume;

  const intake = camEvents(propsOf(spec, 'arb_adm'), false);
  const exhaust = camEvents(propsOf(spec, 'arb_ech'), true);

  /* au PMH, la soupape fermée est à (dégagement du piston + épaisseur du joint + retrait dans la culasse) du piston */
  const base = deckClearance + joint.thickness + culasse.valveRecess;

  const interval = 720 / n;
  const cycleOffsets = Array.from({ length: n }, (_, c) => {
    const pos = spec.params.firingOrder.indexOf(c + 1);
    return pos < 0 ? 0 : pos * interval;
  });

  return {
    cylinders: n,
    bore: bloc.bore,
    stroke: vilo.stroke,
    crankRadius: r,
    rodLength: bielle.length,
    rodStrokeRatio: bielle.length / vilo.stroke,
    cylinderVolume,
    displacement: cylinderVolume * n,
    deckClearance,
    clearanceVolume,
    compressionRatio: (cylinderVolume + clearanceVolume) / clearanceVolume,
    bridge: bloc.pitch - bloc.bore,
    pistonSpeedAtRedline: (2 * (vilo.stroke / 1000) * spec.params.redline) / 60,
    intake,
    exhaust,
    overlap: intake.opens + exhaust.closes,
    cycleOffsets,
    sparkAngle: 360 - spec.params.ignitionAdvance,
    valveClearance: {
      intake: minClearance(intake, base, r, bielle.length),
      exhaust: minClearance(exhaust, base, r, bielle.length),
    },
  };
}
