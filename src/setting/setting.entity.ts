import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @Column({
    nullable: true,
    default: false,
  })
  @Expose({
    groups: ['admin'],
  })
  expose: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
