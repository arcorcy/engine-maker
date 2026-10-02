import { useMemo } from 'react';
import { derive, getTemplate } from '../../engine/spec';
import { useEngine } from './store';

/** Limites de régime et course du moteur affiché, pour le compte-tours et les statistiques de conduite. */
export function useEngineLimits() {
  const spec = useEngine((st) => st.spec);
  return useMemo(() => {
    const redline = spec.params.redline;
    return {
      redline,
      /** Début de la zone rouge. */
      red: redline - 500,
      /** Fin de l'échelle du compte-tours. */
      max: Math.ceil((redline + 500) / 1000) * 1000,
      /** Course en mètres. */
      stroke: derive(spec).stroke / 1000,
    };
  }, [spec]);
}

/** Architecture du moteur affiché : nombre de cylindres et de bancs. */
export function useArchitecture() {
  const id = useEngine((st) => st.spec.template);
  return useMemo(() => {
    const t = getTemplate(id);
    return { template: t, cylinders: t?.cylinders ?? 4, banks: t?.layout === 'v' ? 2 : 1 };
  }, [id]);
}
