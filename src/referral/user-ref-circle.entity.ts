import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { NumericColumn } from '@/common/transform-decimal';

@Entity('user_ref_circle')
@Unique(['userId', 'circleId'])
export class UserRefCircleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  parentId: number;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  earnFromChild: number;

  @NumericColumn({
    round: 6,
    precision: 18,
    scale: 6,
    default: 0,
  })
  contributeToParent: number;

  @Column({ default: false })
  isWithdrawn: boolean;

  // circleId = year * 54 + week of year (1->53)
  @Column()
  circleId: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
