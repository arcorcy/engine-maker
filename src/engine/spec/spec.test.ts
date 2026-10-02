import { describe, expect, it } from 'vitest';
import { geometryFor, liftOf } from '../scene/geometry';
import {
  applyChange, camLift, createSpec, derive, optionsFor, parseSpec, pistonDrop, SLOTS, TEMPLATES, validate, variantsFor,
  type EngineSpec, type SlotId,
} from '.';

const base = () => createSpec('i4-dohc-16v');
const codes = (spec: EngineSpec) => validate(spec).issues.map((i) => `${i.severity}:${i.code}`);
const pick = (spec: EngineSpec, ...changes: Array<[SlotId, string]>) =>
  changes.reduce((s, [slot, variant]) => applyChange(s, { type: 'part', slot, variant }).spec, spec);

describe('moteur de référence', () => {
  const d = derive(base());

  it('a les cotes d’un 1.6 16 soupapes', () => {
    expect(d.bore).toBe(79);
    expect(d.stroke).toBe(81.5);
    expect(d.displacement).toBeCloseTo(1597.9, 1);
    expect(d.compressionRatio).toBeCloseTo(10.5, 1);
    expect(d.deckClearance).toBeCloseTo(0.5, 5);
    expect(d.pistonSpeedAtRedline).toBeCloseTo(17.66, 2);
  });

  it('est valide, sans avertissement', () => {
    expect(validate(base())).toMatchObject({ ok: true, issues: [] });
  });

  it('a le calage de la maquette 3D d’origine', () => {
    expect(d.cycleOffsets).toEqual([0, 540, 180, 360]);
    expect(d.intake.peak).toBe(105);
    expect(d.exhaust.peak).toBe(615);
    expect(d.sparkAngle).toBe(355);
    expect(d.intake).toMatchObject({ opens: 5, closes: 35 });
    expect(d.exhaust).toMatchObject({ opens: 35, closes: 5 });
    expect(d.overlap).toBe(10);
  });
});

describe('géométrie de la maquette', () => {
  it('reprend les cotes de la spec, en décimètres', () => {
    const g = geometryFor(base());
    expect(g).toMatchObject({ boreR: 0.395, CR: 0.4075, CL: 1.335, CH: 0.3825, deck: 2.13 });
    expect(g.offsets).toEqual(derive(base()).cycleOffsets);
  });

  it('place la calotte du piston sous le plan de joint au PMH, du dégagement calculé', () => {
    for (const spec of [base(), pick(base(), ['vilo', 'vilo-77']), pick(base(), ['vilo', 'vilo-86'])]) {
      const g = geometryFor(spec);
      expect(g.deck - (g.CR + g.CL + g.CH)).toBeCloseTo(derive(spec).deckClearance / 100, 9);
    }
  });

  it('anime les soupapes avec le profil de came de la spec', () => {
    const spec = pick(base(), ['arb_adm', 'cam-adm-sport']);
    const g = geometryFor(spec);
    const dd = derive(spec);
    for (let c = 0; c < 720; c += 7) {
      expect(liftOf(g.intake, c) * 100).toBeCloseTo(camLift(c, dd.intake.peak, dd.intake.halfDuration, dd.intake.lift), 9);
    }
  });

  it('suit l’ordre d’allumage', () => {
    const alt = applyChange(base(), { type: 'param', key: 'firingOrder', value: [1, 2, 4, 3] }).spec;
    expect(geometryFor(alt).offsets).toEqual([0, 180, 540, 360]);
  });
});

describe('cinématique', () => {
  it('place le piston au PMH à 0° et au PMB à 180°', () => {
    expect(pistonDrop(0, 40.75, 133.5)).toBeCloseTo(0, 9);
    expect(pistonDrop(180, 40.75, 133.5)).toBeCloseTo(81.5, 9);
    expect(pistonDrop(360, 40.75, 133.5)).toBeCloseTo(0, 9);
  });

  it('donne la levée maximale au centre de came et zéro hors de la durée', () => {
    expect(camLift(105, 105, 110, 9.5)).toBeCloseTo(9.5, 9);
    expect(camLift(300, 105, 110, 9.5)).toBe(0);
    expect(camLift(715, 105, 110, 9.5)).toBe(0); // ouverture exacte, 5° avant le PMH
    expect(camLift(718, 105, 110, 9.5)).toBeGreaterThan(0); // déjà ouverte, de l'autre côté du 0
  });
});

describe('résolution des dépendances', () => {
  it('réalésage : remplace pistons, segments et joint, et dit pourquoi', () => {
    const r = applyChange(base(), { type: 'part', slot: 'bloc', variant: 'bloc-80-5' });
    expect(r.adjustments.map((a) => [a.slot, a.to])).toEqual([
      ['piston', 'piston-80-5'],
      ['segments', 'segments-80-5'],
      ['joint', 'joint-82'],
    ]);
    expect(r.adjustments[0].reason).toBe('alésage de 80,5 mm');
    expect(r.unresolved).toEqual([]);
    expect(validate(r.spec).ok).toBe(true);
  });

  it('ne touche à rien quand le changement est compatible', () => {
    const r = applyChange(base(), { type: 'part', slot: 'piston', variant: 'piston-79-hc' });
    expect(r.adjustments).toEqual([]);
  });

  it('garde la pièce choisie par l’utilisateur et signale l’impossibilité', () => {
    const r = applyChange(base(), { type: 'part', slot: 'piston', variant: 'piston-82' });
    expect(r.spec.parts.piston).toBe('piston-82');
    expect(r.unresolved).toContain('piston');
    expect(codes(r.spec)).toContain('error:fit.piston-bore');
  });

  it('annote les options : montables, à conséquences, ou bloquées', () => {
    const opts = Object.fromEntries(optionsFor(base(), 'piston').map((o) => [o.variant.id, o]));
    expect(opts['piston-79-hc'].fits).toBe(true);
    expect(opts['piston-82'].blocked).toMatch(/alésage de 79 mm/);
    const blocs = Object.fromEntries(optionsFor(base(), 'bloc').map((o) => [o.variant.id, o]));
    expect(blocs['bloc-82'].fits).toBe(false);
    expect(blocs['bloc-82'].adjustments.map((a) => a.slot)).toEqual(['piston', 'segments', 'joint']);
  });

  it('chaque variante du catalogue peut être choisie sans exception', () => {
    for (const slot of SLOTS) {
      for (const v of variantsFor(slot, 'i4-dohc-16v')) {
        expect(() => validate(applyChange(base(), { type: 'part', slot, variant: v.id }).spec)).not.toThrow();
      }
    }
  });
});

describe('règles de cohérence', () => {
  it('course longue : le piston dépasse, deux corrections possibles', () => {
    const long = pick(base(), ['vilo', 'vilo-86']);
    expect(codes(long)).toContain('error:geom.piston-protrudes');
    expect(validate(pick(long, ['bielle', 'bielle-131'])).ok).toBe(true);
    expect(validate(pick(long, ['piston', 'piston-79-long'])).ok).toBe(true);
  });

  it('bielles longues sans pistons adaptés : erreur', () => {
    expect(codes(pick(base(), ['bielle', 'bielle-140']))).toContain('error:geom.piston-protrudes');
  });

  it('course courte : rapport volumétrique bas et chasse perdue', () => {
    expect(codes(pick(base(), ['vilo', 'vilo-77']))).toEqual(['warning:geom.deck-clearance', 'warning:cr.low']);
  });

  it('pistons haute compression : avertissement de cliquetis, que le joint épais corrige', () => {
    const hc = pick(base(), ['piston', 'piston-79-hc']);
    expect(codes(hc)).toEqual(['warning:cr.high']);
    expect(codes(pick(hc, ['joint', 'joint-80-epais']))).toEqual([]);
  });

  it('cames course : levée trop forte pour la culasse d’origine, croisement et jeu réduits', () => {
    const race = pick(base(), ['arb_adm', 'cam-adm-course'], ['arb_ech', 'cam-ech-course']);
    expect(codes(race)).toEqual(expect.arrayContaining(['error:cam.lift-arb_adm', 'error:cam.lift-arb_ech', 'warning:cam.overlap']));
    const prepared = validate(pick(race, ['culasse', 'culasse-preparee']));
    expect(prepared.ok).toBe(true);
    expect(prepared.derived!.valveClearance.intake.min).toBeLessThan(2);
  });

  it('jeu soupape-piston : erreur quand les soupapes toucheraient', () => {
    const tight = pick(base(), ['arb_adm', 'cam-adm-course'], ['culasse', 'culasse-rectifiee'], ['vilo', 'vilo-86'], ['piston', 'piston-79-long']);
    const v = validate(tight);
    expect(v.derived!.valveClearance.intake.min).toBeLessThan(1);
    expect(codes(tight)).toContain('error:valve.clearance-intake');
  });

  it('régime maxi au-delà des ressorts : affolement, que les ressorts renforcés corrigent', () => {
    const high = applyChange(base(), { type: 'param', key: 'redline', value: 7500 }).spec;
    expect(codes(high)).toEqual(['error:rpm.valve-float']);
    expect(codes(pick(high, ['ressort', 'ressort-renforce']))).toEqual([]);
  });

  it('vitesse de piston excessive', () => {
    const s = pick(base(), ['vilo', 'vilo-86'], ['bielle', 'bielle-131'], ['ressort', 'ressort-renforce']);
    const fast = applyChange(s, { type: 'param', key: 'redline', value: 8400 }).spec;
    expect(codes(fast)).toContain('warning:rpm.piston-speed-high');
  });

  it('ordre d’allumage : seuls ceux du vilebrequin sont acceptés, et ils fixent les décalages', () => {
    const bad = applyChange(base(), { type: 'param', key: 'firingOrder', value: [1, 2, 3, 4] }).spec;
    expect(codes(bad)).toEqual(['error:params.firing-order']);
    const alt = applyChange(base(), { type: 'param', key: 'firingOrder', value: [1, 2, 4, 3] }).spec;
    expect(validate(alt).ok).toBe(true);
    expect(derive(alt).cycleOffsets).toEqual([0, 180, 540, 360]);
  });

  it('pièce inconnue : erreur de référence, aucune valeur dérivée', () => {
    const s = base();
    const v = validate({ ...s, parts: { ...s.parts, vilo: 'vilo-imaginaire' } });
    expect(v.ok).toBe(false);
    expect(v.derived).toBeUndefined();
    expect(v.issues[0]).toMatchObject({ code: 'spec.variant', targets: ['vilo'] });
  });

  it('chaque modèle de départ est cohérent, sans erreur ni avertissement', () => {
    for (const t of TEMPLATES) expect([t.id, codes(createSpec(t.id))]).toEqual([t.id, []]);
  });
});

describe('schéma de stockage', () => {
  it('accepte une spec créée puis relue en JSON', () => {
    const s = base();
    const r = parseSpec(JSON.parse(JSON.stringify(s)));
    expect(r).toEqual({ ok: true, spec: s });
  });

  it('refuse une spec incomplète ou hors bornes, en nommant le champ', () => {
    const s = base();
    const { vilo: _omit, ...parts } = s.parts;
    const r = parseSpec({ ...s, parts, params: { ...s.params, redline: 20000 } });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.startsWith('parts.vilo'))).toBe(true);
      expect(r.errors.some((e) => e.startsWith('params.redline'))).toBe(true);
    }
  });

  it('refuse une version de schéma inconnue', () => {
    expect(parseSpec({ ...base(), schemaVersion: 2 }).ok).toBe(false);
  });
});

describe('architectures', () => {
  it('vont du 3 cylindres au V16, avec des ordres d’allumage complets', () => {
    expect(TEMPLATES.map((t) => t.short)).toEqual(['L3 1.0', 'L4 1.6', 'L5 2.5', 'L6 3.0', 'V6 3.5', 'V8 5.0', 'V10 5.2', 'V12 6.5', 'V16 8.0']);
    for (const t of TEMPLATES) {
      for (const o of t.firingOrders) expect([...o].sort((a, b) => a - b)).toEqual(Array.from({ length: t.cylinders }, (_, i) => i + 1));
    }
  });

  it('ont des cylindrées réalistes', () => {
    const cc = Object.fromEntries(TEMPLATES.map((t) => [t.short, Math.round(derive(createSpec(t.id)).displacement)]));
    expect(cc).toEqual({ 'L3 1.0': 999, 'L4 1.6': 1598, 'L5 2.5': 2480, 'L6 3.0': 2979, 'V6 3.5': 3456, 'V8 5.0': 4951, 'V10 5.2': 5204, 'V12 6.5': 6496, 'V16 8.0': 7993 });
  });

  it('ne proposent que les pièces de leur architecture', () => {
    const v8 = createSpec('v8-90-32v');
    const ids = optionsFor(v8, 'vilo').map((o) => o.variant.id);
    expect(ids.every((id) => id.startsWith('v8-'))).toBe(true);
    expect(() => applyChange(v8, { type: 'part', slot: 'vilo', variant: 'vilo-86' })).toThrow();
    expect(codes({ ...v8, parts: { ...v8.parts, vilo: 'vilo-86' } })).toContain('error:spec.variant-template');
  });

  it('gardent les mêmes leviers de préparation et les mêmes règles', () => {
    for (const t of TEMPLATES.filter((x) => x.id !== 'i4-dohc-16v')) {
      const long = pick(createSpec(t.id), ['vilo', `${t.id}-vilo-long`]);
      expect(codes(long)).toContain('error:geom.piston-protrudes');
      expect(validate(pick(long, ['piston', `${t.id}-piston-long`])).ok).toBe(true);
      expect(validate(pick(long, ['bielle', `${t.id}-bielle-courte`])).ok).toBe(true);
    }
  });

  it('placent les cylindres d’un V en deux bancs, axe par axe', () => {
    const g = geometryFor(createSpec('v8-90-32v'));
    expect(g.banks.map((b) => b.cyls.length)).toEqual([4, 4]);
    expect(g.offsets).toHaveLength(8);
    expect(g.cylX[0]).toBeLessThan(g.cylX[1]);
  });
});
