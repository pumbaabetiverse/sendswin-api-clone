import type { Repository } from 'typeorm';

export function getCols<T extends object>(
  repository: Repository<T>,
): (keyof T)[] {
  return repository.metadata.columns.map(
    (col) => col.propertyName,
  ) as (keyof T)[];
}
