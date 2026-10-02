import { useEffect, useState } from 'react';
import { Button, Dialog, Icon, IconButton, Readout, SearchField, Surface, Text } from '@ds';
import { navigate } from '../router';
import { useTheme } from '../useTheme';
import { EngineCard } from './EngineCard';
import { NewEngineSheet } from './NewEngineSheet';
import { useGarage } from './garageStore';
import { dim, num, plural, REFERENCE } from './summary';
import s from './Garage.module.css';

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Accueil : le tableau de bord des moteurs créés. */
export function Garage() {
  const [theme, toggleTheme] = useTheme();
  const { records, loaded, load, createEngine, duplicate, remove } = useGarage();
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const create = () => setCreating(true);
  const fromReference = async () => navigate({ name: 'engine', id: (await createEngine('L4 1.6')).id });
  const shown = records.filter((r) => !query.trim() || norm(r.spec.name).includes(norm(query.trim())));
  const target = records.find((r) => r.id === toDelete);
  const ref = REFERENCE.validation.derived!;

  return (
    <div className={s.page}>
      <header className={s.bar}>
        <span className={s.brand}>Anatomie moteur</span>
        <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Thème clair' : 'Thème sombre'} tooltip="bottom" onClick={toggleTheme} />
      </header>

      <main className={s.wrap}>
        <div className={s.hero}>
          <div>
            <Text variant="large-title">Mes moteurs</Text>
            <Text variant="callout" tone="secondary">
              {loaded ? (records.length ? plural(records.length, 'moteur', 'moteurs') : 'Aucun moteur') : 'Chargement'} · enregistrés dans ce navigateur
            </Text>
          </div>
          <div className={s.tools}>
            {records.length > 3 && <SearchField label="Rechercher un moteur" placeholder="Rechercher" value={query} onChange={setQuery} />}
            <Button variant="primary" icon="plus" onClick={create}>Nouveau moteur</Button>
          </div>
        </div>

        <section className={s.section} aria-labelledby="ref-title">
          <Text variant="caption" tone="tertiary" caps as="h2" id="ref-title">Point de départ</Text>
          <Surface material="solid" radius="lg" padding="lg" className={s.ref}>
            <div>
              <Text variant="title-3" as="h3">1.6 16 soupapes</Text>
              <Text variant="footnote" tone="secondary">{REFERENCE.templateName} · moteur de référence de la maquette 3D</Text>
            </div>
            <div className={s.figures}>
              <Readout size="sm" value={num(ref.displacement)} unit="cm³" label="cylindrée" />
              <Readout size="sm" value={`${dim(ref.bore)} × ${dim(ref.stroke)}`} unit="mm" label="alésage × course" />
              <Readout size="sm" value={num(ref.compressionRatio, 1)} label="rapport volumétrique" />
            </div>
            <div className={s.refActions}>
              <Button icon="cube" onClick={() => navigate({ name: 'reference' })}>Voir en 3D</Button>
              <Button icon="plus" onClick={fromReference}>Partir de ce moteur</Button>
            </div>
          </Surface>
        </section>

        <section className={s.section} aria-labelledby="mine-title">
          <Text variant="caption" tone="tertiary" caps as="h2" id="mine-title">Mes créations</Text>
          {loaded && !records.length ? (
            <Surface material="inset" radius="lg" className={s.empty}>
              <Icon name="cube" size={36} />
              <Text variant="headline" as="p">Aucun moteur pour l'instant</Text>
              <Text variant="callout" tone="secondary">Choisissez une architecture, du 3 cylindres au V16, puis remplacez ses pièces depuis la vue 3D : chaque choix est vérifié pour que l'ensemble reste cohérent.</Text>
              <Button variant="primary" icon="plus" onClick={create}>Créer mon premier moteur</Button>
            </Surface>
          ) : shown.length ? (
            <div className={s.grid}>
              {shown.map((r) => (
                <EngineCard key={r.id} record={r} onDuplicate={() => duplicate(r.id)} onDelete={() => setToDelete(r.id)} />
              ))}
            </div>
          ) : (
            loaded && <Text variant="callout" tone="secondary">Aucun moteur ne correspond à « {query} ».</Text>
          )}
        </section>
      </main>

      <NewEngineSheet open={creating} onClose={() => setCreating(false)} />

      <Dialog
        open={!!target}
        title={`Supprimer « ${target?.spec.name ?? ''} » ?`}
        message="Ce moteur sera supprimé de ce navigateur. Cette action est définitive."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete) await remove(toDelete);
          setToDelete(null);
        }}
      />
    </div>
  );
}
