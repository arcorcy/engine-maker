/*
 * Modèle 3D procédural d'un moteur à pistons, en ligne ou en V, construit à partir de sa géométrie
 * (nombre et position des cylindres, bancs, alésage, course, bielle, piston, plan de joint, cames, ordre d'allumage).
 * Unité ≈ 1 dm, axe du vilebrequin = X (avant en -X), haut = Y.
 * Chaque banc a son repère : axe des cylindres = Y local, admission en +z local, échappement en -z local.
 * Tout ce qui est au-dessus du plan de joint a été dessiné pour un plan à DRAWN_DECK et est décalé de headDy.
 */
import * as THREE from 'three';
import { PARTS } from '../data/parts';
import { SYSTEM } from '../data/systems';
import { cycleAngle, liftOf, toWorld, type Bank, type EngineGeometry } from './geometry';
import { looks, PART_FINISH, type Finish, type MatLook } from './materials';

/** Pièces placées au-dessus du plan de joint, qui suivent sa hauteur. */
const HEAD = new Set([
  'culasse', 'cache', 'arb_adm', 'arb_ech', 'sou_adm', 'sou_ech', 'ressort', 'bougie', 'bobine', 'injecteur',
  'admission', 'papillon', 'echappement', 'catalyseur', 'sonde_lambda',
]);

/* Tubulure d'échappement d'un cylindre, dans le repère du banc (dessinée pour le plan de joint de référence) */
const RUNNER = (x: number) => [[x, 2.45, -0.55], [x, 2.45, -0.9], [x * 0.6, 2.0, -1.15], [x * 0.15, 1.55, -1.3]];

export interface ExhaustPath {
  /** Points échantillonnés à abscisse curviligne régulière, avec un repère local et le rayon utile du conduit. */
  pts: Float32Array;
  nrm: Float32Array;
  bin: Float32Array;
  rad: Float32Array;
  length: number;
  samples: number;
}

/** Courbe échantillonnée passant par des points de contrôle, chacun portant le rayon utile du conduit à cet endroit. */
function samplePath(ctrl: { p: number[]; r: number }[]): ExhaustPath {
  const curve = new THREE.CatmullRomCurve3(ctrl.map((c) => new THREE.Vector3(c.p[0], c.p[1], c.p[2])), false, 'centripetal');
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
    let best = Infinity;
    for (const c of ctrl) {
      const d = (c.p[0] - v.x) ** 2 + (c.p[1] - v.y) ** 2 + (c.p[2] - v.z) ** 2;
      if (d < best) {
        best = d;
        R[k] = c.r;
      }
    }
  }
  return { pts: P, nrm: NR, bin: BN, rad: R, length: curve.getLength(), samples: N };
}

export interface EngineMaterial extends THREE.MeshStandardMaterial {
  userData: { looks: { materials: MatLook; systems: MatLook }; bank: number };
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
  /** -1 pour les cylindres d'un banc dessiné en miroir. */
  rodSign: number[];
  /** base : hauteur de la soupape fermée. */
  valve: { g: THREE.Group; cyl: number; ex: boolean; base: number }[];
  spring: { g: THREE.Group; cyl: number; ex: boolean }[];
  gas: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>[];
  spin: { g: THREE.Group; k: number }[];
  crank: THREE.Group;
  flywheel: THREE.Group;
  pulley: THREE.Group;
  cams: THREE.Group[];
}

type V3 = [number, number, number];
interface AddOpts {
  parent?: THREE.Object3D;
  rot?: V3;
  /** Finition d'un détail ; le détail est éclairci en mode systèmes. */
  fin?: Finish;
  /** Matériau propre à ce maillage (pour l'animer seul, par exemple la chaleur d'une tubulure). */
  key?: string;
  /** Banc dans le repère duquel la pièce est placée. */
  bank?: number;
  /** Coordonnées déjà exprimées dans le repère du moteur, décalage de culasse compris. */
  abs?: boolean;
}

/** Applique à un groupe l'inclinaison (et le miroir) d'un banc. */
function placeBank(g: THREE.Object3D, bank: Bank) {
  g.rotation.x = bank.angle;
  g.scale.z = bank.mirror ? -1 : 1;
  g.userData.bank = undefined;
}

export function buildEngine(geo: EngineGeometry) {
  const { boreR, CR, CL, CH, deck, headBot, headDy: dy, cylX: cxs, banks, bankOf, length: L } = geo;
  const isV = geo.layout === 'v';
  const F = -L / 2; // face avant du bloc
  const B = L / 2; // face arrière
  const root = new THREE.Group();
  const P: Record<string, PartNode & { cache: Map<string, EngineMaterial>; banks: Map<number, THREE.Group> }> = {};

  PARTS.forEach((d) => {
    const g = new THREE.Group();
    g.name = d.id;
    root.add(g);
    P[d.id] = { id: d.id, group: g, mats: [], cur: 1, cache: new Map(), banks: new Map() };
  });

  /** Sous-groupe d'une pièce dans le repère d'un banc. */
  function bankGroup(id: string, b: number) {
    let g = P[id].banks.get(b);
    if (!g) {
      g = new THREE.Group();
      placeBank(g, banks[b]);
      g.userData.bank = b;
      P[id].group.add(g);
      P[id].banks.set(b, g);
    }
    return g;
  }

  /* un matériau par pièce, finition, clé et banc : la coupe se fait banc par banc */
  function mat(id: string, fin: Finish | undefined, own: string | undefined, bank: number) {
    const p = P[id];
    const key = `${fin ?? '_'}${own ?? ''}@${bank}`;
    let m = p.cache.get(key);
    if (!m) {
      const lk = looks(fin ?? PART_FINISH[id], SYSTEM[PARTS.find((x) => x.id === id)!.sys].color, !!fin);
      m = new THREE.MeshStandardMaterial({
        color: lk.materials.color.clone(),
        metalness: lk.materials.metalness,
        roughness: lk.materials.roughness,
      }) as EngineMaterial;
      m.userData = { looks: lk, bank };
      p.cache.set(key, m);
      p.mats.push(m);
    }
    return m;
  }

  const bankOfParent = (o: THREE.Object3D | undefined): number => {
    for (let x = o; x; x = x.parent ?? undefined) if (typeof x.userData.bank === 'number') return x.userData.bank;
    return -1;
  };

  function add(id: string, g: THREE.BufferGeometry, pos?: readonly number[] | null, o: AddOpts = {}) {
    const parent = o.parent ?? (o.bank !== undefined ? bankGroup(id, o.bank) : P[id].group);
    const bank = o.bank ?? bankOfParent(parent);
    const m = new THREE.Mesh(g, mat(id, o.fin, o.key, bank));
    m.userData.partId = id;
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (!o.parent && !o.abs && HEAD.has(id)) m.position.y += dy;
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    parent.add(m);
    return m;
  }

  function sub(id: string, x: number, y: number, z: number, o: { parent?: THREE.Object3D; bank?: number } = {}) {
    const parent = o.parent ?? (o.bank !== undefined ? bankGroup(id, o.bank) : P[id].group);
    const g = new THREE.Group();
    g.position.set(x, y + (!o.parent && HEAD.has(id) ? dy : 0), z);
    parent.add(g);
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
  function gearGeo(r: number, count: number, w: number, d: number) {
    const s = new THREE.Shape();
    const st = (Math.PI * 2) / count;
    for (let k = 0; k < count; k++) {
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
  /** Plaque rectangulaire percée d'un trou par cylindre. */
  function outline(hw: number, hd: number, holeR: number, xs: number[]) {
    const s = new THREE.Shape();
    s.moveTo(-hw, -hd);
    s.lineTo(hw, -hd);
    s.lineTo(hw, hd);
    s.lineTo(-hw, hd);
    s.closePath();
    xs.forEach((x) => {
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

  /** Profil de came en cos² : demi-durée en degrés vilebrequin, levée en dm. */
  function lobeGeo(halfCrank: number, lift: number) {
    const s = new THREE.Shape();
    const half = ((halfCrank / 2) * Math.PI) / 180;
    for (let k = 0; k < 160; k++) {
      const b = -Math.PI + (k / 160) * Math.PI * 2;
      const r = 0.12 + (Math.abs(b) < half ? lift * Math.pow(Math.cos(((Math.PI / 2) * b) / half), 2) : 0);
      const x = r * Math.sin(b);
      const y = r * Math.cos(b);
      if (k) s.lineTo(x, y);
      else s.moveTo(x, y);
    }
    s.closePath();
    return extX(s, 0.1);
  }

  const xsOf = (b: number) => banks[b].cyls.map((i) => cxs[i]);
  /** Point du repère d'un banc, décalage de culasse compris, exprimé dans le repère du moteur. */
  const W = (b: number, p: readonly number[]) => toWorld(banks[b], [p[0], p[1] + dy, p[2]]);

  const pist: THREE.Group[] = [];
  const ring: THREE.Group[] = [];
  const rod: THREE.Group[] = [];
  const rodSign: number[] = [];
  const valve: Anim['valve'] = [];
  const spring: Anim['spring'] = [];
  const spin: Anim['spin'] = [];
  const cams: THREE.Group[] = [];

  /* ----- Bas moteur : carter-cylindres, paliers, carter d'huile ----- */
  let halfW = 0.55; // demi-largeur du carter inférieur
  if (isV) {
    /* carter en V : enveloppe des embases des deux bancs et du fond */
    const pts: number[][] = [[-0.6, -0.25, 0], [0.6, -0.25, 0]];
    banks.forEach((bk) => [-0.55, 0.55].forEach((z) => {
      const w = toWorld(bk, [0, 0.74, z]);
      pts.push([w[2], w[1], 0]);
    }));
    const s = new THREE.Shape(hull(pts.map((p) => [-p[0], p[1], 0]), 0));
    add('bloc', extX(s, L));
    halfW = 0.6;
  } else {
    add('bloc', box(L, 1.0, 1.1), [0, 0.25, 0]);
  }
  geo.mains.forEach((x) => add('bloc', box(0.45, 0.1, halfW * 2 - 0.1), [x, -0.29, 0]));
  add('bloc', box(0.14, 1.3, halfW * 2 + 0.06), [B + 0.07, 0.3, 0]);
  add('bloc', cylX(0.26, 0.12), [F - 0.06, 0, 0]);
  banks.forEach((_, b) => {
    add('bloc', extY(outline(L / 2, 0.55, boreR + 0.02, xsOf(b)), 0.74, deck - 0.74), null, { bank: b });
    add('joint', extY(outline(L / 2, 0.55, boreR + 0.02, xsOf(b)), deck + 0.004, headBot - deck - 0.008), null, { bank: b });
  });

  {
    const s = new THREE.Shape();
    const w = halfW;
    [[-w, 0], [w, 0], [w, -0.15], [w - 0.15, -0.85], [-w + 0.15, -0.85], [-w, -0.15]].forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    s.closePath();
    add('carter', extX(s, L - 0.2).translate(0, -0.26, 0));
    add('carter', box(L, 0.05, w * 2 + 0.04), [0, -0.28, 0]);
    add('carter', cyl(0.06, 0.06, 0.1), [B - 0.85, -1.14, 0], { fin: 'steel' });
  }

  /* ----- Haut moteur : culasse et couvre-culasse, par banc ----- */
  banks.forEach((_, b) => {
    add('culasse', box(L, 0.76, 1.1), [0, 2.47, 0], { bank: b });
    xsOf(b).forEach((x) => {
      add('culasse', box(0.42, 0.32, 0.14), [x, 2.45, 0.62], { bank: b });
      add('culasse', box(0.42, 0.32, 0.14), [x, 2.45, -0.62], { bank: b });
    });
    add('cache', extY(outline(L / 2 - 0.05, 0.5, 0.09, xsOf(b)), 2.854, 0.75), null, { bank: b });
    add('cache', box(L, 0.028, 1.1), [0, 2.876, 0], { bank: b });
    if (b === 0) add('cache', cyl(0.13, 0.13, 0.1), [B - 0.4, 3.66, -0.25], { fin: 'black', bank: b });
  });

  /* ----- Équipage mobile ----- */
  const rodW = isV ? 0.18 : 0.26;
  cxs.forEach((x, i) => {
    const b = bankOf[i];
    /* repère du piston : origine sur l'axe, calotte à CH au-dessus */
    const pg = sub('piston', x, 1.47, 0, { bank: b });
    add('piston', cyl(boreR, boreR, 0.6, 36), [0, CH - 0.32, 0], { parent: pg });
    add('piston', cyl(boreR - 0.04, boreR - 0.04, 0.02, 30), [0, CH - 0.01, 0], { parent: pg, fin: 'aluCast' });
    add('piston', cylX(0.08, boreR * 1.8), [0, 0, 0], { parent: pg, fin: 'steel' });
    pist.push(pg);

    const rg = sub('segments', x, 1.47, 0, { bank: b });
    [0.065, 0.125, 0.185].forEach((d) =>
      add('segments', new THREE.TorusGeometry(boreR, 0.014, 8, 36).rotateX(Math.PI / 2), [0, CH - d, 0], { parent: rg }),
    );
    ring.push(rg);

    const bg = sub('bielle', x, 0, 0, { bank: b });
    add('bielle', cylX(0.22, rodW, 28), [0, 0, 0], { parent: bg });
    add('bielle', box(rodW - 0.06, CL - 0.5, 0.14), [0, CL / 2 - 0.02, 0], { parent: bg });
    add('bielle', cylX(0.12, rodW - 0.04, 20), [0, CL, 0], { parent: bg });
    add('bielle', box(rodW, 0.1, 0.3), [0, -0.2, 0], { parent: bg, fin: 'steelDark' });
    rod.push(bg);
    rodSign.push(banks[b].mirror ? -1 : 1);
  });

  const crank = sub('vilo', 0, 0, 0);
  add('vilo', cylX(0.14, 0.9), [F - 0.27, 0, 0], { parent: crank });
  add('vilo', cylX(0.2, 0.7), [B, 0, 0], { parent: crank });
  geo.mains.forEach((x) => add('vilo', cylX(0.2, 0.24), [x, 0, 0], { parent: crank }));
  add('vilo', gearGeo(0.15, 18, 0.12, 0.025), [F - 0.2, 0, 0], { parent: crank, fin: 'steelDark' });
  const pinLen = isV ? 0.2 : 0.36;
  const webOff = isV ? 0.27 : 0.2;
  geo.throws.forEach((th) => {
    /* maneton à l'angle (axe du banc − décalage) : le piston est au PMH quand psi vaut son décalage */
    let sy = 0;
    let sz = 0;
    th.cyls.forEach((c) => {
      const a = banks[bankOf[c]].angle - (geo.offsets[c] * Math.PI) / 180;
      sy += Math.cos(a);
      sz += Math.sin(a);
      add('vilo', cylX(0.17, pinLen), [cxs[c], CR * Math.cos(a), CR * Math.sin(a)], { parent: crank });
    });
    /* contrepoids à l'opposé des manetons (dans le plan du profil extrudé, z moteur = -x profil) */
    const phi = Math.atan2(-sy, sz);
    [-webOff, webOff].forEach((dx) => {
      add('vilo', cylX(CR + 0.05, 0.1), [th.center + dx, 0, 0], { parent: crank });
      const s = new THREE.Shape();
      s.absarc(0, 0, 0.6, phi - Math.PI / 2, phi + Math.PI / 2, false);
      s.closePath();
      add('vilo', extX(s, 0.1), [th.center + dx, 0, 0], { parent: crank });
    });
  });

  const flywheel = sub('volant', 0, 0, 0);
  add('volant', gearGeo(0.85, 60, 0.2, 0.04), [B + 0.45, 0, 0], { parent: flywheel });
  add('volant', cylX(0.3, 0.3), [B + 0.45, 0, 0], { parent: flywheel, fin: 'steel' });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    add('volant', cylX(0.04, 0.26), [B + 0.45, Math.cos(a) * 0.5, Math.sin(a) * 0.5], { parent: flywheel, fin: 'steel' });
  }

  const pulley = sub('poulie', 0, 0, 0);
  add('poulie', gearGeo(0.38, 40, 0.22, 0.02), [F - 0.75, 0, 0], { parent: pulley });
  add('poulie', cylX(0.3, 0.1), [F - 0.85, 0, 0], { parent: pulley, fin: 'rubber' });
  add('poulie', cylX(0.12, 0.3), [F - 0.75, 0, 0], { parent: pulley, fin: 'steel' });

  /* ----- Distribution, par banc ----- */
  function buildCam(id: string, z: number, cam: EngineGeometry['intake'], b: number) {
    const LOBE = lobeGeo(cam.half, cam.lift);
    const g = sub(id, 0, 3.2, z, { bank: b });
    add(id, cylX(0.07, L + 0.15), [-0.125, 0, 0], { parent: g });
    geo.mains.forEach((x) => add(id, cylX(0.1, 0.12), [x, 0, 0], { parent: g, fin: 'steel' }));
    banks[b].cyls.forEach((i) => {
      const local = Math.PI - ((geo.offsets[i] + cam.peak) * Math.PI) / 180 / 2;
      [-0.15, 0.15].forEach((dx) => add(id, LOBE, [cxs[i] + dx, 0, 0], { parent: g, rot: [local, 0, 0] }));
    });
    add(id, gearGeo(0.23, 24, 0.12, 0.025), [F - 0.2, 0, 0], { parent: g, fin: 'aluCast' });
    cams.push(g);
  }
  banks.forEach((_, b) => {
    buildCam('arb_adm', 0.27, geo.intake, b);
    buildCam('arb_ech', -0.27, geo.exhaust, b);
  });

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
    cxs.forEach((x, i) =>
      [-0.15, 0.15].forEach((dx) => {
        const b = bankOf[i];
        const vg = sub(id, x + dx, 0, z, { bank: b });
        add(id, cyl(0.025, 0.025, 0.94, 10), [0, 2.58, 0], { parent: vg });
        add(id, cyl(0.04, 0.11, 0.06, 24), [0, 2.12, 0], { parent: vg });
        add(id, cyl(0.09, 0.09, 0.06, 20), [0, 3.05, 0], { parent: vg, fin: 'steel' });
        add(id, cyl(0.075, 0.075, 0.02, 16), [0, 2.93, 0], { parent: vg, fin: 'steelDark' });
        valve.push({ g: vg, cyl: i, ex, base: vg.position.y });
        const sg = sub('ressort', x + dx, 2.45, z, { bank: b });
        add('ressort', HELIX, [0, 0, 0], { parent: sg });
        spring.push({ g: sg, cyl: i, ex });
      }),
    );
  });

  /* courroie de distribution : vilebrequin et pignons d'arbres à cames, dans le plan avant */
  {
    const circles: number[][] = [[0, 0, 0.15]];
    banks.forEach((_, b) => [0.27, -0.27].forEach((z) => {
      const w = W(b, [F - 0.2, 3.2, z]);
      circles.push([w[2], w[1], 0.23]);
    }));
    if (!isV) circles.push([0.55, 1.5, 0.12]);
    add('courroie', beltGeo(circles, 0.14), [F - 0.2, 0, 0]);
    if (!isV) add('courroie', cylX(0.12, 0.14), [F - 0.2, 1.5, 0.55], { fin: 'alu' });
  }

  /* ----- Allumage et injection, par cylindre ----- */
  cxs.forEach((x, i) => {
    const b = bankOf[i];
    add('bougie', cyl(0.045, 0.045, 0.45, 14), [x, 2.315, 0], { bank: b });
    add('bougie', cyl(0.07, 0.07, 0.08, 6), [x, 2.58, 0], { fin: 'steel', bank: b });
    add('bougie', cyl(0.055, 0.055, 1.3, 20), [x, 3.25, 0], { fin: 'ceramic', bank: b });
    add('bougie', cyl(0.025, 0.025, 0.1, 10), [x, 3.95, 0], { fin: 'steel', bank: b });
    add('bobine', cyl(0.085, 0.085, 0.45, 20), [x, 3.775, 0], { fin: 'black', bank: b });
    add('bobine', cyl(0.13, 0.13, 0.6, 24), [x, 4.25, 0], { bank: b });
    add('bobine', box(0.14, 0.12, 0.14), [x, 4.6, 0.12], { fin: 'black', bank: b });
    add('injecteur', cyl(0.045, 0.045, 0.45, 16), [x, 2.77, 0.72], { bank: b });
    add('injecteur', cyl(0.02, 0.045, 0.06, 12), [x, 2.52, 0.72], { fin: 'steelDark', bank: b });
    add('injecteur', box(0.1, 0.08, 0.1), [x, 3.02, 0.76], { fin: 'black', bank: b });
  });
  banks.forEach((_, b) => add('injecteur', cylX(0.06, L - 1.1), [0, 3.05, 0.72], { fin: 'alu', bank: b }));

  /* ----- Admission : tubulures et répartiteur (dans le V pour les moteurs en V) ----- */
  const plenumLen = L - 0.8;
  let plenum: number[];
  if (isV) {
    const top = Math.max(...banks.map((_, b) => W(b, [0, 3.6, 0])[1]));
    plenum = [0, top + 0.4, 0];
    cxs.forEach((x, i) => {
      const b = bankOf[i];
      add('admission', box(0.42, 0.34, 0.08), [x, 2.45, 0.63], { bank: b });
      const p1 = W(b, [x, 2.45, 0.6]);
      const p2 = W(b, [x, 2.45, 0.95]);
      add('admission', tube([p1, p2, [x, (p2[1] + plenum[1]) / 2 + 0.1, p2[2] * 0.45], [x, plenum[1] - 0.12, p2[2] * 0.1]], 0.11), null, { abs: true });
    });
  } else {
    plenum = [0, 3.65 + dy, 1.15];
    cxs.forEach((x) => {
      add('admission', tube([[x, 2.45, 0.55], [x, 2.45, 0.9], [x, 2.85, 1.25], [x, 3.4, 1.15]], 0.12), null, { bank: 0 });
      add('admission', box(0.42, 0.34, 0.08), [x, 2.45, 0.63], { bank: 0 });
    });
  }
  add('admission', cylX(0.34, plenumLen), plenum, { abs: true });
  [-plenumLen / 2, plenumLen / 2].forEach((x) => add('admission', cylX(0.36, 0.06), [x, plenum[1], plenum[2]], { abs: true }));
  {
    const pe = plenumLen / 2;
    const [, py, pz] = plenum;
    add('papillon', cylX(0.24, 0.65), [pe + 0.325, py, pz], { abs: true });
    add('papillon', box(0.3, 0.3, 0.3), [pe + 0.35, py, pz + 0.35], { fin: 'black', abs: true });
    add('papillon', new THREE.TorusGeometry(0.24, 0.025, 8, 28).rotateY(Math.PI / 2), [pe + 0.65, py, pz], { fin: 'steel', abs: true });
    const g = sub('papillon', pe + 0.325, py - dy, pz);
    g.rotation.y = 1.0;
    add('papillon', cyl(0.215, 0.215, 0.025, 28).rotateZ(Math.PI / 2), [0, 0, 0], { parent: g, fin: 'steel' });
  }

  /* ----- Échappement : tubulures par cylindre, puis une ligne par banc (descente, catalyseur, sortie) ----- */
  const lines = banks.map((_, b) => {
    const C = W(b, [0, 1.55, -1.3]);
    const s = Math.sign(C[2]) || -1;
    const yl = isV ? Math.min(-0.2, C[1] - 0.6) : -0.2 + dy;
    const zc = C[2] + 0.05 * s;
    const down = [C, [0, C[1] * 0.6 + yl * 0.4, C[2] + 0.02 * s], [0.5, yl + 0.3, zc], [B - 0.45, yl, zc]];
    const outlet = [[B + 1.35, yl, zc], [B + 1.75, yl - 0.02, zc], [B + 2.15, yl - 0.1, zc], [B + 2.4, yl - 0.14, zc]];
    return { C, yl, zc, down, outlet, tail: [B + 2.4, yl - 0.14, zc] as V3 };
  });

  cxs.forEach((x, i) => {
    const b = bankOf[i];
    add('echappement', tube(RUNNER(x), 0.09), null, { key: `r${i}`, bank: b });
    add('echappement', box(0.42, 0.34, 0.08), [x, 2.45, -0.63], { bank: b });
  });
  lines.forEach((ln, b) => {
    const { yl, zc } = ln;
    add('echappement', tube(ln.down, 0.14, 50), null, { key: `pipe${b}`, abs: true });
    add('echappement', cylX(0.2, 0.06), [B - 0.4, yl, zc], { abs: true });
    add('catalyseur', cylX(0.2, 0.06), [B - 0.3, yl, zc], { fin: 'steelDark', abs: true });
    add('catalyseur', cyl(0.14, 0.3, 0.32, 32).rotateZ(Math.PI / 2), [B - 0.11, yl, zc], { key: `cat${b}`, abs: true });
    add('catalyseur', cylX(0.3, 1.0, 36), [B + 0.55, yl, zc], { key: `cat${b}`, abs: true });
    add('catalyseur', cyl(0.3, 0.12, 0.32, 32).rotateZ(Math.PI / 2), [B + 1.21, yl, zc], { key: `cat${b}`, abs: true });
    [0.2, 0.55, 0.9].forEach((dx) =>
      add('catalyseur', new THREE.TorusGeometry(0.305, 0.012, 8, 40).rotateY(Math.PI / 2), [B + dx, yl, zc], { fin: 'steelDark', abs: true }),
    );
    add('catalyseur', tube(ln.outlet, 0.11, 24), null, { key: `cat${b}`, abs: true });
    add('catalyseur', cylX(0.13, 0.05), [ln.tail[0] - 0.03, ln.tail[1], ln.tail[2]], { fin: 'steelDark', abs: true });
    [[B - 0.8, yl + 0.08, 0.12], [B + 1.6, yl, 0.09]].forEach(([x, y, h]) => {
      add('sonde_lambda', cyl(0.045, 0.045, 0.26, 16), [x, y + h + 0.13, zc], { abs: true });
      add('sonde_lambda', cyl(0.07, 0.07, 0.06, 6), [x, y + h + 0.03, zc], { fin: 'steel', abs: true });
      add('sonde_lambda', cyl(0.035, 0.035, 0.16, 10), [x, y + h + 0.34, zc], { fin: 'black', abs: true });
    });
  });

  /* ----- Huile et refroidissement ----- */
  {
    const fz = isV ? 1.35 : 0.9;
    const fy = isV ? -0.05 : 0.35;
    add('filtre', cylZ(0.24, 0.55), [-0.5, fy, fz]);
    add('filtre', cylZ(0.14, 0.12), [-0.5, fy, fz - 0.32], { fin: 'black' });
    add('filtre', new THREE.TorusGeometry(0.24, 0.02, 8, 28), [-0.5, fy, fz + 0.27], { fin: 'rubber' });
  }
  add('pompe_huile', box(0.5, 0.3, 0.5), [F + 0.35, -0.45, 0]);
  add('pompe_huile', cylX(0.1, 0.3), [F + 0.1, -0.45, 0], { fin: 'steel' });
  add('pompe_huile', cyl(0.04, 0.04, 0.35, 10), [F + 0.35, -0.77, 0]);
  add('pompe_huile', box(0.3, 0.06, 0.25), [F + 0.35, -0.97, 0], { fin: 'black' });
  /* en V, la pompe à eau se loge à l'avant, au centre, entre les brins de la courroie de distribution */
  const pump = isV ? { y: 0.95, z: 0 } : { y: 0.75, z: -0.75 };
  {
    add('pompe_eau', cylX(0.2, 0.5), [F - 0.35, pump.y, pump.z]);
    add('pompe_eau', cylX(0.3, 0.06), [F - 0.05, pump.y, pump.z]);
    add('pompe_eau', cylZ(0.07, 0.4), [F - 0.3, pump.y, pump.z - 0.25], { fin: 'steel' });
    const g = sub('pompe_eau', 0, pump.y, pump.z);
    spin.push({ g, k: 1.6 });
    add('pompe_eau', gearGeo(0.18, 16, 0.14, 0.015), [F - 0.75, 0, 0], { parent: g, fin: 'steel' });
    add('pompe_eau', cylX(0.04, 0.2), [F - 0.63, 0, 0], { parent: g });
  }

  /* ----- Accessoires ----- */
  {
    add('alternateur', cylX(0.27, 0.55), [F - 0.35, 0.3, 0.95]);
    add('alternateur', cylX(0.285, 0.06), [F - 0.2, 0.3, 0.95], { fin: 'aluCast' });
    add('alternateur', cylX(0.285, 0.06), [F - 0.5, 0.3, 0.95], { fin: 'aluCast' });
    add('alternateur', cylX(0.2, 0.05), [F - 0.65, 0.3, 0.95], { fin: 'black' });
    add('alternateur', box(0.5, 0.4, 0.3), [F - 0.2, 0.45, 0.72], { fin: 'black' });
    const g = sub('alternateur', 0, 0.3, 0.95);
    spin.push({ g, k: 2.6 });
    add('alternateur', gearGeo(0.12, 12, 0.14, 0.015), [F - 0.75, 0, 0], { parent: g, fin: 'steel' });
    add('alternateur', cylX(0.04, 0.2), [F - 0.67, 0, 0], { parent: g });
  }
  add('courroie_acc', beltGeo([[0, 0, 0.38], [0.95, 0.3, 0.12], [pump.z, pump.y, 0.18], [0.45, -0.55, 0.1]], 0.14), [F - 0.75, 0, 0]);
  add('courroie_acc', cylX(0.1, 0.14), [F - 0.75, -0.55, 0.45], { fin: 'alu' });

  /* ----- Volumes de gaz (hors pièces), dans le repère de chaque banc ----- */
  const gasGroup = new THREE.Group();
  gasGroup.visible = false;
  root.add(gasGroup);
  const gasBanks = banks.map((bk) => {
    const g = new THREE.Group();
    placeBank(g, bk);
    gasGroup.add(g);
    return g;
  });
  const gas: Anim['gas'] = cxs.map((x, i) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x8e8e93, transparent: true, opacity: 0.05, depthWrite: false });
    m.userData.bank = bankOf[i];
    const g = new THREE.Mesh(new THREE.CylinderGeometry(boreR + 0.005, boreR + 0.005, 1, 28), m);
    g.position.x = x;
    gasBanks[bankOf[i]].add(g);
    return g;
  });

  /* trajet des gaz brûlés de chaque cylindre : soupape, conduit, tubulure, puis la ligne de son banc */
  const exhaust = cxs.map((x, i) => {
    const b = bankOf[i];
    const ln = lines[b];
    const local = [
      { p: [x, headBot - 0.06 - dy, -0.27], r: 0.07 },
      { p: [x, 2.3, -0.42], r: 0.07 },
      ...RUNNER(x).map((p) => ({ p, r: 0.06 })),
    ].map((c) => ({ p: W(b, c.p), r: c.r }));
    const yl = ln.yl;
    const zc = ln.zc;
    return samplePath([
      ...local,
      ...ln.down.slice(1).map((p) => ({ p, r: 0.1 })),
      ...[[B - 0.05, yl, zc], [B + 0.55, yl, zc], [B + 1.2, yl, zc]].map((p) => ({ p, r: 0.22 })),
      ...ln.outlet.map((p) => ({ p, r: 0.08 })),
    ]);
  });

  const anim: Anim = { pist, ring, rod, rodSign, valve, spring, gas, spin, crank, flywheel, pulley, cams };
  const parts: Record<string, PartNode> = P;
  /* matériaux animés par la chaleur des gaz : une tubulure par cylindre, une descente et un catalyseur par banc */
  const find = (id: string, key: string, bank: number) => P[id].cache.get(`_${key}@${bank}`)!;
  const heat = {
    runners: cxs.map((_, i) => find('echappement', `r${i}`, bankOf[i])),
    pipes: banks.map((_, b) => find('echappement', `pipe${b}`, -1)),
    cats: banks.map((_, b) => find('catalyseur', `cat${b}`, -1)),
  };
  return { root, parts, anim, gasGroup, gasBanks, heat, exhaust, tailpipes: lines.map((l) => l.tail) };
}

/* ----- Cinématique : bielle-manivelle, cames et levée de soupape ----- */
const D2R = Math.PI / 180;

export function setPose(anim: Anim, psi: number, geo: EngineGeometry) {
  const { CR, CL, CH, headBot } = geo;
  const rad = psi * D2R;
  anim.crank.rotation.x = anim.pulley.rotation.x = anim.flywheel.rotation.x = rad;
  anim.cams.forEach((c) => {
    c.rotation.x = rad / 2;
  });
  anim.spin.forEach((s) => {
    s.g.rotation.x = rad * s.k;
  });
  for (let i = 0; i < geo.n; i++) {
    /* angle mesuré depuis l'axe du banc, dans son repère */
    const th = (psi - geo.offsets[i]) * D2R;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const y = CR * c + Math.sqrt(CL * CL - CR * CR * s * s);
    anim.pist[i].position.y = y;
    anim.ring[i].position.y = y;
    const rod = anim.rod[i];
    const sg = anim.rodSign[i];
    rod.position.y = CR * c;
    rod.position.z = sg * CR * s;
    rod.rotation.x = Math.atan2(-sg * CR * s, y - CR * c);
    const crown = y + CH;
    const h = headBot - 0.012 - crown;
    const gm = anim.gas[i];
    gm.scale.y = Math.max(h, 0.02);
    gm.position.y = crown + h / 2;
  }
  anim.valve.forEach((v) => {
    v.g.position.y = v.base - liftOf(v.ex ? geo.exhaust : geo.intake, cycleAngle(psi, geo.offsets[v.cyl]));
  });
  anim.spring.forEach((v) => {
    const cam = v.ex ? geo.exhaust : geo.intake;
    v.g.scale.y = (0.5 - liftOf(cam, cycleAngle(psi, geo.offsets[v.cyl]))) / 0.5;
  });
}
