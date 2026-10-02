/*
 * Stockage des moteurs. L'interface est asynchrone pour accueillir Supabase sans toucher aux écrans ;
 * l'implémentation actuelle garde les moteurs dans le navigateur.
 */
import { parseSpec, type EngineSpec } from '../../engine/spec';

export interface EngineRecord {
  id: string;
  spec: EngineSpec;
  createdAt: string;
  updatedAt: string;
}

export interface EngineRepository {
  list(): Promise<EngineRecord[]>;
  get(id: string): Promise<EngineRecord | null>;
  create(spec: EngineSpec): Promise<EngineRecord>;
  update(id: string, spec: EngineSpec): Promise<EngineRecord>;
  remove(id: string): Promise<void>;
}

const KEY = 'engines.garage.v1';
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/**
 * Moteurs stockés dans le navigateur : propres à cet appareil, perdus si les données du site sont effacées.
 * Chaque spec relue passe par parseSpec ; une entrée illisible est ignorée plutôt que de casser la liste.
 */
export class LocalEngineRepository implements EngineRepository {
  private memory: EngineRecord[] | null = null;

  private read(): EngineRecord[] {
    if (this.memory) return this.memory;
    let raw: unknown = [];
    try {
      raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      raw = [];
    }
    const records = (Array.isArray(raw) ? raw : []).flatMap((r) => {
      const parsed = parseSpec(r?.spec);
      return parsed.ok && typeof r.id === 'string' ? [{ id: r.id, spec: parsed.spec, createdAt: String(r.createdAt), updatedAt: String(r.updatedAt) }] : [];
    });
    this.memory = records;
    return records;
  }

  private write(records: EngineRecord[]) {
    this.memory = records;
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch {
      /* stockage indisponible (navigation privée) : les moteurs restent en mémoire pour la session */
    }
  }

  async list() {
    return [...this.read()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    return this.read().find((r) => r.id === id) ?? null;
  }

  async create(spec: EngineSpec) {
    const now = new Date().toISOString();
    const rec: EngineRecord = { id: newId(), spec, createdAt: now, updatedAt: now };
    this.write([...this.read(), rec]);
    return rec;
  }

  async update(id: string, spec: EngineSpec) {
    const records = this.read();
    const prev = records.find((r) => r.id === id);
    if (!prev) throw new Error(`Moteur introuvable : ${id}`);
    const rec = { ...prev, spec, updatedAt: new Date().toISOString() };
    this.write(records.map((r) => (r.id === id ? rec : r)));
    return rec;
  }

  async remove(id: string) {
    this.write(this.read().filter((r) => r.id !== id));
  }
}
