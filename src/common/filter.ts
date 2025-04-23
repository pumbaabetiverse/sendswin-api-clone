export function isPresent<T>(t: T | undefined | null): t is T {
  return t !== undefined && t !== null;
}

export function isDefined<T>(t: T | undefined): t is T {
  return t !== undefined;
}

export function isFilled<T>(t: T | null): t is T {
  return t !== null;
}

export function hasPresentKey<K extends string | number | symbol>(k: K) {
  return <T, V>(a: T & Partial<Record<K, V | null>>): a is T & Record<K, V> =>
    a[k] !== undefined && a[k] !== null;
}

export function hasValueAtKey<K extends string | number | symbol, V>(
  k: K,
  v: V,
) {
  return <T>(a: T & Record<K, any>): a is T & Record<K, V> => a[k] === v;
}

export function isNullish<T>(t: T | null | undefined): t is null | undefined {
  return t === null || t === undefined;
}
