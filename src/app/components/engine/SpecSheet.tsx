import { Badge, Button, Notice, Readout, Text } from '@ds';
import { LIMITS, type Issue, type SlotId } from '../../../engine/spec';
import { dim, num, REFERENCE, statusBadge, type Summary } from '../../garage/summary';
import { targetLabel } from './labels';
import s from './SpecSheet.module.css';

interface Props {
  summary: Summary;
  onShow: (slot: SlotId) => void;
}

const delta = (v: number, ref: number, unit: string, d = 0) => {
  const diff = v - ref;
  if (Math.abs(diff) < 10 ** -d / 2) return 'comme la référence';
  return `${diff > 0 ? '+' : '−'}${num(Math.abs(diff), d)} ${unit} par rapport à la référence`;
};

/** Fiche technique calculée et diagnostic. Rien ici n'est saisi : tout découle des pièces choisies. */
export function SpecSheet({ summary, onShow }: Props) {
  const d = summary.validation.derived;
  const ref = REFERENCE.validation.derived!;
  const badge = statusBadge(summary);
  const issues = [...summary.errors, ...summary.warnings];
  const flag = (codes: string[]) => {
    const hit = issues.find((i) => codes.some((c) => i.code.startsWith(c)));
    return hit ? hit.severity : undefined;
  };

  return (
    <div className={s.sheet}>
      <div className={s.head}>
        <Text variant="caption" tone="tertiary" caps as="h2">Fiche technique</Text>
        <Badge tone={badge.tone} icon={badge.icon}>{badge.label}</Badge>
      </div>

      {d ? (
        <>
          <div className={s.hero}>
            <Readout size="lg" value={num(d.displacement)} unit="cm³" label={delta(d.displacement, ref.displacement, 'cm³')} />
            <Readout size="md" value={`${dim(d.bore)} × ${dim(d.stroke)}`} unit="mm" label="alésage × course" />
            <Readout size="md" value={num(d.compressionRatio, 1)} unit=": 1" label="rapport volumétrique" tone={flag(['cr.']) === 'error' ? 'danger' : 'primary'} />
          </div>

          <dl className={s.table}>
            <dt>Rapport bielle / course</dt>
            <dd data-s={flag(['geom.rod-ratio'])}>{num(d.rodStrokeRatio, 2)}</dd>
            <dt>Piston au PMH</dt>
            <dd data-s={flag(['geom.piston-protrudes', 'geom.deck-clearance'])}>
              {d.deckClearance < 0 ? `dépasse de ${num(-d.deckClearance, 2)} mm` : `${num(d.deckClearance, 2)} mm sous le plan`}
            </dd>
            <dt>Paroi entre cylindres</dt>
            <dd data-s={flag(['geom.bridge'])}>{num(d.bridge, 1)} mm</dd>
            <dt>Croisement des soupapes</dt>
            <dd data-s={flag(['cam.overlap'])}>{num(d.overlap)}°</dd>
            <dt>Jeu soupape-piston, admission</dt>
            <dd data-s={flag(['valve.clearance-intake'])}>{num(d.valveClearance.intake.min, 2)} mm</dd>
            <dt>Jeu soupape-piston, échappement</dt>
            <dd data-s={flag(['valve.clearance-exhaust'])}>{num(d.valveClearance.exhaust.min, 2)} mm</dd>
            <dt>Vitesse du piston au régime maxi</dt>
            <dd data-s={flag(['rpm.piston-speed'])}>{num(d.pistonSpeedAtRedline, 1)} m/s</dd>
          </dl>
          <Text variant="footnote" tone="tertiary">
            Repères : jeu soupape-piston d'au moins {num(LIMITS.valveClearanceWarning)} mm, vitesse de piston sous {LIMITS.pistonSpeedWarning} m/s,
            rapport volumétrique entre {num(LIMITS.crLowWarning, 1)} et {num(LIMITS.crHighWarning, 1)} en atmosphérique.
          </Text>
        </>
      ) : (
        <Text variant="callout" tone="secondary">Impossible de calculer la fiche tant que des pièces sont inconnues.</Text>
      )}

      <div className={s.issues} aria-live="polite">
        <Text variant="caption" tone="tertiary" caps as="h2">Diagnostic</Text>
        {issues.length === 0 ? (
          <Notice tone="success" title="Moteur cohérent">
            <p>Toutes les pièces s'appairent et aucun réglage n'est risqué.</p>
          </Notice>
        ) : (
          issues.map((i: Issue, k) => (
            <Notice key={`${i.code}-${k}`} tone={i.severity === 'error' ? 'danger' : 'warning'} title={i.message}>
              {i.hint && <p>{i.hint}</p>}
              <div className={s.targets}>
                {i.targets.filter((t) => !t.startsWith('params.')).map((t) => (
                  <Button key={t} variant="plain" size="sm" onClick={() => onShow(t as SlotId)}>
                    {targetLabel(t)}
                  </Button>
                ))}
              </div>
            </Notice>
          ))
        )}
      </div>
    </div>
  );
}
