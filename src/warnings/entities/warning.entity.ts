// src/warnings/entities/warning.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

export type WarningLevel = 1 | 2 | 3;
export type WarningReason = 'inactivity' | 'non_compliance';

@Entity()
export class Warning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.warnings, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'int' })
  level: WarningLevel;

  @Column({ type: 'text' })
  reason: WarningReason;

  @Column({ type: 'timestamptz' })
  windowStart: Date;

  @Column({ type: 'timestamptz' })
  windowEnd: Date;

  @CreateDateColumn()
  sentAt: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean; // false if admin manually clears it
}
