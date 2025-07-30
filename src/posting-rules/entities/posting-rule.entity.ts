import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class PostingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 0 })
  stories_per_week: number;

  @Column({ default: 0 })
  posts_per_week: number;

  @Column({ default: 0 })
  reels_per_week: number;
  
  @Column({ type: 'text', nullable: true })
  rulesText: string;

}
