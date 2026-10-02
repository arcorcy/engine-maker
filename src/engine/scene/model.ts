/*
 * Modèle 3D procédural d'un 4 cylindres en ligne 16 soupapes.
 * Unité ≈ 1 dm, axe du vilebrequin = X (avant en -X), haut = Y, admission en +Z, échappement en -Z.
 */
import * as THREE from 'three';
import { PARTS } from '../data/parts';
import { SYSTEM } from '../data/systems';
import { looks, PART_FINISH, type Finish, type MatLook } from './materials';

export const XS = [-1.5, -0.5, 0.5, 1.5]; // cylindres 1 à 4
export const OFF = [0, 540, 180, 360]; // décalage de cycle (°) : ordre d'allumage 1-3-4-2
export const CR = 0.32; // rayon de manetons
export const CL = 1.43; // longueur de bielle
export const LIFT = 0.12; // levée de soupape
export const DECK = 2.05;
export const HEADBOT = 2.09;
export const INTAKE_PEAK = 105;
export const EXHAUST_PEAK = 615;

/* Tracé de l'échappement, partagé par la géométrie et le trajet des gaz */
const RUNNER = (x: number) => [[x, 2.45, -0.55], [x, 2.45, -0.9], [x * 0.6, 2.0, -1.15], [x * 0.15, 1.55, -1.3]];
const DOWNPIPE = [[0, 1.55, -1.3], [0, 0.8, -1.32], [0.5, 0.1, -1.35], [1.9, -0.2, -1.35]];
const OUTLET = [[3.7, -0.2, -1.35], [4.1, -0.22, -1.35], [4.5, -0.3, -1.35], [4.75, -0.34, -1.35]];
/** Bout du tuyau de sortie, dans le repère de la pièce « catalyseur ». */
export const TAILPIPE: [number, number, number] = [4.75, -0.34, -1.35];

export interface ExhaustPath {
  /** Points échantillonnés à abscisse curviligne régulière, avec un repère local et le rayon utile du conduit. */
  pts: Float32Array;
  nrm: Float32Array;
  bin: Float32Array;
  rad: Float32Array;
  length: number;
  samples: number;
}

/** Chemin des gaz brûlés du cylindre i : soupape, conduit de culasse, tubulure, descente, catalyseur, sortie. */
function exhaustPath(i: number): ExhaustPath {
  const x = XS[i];
  const pts = [[x, HEADBOT - 0.06, -0.27], [x, 2.3, -0.42], ...RUNNER(x), ...DOWNPIPE.slice(1), [2.3, -0.2, -1.35], [2.9, -0.2, -1.35], [3.55, -0.2, -1.35], ...OUTLET];
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  const N = 240;
  const frames = curve.computeFrenetFrames(N, false);
  const P = new Float32Array((N + 1) * 3);
  const NR = new Float32Array((N + 1) * 3);
  const BN = new Float32Array((N + 1) * 3);
  const R = new Float32Array(N + 1);
  for (let k = 0; k <= N; k++) {
    const v = curve.getPointAt(k / N);
    P.set([v.x, v.y, v.z], k * 3);
    NR.set([frames.normals[k].x, frames.normals[k].y, frames.normals[k].z], k * 3);
    BN.set([frames.binormals[k].x, frames.binormals[k].y, frames.binormals[k].z], k * 3);
    R[k] = v.z > -0.6 && v.y > 1.9 ? 0.07 : v.y > 1.5 ? 0.06 : v.x < 2.2 ? 0.1 : v.x < 3.6 ? 0.22 : 0.08;
  }
  return { pts: P, nrm: NR, bin: BN, rad: R, length: curve.getLength(), samples: N };
}

export interface EngineMaterial extends THREE.MeshStandardMaterial {
  userData: { looks: { materials: MatLook; systems: MatLook } };
}

export interface PartNode {
  id: string;
  group: THREE.Group;
  mats: EngineMaterial[];
  /** Opacité courante, interpolée vers la cible. */
  cur: number;
}

export interface Anim {
  pist: THREE.Group[];
  ring: THREE.Group[];
  rod: THREE.Group[];
  valve: { g: THREE.Group; cyl: number; ex: boolean }[];
  spring: { g: THREE.Group; cyl: number; ex: boolean }[];
  gas: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>[];
  spin: { g: THREE.Group; k: number }[];
  crank: THREE.Group;
  flywheel: THREE.Group;
  pulley: THREE.Group;
  camA: THREE.Group;
  camE: THREE.Group;
}

type V3 = [number, number, number];
interface AddOpts {
  parent?: THREE.Object3D;
  rot?: V3;
  /** Finition d'un détail ; le détail est éclairci en mode systèmes. */
  fin?: Finish;
  /** Matériau propre à ce maillage (pour l'animer seul, par exemple la chaleur d'une tubulure). */
  key?: string;
}

export function buildEngine() {
  const root = new THREE.Group();
  const P: Record<string, PartNode & { cache: Map<string, EngineMaterial> }> = {};

  PARTS.forEach((d) => {
    const g = new THREE.Group();
    g.name = d.id;
    root.add(g);
    P[d.id] = { id: d.id, group: g, mats: [], cur: 1, cache: new Map() };
  });

  function mat(id: string, fin?: Finish, own?: string) {
    const p = P[id];
    const key = (fin ?? '_') + (own ?? '');
    let m = p.cache.get(key);
    if (!m) {
      const lk = looks(fin ?? PART_FINISH[id], SYSTEM[PARTS.find((x) => x.id === id)!.sys].color, !!fin);
      m = new THREE.MeshStandardMaterial({
        color: lk.materials.color.clone(),
        metalness: lk.materials.metalness,
        roughness: lk.materials.roughness,
      }) as EngineMaterial;
      m.userData.looks = lk;
      p.cache.set(key, m);
      p.mats.push(m);
    }
    return m;
  }

  function add(id: string, geo: THREE.BufferGeometry, pos?: V3 | null, o: AddOpts = {}) {
    const m = new THREE.Mesh(geo, mat(id, o.fin, o.key));
    m.userData.partId = id;
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    (o.parent ?? P[id].group).add(m);
    return m;
  }

  function sub(id: string, x: number, y: number, z: number, parent?: THREE.Object3D) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    (parent ?? P[id].group).add(g);
    return g;
  }

  const cyl = (r1: number, r2: number, h: number, s = 28) => new THREE.CylinderGeometry(r1, r2, h, s);
  const cylX = (r: number, len: number, s?: number) => cyl(r, r, len, s).rotateZ(Math.PI / 2);
  const cylZ = (r: number, len: number, s?: number) => cyl(r, r, len, s).rotateX(Math.PI / 2);
  const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

  function extX(shape: THREE.Shape, w: number) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 24 });
    g.rotateY(Math.PI / 2);
    g.translate(-w / 2, 0, 0);
    return g;
  }
  function extY(shape: THREE.Shape, y0: number, h: number) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 28 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    return g;
  }
  function gearGeo(r: number, n: number, w: number, d: number) {
    const s = new THREE.Shape();
    const st = (Math.PI * 2) / n;
    for (let k = 0; k < n; k++) {
      const a = k * st;
      [[0, r], [0.2, r + d], [0.5, r + d], [0.7, r]].forEach((q, j) => {
        const x = Math.cos(a + q[0] * st) * q[1];
        const y = Math.sin(a + q[0] * st) * q[1];
        if (k === 0 && j === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
    }
    s.closePath();
    return extX(s, w);
  }
  function outline(hw: number, hd: number, holeR: number) {
    const s = new THREE.Shape();
    s.moveTo(-hw, -hd);
    s.lineTo(hw, -hd);
    s.lineTo(hw, hd);
    s.lineTo(-hw, hd);
    s.closePath();
    XS.forEach((x) => {
      const h = new THREE.Path();
      h.absarc(x, 0, holeR, 0, Math.PI * 2, true);
      s.holes.push(h);
    });
    return s;
  }
  function hull(circles: number[][], pad: number) {
    const pts: number[][] = [];
    circles.forEach((c) => {
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        pts.push([c[0] + Math.cos(a) * (c[2] + pad), c[1] + Math.sin(a) * (c[2] + pad)]);
      }
    });
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo: number[][] = [];
    const up: number[][] = [];
    pts.forEach((p) => {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    });
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    lo.pop();
    up.pop();
    return lo.concat(up).map((p) => new THREE.Vector2(p[0], p[1]));
  }
  /** Courroie autour de poulies données en (z, y, rayon). */
  function beltGeo(circles: number[][], w: number) {
    const c = circles.map((q) => [-q[0], q[1], q[2]]);
    const s = new THREE.Shape(hull(c, 0.045));
    s.holes.push(new THREE.Path(hull(c, 0)));
    return extX(s, w);
  }
  const tube = (pts: number[][], r: number, seg = 40) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), seg, r, 14, false);

  const LOBE = (() => {
    const s = new THREE.Shape();
    const half = (55 * Math.PI) / 180;
    for (let k = 0; k < 120; k++) {
      const b = -Math.PI + (k / 120) * Math.PI * 2;
      const r = 0.12 + (Math.abs(b) < half ? LIFT * Math.pow(Math.cos(((Math.PI / 2) * b) / half), 2) : 0);
      const x = r * Math.sin(b);
      const y = r * Math.cos(b);
      if (k) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    s.closePath();
    return extX(s, 0.1);
  })();

  const pist: THREE.Group[] = [];
  const ring: THREE.Group[] = [];
  const rod: THREE.Group[] = [];
  const valve: Anim['valve'] = [];
  const spring: Anim['spring'] = [];
  const spin: Anim['spin'] = [];

  /* ----- Structure ----- */
  add('bloc', extY(outline(2.35, 0.55, 0.42), 0.74, DECK - 0.74));
  add('bloc', box(4.7, 1.0, 1.1), [0, 0.25, 0]);
  [-2, -1, 0, 1, 2].forEach((x) => add('bloc', box(0.45, 0.1, 1.0), [x, -0.29, 0]));
  add('bloc', box(0.14, 1.3, 1.16), [2.42, 0.3, 0]);
  add('bloc', cylX(0.26, 0.12), [-2.41, 0, 0]);

  add('joint', extY(outline(2.35, 0.55, 0.42), DECK + 0.004, HEADBOT - DECK - 0.008));

  add('culasse', box(4.7, 0.76, 1.1), [0, 2.47, 0]);
  XS.forEach((x) => {
    add('culasse', box(0.42, 0.32, 0.14), [x, 2.45, 0.62]);
    add('culasse', box(0.42, 0.32, 0.14), [x, 2.45, -0.62]);
  });

  add('cache', extY(outline(2.3, 0.5, 0.09), 2.854, 0.75));
  add('cache', box(4.7, 0.028, 1.1), [0, 2.876, 0]);
  add('cache', cyl(0.13, 0.13, 0.1), [1.95, 3.66, -0.25], { fin: 'black' });

  {
    const s = new THREE.Shape();
    [[-0.55, 0], [0.55, 0], [0.55, -0.15], [0.4, -0.85], [-0.4, -0.85], [-0.55, -0.15]].forEach((p, i) =>
      i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]),
    );
    s.closePath();
    add('carter', extX(s, 4.5).translate(0, -0.26, 0));
    add('carter', box(4.7, 0.05, 1.14), [0, -0.28, 0]);
    add('carter', cyl(0.06, 0.06, 0.1), [1.5, -1.14, 0], { fin: 'steel' });
  }

  /* ----- Équipage mobile ----- */
  XS.forEach((x) => {
    const pg = sub('piston', x, 1.47, 0);
    add('piston', cyl(0.4, 0.4, 0.7, 36), [0, -0.1, 0], { parent: pg });
    add('piston', cyl(0.36, 0.36, 0.02, 30), [0, 0.255, 0], { parent: pg, fin: 'aluCast' });
    add('piston', cylX(0.08, 0.72), [0, 0, 0], { parent: pg, fin: 'steel' });
    pist.push(pg);

    const rg = sub('segments', x, 1.47, 0);
    [0.2, 0.14, 0.08].forEach((y) =>
      add('segments', new THREE.TorusGeometry(0.4, 0.014, 8, 36).rotateX(Math.PI / 2), [0, y, 0], { parent: rg }),
    );
    ring.push(rg);

    const bg = sub('bielle', x, 0, 0);
    add('bielle', cylX(0.22, 0.26, 28), [0, 0, 0], { parent: bg });
    add('bielle', box(0.2, CL - 0.5, 0.14), [0, CL / 2 - 0.02, 0], { parent: bg });
    add('bielle', cylX(0.12, 0.22, 20), [0, CL, 0], { parent: bg });
    add('bielle', box(0.26, 0.1, 0.3), [0, -0.2, 0], { parent: bg, fin: 'steelDark' });
    rod.push(bg);
  });

  const crank = sub('vilo', 0, 0, 0);
  add('vilo', cylX(0.14, 0.9), [-2.62, 0, 0], { parent: crank });
  add('vilo', cylX(0.2, 0.7), [2.35, 0, 0], { parent: crank });
  [-2, -1, 0, 1, 2].forEach((x) => add('vilo', cylX(0.2, 0.24), [x, 0, 0], { parent: crank }));
  add('vilo', gearGeo(0.15, 18, 0.12, 0.025), [-2.55, 0, 0], { parent: crank, fin: 'steelDark' });
  XS.forEach((x, i) => {
    const up = i === 0 || i === 3;
    add('vilo', cylX(0.17, 0.36), [x, up ? CR : -CR, 0], { parent: crank });
    [-0.2, 0.2].forEach((dx) => {
      add('vilo', cylX(0.36, 0.1), [x + dx, 0, 0], { parent: crank });
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.6, up ? Math.PI : 0, up ? Math.PI * 2 : Math.PI, false);
      s.closePath();
      add('vilo', extX(s, 0.1), [x + dx, 0, 0], { parent: crank });
    });
  });

  const flywheel = sub('volant', 0, 0, 0);
  add('volant', gearGeo(0.85, 60, 0.2, 0.04), [2.8, 0, 0], { parent: flywheel });
  add('volant', cylX(0.3, 0.3), [2.8, 0, 0], { parent: flywheel, fin: 'steel' });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add('volant', cylX(0.04, 0.26), [2.8, Math.cos(a) * 0.5, Math.sin(a) * 0.5], { parent: flywheel, fin: 'steel' });
  }

  const pulley = sub('poulie', 0, 0, 0);
  add('poulie', gearGeo(0.38, 40, 0.22, 0.02), [-3.1, 0, 0], { parent: pulley });
  add('poulie', cylX(0.3, 0.1), [-3.2, 0, 0], { parent: pulley, fin: 'rubber' });
  add('poulie', cylX(0.12, 0.3), [-3.1, 0, 0], { parent: pulley, fin: 'steel' });

  /* ----- Distribution ----- */
  function buildCam(id: string, z: number, peak: number) {
    const g = sub(id, 0, 3.2, z);
    add(id, cylX(0.07, 4.85), [-0.125, 0, 0], { parent: g });
    [-2, -1, 0, 1, 2].forEach((x) => add(id, cylX(0.1, 0.12), [x, 0, 0], { parent: g, fin: 'steel' }));
    XS.forEach((x, i) => {
      const local = Math.PI - ((OFF[i] + peak) * Math.PI) / 180 / 2;
      [-0.15, 0.15].forEach((dx) => add(id, LOBE, [x + dx, 0, 0], { parent: g, rot: [local, 0, 0] }));
    });
    add(id, gearGeo(0.23, 24, 0.12, 0.025), [-2.55, 0, 0], { parent: g, fin: 'aluCast' });
    return g;
  }
  const camA = buildCam('arb_adm', 0.27, INTAKE_PEAK);
  const camE = buildCam('arb_ech', -0.27, EXHAUST_PEAK);

  const HELIX = (() => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 96; k++) {
      const t = k / 96;
      const a = t * 7 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * 0.07, t * 0.5, Math.sin(a) * 0.07));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.012, 6, false);
  })();

  ([['sou_adm', 0.27, false], ['sou_ech', -0.27, true]] as const).forEach(([id, z, ex]) => {
    XS.forEach((x, i) =>
      [-0.15, 0.15].forEach((dx) => {
        const vg = sub(id, x + dx, 0, z);
        add(id, cyl(0.025, 0.025, 0.94, 10), [0, 2.58, 0], { parent: vg });
        add(id, cyl(0.04, 0.11, 0.06, 24), [0, 2.12, 0], { parent: vg });
        add(id, cyl(0.09, 0.09, 0.06, 20), [0, 3.05, 0], { parent: vg, fin: 'steel' });
        add(id, cyl(0.075, 0.075, 0.02, 16), [0, 2.93, 0], { parent: vg, fin: 'steelDark' });
        valve.push({ g: vg, cyl: i, ex });
        const sg = sub('ressort', x + dx, 2.45, z);
        add('ressort', HELIX, [0, 0, 0], { parent: sg });
        spring.push({ g: sg, cyl: i, ex });
      }),
    );
  });

  add('courroie', beltGeo([[0, 0, 0.15], [0.27, 3.2, 0.23], [-0.27, 3.2, 0.23], [0.55, 1.5, 0.12]], 0.14), [-2.55, 0, 0]);
  add('courroie', cylX(0.12, 0.14), [-2.55, 1.5, 0.55], { fin: 'alu' });

  /* ----- Allumage et injection ----- */
  XS.forEach((x) => {
    add('bougie', cyl(0.045, 0.045, 0.45, 14), [x, 2.315, 0]);
    add('bougie', cyl(0.07, 0.07, 0.08, 6), [x, 2.58, 0], { fin: 'steel' });
    add('bougie', cyl(0.055, 0.055, 1.3, 20), [x, 3.25, 0], { fin: 'ceramic' });
    add('bougie', cyl(0.025, 0.025, 0.1, 10), [x, 3.95, 0], { fin: 'steel' });
    add('bobine', cyl(0.085, 0.085, 0.45, 20), [x, 3.775, 0], { fin: 'black' });
    add('bobine', cyl(0.13, 0.13, 0.6, 24), [x, 4.25, 0]);
    add('bobine', box(0.14, 0.12, 0.14), [x, 4.6, 0.12], { fin: 'black' });
    add('injecteur', cyl(0.045, 0.045, 0.45, 16), [x, 2.77, 0.72]);
    add('injecteur', cyl(0.02, 0.045, 0.06, 12), [x, 2.52, 0.72], { fin: 'steelDark' });
    add('injecteur', box(0.1, 0.08, 0.1), [x, 3.02, 0.76], { fin: 'black' });
  });
  add('injecteur', cylX(0.06, 3.6), [0, 3.05, 0.72], { fin: 'alu' });

  /* ----- Admission et échappement ----- */
  XS.forEach((x, i) => {
    add('admission', tube([[x, 2.45, 0.55], [x, 2.45, 0.9], [x, 2.85, 1.25], [x, 3.4, 1.15]], 0.12));
    add('admission', box(0.42, 0.34, 0.08), [x, 2.45, 0.63]);
    add('echappement', tube(RUNNER(x), 0.09), null, { key: `r${i}` });
    add('echappement', box(0.42, 0.34, 0.08), [x, 2.45, -0.63]);
  });
  add('admission', cylX(0.34, 3.9), [0, 3.65, 1.15]);
  [-1.95, 1.95].forEach((x) => add('admission', cylX(0.36, 0.06), [x, 3.65, 1.15]));
  add('papillon', cylX(0.24, 0.65), [2.275, 3.65, 1.15]);
  add('papillon', box(0.3, 0.3, 0.3), [2.3, 3.65, 1.5], { fin: 'black' });
  add('papillon', new THREE.TorusGeometry(0.24, 0.025, 8, 28).rotateY(Math.PI / 2), [2.6, 3.65, 1.15], { fin: 'steel' });
  {
    const g = sub('papillon', 2.275, 3.65, 1.15);
    g.rotation.y = 1.0;
    add('papillon', cyl(0.215, 0.215, 0.025, 28).rotateZ(Math.PI / 2), [0, 0, 0], { parent: g, fin: 'steel' });
  }
  add('echappement', tube(DOWNPIPE, 0.14, 50), null, { key: 'pipe' });
  add('echappement', cylX(0.2, 0.06), [1.95, -0.2, -1.35]);

  /* Ligne d'échappement : catalyseur et tuyau de sortie (la ligne réelle continue sous la caisse) */
  add('catalyseur', cylX(0.2, 0.06), [2.05, -0.2, -1.35], { fin: 'steelDark' });
  add('catalyseur', cyl(0.14, 0.3, 0.32, 32).rotateZ(Math.PI / 2), [2.24, -0.2, -1.35], { key: 'cat' });
  add('catalyseur', cylX(0.3, 1.0, 36), [2.9, -0.2, -1.35], { key: 'cat' });
  add('catalyseur', cyl(0.3, 0.12, 0.32, 32).rotateZ(Math.PI / 2), [3.56, -0.2, -1.35], { key: 'cat' });
  [2.55, 2.9, 3.25].forEach((x) => add('catalyseur', new THREE.TorusGeometry(0.305, 0.012, 8, 40).rotateY(Math.PI / 2), [x, -0.2, -1.35], { fin: 'steelDark' }));
  add('catalyseur', tube(OUTLET, 0.11, 24), null, { key: 'cat' });
  add('catalyseur', cylX(0.13, 0.05), [TAILPIPE[0] - 0.03, TAILPIPE[1], TAILPIPE[2]], { fin: 'steelDark' });
  [[1.55, -0.12, -1.35, 0.12], [3.95, -0.2, -1.35, 0.09]].forEach(([x, y, z, dy]) => {
    add('sonde_lambda', cyl(0.045, 0.045, 0.26, 16), [x, y + dy + 0.13, z]);
    add('sonde_lambda', cyl(0.07, 0.07, 0.06, 6), [x, y + dy + 0.03, z], { fin: 'steel' });
    add('sonde_lambda', cyl(0.035, 0.035, 0.16, 10), [x, y + dy + 0.34, z], { fin: 'black' });
  });

  /* ----- Huile et refroidissement ----- */
  add('filtre', cylZ(0.24, 0.55), [-0.5, 0.35, 0.9]);
  add('filtre', cylZ(0.14, 0.12), [-0.5, 0.35, 0.58], { fin: 'black' });
  add('filtre', new THREE.TorusGeometry(0.24, 0.02, 8, 28), [-0.5, 0.35, 1.17], { fin: 'rubber' });
  add('pompe_huile', box(0.5, 0.3, 0.5), [-2.0, -0.45, 0]);
  add('pompe_huile', cylX(0.1, 0.3), [-2.25, -0.45, 0], { fin: 'steel' });
  add('pompe_huile', cyl(0.04, 0.04, 0.35, 10), [-2.0, -0.77, 0]);
  add('pompe_huile', box(0.3, 0.06, 0.25), [-2.0, -0.97, 0], { fin: 'black' });
  {
    add('pompe_eau', cylX(0.2, 0.5), [-2.7, 0.75, -0.75]);
    add('pompe_eau', cylX(0.3, 0.06), [-2.4, 0.75, -0.75]);
    add('pompe_eau', cylZ(0.07, 0.4), [-2.65, 0.75, -1.0], { fin: 'steel' });
    const g = sub('pompe_eau', 0, 0.75, -0.75);
    spin.push({ g, k: 1.6 });
    add('pompe_eau', gearGeo(0.18, 16, 0.14, 0.015), [-3.1, 0, 0], { parent: g, fin: 'steel' });
    add('pompe_eau', cylX(0.04, 0.2), [-2.98, 0, 0], { parent: g });
  }

  /* ----- Accessoires ----- */
  {
    add('alternateur', cylX(0.27, 0.55), [-2.7, 0.3, 0.95]);
    add('alternateur', cylX(0.285, 0.06), [-2.55, 0.3, 0.95], { fin: 'aluCast' });
    add('alternateur', cylX(0.285, 0.06), [-2.85, 0.3, 0.95], { fin: 'aluCast' });
    add('alternateur', cylX(0.2, 0.05), [-3.0, 0.3, 0.95], { fin: 'black' });
    add('alternateur', box(0.5, 0.4, 0.3), [-2.55, 0.45, 0.72], { fin: 'black' });
    const g = sub('alternateur', 0, 0.3, 0.95);
    spin.push({ g, k: 2.6 });
    add('alternateur', gearGeo(0.12, 12, 0.14, 0.015), [-3.1, 0, 0], { parent: g, fin: 'steel' });
    add('alternateur', cylX(0.04, 0.2), [-3.02, 0, 0], { parent: g });
  }
  add('courroie_acc', beltGeo([[0, 0, 0.38], [0.95, 0.3, 0.12], [-0.75, 0.75, 0.18], [0.45, -0.55, 0.1]], 0.14), [-3.1, 0, 0]);
  add('courroie_acc', cylX(0.1, 0.14), [-3.1, -0.55, 0.45], { fin: 'alu' });

  /* ----- Volumes de gaz (hors pièces) ----- */
  const gasGroup = new THREE.Group();
  gasGroup.visible = false;
  root.add(gasGroup);
  const gas: Anim['gas'] = XS.map((x) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x8e8e93, transparent: true, opacity: 0.05, depthWrite: false });
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 1, 28), m);
    g.position.x = x;
    gasGroup.add(g);
    return g;
  });

  const anim: Anim = { pist, ring, rod, valve, spring, gas, spin, crank, flywheel, pulley, camA, camE };
  const parts: Record<string, PartNode> = P;
  /* matériaux animés par la chaleur des gaz : une tubulure par cylindre, la descente, le catalyseur */
  const heat = {
    runners: XS.map((_, i) => P.echappement.cache.get(`_r${i}`)!),
    pipe: P.echappement.cache.get('_pipe')!,
    cat: P.catalyseur.cache.get('_cat')!,
  };
  const exhaust = XS.map((_, i) => exhaustPath(i));
  return { root, parts, anim, gasGroup, heat, exhaust };
}

/* ----- Cinématique : bielle-manivelle, cames et levée de soupape ----- */
const D2R = Math.PI / 180;

export function liftAt(c: number, peak: number) {
  const d = ((c - peak + 360 + 720) % 720) - 360;
  const phi = d / 2;
  return Math.abs(phi) < 55 ? LIFT * Math.pow(Math.cos(((Math.PI / 2) * phi) / 55), 2) : 0;
}

/** Angle dans le cycle de 720° du cylindre i, pour un angle vilebrequin psi. */
export const cycleAngle = (psi: number, i: number) => (((psi - OFF[i]) % 720) + 720) % 720;

export function setPose(anim: Anim, psi: number) {
  const rad = psi * D2R;
  anim.crank.rotation.x = anim.pulley.rotation.x = anim.flywheel.rotation.x = rad;
  anim.camA.rotation.x = anim.camE.rotation.x = rad / 2;
  anim.spin.forEach((s) => {
    s.g.rotation.x = rad * s.k;
  });
  for (let i = 0; i < 4; i++) {
    const th = (psi - OFF[i]) * D2R;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const y = CR * c + Math.sqrt(CL * CL - CR * CR * s * s);
    anim.pist[i].position.y = y;
    anim.ring[i].position.y = y;
    const rod = anim.rod[i];
    rod.position.y = CR * c;
    rod.position.z = CR * s;
    rod.rotation.x = Math.atan2(-CR * s, y - CR * c);
    const crown = y + 0.265;
    const h = HEADBOT - 0.012 - crown;
    const gm = anim.gas[i];
    gm.scale.y = Math.max(h, 0.02);
    gm.position.y = crown + h / 2;
  }
  anim.valve.forEach((v) => {
    v.g.position.y = -liftAt(cycleAngle(psi, v.cyl), v.ex ? EXHAUST_PEAK : INTAKE_PEAK);
  });
  anim.spring.forEach((v) => {
    v.g.scale.y = (0.5 - liftAt(cycleAngle(psi, v.cyl), v.ex ? EXHAUST_PEAK : INTAKE_PEAK)) / 0.5;
  });
}
