/**
 * [LAYER: PLUMBING]
 * Principle: Pure, stateless string utilities.
 * Zero context or layer dependencies.
 */

export const truncate = (str: string, max: number): string => {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
};

export const formatError = (error: any): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
