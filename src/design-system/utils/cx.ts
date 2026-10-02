/** Concatène des classes en ignorant les valeurs vides. */
export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
