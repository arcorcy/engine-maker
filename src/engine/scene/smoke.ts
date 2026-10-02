/*
 * Fumée en sortie d'échappement, quand une panne en produit : blanche (liquide de refroidissement brûlé),
 * bleutée (huile brûlée) ou noire (excès d'essence). Elle avance en temps réel, sans le ralenti du moteur,
 * pour rester lisible même quand l'animation est très ralentie.
 */
import * as THREE from 'three';
import type { Smoke } from '../data/vehicle';

const N = 320;

const COLORS: Record<Smoke, { c: [number, number, number]; a: number; blend: THREE.Blending }> = {
  white: { c: [0.96, 0.96, 0.97], a: 0.5, blend: THREE.NormalBlending },
  blue: { c: [0.6, 0.68, 0.86], a: 0.5, blend: THREE.NormalBlending },
  black: { c: [0.1, 0.1, 0.11], a: 0.62, blend: THREE.NormalBlending },
};

export class SmokeSim {
  readonly points: THREE.Points;
  private pos = new Float32Array(N * 3);
  private vel = new Float32Array(N * 3);
  private age = new Float32Array(N);
  private life = new Float32Array(N);
  private size = new Float32Array(N);
  private alpha = new Float32Array(N);
  private col = new Float32Array(N * 3);
  private acc = 0;
  private next = 0;
  private live = 0;

  constructor(uPx: { value: number }) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uPx },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        #include <common>
        #include <logdepthbuf_pars_vertex>
        uniform float uPx; attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
        varying vec3 vC; varying float vA;
        void main(){
          vC = aColor; vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(aSize * uPx / max(-mv.z, 0.01), 0.0);
          #include <logdepthbuf_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <logdepthbuf_pars_fragment>
        varying vec3 vC; varying float vA;
        void main(){
          #include <logdepthbuf_fragment>
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          gl_FragColor = vec4(vC, vA * smoothstep(0.5, 0.0, r));
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }

  get active() {
    return this.live > 0;
  }

  /**
   * kind : type de fumée, ou null pour arrêter l'émission (les bouffées en vol finissent leur course).
   * origin : bout du tuyau ; rate : bouffées par seconde.
   */
  step(dt: number, kind: Smoke | null, origin: THREE.Vector3, rate: number) {
    if (kind) {
      const look = COLORS[kind];
      this.acc += rate * dt;
      while (this.acc >= 1) {
        this.acc -= 1;
        const k = this.next;
        this.next = (this.next + 1) % N;
        const o = k * 3;
        this.pos[o] = origin.x;
        this.pos[o + 1] = origin.y + (Math.random() - 0.5) * 0.06;
        this.pos[o + 2] = origin.z + (Math.random() - 0.5) * 0.06;
        this.vel[o] = 1.1 + Math.random() * 0.5;
        this.vel[o + 1] = 0.05 + Math.random() * 0.15;
        this.vel[o + 2] = (Math.random() - 0.5) * 0.35;
        this.age[k] = 0;
        this.life[k] = 2.2 + Math.random() * 1.4;
        this.col.set(look.c, o);
        this.alpha[k] = look.a;
        (this.points.material as THREE.ShaderMaterial).blending = look.blend;
      }
    }
    let live = 0;
    const drag = Math.exp(-dt * 1.6);
    for (let k = 0; k < N; k++) {
      if (this.age[k] >= this.life[k]) {
        this.size[k] = 0;
        continue;
      }
      live++;
      this.age[k] += dt;
      const o = k * 3;
      this.vel[o] *= drag;
      this.vel[o + 2] *= drag;
      this.vel[o + 1] += dt * 0.35; // les gaz chauds montent
      this.pos[o] += this.vel[o] * dt;
      this.pos[o + 1] += this.vel[o + 1] * dt;
      this.pos[o + 2] += this.vel[o + 2] * dt;
      const t = this.age[k] / this.life[k];
      this.size[k] = 0.18 + 1.1 * Math.sqrt(t);
      const base = this.col[o] < 0.3 ? COLORS.black.a : COLORS.white.a;
      this.alpha[k] = base * Math.min(1, t * 8) * Math.pow(1 - t, 1.6);
    }
    this.live = live;
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.aSize.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
    a.aColor.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
