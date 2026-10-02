/*
 * Scène Three.js impérative, pilotée par le store : React ne re-rend jamais la 3D.
 * Chaque image lit l'état courant (useEngine.getState()) et publie la télémétrie à ~10 Hz.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FAIL } from '../data/failures';
import { PART, PARTS } from '../data/parts';
import { isPartVisible, useEngine, useTelemetry, type EngineState } from '../../app/state/store';
import type { EngineSpec } from '../spec';
import { cycleAngle, geometryFor, type EngineGeometry } from './geometry';
import { buildEngine, setPose, type PartNode } from './model';
import { SmokeSim } from './smoke';
import { GasSim } from './gas';
import { PANEL } from '../../app/layout';

const D2R = Math.PI / 180;
const ease = (t: number) => t * t * (3 - 2 * t);
const C_BLACK = new THREE.Color(0x000000);
const C_WHITE = new THREE.Color(0xffffff);
const C_HEAT = new THREE.Color('#ff4a12');
/** Pièces rendues en verre quand les gaz sont affichés, pour voir l'échappement circuler dedans. */
const GLASS = ['echappement', 'catalyseur'];
const TH_INTAKE = -0.62;
const TH_EXHAUST = Math.PI + 0.62;

interface Cam {
  th: number;
  ph: number;
  rad: number;
  tx: number;
  ty: number;
  tz: number;
}

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Ombre portée douce sous le moteur, plus légère qu'une vraie carte d'ombre et toujours propre. */
function contactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 4.2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

export class EngineScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  private spec: EngineSpec;
  private geo: EngineGeometry;
  private model!: ReturnType<typeof buildEngine>;
  private gas!: GasSim;
  private uPx = { value: 600 };
  private smoke: SmokeSim;
  /** Échauffement global de la ligne, lié au régime, qui suit lentement. */
  private thermal = 0;
  private tailpipes: THREE.Vector3[] = [];
  /** Plan de coupe du bas moteur (z > 0 retiré). */
  private clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  /** Un plan de coupe par banc, passant par l'axe des cylindres et celui du vilebrequin. */
  private bankClips: THREE.Plane[] = [];
  private shadow = contactShadow();
  private leader: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private rest: Record<string, { box: THREE.Box3; c: THREE.Vector3 }> = {};

  private cam: Cam = { th: -0.62, ph: 1.2, rad: 17, tx: 0, ty: 1.2, tz: 0 };
  private goal: Cam = { ...this.cam };
  private psi = 0;
  private exC = 0;
  private last = performance.now();
  private lastTelemetry = 0;
  private hoverTick = 0;
  private raf = 0;
  private applied: { cut?: boolean; colorMode?: string; fitN?: number; sideN?: number } = {};

  private ptrs = new Map<number, { x: number; y: number; b: number; sh: boolean }>();
  private downAt: { x: number; y: number } | null = null;
  private pinch = 0;
  private moved = 0;
  private mouse = { x: 0, y: 0, in: false };
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cleanups: Array<() => void> = [];
  private accent = new THREE.Color('#0071e3');
  private danger = new THREE.Color('#e30000');

  constructor(
    private canvas: HTMLCanvasElement,
    private stage: HTMLElement,
  ) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    r.localClippingEnabled = true;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    this.renderer = r;

    /* Éclairage studio : environnement de pièce pour les reflets métalliques, plus une lumière clé douce */
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.85;
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-6, 12, 9);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.8);
    rim.position.set(8, 4, -9);
    this.scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x8a8a90, 0.35));

    this.scene.add(this.shadow);
    this.smoke = new SmokeSim(this.uPx);
    this.scene.add(this.smoke.points);
    this.spec = useEngine.getState().spec;
    this.geo = geometryFor(this.spec);
    this.mount();

    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTS.length * 6), 3));
    this.leader = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.5 }));
    this.leader.frustumCulled = false;
    this.scene.add(this.leader);

    this.applyTheme();
    this.bindPointer();

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(stage);
    this.cleanups.push(() => ro.disconnect());

    const mo = new MutationObserver(() => this.applyTheme());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => this.applyTheme();
    mq.addEventListener('change', onMq);
    this.cleanups.push(() => {
      mo.disconnect();
      mq.removeEventListener('change', onMq);
    });

    this.resize();
    const s = useEngine.getState();
    this.fitTo(s.fit.ids, s.fit.minRad, s);
    this.applied.fitN = s.fit.n;
    this.applied.sideN = s.side.n;
    Object.assign(this.cam, this.goal);
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.cleanups.forEach((f) => f());
    this.smoke.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }

  /* ---------- Construction du moteur, et reconstruction quand ses pièces changent ---------- */

  private mount(previous?: Record<string, PartNode>) {
    this.model = buildEngine(this.geo);
    const { root, parts, anim, gasGroup } = this.model;
    this.scene.add(root);
    this.gas = new GasSim(anim, this.model.exhaust, this.geo, this.uPx);
    this.gas.bankPoints.forEach((pts, b) => this.model.gasBanks[b].add(pts));
    gasGroup.add(this.gas.exhaustPoints);
    this.bankClips = this.geo.banks.map((bk) => new THREE.Plane(new THREE.Vector3(0, Math.sin(bk.angle), -Math.cos(bk.angle)), 0));
    PARTS.forEach((d) => {
      const b = new THREE.Box3().setFromObject(parts[d.id].group);
      this.rest[d.id] = { box: b, c: b.getCenter(new THREE.Vector3()) };
      if (previous) parts[d.id].cur = previous[d.id].cur;
    });
    setPose(anim, this.psi, this.geo);
    this.gas.init(this.psi);
    /* les nouveaux matériaux doivent recevoir la coupe et le mode de couleur */
    this.applied.cut = undefined;
    this.applied.colorMode = undefined;
  }

  private rebuild(spec: EngineSpec) {
    const previous = this.model.parts;
    this.scene.remove(this.model.root);
    this.model.root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.spec = spec;
    this.geo = geometryFor(spec);
    this.mount(previous);
  }

  /* ---------- Thème, matériaux, coupe ---------- */

  private applyTheme() {
    const dark = getComputedStyle(document.documentElement).colorScheme.includes('dark');
    this.leader.material.color.set(cssColor('--color-label-tertiary', '#86868b'));
    this.accent.set(cssColor('--color-accent', '#0071e3'));
    this.danger.set(cssColor('--color-danger', '#e30000'));
    this.shadow.material.opacity = dark ? 0.85 : 0.42;
  }

  private applyColorMode(mode: 'materials' | 'systems') {
    Object.values(this.model.parts).forEach((p) =>
      p.mats.forEach((m) => {
        const lk = m.userData.looks[mode];
        m.metalness = lk.metalness;
        m.roughness = lk.roughness;
      }),
    );
  }

  private setCut(on: boolean) {
    const plane = (m: THREE.Material) => {
      const b = m.userData.bank as number | undefined;
      return b !== undefined && b >= 0 ? this.bankClips[b] : this.clip;
    };
    const apply = (m: THREE.Material) => {
      m.clippingPlanes = on ? [plane(m)] : null;
      m.side = on ? THREE.DoubleSide : THREE.FrontSide;
      m.needsUpdate = true;
    };
    Object.values(this.model.parts).forEach((p) => p.mats.forEach(apply));
    this.model.anim.gas.forEach((g) => {
      g.material.clippingPlanes = on ? [plane(g.material)] : null;
      g.material.needsUpdate = true;
    });
  }

  private targetOpacity(s: EngineState, id: string, glass: boolean) {
    let o: number;
    if (s.fail) o = FAIL[s.fail].parts.includes(id) ? 1 : 0.1;
    else if (s.sel) o = id === s.sel ? 1 : s.iso ? (s.xray ? 0.35 : 1) : s.xray ? 0.08 : 0.28;
    else o = s.xray ? 0.26 : 1;
    return glass && GLASS.includes(id) ? Math.min(o, o === 1 && (s.sel === id || s.fail) ? 0.5 : 0.3) : o;
  }

  /** Tourne la caméra vers le côté demandé, par le plus court chemin. */
  private turnTo(side: 'intake' | 'exhaust') {
    const base = side === 'exhaust' ? TH_EXHAUST : TH_INTAKE;
    const k = Math.round((this.goal.th - base) / (Math.PI * 2));
    this.goal.th = base + k * Math.PI * 2;
    this.goal.ph = 1.2;
  }

  /* ---------- Caméra ---------- */

  private resize() {
    const w = this.stage.clientWidth;
    const h = this.stage.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.uPx.value = this.renderer.domElement.height / (2 * Math.tan((this.camera.fov * D2R) / 2));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private boxFor(ids: string[], explode: number) {
    const b = new THREE.Box3();
    const e = ease(explode);
    ids.forEach((id) => {
      const r = this.rest[id].box.clone();
      const o = PART[id].exp;
      r.translate(new THREE.Vector3(o[0] * e, o[1] * e, o[2] * e));
      b.union(r);
    });
    return b;
  }

  /** Cadre les pièces données, en tenant compte des panneaux qui recouvrent la vue. */
  private fitTo(ids: string[], minRad: number, s: EngineState) {
    if (!ids.length) ids = PARTS.map((p) => p.id);
    const b = this.boxFor(ids, s.explode);
    const c = b.getCenter(new THREE.Vector3());
    const r = b.getBoundingSphere(new THREE.Sphere()).radius;
    const fv = this.camera.fov * D2R;
    const occluded = this.occludedWidth(s);
    const aspect = Math.max(0.5, (this.stage.clientWidth - occluded.left - occluded.right) / Math.max(1, this.stage.clientHeight));
    const fh = 2 * Math.atan(Math.tan(fv / 2) * aspect);
    this.goal.tx = c.x;
    this.goal.ty = c.y;
    this.goal.tz = c.z;
    this.goal.rad = Math.max(minRad, (r * 1.08) / Math.sin(Math.min(fv, fh) / 2));
    /* décale la cible pour centrer le moteur dans la zone libre entre les panneaux */
    const shiftPx = (occluded.left - occluded.right) / 2;
    if (shiftPx) {
      const worldPerPx = (this.goal.rad * Math.tan(fv / 2) * 2) / this.stage.clientHeight;
      const right = new THREE.Vector3(Math.cos(this.goal.th), 0, -Math.sin(this.goal.th));
      this.goal.tx -= right.x * shiftPx * worldPerPx;
      this.goal.tz -= right.z * shiftPx * worldPerPx;
    }
  }

  /** Largeur masquée par les panneaux ancrés (sur grand écran seulement, ailleurs ils se superposent). */
  private occludedWidth(s: EngineState) {
    if (this.stage.clientWidth < PANEL.dockMin) return { left: 0, right: 0 };
    return {
      left: s.panels.library ? PANEL.library + PANEL.gap * 2 : 0,
      right: s.panels.inspector ? PANEL.inspector + PANEL.gap * 2 : 0,
    };
  }

  private placeCamera() {
    const { th, ph, rad, tx, ty, tz } = this.cam;
    const sp = Math.sin(ph);
    this.camera.position.set(tx + rad * sp * Math.sin(th), ty + rad * Math.cos(ph), tz + rad * sp * Math.cos(th));
    this.camera.lookAt(tx, ty, tz);
  }

  private pan(dx: number, dy: number) {
    const k = (this.goal.rad * Math.tan((this.camera.fov * D2R) / 2) * 2) / this.stage.clientHeight;
    const m = this.camera.matrixWorld.elements;
    this.goal.tx -= (m[0] * dx - m[4] * dy) * k;
    this.goal.ty -= (m[1] * dx - m[5] * dy) * k;
    this.goal.tz -= (m[2] * dx - m[6] * dy) * k;
  }

  /* ---------- Pointeur : rotation, déplacement, zoom, pincement, sélection ---------- */

  private bindPointer() {
    const c = this.canvas;
    const on = <K extends keyof HTMLElementEventMap>(t: K, f: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions) => {
      c.addEventListener(t, f as EventListener, o);
      this.cleanups.push(() => c.removeEventListener(t, f as EventListener));
    };
    const clampR = (r: number) => Math.min(60, Math.max(2.5, r));

    on('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey });
      if (this.ptrs.size === 1) {
        this.downAt = { x: e.clientX, y: e.clientY };
        this.moved = 0;
        c.dataset.drag = 'true';
      }
      if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    on('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.in = true;
      const p = this.ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.ptrs.size === 1) {
        if (p.b === 2 || p.sh) this.pan(dx, dy);
        else {
          this.goal.th -= dx * 0.008;
          this.goal.ph = Math.min(3.0, Math.max(0.15, this.goal.ph - dy * 0.008));
        }
      } else if (this.ptrs.size === 2) {
        const [a, b] = [...this.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinch) this.goal.rad = clampR((this.goal.rad * this.pinch) / d);
        this.pinch = d;
        this.pan(dx / 2, dy / 2);
      }
    });
    const end = (e: PointerEvent) => {
      const had = this.ptrs.delete(e.pointerId);
      if (!this.ptrs.size) delete c.dataset.drag;
      if (had && e.type === 'pointerup' && this.moved < 5 && this.downAt && this.ptrs.size === 0) this.click(e.clientX, e.clientY);
      if (this.ptrs.size < 2) this.pinch = 0;
    };
    on('pointerup', end);
    on('pointercancel', end);
    on('pointerleave', () => {
      this.mouse.in = false;
    });
    on(
      'wheel',
      (e) => {
        e.preventDefault();
        this.goal.rad = clampR(this.goal.rad * Math.exp(e.deltaY * 0.001));
      },
      { passive: false },
    );
    on('contextmenu', (e) => e.preventDefault());
    on('keydown', (e) => {
      const k = ({ ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] } as Record<string, number[]>)[e.key];
      if (k) {
        this.goal.th += k[0];
        this.goal.ph = Math.min(3, Math.max(0.15, this.goal.ph + k[1]));
        e.preventDefault();
      }
      if (e.key === '+' || e.key === '=') this.goal.rad = clampR(this.goal.rad * 0.88);
      if (e.key === '-') this.goal.rad = clampR(this.goal.rad * 1.14);
    });
  }

  private pickAt(cx: number, cy: number) {
    const s = useEngine.getState();
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const targets = this.model.root.children.filter((o) => o !== this.model.gasGroup);
    for (const h of this.ray.intersectObjects(targets, true)) {
      const id = h.object.userData.partId as string | undefined;
      if (!id) continue;
      if (!isPartVisible(s, id) || this.model.parts[id].cur < 0.18) continue;
      if (s.cut && h.point.z > 1e-4) continue;
      return id;
    }
    return null;
  }

  private click(x: number, y: number) {
    const id = this.pickAt(x, y);
    const s = useEngine.getState();
    if (id) s.selectPart(id);
    else if (s.sel || s.fail) s.clear();
  }

  /* ---------- Chaleur et fumée ---------- */

  private runnerGlow(h: number) {
    return Math.min(1, 0.45 * this.thermal + 0.75 * h);
  }

  /** Lueur des tubulures, de la descente et du catalyseur ; les pièces surlignées gardent leur surbrillance. */
  private applyHeat(s: EngineState, dt: number, free: Set<string>) {
    const target = s.play ? 0.12 + (0.6 * s.rpm) / 6500 : this.thermal;
    this.thermal += (target - this.thermal) * (1 - Math.exp(-dt * 0.3));
    const { heat } = this.model;
    const mean = this.gas.heat.reduce((a, b) => a + b, 0) / this.gas.heat.length;
    const set = (m: THREE.MeshStandardMaterial, v: number) => {
      m.emissive.copy(C_HEAT);
      m.emissiveIntensity = 1.25 * v * v;
    };
    if (free.has('echappement')) {
      heat.runners.forEach((m, i) => set(m, this.runnerGlow(this.gas.heat[i])));
      heat.pipes.forEach((m) => set(m, Math.min(1, 0.4 * this.thermal + 0.35 * mean)));
    }
    if (free.has('catalyseur')) heat.cats.forEach((m) => set(m, Math.min(1, 0.3 * this.thermal + 0.2 * mean)));
  }

  private stepSmoke(s: EngineState, dt: number, e: number) {
    const kind = (s.fail && FAIL[s.fail].smoke) || null;
    const on = kind && isPartVisible(s, 'catalyseur') ? kind : null;
    if (!on && !this.smoke.active) {
      this.smoke.points.visible = false;
      return;
    }
    this.smoke.points.visible = true;
    const o = PART.catalyseur.exp;
    this.tailpipes = this.model.tailpipes.map((tp, k) =>
      (this.tailpipes[k] ?? new THREE.Vector3()).set(tp[0] + o[0] * e, tp[1] + o[1] * e, tp[2] + o[2] * e),
    );
    this.smoke.step(dt, on, this.tailpipes, s.play ? 10 + s.rpm / 160 : 7);
  }

  /* ---------- Boucle ---------- */

  private frame = (now: number) => {
    const s = useEngine.getState();
    if (s.spec !== this.spec) this.rebuild(s.spec);
    const { parts, anim, gasGroup } = this.model;
    const dt = Math.max(0, Math.min((now - this.last) / 1000, 0.05));
    this.last = now;

    if (s.cut !== this.applied.cut) {
      this.setCut(s.cut);
      this.applied.cut = s.cut;
    }
    if (s.colorMode !== this.applied.colorMode) {
      this.applyColorMode(s.colorMode);
      this.applied.colorMode = s.colorMode;
    }
    if (s.side.n !== this.applied.sideN) {
      this.turnTo(s.side.value);
      this.applied.sideN = s.side.n;
    }
    if (s.fit.n !== this.applied.fitN) {
      this.fitTo(s.fit.ids, s.fit.minRad, s);
      this.applied.fitN = s.fit.n;
    }

    /* rotation du moteur, par petits pas d'angle à haut régime pour garder gaz et soupapes cohérents */
    if (s.play) {
      const ds = (s.rpm * 6 * dt) / s.slow;
      const n = gasGroup.visible ? Math.min(100, Math.max(1, Math.ceil(ds / 5))) : 1;
      for (let k = 0; k < n; k++) {
        this.psi = (this.psi + ds / n) % 720;
        setPose(anim, this.psi, this.geo);
        if (gasGroup.visible) this.gas.step(dt / n, ds / n, this.psi, s.cut);
      }
    } else if (gasGroup.visible) this.gas.step(dt, 0, this.psi, s.cut);

    if (now - this.lastTelemetry > 90) {
      this.lastTelemetry = now;
      useTelemetry.setState({
        psi: this.psi,
        strokes: this.geo.offsets.map((off) => Math.floor(cycleAngle(this.psi, off) / 180)),
        pressures: this.gas.p.map((p) => Math.round(p)),
        trace: Array.from(this.gas.trace),
        heat: this.gas.heat.map((h) => this.runnerGlow(h)),
      });
    }

    /* éclaté, opacités, surbrillances */
    this.exC += (s.explode - this.exC) * (1 - Math.exp(-dt * 6));
    if (Math.abs(s.explode - this.exC) < 0.0005) this.exC = s.explode;
    const e = ease(this.exC);
    const kf = 1 - Math.exp(-dt * 8);
    const pulse = 0.5 + 0.5 * Math.sin(now / 260);
    gasGroup.visible = s.gas && isPartVisible(s, 'piston') && this.exC < 0.05;
    const glass = gasGroup.visible;
    const hot = new Set<string>();
    this.shadow.position.y = -1.2 - 2.6 * e;

    const failParts = s.fail ? FAIL[s.fail].parts : null;
    const lp = this.leader.geometry.attributes.position.array as Float32Array;

    PARTS.forEach((d, i) => {
      const p: PartNode = parts[d.id];
      const vis = isPartVisible(s, d.id);
      p.group.position.set(d.exp[0] * e, d.exp[1] * e, d.exp[2] * e);
      const tgt = vis ? this.targetOpacity(s, d.id, glass) : 0;
      p.cur += (tgt - p.cur) * kf;
      p.group.visible = p.cur > 0.012;
      const isSel = s.sel === d.id;
      const isFail = !!failParts?.includes(d.id);
      const isHov = s.hover === d.id && !isSel;
      const col = isFail ? this.danger : this.accent;
      const em = isFail ? 0.22 + 0.28 * pulse : isSel ? 0.28 + 0.08 * pulse : isHov ? 0.12 : 0;
      const tint = isFail ? 0.45 : isSel ? 0.35 : 0;
      if (!em) hot.add(d.id);
      p.mats.forEach((m) => {
        m.opacity = p.cur;
        m.transparent = p.cur < 0.995;
        m.depthWrite = p.cur > 0.6;
        m.emissive.copy(em ? (isHov ? C_WHITE : col) : C_BLACK);
        m.emissiveIntensity = em;
        m.color.copy(m.userData.looks[s.colorMode].color);
        if (tint) m.color.lerp(col, tint);
      });
      const c = this.rest[d.id].c;
      const o = d.exp;
      const show = e > 0.02 && vis && p.cur > 0.2;
      lp.set(show ? [c.x, c.y, c.z, c.x + o[0] * e, c.y + o[1] * e, c.z + o[2] * e] : [0, 0, 0, 0, 0, 0], i * 6);
    });
    this.leader.geometry.attributes.position.needsUpdate = true;
    this.applyHeat(s, dt, hot);
    this.stepSmoke(s, dt, e);

    (Object.keys(this.cam) as (keyof Cam)[]).forEach((k) => {
      this.cam[k] += (this.goal[k] - this.cam[k]) * kf;
    });
    this.placeCamera();
    this.camera.near = Math.max(0.15, this.cam.rad * 0.035);
    this.camera.far = this.cam.rad * 4 + 60;
    this.camera.updateProjectionMatrix();

    if (this.mouse.in && !this.ptrs.size && now - this.hoverTick > 60) {
      this.hoverTick = now;
      const id = this.pickAt(this.mouse.x, this.mouse.y);
      if (id !== s.hover) s.setHover(id);
      this.canvas.style.cursor = id ? 'pointer' : '';
    } else if (!this.mouse.in && s.hover) s.setHover(null);

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };
}
