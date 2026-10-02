import { getTemplate, validate, type EngineSpec, type Issue } from '../../engine/spec';
import { REFERENCE_SPEC } from '../../engine/data/vehicle';

export type Status = 'ok' | 'warning' | 'error';

export interface Summary {
  validation: ReturnType<typeof validate>;
  errors: Issue[];
  warnings: Issue[];
  status: Status;
  /** Pièces différentes de la version d'origine du modèle de départ. */
  changedParts: number;
  templateName: string;
}

export function summarize(spec: EngineSpec): Summary {
  const validation = validate(spec);
  const errors = validation.issues.filter((i) => i.severity === 'error');
  const warnings = validation.issues.filter((i) => i.severity === 'warning');
  const t = getTemplate(spec.template);
  const changedParts = t ? Object.entries(spec.parts).filter(([slot, v]) => t.defaults.parts[slot as keyof typeof spec.parts] !== v).length : 0;
  return {
    validation,
    errors,
    warnings,
    status: errors.length ? 'error' : warnings.length ? 'warning' : 'ok',
    changedParts,
    templateName: t?.name ?? spec.template,
  };
}

export const REFERENCE = summarize(REFERENCE_SPEC);

export const num = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
/** Cote en millimètres : une décimale seulement si elle existe (79, 80,5). */
export const dim = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

export const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function statusBadge(s: Summary) {
  if (s.status === 'error') return { tone: 'danger' as const, icon: 'errorCircle' as const, label: plural(s.errors.length, 'erreur', 'erreurs') };
  if (s.status === 'warning') return { tone: 'warning' as const, icon: 'warning' as const, label: plural(s.warnings.length, 'avertissement', 'avertissements') };
  return { tone: 'success' as const, icon: 'checkCircle' as const, label: 'Cohérent' };
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
export function relativeTime(iso: string, now = Date.now()) {
  const s = (new Date(iso).getTime() - now) / 1000;
  const a = Math.abs(s);
  if (a < 45) return "à l'instant";
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
