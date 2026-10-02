import { useMemo, useState } from 'react';
import { Button, Dialog, ListItem, NumberField, SegmentedControl, Text, TextField } from '@ds';
import { PART } from '../../../engine/data/parts';
import { createSpec, getTemplate, SLOTS } from '../../../engine/spec';
import { summarize } from '../../garage/summary';
import { mountedName, useEngine } from '../../state/store';
import { PARAM_LABEL } from './labels';
import { SpecSheet } from './SpecSheet';
import s from './EnginePanel.module.css';

/** Onglet Moteur : nom, fiche technique calculée, diagnostic, réglages et pièces changées. */
export function EnginePanel() {
  const spec = useEngine((st) => st.spec);
  const readOnly = useEngine((st) => st.readOnly);
  const { renameEngine, setEngineParam, selectPart, resetEngine } = useEngine.getState();
  const [confirm, setConfirm] = useState(false);
  const summary = useMemo(() => summarize(spec), [spec]);
  const template = getTemplate(spec.template);

  const issuesFor = (key: keyof typeof PARAM_LABEL) => summary.validation.issues.filter((i) => (i.targets as string[]).includes(`params.${key}`));
  const flag = (key: keyof typeof PARAM_LABEL) => {
    const list = issuesFor(key);
    return list.length ? <Text variant="footnote" tone={list.some((i) => i.severity === 'error') ? 'danger' : 'secondary'}>{list[0].message}</Text> : null;
  };
  const changed = template ? SLOTS.filter((slot) => template.defaults.parts[slot] !== spec.parts[slot]) : [];

  return (
    <div className={s.content}>
      {!readOnly && (
        <TextField
          label="Nom du moteur"
          value={spec.name}
          maxLength={80}
          onChange={renameEngine}
          onBlur={() => !spec.name.trim() && renameEngine('Sans titre')}
        />
      )}

      <SpecSheet summary={summary} onShow={selectPart} />

      <section className={s.block} aria-label="Réglages">
        <Text variant="caption" tone="tertiary" caps as="h2">Réglages</Text>
        <div>
          <div className={s.param}>
            <div>
              <Text variant="callout">{PARAM_LABEL.redline}</Text>
              {flag('redline')}
            </div>
            {readOnly ? (
              <Text variant="callout" tabular>{spec.params.redline.toLocaleString('fr-FR')} tr/min</Text>
            ) : (
              <NumberField label={PARAM_LABEL.redline} value={spec.params.redline} min={3000} max={10000} step={100} unit="tr/min" digits={5}
                onChange={(v) => setEngineParam('redline', v)} />
            )}
          </div>
          <div className={s.param}>
            <div>
              <Text variant="callout">{PARAM_LABEL.ignitionAdvance}</Text>
              {flag('ignitionAdvance')}
            </div>
            {readOnly ? (
              <Text variant="callout" tabular>{spec.params.ignitionAdvance}° avant PMH</Text>
            ) : (
              <NumberField label={PARAM_LABEL.ignitionAdvance} value={spec.params.ignitionAdvance} min={0} max={45} step={1} unit="° avant PMH" digits={2}
                onChange={(v) => setEngineParam('ignitionAdvance', v)} />
            )}
          </div>
          {template && (
            <div className={s.param}>
              <div>
                <Text variant="callout">{PARAM_LABEL.firingOrder}</Text>
                {flag('firingOrder')}
              </div>
              {readOnly ? (
                <Text variant="callout" tabular>{spec.params.firingOrder.join('-')}</Text>
              ) : (
              <SegmentedControl
                label={PARAM_LABEL.firingOrder}
                size="sm"
                options={template.firingOrders.map((o) => ({ value: o.join('-'), label: o.join('-') }))}
                value={spec.params.firingOrder.join('-')}
                onChange={(v) => setEngineParam('firingOrder', v.split('-').map(Number))}
              />
              )}
            </div>
          )}
        </div>
        {readOnly && <Text variant="footnote" tone="tertiary">Réglages du moteur de référence, non modifiables.</Text>}
      </section>

      {!readOnly && (
        <section className={s.block} aria-label="Pièces changées">
          <Text variant="caption" tone="tertiary" caps as="h2">Pièces changées</Text>
          {changed.length ? (
            <div className={s.changed}>
              {changed.map((slot) => (
                <ListItem key={slot} title={PART[slot].name} subtitle={mountedName(spec, slot)} onSelect={() => selectPart(slot)} />
              ))}
            </div>
          ) : (
            <Text variant="callout" tone="secondary">Toutes les pièces sont d'origine. Cliquez une pièce dans la vue pour la remplacer.</Text>
          )}
          {changed.length > 0 && (
            <Button variant="plain" size="sm" icon="reset" onClick={() => setConfirm(true)} style={{ alignSelf: 'flex-start' }}>
              Revenir aux pièces d'origine
            </Button>
          )}
        </section>
      )}

      <Dialog
        open={confirm}
        title="Revenir aux pièces d'origine ?"
        message={`Les ${changed.length} pièces changées et les réglages reprennent leur version d'origine. Vous pourrez annuler.`}
        confirmLabel="Réinitialiser"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          resetEngine(createSpec(spec.template));
        }}
      />
    </div>
  );
}

