import { useMemo, useState, type PointerEvent } from 'react';
import { IconButton, Meter, SegmentedControl, Text } from '@ds';
import { cycleAngle } from '../../engine/scene/geometry';
import { camLift, derive, type Derived } from '../../engine/spec';
import { GAS_COLORS, STROKES, fmt } from '../../engine/data/vehicle';
import { useEngine, useTelemetry } from '../state/store';
import s from './Cycle.module.css';


/** Calage du moteur affiché, en angles de cycle (0 = PMH de croisement). */
interface Timing {
  IO: number;
  IC: number;
  EO: number;
  EC: number;
  spark: number;
  d: Derived;
}

function timingOf(d: Derived): Timing {
  return {
    IO: d.intake.peak - d.intake.halfDuration + 720, // ouverture admission, ramenée sur 0..720
    IC: d.intake.peak + d.intake.halfDuration,
    EO: d.exhaust.peak - d.exhaust.halfDuration,
    EC: d.exhaust.peak + d.exhaust.halfDuration,
    spark: d.sparkAngle,
    d,
  };
}

const liftA = (t: Timing, c: number) => camLift(c, t.d.intake.peak, t.d.intake.halfDuration, t.d.intake.lift);
const liftE = (t: Timing, c: number) => camLift(c, t.d.exhaust.peak, t.d.exhaust.halfDuration, t.d.exhaust.lift);

/** Épure, levées, pression : le cycle à quatre temps du cylindre suivi. */
export function Cycle() {
  const [cyl, setCyl] = useState(0);
  const gas = useEngine((st) => st.gas);
  const spec = useEngine((st) => st.spec);
  const t = useMemo(() => timingOf(derive(spec)), [spec]);
  const { psi, trace, heat } = useTelemetry();
  const c = Math.min(cyl, t.d.cylinders - 1);
  const cc = cycleAngle(psi, t.d.cycleOffsets[c] ?? 0);

  return (
    <div className={s.content}>
      <div className={s.head}>
        <Text variant="caption" tone="tertiary" caps as="h3">Cylindre suivi</Text>
        <CylinderPicker count={t.d.cylinders} value={Math.min(cyl, t.d.cylinders - 1)} onChange={setCyl} />
      </div>

      <section className={s.block} aria-label="Épure de distribution">
        <Text variant="headline" as="h3">Épure de distribution</Text>
        <Dial angle={cc} t={t} />
        <div className={s.legend}>
          <span><i style={{ background: 'var(--color-chart-intake)' }} />Admission ouverte</span>
          <span><i style={{ background: 'var(--color-chart-exhaust)' }} />Échappement ouvert</span>
          <span>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d={star(6, 6, 5.5)} fill="var(--color-label)" /></svg>
            Étincelle
          </span>
        </div>
      </section>

      <section className={s.block} aria-label="Levées et pression">
        <Text variant="headline" as="h3">Levées et pression</Text>
        <Text variant="footnote" tone="tertiary">
          {gas ? 'Pression relevée en direct dans la simulation. Survolez pour lire les valeurs.' : 'Activez les gaz dans la barre d\'outils pour relever la pression.'}
        </Text>
        <Charts angle={cc} t={t} trace={trace.length >= (c + 1) * 180 ? trace.slice(c * 180, c * 180 + 180) : new Array(180).fill(1)} />
      </section>

      <section className={s.block} aria-label="Calage">
        <Text variant="headline" as="h3">Calage</Text>
        <dl className={s.timing}>
          <dt>Ouverture admission</dt><dd>{fmt(t.d.intake.opens)}° avant PMH</dd>
          <dt>Fermeture admission</dt><dd>{fmt(t.d.intake.closes)}° après PMB</dd>
          <dt>Ouverture échappement</dt><dd>{fmt(t.d.exhaust.opens)}° avant PMB</dd>
          <dt>Fermeture échappement</dt><dd>{fmt(t.d.exhaust.closes)}° après PMH</dd>
          <dt>Croisement des soupapes</dt><dd>{fmt(t.d.overlap)}°</dd>
          <dt>Avance à l'allumage</dt><dd>{fmt(360 - t.spark)}° avant PMH</dd>
        </dl>
        <Text variant="footnote" tone="tertiary">
          L'échappement s'ouvre avant le point mort bas : il reste plusieurs bars dans le cylindre et les gaz sortent d'un coup, c'est la bouffée. Le piston chasse ensuite le reste en remontant. Au croisement, le mélange frais qui entre aide à pousser les derniers gaz brûlés.
        </Text>
      </section>

      <section className={s.block} aria-label="Gaz">
        <Text variant="headline" as="h3">Couleur des gaz</Text>
        <div className={s.legend}>
          <span><i style={{ background: GAS_COLORS.fresh }} />Mélange frais</span>
          <span><i style={{ background: GAS_COLORS.flame }} />Combustion</span>
          <span><i style={{ background: GAS_COLORS.burnt }} />Gaz brûlés</span>
        </div>
        <Text variant="footnote" tone="tertiary">La taille et l'éclat des particules suivent la pression.</Text>
      </section>

      <section className={s.block} aria-label="Chaleur des tubulures">
        <Text variant="headline" as="h3">Chaleur des tubulures</Text>
        <div className={s.heat}>
          {heat.map((h, i) => (
            <FragmentRow key={i} label={`C${i + 1}`} value={h} />
          ))}
        </div>
        <Text variant="footnote" tone="tertiary">
          Chaque bouffée réchauffe la tubulure de son cylindre, dans l'ordre d'allumage 1, 3, 4, 2. La ligne entière chauffe avec le régime.
        </Text>
      </section>
    </div>
  );
}

/** Choix du cylindre suivi : segments jusqu'à six cylindres, flèches au-delà. */
function CylinderPicker({ count, value, onChange }: { count: number; value: number; onChange: (v: number) => void }) {
  if (count <= 6) {
    const options = Array.from({ length: count }, (_, i) => ({ value: String(i), label: `C${i + 1}` }));
    return <SegmentedControl label="Cylindre suivi" size="sm" options={options} value={String(value)} onChange={(v) => onChange(+v)} />;
  }
  return (
    <div className={s.stepper} role="group" aria-label="Cylindre suivi">
      <IconButton icon="chevronLeft" label="Cylindre précédent" size="sm" tooltip={false} onClick={() => onChange((value - 1 + count) % count)} />
      <span aria-live="polite">Cylindre {value + 1} sur {count}</span>
      <IconButton icon="chevronRight" label="Cylindre suivant" size="sm" tooltip={false} onClick={() => onChange((value + 1) % count)} />
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <span>{label}</span>
      <Meter label={`Chaleur de la tubulure ${label}`} value={value} min={0} max={1} high={0.8} tone="neutral" />
    </>
  );
}

/* ---------- Épure : 720° sur un tour de cadran, PMH en haut ---------- */

const pt = (deg: number, r: number, c = 130): [number, number] => {
  const a = (deg / 720) * Math.PI * 2;
  return [c + r * Math.sin(a), c - r * Math.cos(a)];
};

function arc(from: number, to: number, r: number) {
  const [x0, y0] = pt(from, r);
  const [x1, y1] = pt(to, r);
  const span = (((to - from) % 720) + 720) % 720;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${span > 360 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

/** Petite étoile à quatre branches pour marquer l'étincelle. */
const star = (x: number, y: number, r = 6) =>
  `M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z`;

function Dial({ angle, t }: { angle: number; t: Timing }) {
  const stroke = Math.floor(angle / 180);
  const [nx, ny] = pt(angle, 92);
  const [sx, sy] = pt(t.spark, 93);
  const marks: [number, string][] = [[0, 'PMH'], [180, 'PMB'], [360, 'PMH'], [540, 'PMB']];
  return (
    <svg className={s.dial} viewBox="0 0 260 260" role="img" aria-label={`Épure de distribution, cylindre à ${Math.round(angle)} degrés, temps ${STROKES[stroke]}`}>
      <circle cx="130" cy="130" r="100" fill="none" stroke="var(--color-chart-grid)" strokeWidth="1" />
      <circle cx="130" cy="130" r="86" fill="none" stroke="var(--color-chart-grid)" strokeWidth="1" />
      {marks.map(([d, l]) => {
        const [x0, y0] = pt(d, 60);
        const [x1, y1] = pt(d, 108);
        const [tx, ty] = pt(d, 120);
        return (
          <g key={d}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--color-separator)" />
            <text x={tx} y={ty + 3.5} textAnchor="middle" className={s.axis}>{l}</text>
          </g>
        );
      })}
      {STROKES.map((name, i) => {
        const [x, y] = pt(i * 180 + 90, 74);
        return (
          <text key={name} x={x} y={y + 3.5} textAnchor="middle" className={s.label} opacity={i === stroke ? 1 : 0.55}>
            {name}
          </text>
        );
      })}
      <path d={arc(t.IO, t.IC, 100)} fill="none" stroke="var(--color-chart-intake)" strokeWidth="6" strokeLinecap="round" />
      <path d={arc(t.EO, t.EC, 86)} fill="none" stroke="var(--color-chart-exhaust)" strokeWidth="6" strokeLinecap="round" />
      <path d={star(sx, sy)} fill="var(--color-label)" stroke="var(--color-bg-elevated)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="130" y1="130" x2={nx} y2={ny} stroke="var(--color-label)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={nx} cy={ny} r="4.5" fill="var(--color-label)" stroke="var(--color-bg-elevated)" strokeWidth="2" />
      <circle cx="130" cy="130" r="26" fill="var(--color-bg-elevated)" stroke="var(--color-separator)" />
      <text x="130" y="128" textAnchor="middle" className={s.strong}>{Math.round(angle)}°</text>
      <text x="130" y="142" textAnchor="middle" className={s.axis}>sur 720°</text>
    </svg>
  );
}

/* ---------- Levées et pression : deux graphiques empilés sur le même axe des angles ---------- */

const W = 304;
const PAD_L = 30;
const PAD_R = 8;
const X = (deg: number) => PAD_L + (deg / 720) * (W - PAD_L - PAD_R);
const LIFT_H = 84;
const PRES_H = 104;

function Charts({ angle, t, trace }: { angle: number; t: Timing; trace: number[] }) {
  const [hover, setHover] = useState<number | null>(null);

  /* échelle des levées : 12 mm en haut, pour comparer les cames entre elles */
  const LMAX = 12;
  const ly = (mm: number) => LIFT_H - 12 - (mm / LMAX) * (LIFT_H - 22);
  const lift = useMemo(() => {
    const path = (f: (c: number) => number) => {
      let d = '';
      for (let a = 0; a <= 720; a += 2) d += `${a ? 'L' : 'M'}${X(a).toFixed(1)} ${ly(f(a)).toFixed(1)}`;
      return d;
    };
    return { a: path((c) => liftA(t, c)), e: path((c) => liftE(t, c)) };
  }, [t]);

  const pMax = Math.max(10, Math.ceil((Math.max(...trace) * 1.1) / 10) * 10);
  const py = (p: number) => PRES_H - 16 - (p / pMax) * (PRES_H - 28);
  const presPath = trace.map((p, k) => `${k ? 'L' : 'M'}${X(k * 4 + 2).toFixed(1)} ${py(p).toFixed(1)}`).join('');

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const deg = Math.round(((x - PAD_L) / (W - PAD_L - PAD_R)) * 720);
    setHover(deg >= 0 && deg <= 720 ? deg : null);
  };

  const ticks = [0, 180, 360, 540, 720];
  const cursor = hover ?? angle;
  const tipLeft = hover !== null ? Math.min(Math.max(0, (X(hover) / W) * 100 - 22), 56) : 0;

  return (
    <div className={s.chart} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <div className={s.legend} style={{ marginBottom: 8 }}>
        <span><i className={s.line} style={{ background: 'var(--color-chart-intake)' }} />Levée admission</span>
        <span><i className={s.line} style={{ background: 'var(--color-chart-exhaust)' }} />Levée échappement</span>
      </div>
      <svg viewBox={`0 0 ${W} ${LIFT_H}`} role="img" aria-label={`Levée des soupapes sur le cycle : ${fmt(t.d.intake.lift, 1)} mm à l'admission, ${fmt(t.d.exhaust.lift, 1)} mm à l'échappement`}>
        {ticks.map((t) => (
          <line key={t} x1={X(t)} x2={X(t)} y1={4} y2={LIFT_H - 12} stroke="var(--color-chart-grid)" />
        ))}
        <line x1={PAD_L} x2={W - PAD_R} y1={LIFT_H - 12} y2={LIFT_H - 12} stroke="var(--color-separator)" />
        <text x={PAD_L - 6} y={ly(LMAX) + 3} textAnchor="end" className={s.axis}>{LMAX}</text>
        <text x={PAD_L - 6} y={LIFT_H - 9} textAnchor="end" className={s.axis}>mm</text>
        <path d={lift.a} fill="none" stroke="var(--color-chart-intake)" strokeWidth="2" strokeLinejoin="round" />
        <path d={lift.e} fill="none" stroke="var(--color-chart-exhaust)" strokeWidth="2" strokeLinejoin="round" />
        <line x1={X(cursor)} x2={X(cursor)} y1={2} y2={LIFT_H - 12} stroke="var(--color-label)" strokeWidth="1" opacity={hover !== null ? 0.5 : 0.9} />
      </svg>
      <svg viewBox={`0 0 ${W} ${PRES_H}`} role="img" aria-label={`Pression dans le cylindre relevée sur le cycle, maximum ${fmt(Math.max(...trace))} bars`} style={{ marginTop: 6 }}>
        {ticks.map((t) => (
          <line key={t} x1={X(t)} x2={X(t)} y1={6} y2={PRES_H - 16} stroke="var(--color-chart-grid)" />
        ))}
        <line x1={PAD_L} x2={W - PAD_R} y1={PRES_H - 16} y2={PRES_H - 16} stroke="var(--color-separator)" />
        <text x={PAD_L - 6} y={py(pMax) + 3} textAnchor="end" className={s.axis}>{pMax}</text>
        <text x={PAD_L - 6} y={PRES_H - 13} textAnchor="end" className={s.axis}>bar</text>
        <path d={presPath} fill="none" stroke="var(--color-chart-pressure)" strokeWidth="2" strokeLinejoin="round" />
        <line x1={X(cursor)} x2={X(cursor)} y1={4} y2={PRES_H - 16} stroke="var(--color-label)" strokeWidth="1" opacity={hover !== null ? 0.5 : 0.9} />
        {ticks.map((t, i) => (
          <text key={t} x={X(t)} y={PRES_H - 3} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} className={s.axis}>
            {i % 2 ? 'PMB' : 'PMH'}
          </text>
        ))}
        <text x={(X(0) + X(180)) / 2} y={14} textAnchor="middle" className={s.axis}>Pression</text>
      </svg>
      {hover !== null && (
        <div className={s.tip} style={{ left: `${tipLeft}%` }}>
          <b>{hover}° · {STROKES[Math.min(3, Math.floor(hover / 180))]}</b>
          <div><i style={{ background: 'var(--color-chart-intake)' }} />Admission<span>{fmt(liftA(t, hover), 1)} mm</span></div>
          <div><i style={{ background: 'var(--color-chart-exhaust)' }} />Échappement<span>{fmt(liftE(t, hover), 1)} mm</span></div>
          <div><i style={{ background: 'var(--color-chart-pressure)' }} />Pression<span>{fmt(trace[Math.min(179, Math.floor(hover / 4))], 1)} bar</span></div>
        </div>
      )}
    </div>
  );
}
