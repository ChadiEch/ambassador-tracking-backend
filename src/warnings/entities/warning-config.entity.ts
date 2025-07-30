// src/warnings/entities/warning-config.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class WarningConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 30 }) inactivityWindowDays: number;
  @Column({ type: 'int', default: 7 }) secondGraceDays: number;
  @Column({ type: 'int', default: 7 }) thirdGraceDays: number;
  @Column({ type: 'int', default: 14 }) noncomplianceGraceDays: number;
  @Column({ type: 'int', default: 1 }) expectedStoriesPerWeek: number;
  @Column({ type: 'int', default: 1 }) expectedPostsPerWeek: number;
  @Column({ type: 'int', default: 1 }) expectedReelsPerWeek: number;

  // Editable email templates (simple):
  @Column({ type: 'text', default: '...' }) emailTemplateLevel1: string;
  @Column({ type: 'text', default: '...' }) emailTemplateLevel2: string;
  @Column({ type: 'text', default: '...' }) emailTemplateLevel3: string;
}
