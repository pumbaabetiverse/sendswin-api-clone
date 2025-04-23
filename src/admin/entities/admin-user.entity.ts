import { sonyflake } from '@/common/sonyflake';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class AdminUser {
  @PrimaryColumn('bigint')
  id: string;

  @Column()
  @Index({ unique: true })
  username: string;

  @Column({ select: false })
  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column({ nullable: true })
  name?: string;

  @Column({
    default: false,
  })
  suspended: boolean;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  roles?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose({
    groups: ['admin'],
    toPlainOnly: true,
  })
  updatedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = sonyflake.nextId().toString();
  }
}
