import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;

  @UpdateDateColumn()
  updatedAt: Date;
}