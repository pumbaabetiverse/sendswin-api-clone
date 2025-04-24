import { GetManyDefaultResponse } from '@dataui/crud';
import { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PaginationQuery {
  page?: number;
  current?: number;
  pageSize?: number;
}

export class PaginationResponse<T> implements GetManyDefaultResponse<T> {
  @ApiProperty({ description: 'Response data' })
  @Expose()
  data: T[];
  @Expose()
  count: number;
  @Expose()
  pageCount: number;
  @Expose()
  total: number;
  @Expose()
  page: number;
  @ApiPropertyOptional({ nullable: true })
  @Expose()
  hasNext?: boolean;
  @ApiPropertyOptional({ nullable: true })
  @Expose()
  hasPrev?: boolean;
}

export const PaginatedDto = <TModel extends Type<any>>(model: TModel) => {
  class PaginatedDtoClass extends PaginationResponse<InstanceType<TModel>> {
    @ApiProperty({ type: [model] })
    @Expose()
    items: InstanceType<TModel>[];

    @ApiProperty({ type: [model] })
    @Expose()
    data: InstanceType<TModel>[];
  }

  Object.defineProperty(PaginatedDtoClass, 'name', {
    value: `Paginated${model.name}Response`,
  });

  return PaginatedDtoClass;
};

export const buildPaginateResponse = <T>(
  items: T[],
  total: number,
  page: number,
  limit?: number,
): PaginationResponse<T> => {
  const pageSize = Math.max(1, limit ?? 20);
  const pageCount = Math.ceil(total / pageSize);
  return {
    count: items.length,
    data: items,
    page,
    pageCount,
    total,
    hasNext: total > page * pageSize,
    hasPrev: page > 1,
  } satisfies PaginationResponse<T>;
};
