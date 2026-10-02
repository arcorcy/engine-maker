import { Badge, IconButton, Readout, Surface, Text } from '@ds';
import { href } from '../router';
import type { EngineRecord } from './repository';
import { dim, num, plural, relativeTime, statusBadge, summarize } from './summary';
import s from './EngineCard.module.css';

interface Props {
  record: EngineRecord;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function EngineCard({ record, onDuplicate, onDelete }: Props) {
  const sum = summarize(record.spec);
  const d = sum.validation.derived;
  const badge = statusBadge(sum);
  return (
    <Surface as="article" material="solid" radius="lg" className={s.card} aria-label={record.spec.name}>
      <a className={s.link} href={href({ name: 'engine', id: record.id })}>
        <div className={s.head}>
          <Text variant="title-3" as="h3" className={s.name}>{record.spec.name}</Text>
          <Text variant="footnote" tone="secondary">
            {sum.templateName} · {sum.changedParts ? plural(sum.changedParts, 'pièce modifiée', 'pièces modifiées') : "pièces d'origine"}
          </Text>
        </div>
        {d ? (
          <div className={s.figures}>
            <Readout size="sm" value={num(d.displacement)} unit="cm³" label="cylindrée" />
            <Readout size="sm" value={`${dim(d.bore)} × ${dim(d.stroke)}`} label="alésage × course" />
            <Readout size="sm" value={num(d.compressionRatio, 1)} label="rapport vol." />
          </div>
        ) : (
          <Text variant="footnote" tone="danger">Pièces inconnues : ouvrir pour corriger.</Text>
        )}
        <div className={s.foot}>
          <Badge tone={badge.tone} icon={badge.icon}>{badge.label}</Badge>
          <Text variant="footnote" tone="tertiary" as="span">Modifié {relativeTime(record.updatedAt)}</Text>
        </div>
      </a>
      <div className={s.actions}>
        <IconButton icon="copy" label={`Dupliquer ${record.spec.name}`} size="sm" tooltip="bottom" onClick={onDuplicate} />
        <IconButton icon="trash" label={`Supprimer ${record.spec.name}`} size="sm" tooltip="bottom" onClick={onDelete} />
      </div>
    </Surface>
  );
}
