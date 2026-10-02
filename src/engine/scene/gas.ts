/*
 * Gaz dans les cylindres : particules qui rebondissent sur les parois et la tête du piston.
 * La pression (et donc la taille et la couleur des particules) suit le nombre de particules,
 * leur « température » et le volume de la chambre. Modèle pédagogique, pas thermodynamique.
 */
import * as THREE from 'three';
import { cycleAngle, EXHAUST_PEAK, HEADBOT, INTAKE_PEAK, LIFT, XS, liftAt, type Anim } from './model';

const M = 190; // particules max par cylindre
const N0 = 130;
const NMAX = 130;
const R = 0.4;
const HB = 0.718;
const PMAX = 70;

const STOPS = [
  [0, 0.19, 0.69, 0.78],
  [0.45, 1, 0.8, 0],
  [0.75, 1, 0.58, 0],
  [1, 1, 0.23, 0.19],
];

function pressureColor(pn: number): [number, number, number] {
  for (let k = 1; k < STOPS.length; k++) {
    if (pn <= STOPS[k][0]) {
      const a = STOPS[k - 1];
      const b = STOPS[k];
      const t = (pn - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return [1, 0.23, 0.19];
}

export class GasSim {
  readonly points: THREE.Points;
  readonly uniforms = { uPx: { value: 600 }, uCut: { value: 1 } };
  /** Pression lissée par cylindre, en bars. */
  readonly p = [1, 1, 1, 1];

  private T = [1, 1, 1, 1];
  private n = [0, 0, 0, 0];
  private hPrev = [0, 0, 0, 0];
  private cPrev = [0, 0, 0, 0];
  private crownPrev = [0, 0, 0, 0];
  private spawn = [0, 0, 0, 0];
  private pos = new Float32Array(4 * M * 3);
  private vel = new Float32Array(4 * M * 3);
  private col = new Float32Array(4 * M * 3);
  private size = new Float32Array(4 * M);
  private jit = new Float32Array(4 * M);
  private alive = new Uint8Array(4 * M);
  private geo = new THREE.BufferGeometry();

  constructor(private anim: Anim) {
    for (let k = 0; k < this.jit.length; k++) this.jit[k] = 0.8 + Math.random() * 0.4;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform float uPx; attribute vec3 aColor; attribute float aSize; varying vec3 vC; varying float vZ;
        void main(){
          vC = aColor; vZ = position.z;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(aSize * uPx / max(-mv.z, 0.01), 0.0);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <logdepthbuf_pars_fragment>
        uniform float uCut; varying vec3 vC; varying float vZ;
        void main(){
          #include <logdepthbuf_fragment>
          if (uCut > 0.5 && vZ > 0.0) discard;
          vec2 d = gl_PointCoord - 0.5; float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.18, r);
          gl_FragColor = vec4(mix(vC, vec3(1.0), 0.35 * (1.0 - r * 2.0)), 0.92 * a);
        }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  private crown(i: number) {
    return this.anim.pist[i].position.y + 0.265;
  }

  private place(i: number, k: number, crown: number, top: number) {
    const a = Math.random() * 6.2832;
    const r = R * Math.sqrt(Math.random());
    const o = (i * M + k) * 3;
    this.pos[o] = XS[i] + Math.cos(a) * r;
    this.pos[o + 1] = crown + Math.random() * (top - crown);
    this.pos[o + 2] = Math.sin(a) * r;
    const th = Math.random() * 6.2832;
    const ph = Math.acos(2 * Math.random() - 1);
    this.vel[o] = Math.sin(ph) * Math.cos(th);
    this.vel[o + 1] = Math.cos(ph);
    this.vel[o + 2] = Math.sin(ph) * Math.sin(th);
    this.alive[i * M + k] = 1;
  }

  init(psi: number) {
    const top = HEADBOT - 0.012;
    for (let i = 0; i < 4; i++) {
      const cc = cycleAngle(psi, i);
      const st = Math.floor(cc / 180);
      const crown = this.crown(i);
      const h = Math.max(top - crown, 0.02);
      const n = [55, 100, 100, 45][st];
      for (let k = 0; k < n; k++) this.place(i, k, crown, top);
      this.n[i] = n;
      this.hPrev[i] = h;
      this.cPrev[i] = cc;
      this.crownPrev[i] = crown;
      this.T[i] = st === 0 ? 1.1 : st === 1 ? Math.pow(HB / h, 0.35) : st === 2 ? 3.5 * Math.pow(0.07 / h, 0.35) : 1.8;
    }
  }

  /** dt : secondes écoulées ; ds : degrés vilebrequin parcourus pendant dt. */
  step(dt: number, ds: number, psi: number, cut: boolean) {
    const top = HEADBOT - 0.012;
    const sub = 2;
    const sdt = dt / sub;
    const { pos, vel, size, col, alive, jit } = this;
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
      if (ds > 0 && this.cPrev[i] <= 355 && cc > 355 && cc < 420) T *= 3.5; // étincelle
      if (liE > 0) T += (1.7 - T) * Math.min(1, ds * 0.04 * liE);
      if (liA > 0) T += (1.05 - T) * Math.min(1, ds * 0.04 * liA);
      T = Math.min(14, Math.max(0.9, T));
      this.T[i] = T;
      this.hPrev[i] = h;
      this.cPrev[i] = cc;
      this.crownPrev[i] = crown;

      /* admission : des particules entrent par les soupapes ouvertes ; échappement : elles sortent */
      this.spawn[i] += liA * 1.2 * ds;
      while (this.spawn[i] >= 1) {
        this.spawn[i] -= 1;
        if (this.n[i] >= NMAX) break;
        let k = 0;
        while (k < M && alive[base + k]) k++;
        if (k >= M) break;
        const jx = Math.random() < 0.5 ? -0.15 : 0.15;
        const o = (base + k) * 3;
        const a = Math.random() * 6.28;
        const r = Math.random() * 0.08;
        pos[o] = XS[i] + jx + Math.cos(a) * r;
        pos[o + 1] = top - 0.01;
        pos[o + 2] = 0.27 + Math.sin(a) * r;
        vel[o] = (Math.random() - 0.5) * 0.4;
        vel[o + 1] = -1.4;
        vel[o + 2] = (Math.random() - 0.5) * 0.4;
        alive[base + k] = 1;
        this.n[i]++;
      }

      const speed = 0.9 * Math.sqrt(T);
      let count = 0;
      for (let k = 0; k < M; k++) {
        const id = base + k;
        const o = id * 3;
        if (!alive[id]) {
          size[id] = 0;
          continue;
        }
        if (liE > 0 && this.n[i] > 12 && Math.random() < liE * 0.045 * ds) {
          alive[id] = 0;
          size[id] = 0;
          this.n[i]--;
          continue;
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
      const pn = Math.min(1, Math.max(0, Math.log(Math.max(this.p[i], 1)) / Math.log(PMAX)));
      const c = pressureColor(pn);
      const sz = 0.05 + 0.09 * pn;
      for (let k = 0; k < M; k++) {
        const id = base + k;
        if (!alive[id]) continue;
        size[id] = sz * jit[id];
        col[id * 3] = c[0];
        col[id * 3 + 1] = c[1];
        col[id * 3 + 2] = c[2];
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
