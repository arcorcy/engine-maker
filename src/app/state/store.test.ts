import { beforeEach, describe, expect, it } from 'vitest';
import { REFERENCE_SPEC } from '../../engine/data/vehicle';
import { createSpec } from '../../engine/spec';
import { useEngine } from './store';

const st = () => useEngine.getState();

describe('moteur affiché', () => {
  beforeEach(() => st().loadEngine('m1', createSpec('i4-dohc-16v', 'Essai'), false));

  it('remplace une pièce, adapte les pièces liées et garde de quoi annuler', () => {
    st().swapPart('bloc', 'bloc-80-5');
    expect(st().spec.parts).toMatchObject({ bloc: 'bloc-80-5', piston: 'piston-80-5', segments: 'segments-80-5', joint: 'joint-82' });
    expect(st().lastChange?.adjustments.map((a) => a.slot)).toEqual(['piston', 'segments', 'joint']);
    st().undo();
    expect(st().spec.parts.bloc).toBe('bloc-79');
    expect(st().spec.parts.piston).toBe('piston-79');
    st().redo();
    expect(st().spec.parts.bloc).toBe('bloc-80-5');
  });

  it('ramène le régime sous un régime maxi abaissé', () => {
    st().setRpm(6400);
    st().setEngineParam('redline', 5000);
    expect(st().rpm).toBe(5000);
  });

  it('ne touche pas au moteur de référence', () => {
    st().loadEngine(null, REFERENCE_SPEC, true);
    st().swapPart('vilo', 'vilo-86');
    st().renameEngine('Autre');
    expect(st().spec).toBe(REFERENCE_SPEC);
  });

  it('repart d’une sélection vide en changeant de moteur', () => {
    st().selectPart('vilo');
    st().loadEngine('m2', createSpec('i4-dohc-16v', 'Deux'), false);
    expect(st()).toMatchObject({ sel: null, engineId: 'm2', past: [], lastChange: null });
  });
});
