import { describe, expect, it } from 'vitest';
import { createSpec, TEMPLATES } from '../spec';
import { geometryFor } from './geometry';
import { buildEngine, setPose } from './model';

describe('maquette de chaque architecture', () => {
  for (const t of TEMPLATES) {
    it(`construit ${t.short}`, () => {
      const geo = geometryFor(createSpec(t.id));
      const m = buildEngine(geo);
      expect(m.anim.pist).toHaveLength(t.cylinders);
      expect(m.exhaust).toHaveLength(t.cylinders);
      expect(m.tailpipes).toHaveLength(t.layout === 'v' ? 2 : 1);
      expect(m.anim.cams).toHaveLength(t.layout === 'v' ? 4 : 2);
      expect(m.heat.runners.every(Boolean)).toBe(true);
      /* chaque piston passe au PMH quand le vilebrequin atteint son décalage, sous la culasse */
      geo.offsets.forEach((off, i) => {
        setPose(m.anim, off, geo);
        const crown = m.anim.pist[i].position.y + geo.CH;
        expect(crown).toBeCloseTo(geo.CR + geo.CL + geo.CH, 6);
        expect(crown).toBeLessThan(geo.headBot);
      });
    });
  }
});
