import type { ReactNode } from 'react';
import { Badge, Button, Icon, IconButton, SegmentedControl, Surface, Text } from '@ds';
import { FAIL, SEVERITY_LABEL, type Failure } from '../../engine/data/failures';
import { PART, type Part } from '../../engine/data/parts';
import { SYSTEM, SYSTEMS } from '../../engine/data/systems';
import { useEngine, type InspectorTab } from '../state/store';
import { Cycle } from './Cycle';
import { Drive } from './Drive';
import p from './Panel.module.css';
import s from './Inspector.module.css';

const TABS = [
  { value: 'detail', label: 'Fiche' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'drive', label: 'Conduite' },
] as const satisfies readonly { value: InspectorTab; label: string }[];

export function Inspector() {
  const open = useEngine((st) => st.panels.inspector);
  const tab = useEngine((st) => st.inspectorTab);
  const setTab = useEngine((st) => st.setInspectorTab);
  const togglePanel = useEngine((st) => st.togglePanel);
  const sel = useEngine((st) => st.sel);
  const fail = useEngine((st) => st.fail);

  return (
    <Surface as="section" material="glass" className={`${p.panel} ${p.right}`} data-panel="inspector" data-open={open} aria-label="Inspecteur" inert={!open}>
      <div className={p.head}>
        <div className={s.headRow}>
          <SegmentedControl label="Vue de l'inspecteur" options={TABS} value={tab} onChange={setTab} />
          <IconButton icon="close" label="Fermer l'inspecteur" size="sm" variant="filled" tooltip="left" onClick={() => togglePanel('inspector', false)} />
        </div>
      </div>
      <div className={p.body} key={tab + (fail ?? sel ?? '')}>
        {tab === 'drive' ? <Drive /> : tab === 'cycle' ? <Cycle /> : fail ? <FailDetail f={FAIL[fail]} /> : sel ? <PartDetail part={PART[sel]} /> : <Welcome />}
      </div>
    </Surface>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.section}>
      <Text variant="caption" tone="tertiary" caps as="h3">
        {label}
      </Text>
      {children}
    </div>
  );
}

function Welcome() {
  const { demoExplode, demoCycle, selectFail } = useEngine.getState();
  return (
    <div className={s.content}>
      <div className={s.intro}>
        <Text variant="title-2">Découvrir le moteur</Text>
        <Text variant="callout" tone="secondary">
          Un moteur à quatre temps répète quatre étapes dans chaque cylindre : admission, compression, combustion,
          échappement. Les cylindres sont décalés pour que l'un d'eux soit toujours en phase motrice. Ordre d'allumage
          1, 3, 4, 2.
        </Text>
      </div>
      <div className={s.actions}>
        <Button variant="primary" icon="play" onClick={demoCycle}>Suivre le cycle</Button>
        <Button icon="explode" onClick={demoExplode}>Éclater</Button>
        <Button icon="warning" onClick={() => selectFail('joint')}>Voir une panne</Button>
      </div>
      <Section label="Systèmes">
        <div className={s.legend}>
          {SYSTEMS.map((sys) => (
            <span key={sys.id}>
              <i style={{ background: sys.color }} />
              {sys.name}
            </span>
          ))}
        </div>
      </Section>
      <Section label="Gestes">
        <dl className={s.gestures}>
          <dt>Glisser</dt><dd>Tourner autour du moteur</dd>
          <dt>Molette, pincer</dt><dd>Zoomer</dd>
          <dt>Maj + glisser</dt><dd>Déplacer la vue</dd>
          <dt>Clic</dt><dd>Ouvrir la fiche d'une pièce</dd>
          <dt>Échap</dt><dd>Revenir à la vue d'ensemble</dd>
        </dl>
      </Section>
    </div>
  );
}

function PartDetail({ part }: { part: Part }) {
  const iso = useEngine((st) => st.iso);
  const { clear, selectFail, isolateSelectedPart, isolateSelectedSystem, hide } = useEngine.getState();
  const sys = SYSTEM[part.sys];
  return (
    <div className={s.content}>
      <div className={s.intro}>
        <div className={s.meta}>
          <Badge dot={sys.color}>{sys.name}</Badge>
          <Badge>Quantité {part.qty}</Badge>
        </div>
        <div className={s.titleRow}>
          <Text variant="title-2">{part.name}</Text>
          <IconButton icon="close" label="Fermer la fiche" size="sm" tooltip="left" onClick={clear} />
        </div>
        <Text variant="callout">{part.role}</Text>
      </div>
      <Section label="Fonctionnement">
        <Text variant="callout" tone="secondary">{part.how}</Text>
      </Section>
      <Section label="Matière">
        <Text variant="callout" tone="secondary">{part.mat}</Text>
      </Section>
      {part.fails.length > 0 && (
        <Section label="Pannes associées">
          <div className={s.chips}>
            {part.fails.map((id) => (
              <Button key={id} size="sm" onClick={() => selectFail(id)}>{FAIL[id].name}</Button>
            ))}
          </div>
        </Section>
      )}
      <div className={s.actions}>
        <Button size="sm" icon="target" aria-pressed={iso?.type === 'part'} onClick={isolateSelectedPart}>Isoler la pièce</Button>
        <Button size="sm" icon="layers" aria-pressed={iso?.type === 'sys'} onClick={isolateSelectedSystem}>Isoler le système</Button>
        <Button size="sm" icon="eyeSlash" onClick={() => hide(part.id)}>Masquer</Button>
      </div>
    </div>
  );
}

function FailDetail({ f }: { f: Failure }) {
  const { clear, selectPart } = useEngine.getState();
  const tone = f.sev >= 3 ? 'danger' : f.sev === 2 ? 'warning' : 'neutral';
  return (
    <div className={s.content}>
      <div className={s.intro}>
        <div className={s.meta}>
          <Badge tone={tone}>Gravité {SEVERITY_LABEL[f.sev].toLowerCase()}</Badge>
          <Badge>Panne classique</Badge>
        </div>
        <div className={s.titleRow}>
          <Text variant="title-2">{f.name}</Text>
          <IconButton icon="close" label="Quitter la panne" size="sm" tooltip="left" onClick={clear} />
        </div>
        <Text variant="callout" tone="secondary">{f.short}</Text>
      </div>
      <Surface material="inset" padding="md" className={s.callout}>
        <Icon name="warning" size={18} />
        <div>
          <Text variant="headline" as="h3">Peut-on rouler ?</Text>
          <Text variant="callout" tone="secondary">{f.drive}</Text>
        </div>
      </Surface>
      <Section label="Symptômes">
        <ul>{f.symptoms.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>
      <Section label="Causes probables">
        <ul>{f.causes.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>
      <Section label="Pièces touchées, en rouge dans la vue">
        <div className={s.chips}>
          {f.parts.map((id) => (
            <Button key={id} size="sm" onClick={() => selectPart(id)}>{PART[id].name}</Button>
          ))}
        </div>
      </Section>
      <Section label="Diagnostic">
        <ol>{f.diag.map((x) => <li key={x}>{x}</li>)}</ol>
      </Section>
      <Section label="Réparation">
        <Text variant="callout" tone="secondary">{f.fix}</Text>
      </Section>
      <div className={s.actions}>
        <Button variant="destructive" onClick={clear}>Quitter la panne</Button>
      </div>
    </div>
  );
}
