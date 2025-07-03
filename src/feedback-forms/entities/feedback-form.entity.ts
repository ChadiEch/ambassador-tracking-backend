import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class FeedbackForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

@ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
user: User;


  @Column('text')
  message: string;

  @CreateDateColumn()
  created_at: Date;

// feedback-form.entity.ts
@Column({ default: false })
archived: boolean;


}
