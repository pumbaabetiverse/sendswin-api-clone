import { PaginationQuery } from './dto/pagination.dto';

export function composePagination(pagination?: PaginationQuery) {
  const limit = Math.min(Math.max(1, pagination?.pageSize ?? 20), 20);
  const page = Math.max(
    parseInt(`${pagination?.current ?? pagination?.page ?? 1}`),
    1,
  );
  const skip = Math.max(page - 1, 0) * limit;
  return {
    skip,
    limit,
    page,
  };
}
