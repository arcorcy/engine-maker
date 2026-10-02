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
import { cycleAngle, EXHAUST_PEAK, HEADBOT, INTAKE_PEAK, LIFT, XS, liftAt, type Anim, type ExhaustPath } from './model';

const M = 190; // particules max par cylindre
const N0 = 130;
const NMAX = 130;
const R = 0.4;
const HB = 0.718;
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
export function particleMaterial(uniforms: { uPx: { value: number }; uCut: { value: number } }, blending = THREE.NormalBlending) {
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending,
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float uPx; attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
      varying vec3 vC; varying float vZ; varying float vA;
      void main(){
        vC = aColor; vZ = position.z; vA = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(aSize * uPx / max(-mv.z, 0.01), 0.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <logdepthbuf_pars_fragment>
      uniform float uCut; varying vec3 vC; varying float vZ; varying float vA;
      void main(){
        #include <logdepthbuf_fragment>
        if (uCut > 0.5 && vZ > 0.0) discard;
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
  readonly uniforms = { uPx: { value: 600 }, uCut: { value: 1 } };
  readonly points: THREE.Points;
  readonly exhaustPoints: THREE.Points;
  /** Pression lissée par cylindre, en bars. */
  readonly p = [1, 1, 1, 1];
  /** Pression enregistrée sur le cycle de chaque cylindre, par case de 4° (4 × 180 valeurs). */
  readonly trace = new Float32Array(4 * TRACE_BINS).fill(1);
  /** Chaleur apportée par les gaz à chaque tubulure, de 0 à 1 environ. */
  readonly heat = [0, 0, 0, 0];

  private T = [1, 1, 1, 1];
  private n = [0, 0, 0, 0];
  private hPrev = [0, 0, 0, 0];
  private cPrev = [0, 0, 0, 0];
  private crownPrev = [0, 0, 0, 0];
  private spawn = [0, 0, 0, 0];
  private vel = new Float32Array(4 * M * 3);
  private jit = new Float32Array(4 * M);
  private alive = new Uint8Array(4 * M);
  /** 0 : mélange frais, 1 : gaz brûlé. */
  private burnt = new Uint8Array(4 * M);
  /** Éclat de flamme, 1 à l'étincelle puis décroissant pendant la détente. */
  private flame = new Float32Array(4 * M);

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

  constructor(
    private anim: Anim,
    private paths: ExhaustPath[],
  ) {
    for (let k = 0; k < this.jit.length; k++) this.jit[k] = 0.8 + Math.random() * 0.4;
    this.points = pointCloud(4 * M, particleMaterial(this.uniforms));
    this.exhaustPoints = pointCloud(XM, particleMaterial(this.uniforms));
    (this.points.geometry.attributes.aAlpha.array as Float32Array).fill(0.92);
  }

  private get pos() {
    return this.points.geometry.attributes.position.array as Float32Array;
  }

  private crown(i: number) {
    return this.anim.pist[i].position.y + 0.265;
  }

  private place(i: number, k: number, crown: number, top: number, burnt: boolean, flame: number) {
    const pos = this.pos;
    const a = Math.random() * 6.2832;
    const r = R * Math.sqrt(Math.random());
    const id = i * M + k;
    const o = id * 3;
    pos[o] = XS[i] + Math.cos(a) * r;
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
    const top = HEADBOT - 0.012;
    for (let i = 0; i < 4; i++) {
      const cc = cycleAngle(psi, i);
      const st = Math.floor(cc / 180);
      const crown = this.crown(i);
      const h = Math.max(top - crown, 0.02);
      const n = [55, 100, 100, 45][st];
      for (let k = 0; k < n; k++) this.place(i, k, crown, top, st >= 2, st === 2 ? 0.5 : 0);
      this.n[i] = n;
      this.hPrev[i] = h;
      this.cPrev[i] = cc;
      this.crownPrev[i] = crown;
      this.T[i] = st === 0 ? 1.1 : st === 1 ? Math.pow(HB / h, 0.35) : st === 2 ? 3.5 * Math.pow(0.07 / h, 0.35) : 1.8;
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
    const top = HEADBOT - 0.012;
    const sub = 2;
    const sdt = dt / sub;
    const { vel, alive, jit, burnt, flame } = this;
    const pos = this.pos;
    const ga = this.points.geometry.attributes;
    const size = ga.aSize.array as Float32Array;
    const col = ga.aColor.array as Float32Array;
    const c = this.tmp;
    this.uniforms.uCut.value = cut ? 1 : 0;

    for (let i = 0; i < 4; i++) {
      const base = i * M;
      const cc = cycleAngle(psi, i);
      const crown = this.crown(i);
      const h = Math.max(top - crown, 0.02);
      const liA = liftAt(cc, INTAKE_PEAK) / LIFT;
      const liE = liftAt(cc, EXHAUST_PEAK) / LIFT;
      const vp = dt > 0 ? (crown - this.crownPrev[i]) / dt : 0;

      let T = this.T[i];
      if (liA < 0.001 && liE < 0.001 && ds > 0) T *= Math.pow(this.hPrev[i] / h, 0.35);
      const spark = ds > 0 && this.cPrev[i] <= 355 && cc > 355 && cc < 420;
      if (spark) T *= 3.5;
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
        pos[o] = XS[i] + jx + Math.cos(a) * r;
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
        if (spark) {
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
          const dx = pos[o] - XS[i];
          const dz = pos[o + 2];
          const r2 = dx * dx + dz * dz;
          if (r2 > R * R) {
            const r = Math.sqrt(r2);
            const nx = dx / r;
            const nz = dz / r;
            pos[o] = XS[i] + nx * R;
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
    ga.position.needsUpdate = true;
    ga.aColor.needsUpdate = true;
    ga.aSize.needsUpdate = true;

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
    [this.points, this.exhaustPoints].forEach((p) => {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    });
  }
}
