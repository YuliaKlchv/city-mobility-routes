export type SortKey<T> = keyof T | ((x: T) => string | number | boolean);

export function sortBy<T>(arr: T[], key: SortKey<T>, dir: 'asc'|'desc'='asc'): T[] {
  const f = typeof key === 'function' ? key : (x: T) => (x as any)[key];
  const m = dir === 'asc' ? 1 : -1;
  return [...arr].sort((a,b) => {
    const va = f(a), vb = f(b);
    if (va === vb) return 0;
    return (va > vb ? 1 : -1) * m;
  });
}

export function paginate<T>(arr: T[], page: number, size: number): T[] {
  const start = (page-1) * size;
  return arr.slice(start, start + size);
}
