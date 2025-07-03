import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  author: User;

  @ManyToOne(() => User)
  target_user: User;

  @Column('text')
  content: string;

  @Column({ default: false })
  archived: boolean; // ✅ Add this line

  @CreateDateColumn()
  created_at: Date;
}
