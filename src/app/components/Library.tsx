import { Button, Icon, IconButton, ListItem, SearchField, SectionHeader, SegmentedControl, Surface } from '@ds';
import { FAILS, SEVERITY_LABEL } from '../../engine/data/failures';
import { PARTS } from '../../engine/data/parts';
import { SYSTEMS } from '../../engine/data/systems';
import { useEngine, type Tab } from '../state/store';
import p from './Panel.module.css';
import s from './Library.module.css';

const TABS = [
  { value: 'parts', label: 'Pièces' },
  { value: 'fails', label: 'Pannes' },
] as const satisfies readonly { value: Tab; label: string }[];

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function Library() {
  const open = useEngine((st) => st.panels.library);
  const tab = useEngine((st) => st.tab);
  const query = useEngine((st) => st.query);
  const setTab = useEngine((st) => st.setTab);
  const setQuery = useEngine((st) => st.setQuery);

  return (
    <Surface as="aside" material="glass" className={`${p.panel} ${p.left}`} data-panel="library" data-open={open} aria-label="Bibliothèque" inert={!open}>
      <div className={p.head}>
        <SegmentedControl label="Contenu de la liste" options={TABS} value={tab} onChange={setTab} />
        <SearchField
          label={tab === 'parts' ? 'Rechercher une pièce' : 'Rechercher une panne'}
          placeholder={tab === 'parts' ? 'Rechercher une pièce' : 'Rechercher une panne'}
          value={query}
          onChange={setQuery}
        />
      </div>
      <div className={p.body}>{tab === 'parts' ? <PartList q={norm(query.trim())} /> : <FailList q={norm(query.trim())} />}</div>
    </Surface>
  );
}

function PartList({ q }: { q: string }) {
  const sel = useEngine((st) => st.sel);
  const iso = useEngine((st) => st.iso);
  const hidden = useEngine((st) => st.hidden);
  const { selectPart, toggleHidden, isolateSystem } = useEngine.getState();

  const groups = SYSTEMS.map((sys) => ({
    sys,
    items: PARTS.filter((pt) => pt.sys === sys.id && (!q || norm(`${pt.name} ${sys.name}`).includes(q))),
  })).filter((g) => g.items.length);

  if (!groups.length) return <p className={s.empty}>Aucune pièce ne correspond.</p>;

  return (
    <div className={s.list}>
      {groups.map(({ sys, items }) => {
        const isolated = iso?.type === 'sys' && iso.id === sys.id;
        return (
          <section key={sys.id} className={s.group} aria-label={sys.name}>
            <SectionHeader
              dot={sys.color}
              action={
                <Button variant="plain" size="sm" aria-pressed={isolated} onClick={() => isolateSystem(sys.id)}>
                  {isolated ? 'Tout voir' : 'Isoler'}
                </Button>
              }
            >
              {sys.name}
            </SectionHeader>
            {items.map((pt) => {
              const off = hidden.includes(pt.id);
              return (
                <ListItem
                  key={pt.id}
                  title={pt.name}
                  meta={`×${pt.qty}`}
                  selected={sel === pt.id}
                  dimmed={off}
                  onSelect={() => selectPart(pt.id)}
                  accessory={
                    <IconButton
                      icon={off ? 'eyeSlash' : 'eye'}
                      label={`${off ? 'Afficher' : 'Masquer'} ${pt.name}`}
                      size="sm"
                      tooltip={false}
                      onClick={() => toggleHidden(pt.id)}
                    />
                  }
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function FailList({ q }: { q: string }) {
  const fail = useEngine((st) => st.fail);
  const selectFail = useEngine((st) => st.selectFail);
  const items = FAILS.filter((f) => !q || norm(`${f.name} ${f.short}`).includes(q));

  if (!items.length) return <p className={s.empty}>Aucune panne ne correspond.</p>;

  return (
    <div className={s.list}>
      {items.map((f) => (
        <ListItem
          key={f.id}
          title={f.name}
          subtitle={f.short}
          tone="danger"
          selected={fail === f.id}
          onSelect={() => selectFail(f.id)}
          leading={
            <span className={s.sev} data-s={f.sev} title={`Gravité ${SEVERITY_LABEL[f.sev].toLowerCase()}`}>
              <Icon name="warning" size={15} label={`Gravité ${SEVERITY_LABEL[f.sev].toLowerCase()}`} />
            </span>
          }
        />
      ))}
    </div>
  );
}
