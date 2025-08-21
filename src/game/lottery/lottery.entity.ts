import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DepositOption } from '@/deposits/deposit.entity';
import { NumericColumn } from '@/common/transform-decimal';

@Entity('lottery_jackpot_numbers')
export class LotteryJackpotNumber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: string;

  @Column()
  day: string;
}

@Entity('lottery_side_prizes')
export class LotterySidePrize {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: DepositOption,
    nullable: true,
  })
  option: DepositOption;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  multiplier: number;

  @Column()
  pattern: string;
}
