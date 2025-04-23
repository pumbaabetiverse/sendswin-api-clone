import { isNullish } from './filter';
import { applyDecorators } from '@nestjs/common';
import Big from 'big.js';
import { Transform } from 'class-transformer';
import { Column, type ValueTransformer } from 'typeorm';
import type { ColumnCommonOptions } from 'typeorm/decorator/options/ColumnCommonOptions';
import type { ColumnNumericOptions } from 'typeorm/decorator/options/ColumnNumericOptions';

type NumericColumnOptions = ColumnCommonOptions &
  ColumnNumericOptions & { round?: number };

export function TransformDecimal(scale = 4) {
  return Transform(({ value }): number => {
    if (typeof value === 'string') {
      return Big(value).round(scale, Big.roundDown).toNumber();
    }
    return value;
  });
}

export const BigNumericTransformer = (round = 4): ValueTransformer => {
  return {
    to(data?: number | null): string | null {
      if (!isNullish(data)) {
        return Big(data).round(round, Big.roundDown).toString();
      }
      return null;
    },

    from(data?: string | null): number | null {
      if (!isNullish(data)) {
        return Big(data).toNumber();
      }
      return null;
    },
  };
};

export function NumericColumn(options?: NumericColumnOptions) {
  const { round = 4, ...columnOptions } = options ?? {};
  return applyDecorators(
    Column('numeric', {
      nullable: true,
      precision: 20,
      scale: 4,
      default: 0,
      ...columnOptions,
      transformer: BigNumericTransformer(round),
    }),
    TransformDecimal(round),
  );
}
