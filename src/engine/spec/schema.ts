/*
 * Schéma de la spec stockée (Supabase, fichiers, URL). Il vérifie la forme et les bornes ;
 * la cohérence physique relève de validate().
 */
import { z } from 'zod';
import { SLOTS } from './catalog';
import type { EngineSpec, SlotId } from './types';

const parts = z.object(Object.fromEntries(SLOTS.map((s) => [s, z.string().min(1)])) as Record<SlotId, z.ZodString>);

export const EngineSpecSchema = z.object({
  schemaVersion: z.literal(1),
  template: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  parts,
  params: z.object({
    redline: z.number().int().min(3000).max(10000),
    ignitionAdvance: z.number().min(0).max(45),
    firingOrder: z.array(z.number().int().min(1).max(12)).min(1).max(12),
  }),
});

export type ParseResult = { ok: true; spec: EngineSpec } | { ok: false; errors: string[] };

/** Lit une spec venue de l'extérieur. Les messages d'erreur indiquent le champ fautif. */
export function parseSpec(input: unknown): ParseResult {
  const r = EngineSpecSchema.safeParse(input);
  if (r.success) return { ok: true, spec: r.data as EngineSpec };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`) };
}
