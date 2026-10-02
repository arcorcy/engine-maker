/*
 * Cœur des moteurs personnalisés : types, catalogue, valeurs dérivées, règles de cohérence, résolution
 * des dépendances et schéma de stockage. Aucune dépendance au rendu 3D ni à l'interface.
 */
export * from './types';
export { SLOTS, TEMPLATES, VARIANTS, createSpec, getTemplate, getVariant, variantsFor } from './catalog';
export { derive, propsOf, pistonDrop, camLift } from './derive';
export { validate, LIMITS, type Validation } from './validate';
export { applyChange, resolve, optionsFor, INTERFACES, type Change, type Adjustment, type Resolution, type Option } from './resolve';
export { EngineSpecSchema, parseSpec, type ParseResult } from './schema';

