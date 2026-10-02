import { useMemo, type ReactNode } from 'react';
import { Badge, Button, ChoiceList, Icon, IconButton, Notice, SegmentedControl, Surface, Text, type Choice } from '@ds';
import { FAIL, SEVERITY_LABEL, type Failure } from '../../engine/data/failures';
import { PART, quantity, type Part } from '../../engine/data/parts';
import { useArchitecture } from '../state/limits';
import { SYSTEM, SYSTEMS } from '../../engine/data/systems';
import { getVariant, optionsFor, variantsFor, type SlotId } from '../../engine/spec';
import { useGarage } from '../garage/garageStore';
import { plural, summarize } from '../garage/summary';
import { navigate } from '../router';
import { useEngine, type InspectorTab } from '../state/store';
import { Cycle } from './Cycle';
import { Drive } from './Drive';
import { EnginePanel } from './engine/EnginePanel';
import p from './Panel.module.css';
import s from './Inspector.module.css';

const TABS = [
  { value: 'detail', label: 'Pièce' },
  { value: 'engine', label: 'Moteur' },
  { value: 'cycle', label: 'Cycle' },
  { value: 'drive', label: 'Conduite' },
] as const satisfies readonly { value: InspectorTab; label: string }[];

export function Inspector() {
  const open = useEngine((st) => st.panels.inspector);
  const tab = useEngine((st) => st.inspectorTab);
  const setTab = useEngine((st) => st.setInspectorTab);
  const sel = useEngine((st) => st.sel);
  const fail = useEngine((st) => st.fail);

  return (
    <Surface as="section" material="glass" className={`${p.panel} ${p.right}`} data-panel="inspector" data-open={open} aria-label="Inspecteur" inert={!open}>
      <div className={p.head}>
        <div className={s.headRow}>
          <SegmentedControl label="Vue de l'inspecteur" options={TABS} value={tab} onChange={setTab} />
        </div>
      </div>
      <div className={p.body} key={tab + (fail ?? sel ?? '')}>
        {tab === 'drive' ? <Drive /> : tab === 'cycle' ? <Cycle /> : tab === 'engine' ? <EnginePanel /> : fail ? <FailDetail f={FAIL[fail]} /> : sel ? <PartDetail part={PART[sel]} /> : <Welcome />}
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
  const readOnly = useEngine((st) => st.readOnly);
  const order = useEngine((st) => st.spec.params.firingOrder.join(', '));
  return (
    <div className={s.content}>
      <div className={s.intro}>
        <Text variant="title-2">{readOnly ? 'Découvrir le moteur' : 'Personnaliser ce moteur'}</Text>
        <Text variant="callout" tone="secondary">
          {readOnly
            ? `Un moteur à quatre temps répète quatre étapes dans chaque cylindre : admission, compression, combustion, échappement. Les cylindres sont décalés pour que l'un d'eux soit toujours en phase motrice. Ordre d'allumage ${order}.`
            : "Cliquez une pièce dans la vue ou dans la liste : sa fiche propose les pièces de remplacement compatibles, et la maquette se reconstruit avec elles. L'onglet Moteur montre la fiche technique et ce qui pose problème."}
        </Text>
      </div>
      {readOnly && <StartFromReference />}
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

/** Sur le moteur de référence : rappel qu'il faut le copier pour changer ses pièces. */
function StartFromReference() {
  const createEngine = useGarage((st) => st.createEngine);
  return (
    <Notice
      tone="info"
      title="Moteur de référence, en lecture seule"
      action={
        <Button size="sm" variant="primary" icon="plus" onClick={async () => navigate({ name: 'engine', id: (await createEngine('L4 1.6')).id })}>
          Créer
        </Button>
      }
    >
      <p>Créez votre moteur à partir de celui-ci pour remplacer ses pièces.</p>
    </Notice>
  );
}

/** Pièce montée et pièces de remplacement, avec leurs conséquences. */
function Replace({ slot }: { slot: SlotId }) {
  const spec = useEngine((st) => st.spec);
  const readOnly = useEngine((st) => st.readOnly);
  const { swapPart } = useEngine.getState();
  const mounted = getVariant(spec.parts[slot]);
  const several = variantsFor(slot).length > 1;

  const choices: Choice<string>[] = useMemo(
    () =>
      several && !readOnly
        ? optionsFor(spec, slot).map((o) => ({
            value: o.variant.id,
            title: o.variant.name,
            description: o.variant.note,
            meta: o.adjustments.length ? <Badge tone="accent">+{plural(o.adjustments.length, 'pièce', 'pièces')}</Badge> : undefined,
            extra: o.adjustments.length ? `Remplace aussi : ${o.adjustments.map((a) => PART[a.slot].name.toLowerCase()).join(', ')}.` : undefined,
            disabledReason: o.blocked,
          }))
        : [],
    [spec, slot, several, readOnly],
  );

  return (
    <>
      <Section label="Pièce montée">
        <Text variant="headline">{mounted?.name ?? 'Pièce inconnue'}</Text>
        {mounted && <Text variant="callout" tone="secondary">{mounted.note}</Text>}
      </Section>
      {several && readOnly && <StartFromReference />}
      {several && !readOnly && (
        <Section label="Remplacer par">
          <ChoiceList label={`Remplacer ${PART[slot].name}`} choices={choices} value={spec.parts[slot]} onChange={(v) => swapPart(slot, v)} />
        </Section>
      )}
      {!several && (
        <Text variant="footnote" tone="tertiary">Une seule version de cette pièce pour l'instant.</Text>
      )}
    </>
  );
}

/** Conséquences du dernier remplacement fait depuis cette fiche, avec de quoi l'annuler. */
function ChangeNotice({ slot }: { slot: SlotId }) {
  const last = useEngine((st) => st.lastChange);
  const { undo, dismissChange } = useEngine.getState();
  if (last?.slot !== slot) return null;
  return (
    <Notice
      tone="info"
      live
      title={last.adjustments.length > 1 ? `${last.adjustments.length} pièces remplacées pour rester compatibles` : '1 pièce remplacée pour rester compatible'}
      action={<Button variant="plain" size="sm" onClick={undo}>Annuler</Button>}
    >
      <ul>
        {last.adjustments.map((a) => (
          <li key={a.slot}>{getVariant(a.to)?.name}, pour un {a.reason}</li>
        ))}
      </ul>
      <Button variant="plain" size="sm" onClick={dismissChange} style={{ alignSelf: 'flex-start', marginLeft: -8 }}>Compris</Button>
    </Notice>
  );
}

/** Problèmes de cohérence qui concernent cette pièce. */
function PartIssues({ slot }: { slot: SlotId }) {
  const spec = useEngine((st) => st.spec);
  const readOnly = useEngine((st) => st.readOnly);
  const issues = useMemo(() => summarize(spec).validation.issues.filter((i) => (i.targets as string[]).includes(slot)), [spec, slot]);
  if (readOnly || !issues.length) return null;
  return (
    <>
      {issues.map((i, k) => (
        <Notice key={`${i.code}-${k}`} tone={i.severity === 'error' ? 'danger' : 'warning'} title={i.message}>
          {i.hint && <p>{i.hint}</p>}
        </Notice>
      ))}
    </>
  );
}

function PartDetail({ part }: { part: Part }) {
  const iso = useEngine((st) => st.iso);
  const { clear, selectFail, isolateSelectedPart, isolateSelectedSystem, hide } = useEngine.getState();
  const sys = SYSTEM[part.sys];
  const slot = part.id as SlotId;
  const arch = useArchitecture();
  return (
    <div className={s.content}>
      <div className={s.intro}>
        <div className={s.meta}>
          <Badge dot={sys.color}>{sys.name}</Badge>
          <Badge>Quantité {quantity(part, arch.cylinders, arch.banks)}</Badge>
        </div>
        <div className={s.titleRow}>
          <Text variant="title-2">{part.name}</Text>
          <IconButton icon="close" label="Fermer la fiche" size="sm" tooltip="left" onClick={clear} />
        </div>
        <Text variant="callout">{part.role}</Text>
      </div>
      <ChangeNotice slot={slot} />
      <PartIssues slot={slot} />
      <Replace slot={slot} />
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
