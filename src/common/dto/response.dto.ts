import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiPropertyOptional } from '@nestjs/swagger';

import { PaginatedDto } from './pagination.dto';

export interface ApiResponse<T> {
  data?: T | null;
  errors?: string[];
  message?: string | null;
}

export const BaseResponseDto = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  class ResponseDtoClass implements ApiResponse<TModel> {
    @ApiPropertyOptional({
      description: 'Response data',
      nullable: true,
      type: model,
    })
    data?: TModel | null;

    @ApiPropertyOptional({
      description: 'Array of error messages',
      type: [String],
      default: [],
    })
    errors: string[];

    @ApiPropertyOptional({
      description: 'Optional message for additional information',
      type: String,
      nullable: true,
    })
    message?: string | null;
    @ApiPropertyOptional({ description: 'Server Timestamp of the response' })
    ts?: number;
  }

  Object.defineProperty(ResponseDtoClass, 'name', {
    value: `Standard${model.name}Response`,
  });

  return ResponseDtoClass;
};

export const BaseResponseListDto = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  class ResponseListDtoClass implements ApiResponse<TModel[]> {
    @ApiPropertyOptional({
      description: 'Response data',
      nullable: true,
      type: [model],
    })
    data?: TModel[] | null;

    @ApiPropertyOptional({
      description: 'Array of error messages',
      type: [String],
      default: [],
    })
    errors: string[];

    @ApiPropertyOptional({
      description: 'Optional message for additional information',
      type: String,
      nullable: true,
    })
    message?: string | null;
    @ApiPropertyOptional({ description: 'Server Timestamp of the response' })
    ts?: number;
  }

  Object.defineProperty(ResponseListDtoClass, 'name', {
    value: `Standard${model.name}ListResponse`,
  });

  return ResponseListDtoClass;
};

export const ApiOkResponseList = <TModel extends Type<unknown>>(
  model: TModel,
) =>
  applyDecorators(
    ApiOkResponse({
      description: `Response list of ${model.name}`,
      type: [model],
    }),
  );

export const ApiOkResponsePagination = <TModel extends Type<unknown>>(
  model: TModel,
) =>
  applyDecorators(
    ApiOkResponse({
      description: `Response of ${model.name}`,
      type: PaginatedDto(model),
    }),
  );

export class SucccessResponseDto {
  success?: boolean;
}
