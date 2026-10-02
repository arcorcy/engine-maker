import { create } from 'zustand';
import { createSpec, type EngineSpec } from '../../engine/spec';
import { LocalEngineRepository, type EngineRecord, type EngineRepository } from './repository';

/** Point unique de branchement du stockage : remplacer par l'implémentation Supabase le moment venu. */
export const repository: EngineRepository = new LocalEngineRepository();

interface GarageState {
  records: EngineRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  createEngine: (name?: string, templateId?: string) => Promise<EngineRecord>;
  duplicate: (id: string) => Promise<EngineRecord | null>;
  save: (id: string, spec: EngineSpec) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const uniqueName = (base: string, records: EngineRecord[]) => {
  const names = new Set(records.map((r) => r.spec.name));
  if (!names.has(base)) return base;
  let n = 2;
  while (names.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
};

export const useGarage = create<GarageState>()((set, get) => ({
  records: [],
  loaded: false,

  load: async () => {
    set({ records: await repository.list(), loaded: true });
  },

  createEngine: async (name = 'Nouveau moteur', templateId = 'i4-dohc-16v') => {
    const rec = await repository.create(createSpec(templateId, uniqueName(name.trim() || 'Nouveau moteur', get().records)));
    set({ records: await repository.list() });
    return rec;
  },

  duplicate: async (id) => {
    const src = get().records.find((r) => r.id === id);
    if (!src) return null;
    const rec = await repository.create({ ...structuredClone(src.spec), name: uniqueName(`${src.spec.name} (copie)`, get().records) });
    set({ records: await repository.list() });
    return rec;
  },

  save: async (id, spec) => {
    await repository.update(id, spec);
    set({ records: await repository.list() });
  },

  remove: async (id) => {
    await repository.remove(id);
    set({ records: await repository.list() });
  },
}));
