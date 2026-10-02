import { useSyncExternalStore } from 'react';

/* Navigation par le fragment d'URL : pas de configuration serveur, les liens restent partageables */
export type Route = { name: 'garage' } | { name: 'engine'; id: string } | { name: 'reference' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'moteurs' && parts[1]) return { name: 'engine', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'reference') return { name: 'reference' };
  return { name: 'garage' };
}

export const href = (r: Route) =>
  r.name === 'engine' ? `#/moteurs/${encodeURIComponent(r.id)}` : r.name === 'reference' ? '#/reference' : '#/';

export function navigate(r: Route) {
  window.location.hash = href(r);
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseRoute(hash);
}
