/*
 * Gaz dans les cylindres et dans la ligne d'échappement.
 * Dans le cylindre, des particules rebondissent sur les parois et la tête du piston. La pression suit leur nombre,
 * leur « température » et le volume de la chambre ; elle règle la taille et l'éclat des particules.
 * Leur teinte indique la composition : mélange frais, combustion, gaz brûlés.
 * Soupape d'échappement ouverte, les particules quittent le cylindre (bouffée puis refoulement) et suivent le trajet
 * soupape, tubulure, descente, catalyseur, sortie. Chaque passage réchauffe la tubulure du cylindre.
 * Modèle pédagogique, pas thermodynamique.
 */
import * as THREE from 'three';
import { GAS_COLORS } from '../data/vehicle';
import { cycleAngle, liftOf, type EngineGeometry } from './geometry';
import type { Anim, ExhaustPath } from './model';

const M = 190; // particules max par cylindre
const N0 = 130;
const NMAX = 130;
const PMAX = 70;
const XM = 520; // particules max dans la ligne d'échappement
/** Distance parcourue dans la ligne par degré de vilebrequin, hors effet de bouffée (dm/°). */
const KD = 0.05;
export const TRACE_BINS = 180; // 4° par case

const rgb = (hex: string) => new THREE.Color(hex).toArray() as [number, number, number];
const FRESH = rgb(GAS_COLORS.fresh);
const FLAME = rgb(GAS_COLORS.flame);
const BURNT = rgb(GAS_COLORS.burnt);
const HOT: [number, number, number] = [1, 0.86, 0.55];

const mix = (a: number[], b: number[], t: number, out: number[]) => {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
};

/** Matériau des particules : disque doux, taille en perspective, coupe optionnelle. */
type Uniforms = { uPx: { value: number }; uCut: { value: number }; uN: { value: THREE.Vector3 } };

/**
 * Matériau des particules : disque doux, taille en perspective. Avec la coupe, les particules du côté retiré
 * sont écartées : celles dont la position, dans le repère du nuage, est du côté négatif du plan de normale uN.
 */
export function particleMaterial(uniforms: Uniforms, blending: THREE.Blending = THREE.NormalBlending) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending,
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float uPx; uniform vec3 uN; attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      varying vec3 vC; varying float vD; varying float vA;
      void main(){
        vC = aColor; vD = dot(uN, position); vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(aSize * uPx / max(-mv.z, 0.01), 0.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      uniform float uCut; varying vec3 vC; varying float vD; varying float vA;
      void main(){
        #include <logdepthbuf_fragment>
        if (uCut > 0.5 && vD < 0.0) discard;
        vec2 d = gl_PointCoord - 0.5; float r = length(d);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.18, r);
        gl_FragColor = vec4(mix(vC, vec3(1.0), 0.3 * (1.0 - r * 2.0)), vA * a);
      }`,
  });
}

function pointCloud(n: number, mat: THREE.Material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return pts;
}

export class GasSim {
  /** Coupe active : partagée par les nuages de chaque banc. */
  private cut = { value: 1 };
  /** Un nuage de particules par banc, placé dans le repère du banc. */
  readonly bankPoints: THREE.Points[];
  readonly exhaustPoints: THREE.Points;
  /** Pression lissée par cylindre, en bars. */
  readonly p: number[];
  /** Pression enregistrée sur le cycle de chaque cylindre, par case de 4° (n × 180 valeurs). */
  readonly trace: Float32Array;
  /** Chaleur apportée par les gaz à chaque tubulure, de 0 à 1 environ. */
  readonly heat: number[];

  private T: number[];
  private n: number[];
  private hPrev: number[];
  private cPrev: number[];
  private crownPrev: number[];
  private spawn: number[];
  /* état de la simulation, indexé par cylindre × M + particule, dans le repère du banc */
  private simPos: Float32Array;
  private simCol: Float32Array;
  private simSize: Float32Array;
  private vel: Float32Array;
  private jit: Float32Array;
  private alive: Uint8Array;
  /** 0 : mélange frais, 1 : gaz brûlé. */
  private burnt: Uint8Array;
  /** Éclat de flamme, 1 à l'étincelle puis décroissant pendant la détente. */
  private flame: Float32Array;
  private cyls: number;

  /* ligne d'échappement */
  private eAlive = new Uint8Array(XM);
  private eCyl = new Uint8Array(XM);
  private eT = new Float32Array(XM);
  private eU = new Float32Array(XM);
  private eV = new Float32Array(XM);
  private eAge = new Float32Array(XM);
  private eHot = new Float32Array(XM);
  private eFree = 0;
  private tmp = [0, 0, 0];
  /** Rayon d'alésage, plafond de chambre. */
  private R: number;
  private top: number;
  /**
   * Volume mort exprimé en hauteur de cylindre équivalente : avec lui, le rapport entre volume au PMB et au PMH
   * vaut le rapport volumétrique calculé par la spec. HB est la hauteur équivalente au PMB.
   */
  private dead: number;
  private HB: number;

  constructor(
    private anim: Anim,
    private paths: ExhaustPath[],
    private geo: EngineGeometry,
    /** Échelle des points, partagée avec la fumée et mise à jour par la scène au redimensionnement. */
    uPx: { value: number },
  ) {
    const N = geo.n;
    this.cyls = N;
    const fill = (v: number) => new Array(N).fill(v);
    this.p = fill(1);
    this.heat = fill(0);
    this.T = fill(1);
    this.n = fill(0);
    this.hPrev = fill(0);
    this.cPrev = fill(0);
    this.crownPrev = fill(0);
    this.spawn = fill(0);
    this.trace = new Float32Array(N * TRACE_BINS).fill(1);
    this.simPos = new Float32Array(N * M * 3);
    this.simCol = new Float32Array(N * M * 3);
    this.simSize = new Float32Array(N * M);
    this.vel = new Float32Array(N * M * 3);
    this.jit = new Float32Array(N * M);
    this.alive = new Uint8Array(N * M);
    this.burnt = new Uint8Array(N * M);
    this.flame = new Float32Array(N * M);
    this.R = geo.boreR;
    this.top = geo.headBot - 0.012;
    const hTDC = Math.max(0.005, this.top - (geo.CR + geo.CL + geo.CH));
    const hBDC = this.top - (geo.CL - geo.CR + geo.CH);
    const cr = Math.max(2, geo.compressionRatio);
    this.dead = Math.max(0, (hBDC - cr * hTDC) / (cr - 1));
    this.HB = hBDC + this.dead;
    for (let k = 0; k < this.jit.length; k++) this.jit[k] = 0.8 + Math.random() * 0.4;
    this.bankPoints = geo.banks.map((bk) => {
      /* dans le repère du banc, le côté retiré par la coupe est z > 0 (z < 0 si le banc est en miroir) */
      const n = new THREE.Vector3(0, 0, bk.mirror ? 1 : -1);
      const pts = pointCloud(bk.cyls.length * M, particleMaterial({ uPx, uCut: this.cut, uN: { value: n } }));
      (pts.geometry.attributes.aAlpha.array as Float32Array).fill(0.92);
      return pts;
    });
    /* gaz de la ligne d'échappement, dans le repère du moteur : même plan que le bas moteur (z > 0 retiré) */
    this.exhaustPoints = pointCloud(XM, particleMaterial({ uPx, uCut: this.cut, uN: { value: new THREE.Vector3(0, 0, -1) } }));
  }

  private get pos() {
    return this.simPos;
  }

  /** Recopie l'état de chaque cylindre dans le nuage de son banc. */
  private publish() {
    this.geo.banks.forEach((bk, b) => {
      const a = this.bankPoints[b].geometry.attributes;
      const pos = a.position.array as Float32Array;
      const col = a.aColor.array as Float32Array;
      const size = a.aSize.array as Float32Array;
      bk.cyls.forEach((c, j) => {
        pos.set(this.simPos.subarray(c * M * 3, (c + 1) * M * 3), j * M * 3);
        col.set(this.simCol.subarray(c * M * 3, (c + 1) * M * 3), j * M * 3);
        size.set(this.simSize.subarray(c * M, (c + 1) * M), j * M);
      });
      a.position.needsUpdate = true;
      a.aColor.needsUpdate = true;
      a.aSize.needsUpdate = true;
    });
  }

  private crown(i: number) {
    return this.anim.pist[i].position.y + this.geo.CH;
  }

  /** Hauteur de gaz équivalente au-dessus du piston, volume mort compris. */
  private height(crown: number) {
    return Math.max(this.top - crown, 0.005) + this.dead;
  }

  private lifts(cc: number) {
    const { intake, exhaust } = this.geo;
    return { a: liftOf(intake, cc) / intake.lift, e: liftOf(exhaust, cc) / exhaust.lift };
  }

  private cycle(psi: number, i: number) {
    return cycleAngle(psi, this.geo.offsets[i]);
  }

  private place(i: number, k: number, crown: number, top: number, burnt: boolean, flame: number) {
    const pos = this.pos;
    const a = Math.random() * 6.2832;
    const r = this.R * Math.sqrt(Math.random());
    const id = i * M + k;
    const o = id * 3;
    pos[o] = this.geo.cylX[i] + Math.cos(a) * r;
    pos[o + 1] = crown + Math.random() * (top - crown);
    pos[o + 2] = Math.sin(a) * r;
    const th = Math.random() * 6.2832;
    const ph = Math.acos(2 * Math.random() - 1);
    this.vel[o] = Math.sin(ph) * Math.cos(th);
    this.vel[o + 1] = Math.cos(ph);
    this.vel[o + 2] = Math.sin(ph) * Math.sin(th);
    this.alive[id] = 1;
    this.burnt[id] = burnt ? 1 : 0;
    this.flame[id] = flame;
  }

  init(psi: number) {
    const top = this.top;
    const HB = this.HB;
    for (let i = 0; i < this.cyls; i++) {
      const cc = this.cycle(psi, i);
      const st = Math.floor(cc / 180);
      const crown = this.crown(i);
      const h = this.height(crown);
      const n = [55, 100, 100, 45][st];
      for (let k = 0; k < n; k++) this.place(i, k, crown, top, st >= 2, st === 2 ? 0.5 : 0);
      this.n[i] = n;
      this.hPrev[i] = h;
      this.cPrev[i] = cc;
      this.crownPrev[i] = crown;
      this.T[i] = st === 0 ? 1.1 : st === 1 ? Math.pow(HB / h, 0.35) : st === 2 ? 2.8 * Math.pow((HB / h) * 0.1, 0.35) : 1.8;
    }
  }

  /** Envoie une particule du cylindre i dans la ligne d'échappement. */
  private emitExhaust(i: number, hot: number) {
    for (let n = 0; n < XM; n++) {
      const k = (this.eFree + n) % XM;
      if (this.eAlive[k]) continue;
      this.eFree = (k + 1) % XM;
      const a = Math.random() * 6.2832;
      const r = Math.sqrt(Math.random());
      this.eAlive[k] = 1;
      this.eCyl[k] = i;
      this.eT[k] = 0;
      this.eU[k] = Math.cos(a) * r;
      this.eV[k] = Math.sin(a) * r;
      this.eAge[k] = 0;
      this.eHot[k] = hot;
      this.heat[i] = Math.min(1.4, this.heat[i] + 0.006 + 0.01 * hot);
      return;
    }
  }

  /** dt : secondes écoulées ; ds : degrés vilebrequin parcourus pendant dt. */
  step(dt: number, ds: number, psi: number, cut: boolean) {
    const { top, HB, R } = this;
    const spark = this.geo.spark;
    const sub = 2;
    const sdt = dt / sub;
    const { vel, alive, jit, burnt, flame } = this;
    const pos = this.pos;
    const size = this.simSize;
    const col = this.simCol;
    const c = this.tmp;
    this.cut.value = cut ? 1 : 0;

    for (let i = 0; i < this.cyls; i++) {
      const base = i * M;
      const cc = this.cycle(psi, i);
      const crown = this.crown(i);
      const h = this.height(crown);
      const { a: liA, e: liE } = this.lifts(cc);
      const vp = dt > 0 ? (crown - this.crownPrev[i]) / dt : 0;

      let T = this.T[i];
      if (liA < 0.001 && liE < 0.001 && ds > 0) T *= Math.pow(this.hPrev[i] / h, 0.35);
      const fired = ds > 0 && this.cPrev[i] <= spark && cc > spark && cc < spark + 65;
      if (fired) T *= 2.8;
      if (liE > 0) T += (1.7 - T) * Math.min(1, ds * 0.04 * liE);
      if (liA > 0) T += (1.05 - T) * Math.min(1, ds * 0.04 * liA);
      T = Math.min(14, Math.max(0.9, T));
      this.T[i] = T;
      this.hPrev[i] = h;
      this.cPrev[i] = cc;
      this.crownPrev[i] = crown;

      /* admission : du mélange frais entre par les soupapes ouvertes */
      this.spawn[i] += liA * 1.2 * ds;
      while (this.spawn[i] >= 1) {
        this.spawn[i] -= 1;
        if (this.n[i] >= NMAX) break;
        let k = 0;
        while (k < M && alive[base + k]) k++;
        if (k >= M) break;
        const id = base + k;
        const jx = Math.random() < 0.5 ? -0.15 : 0.15;
        const o = id * 3;
        const a = Math.random() * 6.28;
        const r = Math.random() * 0.08;
        pos[o] = this.geo.cylX[i] + jx + Math.cos(a) * r;
        pos[o + 1] = top - 0.01;
        pos[o + 2] = 0.27 + Math.sin(a) * r;
        vel[o] = (Math.random() - 0.5) * 0.4;
        vel[o + 1] = -1.4;
        vel[o + 2] = (Math.random() - 0.5) * 0.4;
        alive[id] = 1;
        burnt[id] = 0;
        flame[id] = 0;
        this.n[i]++;
      }

      /* échappement : débit selon la levée, l'écart de pression (bouffée) et la remontée du piston (refoulement) */
      const push = liE > 0 ? liE * ds * (0.02 + 0.012 * Math.max(0, this.p[i] - 1.2) + 0.015 * Math.max(0, vp)) : 0;
      const fade = Math.exp(-ds * 0.012);
      const speed = 0.9 * Math.sqrt(T);
      let count = 0;
      for (let k = 0; k < M; k++) {
        const id = base + k;
        const o = id * 3;
        if (!alive[id]) {
          size[id] = 0;
          continue;
        }
        if (fired) {
          burnt[id] = 1;
          flame[id] = 1;
        } else flame[id] *= fade;
        if (push > 0 && this.n[i] > 12) {
          const nearValve = pos[o + 2] < 0 && pos[o + 1] > crown + (top - crown) * 0.4;
          if (Math.random() < Math.min(0.5, push * (nearValve ? 1.7 : 0.35))) {
            alive[id] = 0;
            size[id] = 0;
            this.n[i]--;
            this.emitExhaust(i, burnt[id] ? Math.min(1, 0.35 + flame[id] + 0.04 * this.p[i]) : 0.1);
            continue;
          }
        }
        for (let s = 0; s < sub; s++) {
          pos[o] += vel[o] * sdt * speed;
          pos[o + 1] += vel[o + 1] * sdt * speed;
          pos[o + 2] += vel[o + 2] * sdt * speed;
          const dx = pos[o] - this.geo.cylX[i];
          const dz = pos[o + 2];
          const r2 = dx * dx + dz * dz;
          if (r2 > R * R) {
            const r = Math.sqrt(r2);
            const nx = dx / r;
            const nz = dz / r;
            pos[o] = this.geo.cylX[i] + nx * R;
            pos[o + 2] = nz * R;
            const vn = vel[o] * nx + vel[o + 2] * nz;
            if (vn > 0) {
              vel[o] -= 2 * vn * nx;
              vel[o + 2] -= 2 * vn * nz;
            }
          }
          if (pos[o + 1] > top) {
            pos[o + 1] = top;
            if (vel[o + 1] > 0) vel[o + 1] = -vel[o + 1];
          }
          if (pos[o + 1] < crown) {
            pos[o + 1] = crown;
            const vy = vel[o + 1] * speed;
            const out = Math.abs(vy) + Math.max(0, 2 * vp);
            vel[o + 1] = Math.min(out, 6) / speed;
          }
        }
        const m = Math.hypot(vel[o], vel[o + 1], vel[o + 2]) || 1;
        const g = 1 + (1 / m - 1) * Math.min(1, 3 * dt);
        vel[o] *= g;
        vel[o + 1] *= g;
        vel[o + 2] *= g;
        count++;
      }
      this.n[i] = count;

      const p = Math.max(0.3, (count / N0) * T * (HB / h));
      this.p[i] += (p - this.p[i]) * Math.min(1, dt * 14);
      if (ds > 0) this.trace[i * TRACE_BINS + Math.min(TRACE_BINS - 1, Math.floor(cc / (720 / TRACE_BINS)))] = this.p[i];
      const pn = Math.min(1, Math.max(0, Math.log(Math.max(this.p[i], 1)) / Math.log(PMAX)));
      const sz = 0.05 + 0.08 * pn;
      for (let k = 0; k < M; k++) {
        const id = base + k;
        if (!alive[id]) continue;
        size[id] = sz * jit[id];
        if (burnt[id]) {
          const f = flame[id];
          mix(BURNT, FLAME, Math.min(1, f * 1.4), c);
          if (f > 0.6) mix(c, HOT, (f - 0.6) * 2.2, c);
        } else mix(FRESH, [1, 1, 1], 0.45 * pn, c);
        col[id * 3] = c[0];
        col[id * 3 + 1] = c[1];
        col[id * 3 + 2] = c[2];
      }
      /* la chaleur des tubulures retombe entre deux bouffées */
      this.heat[i] *= Math.exp(-ds * 0.0035);
    }
    this.publish();

    this.stepExhaust(ds);
  }

  private stepExhaust(ds: number) {
    const ea = this.exhaustPoints.geometry.attributes;
    const pos = ea.position.array as Float32Array;
    const col = ea.aColor.array as Float32Array;
    const size = ea.aSize.array as Float32Array;
    const alpha = ea.aAlpha.array as Float32Array;
    const c = this.tmp;
    for (let k = 0; k < XM; k++) {
      if (!this.eAlive[k]) {
        size[k] = 0;
        continue;
      }
      const path = this.paths[this.eCyl[k]];
      /* la bouffée chasse les gaz vite, puis ils ralentissent en se détendant et en refroidissant */
      const boost = 1 + 2.4 * Math.exp(-this.eAge[k] / 70);
      this.eAge[k] += ds;
      this.eT[k] += (ds * KD * boost) / path.length;
      const t = this.eT[k];
      if (t >= 1) {
        this.eAlive[k] = 0;
        size[k] = 0;
        continue;
      }
      const f = t * path.samples;
      const j = Math.min(path.samples - 1, Math.floor(f));
      const w = f - j;
      const a3 = j * 3;
      const b3 = a3 + 3;
      const r = path.rad[j] + (path.rad[j + 1] - path.rad[j]) * w;
      const u = this.eU[k] * r;
      const v = this.eV[k] * r;
      for (let d = 0; d < 3; d++) {
        const p0 = path.pts[a3 + d] + (path.pts[b3 + d] - path.pts[a3 + d]) * w;
        pos[k * 3 + d] = p0 + path.nrm[a3 + d] * u + path.bin[a3 + d] * v;
      }
      const hot = this.eHot[k] * Math.exp(-t * 3);
      mix(BURNT, FLAME, Math.min(1, hot * 1.3), c);
      col[k * 3] = c[0];
      col[k * 3 + 1] = c[1];
      col[k * 3 + 2] = c[2];
      size[k] = 0.06 + 0.04 * hot;
      alpha[k] = 0.9 * Math.min(1, (1 - t) / 0.12) * Math.min(1, this.eAge[k] / 6);
    }
    ea.position.needsUpdate = true;
    ea.aColor.needsUpdate = true;
    ea.aSize.needsUpdate = true;
    ea.aAlpha.needsUpdate = true;
  }

  dispose() {
    [...this.bankPoints, this.exhaustPoints].forEach((p) => {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
  }
}
