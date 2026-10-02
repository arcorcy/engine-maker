import { Badge, Button, Meter, Readout, SegmentedControl, Text } from '@ds';
import { CAR, GEAR_LABEL, PRESETS, SLOW_OPTIONS, fmt, ratioOf, rpmFor, speedKmh } from '../../engine/data/vehicle';
import { useEngine } from '../state/store';
import { RoadCanvas } from './RoadCanvas';
import s from './Drive.module.css';

const GEARS = GEAR_LABEL.map((l, g) => ({ value: String(g), label: l }));
const SLOWS = SLOW_OPTIONS.map((v) => ({ value: String(v), label: v === 1 ? '×1' : `1/${v}` }));

/** Véhicule simulé : le régime et le rapport donnent la vitesse, la route défile au même ralenti que le moteur. */
export function Drive() {
  const rpm = useEngine((st) => st.rpm);
  const gear = useEngine((st) => st.gear);
  const slow = useEngine((st) => st.slow);
  const { setGear, applyPreset, setSlow } = useEngine.getState();
  const kmh = speedKmh(rpm, gear);
  const ratio = ratioOf(gear);
  const red = rpm >= CAR.red;

  return (
    <div className={s.content}>
      <div className={s.head}>
        <Text variant="caption" tone="tertiary" caps as="h3">Véhicule simulé</Text>
        <Badge>{CAR.name}</Badge>
      </div>

      <div className={s.gauge}>
        <div className={s.readouts}>
          <Readout size="lg" value={fmt(kmh)} unit="km/h" />
          <Readout size="lg" value={GEAR_LABEL[gear]} label={gear ? `${gear}${gear === 1 ? 're' : 'e'} vitesse` : 'point mort'} className={s.gear} />
        </div>
        <div className={s.rpm}>
          <Readout size="sm" value={fmt(rpm)} unit="tr/min" tone={red ? 'danger' : 'primary'} />
          <Text variant="footnote" tone="tertiary" as="span">zone rouge {fmt(CAR.red)}</Text>
        </div>
        <Meter label="Régime moteur" value={rpm} min={0} max={CAR.maxScale} high={CAR.red} />
      </div>

      <RoadCanvas className={s.road} />

      <div className={s.block}>
        <Text variant="footnote" tone="secondary" as="span">Rapport</Text>
        <SegmentedControl label="Rapport de boîte" options={GEARS} value={String(gear)} onChange={(v) => setGear(+v)} />
      </div>

      <div className={s.block}>
        <Text variant="footnote" tone="secondary" as="span">Allures types, en km/h</Text>
        <div className={s.presets}>
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              aria-pressed={p.gear === gear && Math.abs(rpmFor(p) - rpm) < 60}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={s.block}>
        <Text variant="footnote" tone="secondary" as="span">Ralenti de l'animation</Text>
        <SegmentedControl label="Ralenti de l'animation" size="sm" options={SLOWS} value={String(slow)} onChange={(v) => setSlow(+v)} />
        <Text variant="footnote" tone="tertiary">
          {slow === 1
            ? "Temps réel : le moteur fait plusieurs tours entre deux images, d'où un effet stroboscopique."
            : 'Le moteur et la route sont ralentis du même facteur.'}
        </Text>
      </div>

      <div className={s.stats}>
        <Readout size="sm" value={fmt(rpm / 30)} label="combustions par seconde" />
        <Readout size="sm" value={fmt((2 * CAR.stroke * rpm) / 60, 1)} unit="m/s" label="vitesse moyenne du piston" />
        <Readout size="sm" value={ratio ? fmt((2 * CAR.circ) / ratio, 2) : '0'} unit="m" label="parcourus par cycle de 720°" />
      </div>
    </div>
  );
}
