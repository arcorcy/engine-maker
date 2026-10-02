import { useMemo, useState } from 'react';
import { Badge, Button, ChoiceList, Sheet, Text, TextField, type Choice } from '@ds';
import { createSpec, derive, TEMPLATES } from '../../engine/spec';
import { navigate } from '../router';
import { useGarage } from './garageStore';
import { dim, num } from './summary';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Création d'un moteur : choix de l'architecture, du 3 cylindres au V16, puis ouverture en 3D. */
export function NewEngineSheet({ open, onClose }: Props) {
  const createEngine = useGarage((st) => st.createEngine);
  const [template, setTemplate] = useState('i4-dohc-16v');
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const choices: Choice<string>[] = useMemo(
    () =>
      TEMPLATES.map((t) => {
        const d = derive(createSpec(t.id));
        return {
          value: t.id,
          title: t.short,
          meta: <Badge>{t.cylinders} cyl.</Badge>,
          description: `${t.name} · ${num(d.displacement)} cm³ · ${dim(d.bore)} × ${dim(d.stroke)} mm`,
          extra: t.note,
        };
      }),
    [],
  );
  const short = TEMPLATES.find((t) => t.id === template)?.short ?? '';
  const shownName = name ?? short;

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const rec = await createEngine(shownName, template);
    setBusy(false);
    onClose();
    setName(null);
    navigate({ name: 'engine', id: rec.id });
  };

  return (
    <Sheet
      open={open}
      title="Nouveau moteur"
      description="Choisissez une architecture : elle fixe le nombre de cylindres et leur disposition. Vous changerez ensuite les pièces une à une depuis la vue 3D."
      onClose={onClose}
      onSubmit={create}
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" icon="cube" disabled={busy}>Créer et ouvrir en 3D</Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
        <TextField label="Nom" value={shownName} maxLength={80} onChange={setName} />
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <Text variant="caption" tone="tertiary" caps as="h3">Architecture</Text>
          <ChoiceList label="Architecture" choices={choices} value={template} onChange={setTemplate} />
        </div>
      </div>
    </Sheet>
  );
}
