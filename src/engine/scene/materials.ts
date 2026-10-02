import * as THREE from 'three';

/* Finitions « réalistes » : le moteur rendu comme un objet produit, métaux et plastiques neutres */
export const FINISH = {
  alu: { color: '#c9cacd', metalness: 0.78, roughness: 0.34 },
  aluCast: { color: '#a8aaae', metalness: 0.72, roughness: 0.52 },
  iron: { color: '#75777b', metalness: 0.66, roughness: 0.58 },
  steel: { color: '#b9bbbf', metalness: 0.95, roughness: 0.2 },
  steelDark: { color: '#5f6165', metalness: 0.85, roughness: 0.4 },
  exhaust: { color: '#7d6d62', metalness: 0.8, roughness: 0.48 },
  graphite: { color: '#38393c', metalness: 0.45, roughness: 0.4 },
  black: { color: '#1e1f22', metalness: 0.08, roughness: 0.55 },
  rubber: { color: '#17171a', metalness: 0, roughness: 0.9 },
  ceramic: { color: '#f2f2f4', metalness: 0, roughness: 0.22 },
  filter: { color: '#1f5fd1', metalness: 0.35, roughness: 0.32 },
} as const;

export type Finish = keyof typeof FINISH;

/** Finition principale de chaque pièce. */
export const PART_FINISH: Record<string, Finish> = {
  bloc: 'aluCast', joint: 'steelDark', culasse: 'alu', cache: 'graphite', carter: 'steelDark',
  piston: 'alu', segments: 'steelDark', bielle: 'steel', vilo: 'steel', volant: 'iron', poulie: 'iron',
  arb_adm: 'steel', arb_ech: 'steel', sou_adm: 'steel', sou_ech: 'steel', ressort: 'steel', courroie: 'rubber',
  bougie: 'steel', bobine: 'graphite', injecteur: 'steel',
  admission: 'black', papillon: 'alu', echappement: 'exhaust', catalyseur: 'steel', sonde_lambda: 'steelDark',
  filtre: 'filter', pompe_huile: 'aluCast', pompe_eau: 'alu',
  alternateur: 'alu', courroie_acc: 'rubber',
};

const DARK: Finish[] = ['rubber', 'black', 'graphite', 'steelDark'];
const WHITE = new THREE.Color('#ffffff');
const BLACK = new THREE.Color('#000000');

export interface MatLook {
  color: THREE.Color;
  metalness: number;
  roughness: number;
}

/**
 * Deux apparences par matériau : finition réaliste, ou couleur du système mécanique.
 * Les détails (accent = true) sont éclaircis en mode systèmes, les pièces sombres assombries.
 */
export function looks(finish: Finish, sysColor: string, accent: boolean) {
  const f = FINISH[finish];
  const sys = new THREE.Color(sysColor);
  if (accent) sys.lerp(WHITE, 0.38);
  else if (DARK.includes(finish)) sys.lerp(BLACK, 0.42);
  return {
    materials: { color: new THREE.Color(f.color), metalness: f.metalness, roughness: f.roughness } as MatLook,
    systems: { color: sys, metalness: 0.12, roughness: 0.5 } as MatLook,
  };
}
