/** Géométrie des panneaux flottants, partagée entre le CSS (via variables) et le cadrage caméra. */
export const PANEL = {
  library: 296,
  inspector: 344,
  gap: 16,
  top: 72,
  /** Largeur minimale de la vue pour ancrer les panneaux ; en dessous ils se superposent. */
  dockMin: 1024,
} as const;
